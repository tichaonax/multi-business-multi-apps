/**
 * GET /api/qz/certificate
 * Serves the QZ Tray public certificate so the browser can pass it to QZ Tray.
 */
export async function GET() {
  const certB64 = process.env.QZ_CERTIFICATE
  if (!certB64) {
    return new Response('', { status: 404 })
  }
  const cert = Buffer.from(certB64, 'base64').toString('utf8')
  return new Response(cert, {
    headers: { 'Content-Type': 'text/plain' },
  })
}
