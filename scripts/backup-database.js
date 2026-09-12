#!/usr/bin/env node
/**
 * Raw pg_dump safety-net backup, used before migrations/deploys (see
 * docs/TECHNICAL-DEPLOYMENT-GUIDE.md's go-live checklist). Not the app's
 * structured JSON backup feature — that's the admin UI, backed by
 * src/app/api/backup/route.ts.
 *
 * `npm run backup:database` was referenced in docs for a long time before
 * this file existed - loads DATABASE_URL from .env.local (raw pg_dump has no
 * concept of .env files) rather than the old scripts/backup-database.bat's
 * hardcoded postgres/postgres credentials, which silently produced an empty
 * dump on any server using a different password.
 */
require('dotenv').config({ path: '.env.local' })
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('DATABASE_URL not found in .env.local')
  process.exit(1)
}

const backupsDir = path.join(process.cwd(), 'backups')
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true })
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
const outFile = path.join(backupsDir, `database-backup_${timestamp}.sql`)

const pgDumpCandidates = [
  'pg_dump',
  'C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe',
]
const pgDump = pgDumpCandidates.find(cmd => {
  try {
    execSync(`where "${cmd}"`, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}) || pgDumpCandidates[1]

console.log(`Backing up database to ${outFile} ...`)
execSync(`"${pgDump}" "${databaseUrl}" -f "${outFile}"`, { stdio: 'inherit' })
console.log('Backup complete.')
