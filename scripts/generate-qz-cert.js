/**
 * Generate QZ Tray signing certificate
 *
 * Run once: node scripts/generate-qz-cert.js
 *
 * Output:
 *   certs/qz-certificate.pem  — public cert (add to QZ Tray trusted list)
 *   Prints QZ_PRIVATE_KEY and QZ_CERTIFICATE env vars to add to .env.local
 *
 * Requires openssl in PATH (comes with Git for Windows).
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

function findOpenssl() {
  const candidates = [
    'openssl',
    'C:\\Program Files\\Git\\usr\\bin\\openssl.exe',
    'C:\\Program Files (x86)\\Git\\usr\\bin\\openssl.exe',
    'C:\\Windows\\System32\\OpenSSH\\openssl.exe',
  ]
  for (const bin of candidates) {
    try {
      execSync(`"${bin}" version`, { stdio: 'pipe' })
      return bin
    } catch {
      // try next
    }
  }
  throw new Error(
    'openssl not found.\n' +
    'Install Git for Windows (https://git-scm.com) or OpenSSL and ensure it is on your PATH.'
  )
}

const openssl = findOpenssl()
console.log(`Using openssl: ${openssl}\n`)

const certsDir = path.join(__dirname, '..', 'certs')
const tmpKeyFile = path.join(os.tmpdir(), 'qz-gen-key.pem')
const certFile = path.join(certsDir, 'qz-certificate.pem')

if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true })
}

// Generate RSA 2048 private key
execSync(`"${openssl}" genrsa -out "${tmpKeyFile}" 2048`, { stdio: 'inherit' })

// Generate self-signed certificate (10 year validity)
execSync(
  `"${openssl}" req -new -x509 -key "${tmpKeyFile}" -out "${certFile}" -days 3650 ` +
  `-subj "/CN=Multi-Business QZ Tray/O=Multi-Business/C=US"`,
  { stdio: 'inherit' }
)

const privateKey = fs.readFileSync(tmpKeyFile, 'utf8')
const cert = fs.readFileSync(certFile, 'utf8')

// Clean up temp private key file
fs.unlinkSync(tmpKeyFile)

const privateKeyB64 = Buffer.from(privateKey).toString('base64')
const certB64 = Buffer.from(cert).toString('base64')

console.log('\n✅ Certificate generated: certs/qz-certificate.pem')
console.log('\n─────────────────────────────────────────────────────────────')
console.log('Add these two lines to your .env.local:\n')
console.log(`QZ_PRIVATE_KEY=${privateKeyB64}`)
console.log(`QZ_CERTIFICATE=${certB64}`)
console.log('\n─────────────────────────────────────────────────────────────')
console.log('\nNext steps:')
console.log('  1. Copy the two lines above into .env.local')
console.log('  2. In QZ Tray: right-click tray icon → Advanced → Site Manager')
console.log('     → Add Certificate → select certs/qz-certificate.pem')
console.log('  3. Restart the service: npm run service:stop && npm run service:start')
console.log('  4. The popup will not appear again.\n')
