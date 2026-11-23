/**
 * The root certificate behind this server's own HTTPS certificate (mkcert,
 * certs/rootCA.pem) — public, no auth (MBM-341)
 *
 * A till that opens MBM by IP trusts it once; deploy/workstation/
 * setup-printing.ps1 fetches it from here (no USB stick, no setup-ssl.bat).
 * Only the public certificate: the authority's key never leaves the machine
 * that made it. A till that opens MBM by its tailnet name doesn't need it.
 *
 *   GET /api/public/root-ca   → PEM, with X-Certificate-SHA1 (the thumbprint
 *                               00-status.ps1 shows, to compare)
 */
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { X509Certificate } from 'crypto'

export async function GET() {
  const file = join(process.cwd(), 'certs', 'rootCA.pem')
  if (!existsSync(file)) {
    return new Response('No root certificate on this server (certs/rootCA.pem)', { status: 404 })
  }
  const pem = readFileSync(file, 'utf-8')
  const sha1 = new X509Certificate(pem).fingerprint.replace(/:/g, '')
  return new Response(pem, {
    headers: {
      'Content-Type': 'application/x-pem-file',
      'Content-Disposition': 'attachment; filename="mbm-rootCA.pem"',
      'X-Certificate-SHA1': sha1,
    },
  })
}
