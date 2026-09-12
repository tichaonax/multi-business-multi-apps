#!/usr/bin/env node
/**
 * Resolve a stuck/failed Prisma migration (P3018 and similar) by marking it
 * rolled-back or applied, loading DATABASE_URL from .env.local first — the
 * raw `npx prisma ...` CLI only reads `.env` by default, never `.env.local`
 * (see PRISMA_GUIDE.md), which is why running `prisma migrate resolve`
 * directly fails with "Environment variable not found: DATABASE_URL".
 *
 * Usage:
 *   npm run db:rollback <migration-name>             # marks --rolled-back (default)
 *   npm run db:rollback <migration-name> --applied    # marks --applied instead
 * (npm7+ forwards plain trailing args automatically; add `--` before them
 * yourself if your npm version needs it: npm run db:rollback -- <name>)
 */
require('dotenv').config({ path: '.env.local' })
const { execSync } = require('child_process')

const args = process.argv.slice(2)
const migrationName = args.find(a => !a.startsWith('--'))
const mode = args.includes('--applied') ? '--applied' : '--rolled-back'

if (!migrationName) {
  console.error('Usage: npm run db:rollback <migration-name> [--applied]')
  console.error('Example: npm run db:rollback 20260326000001_education_subcategories')
  process.exit(1)
}

console.log(`Resolving migration "${migrationName}" as ${mode}...`)
execSync(`npx prisma migrate resolve ${mode} ${migrationName}`, { stdio: 'inherit', env: process.env })
