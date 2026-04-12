import { createSign } from 'crypto'

/**
 * POST /api/qz/sign
 * Signs a QZ Tray challenge string with the app's private key.
 * Called by the browser whenever QZ Tray requests a signature.
 */
export async function POST(req: Request) {
  try {
    const { request } = await req.json()

    const privateKeyB64 = process.env.QZ_PRIVATE_KEY
    if (!privateKeyB64) {
      return new Response('', { status: 200 })
    }

    const privateKey = Buffer.from(privateKeyB64, 'base64').toString('utf8')
    const sign = createSign('RSA-SHA512')
    sign.update(request)
    const signature = sign.sign(privateKey, 'base64')

    return new Response(signature, {
      headers: { 'Content-Type': 'text/plain' },
    })
  } catch {
    return new Response('', { status: 200 })
  }
}
