import { createSign } from 'crypto'
import { NextResponse } from 'next/server'

/**
 * POST /api/qz/sign
 * Signs a QZ Tray challenge string with the app's private key.
 * Called by the browser whenever QZ Tray requests a signature.
 */
export async function POST(req: Request) {
  try {
    // Read as plain text to preserve the exact toSign value QZ Tray expects
    const toSign = await req.text()

    const privateKeyB64 = process.env.QZ_PRIVATE_KEY
    if (!privateKeyB64) {
      // No private key configured — fall back to unsigned mode
      return NextResponse.json({ signature: '' })
    }

    const privateKey = Buffer.from(privateKeyB64, 'base64').toString('utf8')
    const sign = createSign('SHA512')
    sign.update(toSign, 'utf8')
    const signature = sign.sign(privateKey, 'base64')

    return NextResponse.json({ signature })
  } catch {
    return NextResponse.json({ signature: '' })
  }
}
