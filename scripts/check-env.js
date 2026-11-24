#!/usr/bin/env node
/**
 * MBM-341 — check a server's .env.local before installing or starting.
 *
 *   node scripts/check-env.js                 # .env.local here
 *   node scripts/check-env.js --file D:\MBM\shared\.env.local --server
 *
 * Prints OK / WARN / FAIL per setting, by NAME only: it never prints a value
 * (safe to run over SSH and paste anywhere). Exit 1 when anything FAILs.
 * --server also expects production settings (NODE_ENV=production).
 */
const fs = require('fs')
const path = require('path')

const i = process.argv.indexOf('--file')
const file = path.resolve(i > 0 ? process.argv[i + 1] : path.join(process.cwd(), '.env.local'))
const server = process.argv.includes('--server')

const lines = []
let fails = 0
const ok = (k, t) => lines.push(`  OK    ${k}${t ? ': ' + t : ''}`)
const warn = (k, t) => lines.push(`  WARN  ${k}: ${t}`)
const fail = (k, t) => { fails++; lines.push(`  FAIL  ${k}: ${t}`) }

if (!fs.existsSync(file)) {
  console.log(`  FAIL  ${file} is missing`)
  process.exit(1)
}

// Parse KEY=value (quotes stripped); later lines win, as dotenv
const env = {}
for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
  const m = raw.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
  if (!m) continue
  env[m[1]] = m[2].trim().replace(/^(['"])(.*)\1$/, '$2')
}
const has = k => typeof env[k] === 'string' && env[k] !== ''
const placeholder = v => /change[-_ ]?me|your[-_ ]|example|placeholder|xxx/i.test(v)

console.log(`Settings in ${file}`)

// Required
if (!has('DATABASE_URL')) fail('DATABASE_URL', 'missing')
else if (!/^postgres(ql)?:\/\//.test(env.DATABASE_URL)) fail('DATABASE_URL', 'not a postgresql:// address')
else ok('DATABASE_URL', 'postgresql')

if (!has('NEXTAUTH_SECRET')) fail('NEXTAUTH_SECRET', 'missing')
else if (env.NEXTAUTH_SECRET.length < 32 || placeholder(env.NEXTAUTH_SECRET)) fail('NEXTAUTH_SECRET', 'too short or a placeholder (32+ random characters)')
else ok('NEXTAUTH_SECRET')

if (!has('ENCRYPTION_KEY')) fail('ENCRYPTION_KEY', 'missing (64 hex characters)')
else if (!/^[0-9a-fA-F]{64}$/.test(env.ENCRYPTION_KEY)) fail('ENCRYPTION_KEY', 'must be exactly 64 hex characters')
else ok('ENCRYPTION_KEY')

// Production
if (server) {
  if (env.NODE_ENV !== 'production') fail('NODE_ENV', 'must be production on a server')
  else ok('NODE_ENV', 'production')
}
if (has('PORT') && !/^\d+$/.test(env.PORT)) fail('PORT', 'not a number')
else ok('PORT', has('PORT') ? env.PORT : '8080 (default)')

// Optional, with a reason when left out
if (has('QZ_PRIVATE_KEY') !== has('QZ_CERTIFICATE')) fail('QZ_PRIVATE_KEY / QZ_CERTIFICATE', 'set both or neither')
else if (!has('QZ_PRIVATE_KEY')) warn('QZ_PRIVATE_KEY / QZ_CERTIFICATE', 'not set: QZ Tray printing uses its demo certificate (npm run qz:generate-cert)')
else ok('QZ_PRIVATE_KEY / QZ_CERTIFICATE')

if (env.AUTH_TRUST_HOST === 'true') ok('AUTH_TRUST_HOST', 'true (sign-in at any of this server’s addresses: tailnet name, IP, localhost)')
else if (has('NEXTAUTH_URL')) warn('NEXTAUTH_URL', 'sign-in only at that address. AUTH_TRUST_HOST=true allows the tailnet name and the IP both (04-configure.ps1 sets it)')
if (env.FORCE_HTTPS === 'true') ok('FORCE_HTTPS', 'true (certificates needed)')

console.log(lines.join('\n'))
console.log(fails ? `\n  STOP  ${fails} setting(s) to fix` : '\n  Settings OK')
process.exit(fails ? 1 : 0)
