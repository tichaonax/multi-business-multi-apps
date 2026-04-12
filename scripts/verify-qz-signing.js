/**
 * Diagnostic: verify QZ Tray signing works correctly
 * Run: node scripts/verify-qz-signing.js
 *
 * Uses the same toSign value QZ Tray sent (from browser Network tab)
 */

require('dotenv').config({ path: '.env.local' })
const { createSign, createVerify } = require('crypto')

const privateKeyB64 = process.env.QZ_PRIVATE_KEY
const certB64 = process.env.QZ_CERTIFICATE

if (!privateKeyB64 || !certB64) {
  console.error('❌ QZ_PRIVATE_KEY or QZ_CERTIFICATE not found in .env.local')
  process.exit(1)
}

const privateKey = Buffer.from(privateKeyB64, 'base64').toString('utf8')
const cert = Buffer.from(certB64, 'base64').toString('utf8')

// Use the actual toSign value from the browser Network tab
const toSign = '118d1070ba76875d77199101130debb62381745cdf32e5681b57d2c6f30754af'

console.log('Private key starts with:', privateKey.split('\n')[0])
console.log('Cert starts with:', cert.split('\n')[0])
console.log('Signing:', toSign)
console.log()

try {
  // Sign exactly as the API route does
  const sign = createSign('SHA512')
  sign.update(toSign, 'utf8')
  const signature = sign.sign(privateKey, 'base64')
  console.log('✅ Signature generated:', signature.substring(0, 40) + '...')

  // Verify using the certificate (same as QZ Tray Java would do)
  const verify = createVerify('SHA512')
  verify.update(toSign, 'utf8')
  const valid = verify.verify(cert, signature, 'base64')

  if (valid) {
    console.log('✅ Signature VALID — signing implementation is correct')
    console.log('   Issue is on QZ Tray side (cert mismatch or QZ Tray version quirk)')
  } else {
    console.log('❌ Signature INVALID — private key does not match certificate')
    console.log('   Re-run: npm run qz:generate-cert and update .env.local')
  }
} catch (err) {
  console.error('❌ Error during signing:', err.message)
  console.log('   Private key may be corrupted or truncated in .env.local')
}
