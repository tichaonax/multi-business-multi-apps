/**
 * Generate (or extend) the shared HTTPS certificate used by every LAN app
 * server — see certs/README.md for the full deployment story. All servers
 * share ONE mkcert-issued certificate covering all their IPs, signed by one
 * root CA that every client machine trusts once (setup-ssl.bat). Adding a
 * server means adding its IP to the certificate's SAN list and redistributing
 * the regenerated cert+key to that server — existing servers are unaffected
 * and never need to change.
 *
 * Usage:
 *   node scripts/generate-server-cert.js                  Regenerate from the current list in lan-server-ips.json
 *   node scripts/generate-server-cert.js --add 192.168.1.213   Add a new IP to the list, then regenerate
 *
 * Requires mkcert on PATH (or at C:\mkcert\mkcert.exe) with the SAME root CA
 * that issued the certificate already trusted on client machines — running
 * this on a machine with a different/fresh mkcert install would mint a cert
 * no existing client trusts yet, forcing setup-ssl.bat to be re-run everywhere.
 */

const { execSync, execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ipsFile = path.join(__dirname, 'lan-server-ips.json')
const certsDir = path.join(__dirname, '..', 'certs')

function findMkcert() {
  const candidates = ['mkcert', 'C:\\mkcert\\mkcert.exe']
  for (const bin of candidates) {
    try {
      execSync(`"${bin}" -version`, { stdio: 'pipe' })
      return bin
    } catch {
      // try next
    }
  }
  throw new Error(
    'mkcert not found.\n' +
    'Install it from https://github.com/FiloSottile/mkcert and run "mkcert -install" once, ' +
    'using the SAME machine/CAROOT that issued the certificate already trusted on client machines.'
  )
}

function loadIps() {
  const data = JSON.parse(fs.readFileSync(ipsFile, 'utf8'))
  return data.ips
}

function saveIps(ips) {
  const data = JSON.parse(fs.readFileSync(ipsFile, 'utf8'))
  data.ips = ips
  fs.writeFileSync(ipsFile, JSON.stringify(data, null, 2) + '\n')
}

// --add <ip>: append to the canonical list (idempotent) before regenerating.
const addIdx = process.argv.indexOf('--add')
if (addIdx !== -1) {
  const newIp = process.argv[addIdx + 1]
  if (!newIp) throw new Error('--add requires an IP, e.g. --add 192.168.1.213')
  const ips = loadIps()
  if (!ips.includes(newIp)) {
    ips.push(newIp)
    saveIps(ips)
    console.log(`Added ${newIp} to scripts/lan-server-ips.json`)
  } else {
    console.log(`${newIp} is already in scripts/lan-server-ips.json`)
  }
}

const ips = loadIps()
const names = [...ips, 'localhost', '127.0.0.1']

const mkcert = findMkcert()
console.log(`Using mkcert: ${mkcert}`)
console.log(`Generating certificate for: ${names.join(', ')}\n`)

if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true })
}

// Remove previously generated IP-based cert/key pairs so server.ts (which
// just picks the first *.pem / *-key.pem it finds) can't pick up a stale one
// alongside the new pair. Never touches qz-certificate.pem (a separate,
// unrelated QZ Tray signing cert), rootCA.pem, README.md, or setup-ssl.bat.
for (const file of fs.readdirSync(certsDir)) {
  if (file === 'qz-certificate.pem' || file === 'rootCA.pem' || file === 'README.md' || file === 'setup-ssl.bat') continue
  if (file.endsWith('.pem')) {
    console.log(`Removing stale cert file: certs/${file}`)
    fs.unlinkSync(path.join(certsDir, file))
  }
}

execFileSync(mkcert, names, { cwd: certsDir, stdio: 'inherit' })

// mkcert also writes its own copy of rootCA.pem's issuer info but not the
// file itself into cwd — copy the actual root CA public cert alongside so
// certs/ is self-contained for distributing to a brand-new server.
const carootOut = execSync(`"${mkcert}" -CAROOT`).toString().trim()
fs.copyFileSync(path.join(carootOut, 'rootCA.pem'), path.join(certsDir, 'rootCA.pem'))

const generated = fs.readdirSync(certsDir).filter((f) => f.endsWith('.pem') && !f.includes('-key') && f !== 'rootCA.pem' && f !== 'qz-certificate.pem')
console.log(`\nGenerated: certs/${generated[0]}`)
console.log(`           certs/${generated[0].replace('.pem', '-key.pem')}`)
console.log('\nNext steps:')
console.log('  - Existing servers already covered keep working — no action needed.')
console.log('  - A NEW server needs: the whole certs/ folder copied to its app root, then restart the service.')
console.log('  - A NEW client machine needs: setup-ssl.bat + rootCA.pem run once (see certs/README.md).')
