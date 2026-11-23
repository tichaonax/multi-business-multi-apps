/**
 * Custom Next.js Server with Socket.io Support
 *
 * This server wraps the Next.js application and adds Socket.io functionality
 * for real-time customer display synchronization across separate devices.
 */

import { createServer as createHttpServer } from 'http'
import { createServer as createHttpsServer } from 'https'
import { existsSync, readFileSync, statSync } from 'fs'
import { createSecureContext, SecureContext } from 'tls'
import { X509Certificate } from 'crypto'
import { join } from 'path'
import { parse } from 'url'
import next from 'next'
import { initSocketServer } from './src/lib/customer-display/socket-server'
import { r710AgentHub } from './src/lib/r710/agent-hub'
import { workstationAgentHub } from './src/lib/workstation-agents/agent-hub'
import { startAutoGenerateScheduler } from './src/lib/r710/auto-generate-scheduler'
import { startBusinessTargetRecalculationScheduler } from './src/lib/business-targets/recalculate-all-targets-scheduler'
import { startComboRequestExpiryScheduler } from './src/lib/expense-account/combo-request-expiry-scheduler'
import { startReceiptReminderScheduler } from './src/lib/expense-account/receipt-reminder-scheduler'
import { startVehicleLicenseReminderScheduler } from './src/lib/vehicles/license-reminder-scheduler'
import { startFarmAlertsScheduler } from './src/lib/farm-control/alerts-poller'
import { startFarmMotionScheduler } from './src/lib/farm-control/camera-events-poller'
import { startOverdueLoanScheduler } from './src/lib/loans/overdue-loan-scheduler'
import { startRestaurantExpenseReminderScheduler } from './src/lib/restaurant-expense-reminder-scheduler'
import { startBackgroundJobs } from './src/lib/background-jobs'
import { join as joinPath } from 'path'

// Fails fast, loudly, if `npm install` hasn't been run since package.json
// last changed — see scripts/check-dependencies.js for why this exists.
// Runs regardless of how the server is started (npm start, the Windows
// service exe, ts-node in dev) since it's the server process itself doing
// the check, not an npm lifecycle hook that some start paths bypass.
// eslint-disable-next-line @typescript-eslint/no-var-requires
require(joinPath(process.cwd(), 'scripts', 'check-dependencies.js')).checkDependencies()

const dev = process.env.NODE_ENV !== 'production'
const hostname = '0.0.0.0'
const port = parseInt(process.env.PORT || '8080', 10)

// Load SSL certs if present — enables HTTPS for QZ Tray Chrome compatibility
// HTTPS activates whenever certs are found in ./certs/, regardless of NODE_ENV
// Use process.cwd() (not __dirname) so the path resolves to the project root
// whether running as ts-node (dev) or compiled dist/server.js (production)
const certsDir = join(process.cwd(), 'certs')
const certFiles = existsSync(certsDir)
  // Not the QZ Tray signing certificate (as install-server-cert.ps1): it has no key here
  ? require('fs').readdirSync(certsDir).filter((f: string) => f.endsWith('.pem') && !f.includes('-key') && f !== 'rootCA.pem' && f !== 'qz-certificate.pem')
  : []
const keyFiles = existsSync(certsDir)
  ? require('fs').readdirSync(certsDir).filter((f: string) => f.endsWith('-key.pem'))
  : []

// MBM-341: a Tailscale certificate for the server's tailnet name
// (deploy/server/06-tailscale-certificate.ps1) in certs/tailscale/, as Farm
// Control does: a browser that asks for that name gets it (trusted, no
// warning); any other name or an IP keeps the certificate above. Read again
// when the file changes (renewal), with no restart.
const tsCertPath = join(certsDir, 'tailscale', 'cert.pem')
const tsKeyPath = join(certsDir, 'tailscale', 'key.pem')
let tsCache: { mtime: number; x509: X509Certificate; ctx: SecureContext } | null = null
function tailscaleContext(servername?: string): SecureContext | null {
  try {
    if (!existsSync(tsCertPath) || !existsSync(tsKeyPath)) return null
    const mtime = statSync(tsCertPath).mtimeMs
    if (!tsCache || tsCache.mtime !== mtime) {
      const cert = readFileSync(tsCertPath)
      const key = readFileSync(tsKeyPath)
      tsCache = { mtime, x509: new X509Certificate(cert), ctx: createSecureContext({ cert, key }) }
      console.log(`[Server] Tailscale certificate loaded: ${tsCache.x509.subjectAltName}, valid until ${tsCache.x509.validTo}`)
    }
    if (servername && !tsCache.x509.checkHost(servername)) return null
    return tsCache.ctx
  } catch (err) {
    console.error('[Server] Tailscale certificate unusable, keeping the default one:', (err as Error).message)
    return null
  }
}

const hasOwnCert = certFiles.length > 0 && keyFiles.length > 0
const hasTailscaleCert = existsSync(tsCertPath) && existsSync(tsKeyPath)
const useHttps = hasOwnCert || hasTailscaleCert
const sslOptions = useHttps ? {
  // The default: this server's own certificate (IPs, localhost); the
  // Tailscale one when it is the only one
  cert: readFileSync(hasOwnCert ? join(certsDir, certFiles[0]) : tsCertPath),
  key: readFileSync(hasOwnCert ? join(certsDir, keyFiles[0]) : tsKeyPath),
  SNICallback: (servername: string, cb: (err: Error | null, ctx?: SecureContext) => void) => {
    cb(null, tailscaleContext(servername) ?? undefined)
  },
} : null

// Initialize Next.js app
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const requestHandler = (req: any, res: any) => {
    try {
      const parsedUrl = parse(req.url!, true)
      handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('Internal server error')
    }
  }

  // Use HTTPS if certs are present, otherwise fall back to HTTP
  const httpServer = useHttps
    ? createHttpsServer(sslOptions!, requestHandler)
    : createHttpServer(requestHandler)

  if (useHttps) {
    console.log('[Server] HTTPS enabled — certs loaded from ./certs/')
    if (!tailscaleContext()) console.log('[Server] no Tailscale certificate (certs/tailscale/): the tailnet name gets the default one')
  } else {
    console.log('[Server] HTTP only — no certs found in ./certs/ (place cert + key .pem files there to enable HTTPS)')
  }

  // Initialize Socket.io on the server
  const io = initSocketServer(httpServer)
  console.log('[Server] Socket.io server initialized')

  // MBM-272: R710 remote agents dial out and connect on this same Socket.io
  // instance (no separate port/server needed).
  r710AgentHub.attach(io)

  // MBM-275: workstation agents (scale + printer relay) — a separate
  // pairing from R710's, same shared Socket.io instance.
  workstationAgentHub.attach(io)

  // Keeps every business's WiFi token pool topped up automatically —
  // previously existed as dead code with no scheduler ever calling it.
  startAutoGenerateScheduler()

  // MBM-288: nightly recalculation of business targets.
  startBusinessTargetRecalculationScheduler()

  // Combo Payment Request 30-day auto-expiry sweep + advance warnings.
  startComboRequestExpiryScheduler()

  // Outstanding receipt-reconciliation daily reminders.
  startReceiptReminderScheduler()

  // MBM-304: overdue/expiring vehicle & driver license reminders.
  startVehicleLicenseReminderScheduler()

  // MBM-332: Farm Control camera alerts → bell + Farm Camera Alerts chat.
  startFarmAlertsScheduler()
  startFarmMotionScheduler() // MBM-339: camera alerts (movement / sound)

  // MBM-312: overdue inter-business/expense-account loan repayments.
  startOverdueLoanScheduler()

  // MBM-319: flagged reminder until recorded restaurant expenses are requested.
  startRestaurantExpenseReminderScheduler()

  // Print-worker health check, WiFi token sanitization, R710/ESP32 client
  // sync — relocated from the removed legacy sync engine (all opt-in, off
  // by default; see src/lib/background-jobs.ts).
  startBackgroundJobs()

  // Start listening
  httpServer.listen(port, () => {
    const protocol = useHttps ? 'https' : 'http'
    console.log(`> Ready on ${protocol}://${hostname}:${port}`)
    console.log(`> Socket.io ready for connections`)
  })

  // Graceful shutdown
  const gracefulShutdown = () => {
    console.log('\n[Server] Shutting down gracefully...')
    io.close(() => {
      console.log('[Server] Socket.io server closed')
      httpServer.close(() => {
        console.log('[Server] HTTP server closed')
        process.exit(0)
      })
    })
  }

  process.on('SIGTERM', gracefulShutdown)
  process.on('SIGINT', gracefulShutdown)
})
