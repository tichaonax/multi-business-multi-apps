/**
 * Custom Next.js Server with Socket.io Support
 *
 * This server wraps the Next.js application and adds Socket.io functionality
 * for real-time customer display synchronization across separate devices.
 */

import { createServer as createHttpServer } from 'http'
import { createServer as createHttpsServer } from 'https'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { parse } from 'url'
import next from 'next'
import { initSocketServer } from './src/lib/customer-display/socket-server'

const dev = process.env.NODE_ENV !== 'production'
const hostname = '0.0.0.0'
const port = parseInt(process.env.PORT || '8080', 10)

// Load SSL certs if present — enables HTTPS for QZ Tray Chrome compatibility
// HTTPS activates whenever certs are found in ./certs/, regardless of NODE_ENV
// Use process.cwd() (not __dirname) so the path resolves to the project root
// whether running as ts-node (dev) or compiled dist/server.js (production)
const certsDir = join(process.cwd(), 'certs')
const certFiles = existsSync(certsDir)
  ? require('fs').readdirSync(certsDir).filter((f: string) => f.endsWith('.pem') && !f.includes('-key') && f !== 'rootCA.pem')
  : []
const keyFiles = existsSync(certsDir)
  ? require('fs').readdirSync(certsDir).filter((f: string) => f.endsWith('-key.pem'))
  : []

const useHttps = certFiles.length > 0 && keyFiles.length > 0
const sslOptions = useHttps ? {
  cert: readFileSync(join(certsDir, certFiles[0])),
  key: readFileSync(join(certsDir, keyFiles[0])),
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
  } else {
    console.log('[Server] HTTP only — no certs found in ./certs/ (place cert + key .pem files there to enable HTTPS)')
  }

  // Initialize Socket.io on the server
  const io = initSocketServer(httpServer)
  console.log('[Server] Socket.io server initialized')

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
