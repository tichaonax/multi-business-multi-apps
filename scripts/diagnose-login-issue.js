/**
 * READ-ONLY diagnostic for a login issue. Makes no changes to the database.
 *
 * Usage:
 *   node scripts/diagnose-login-issue.js <email>
 *
 * Example:
 *   node scripts/diagnose-login-issue.js tichaona@yahoo.com
 *
 * Run this on the machine/environment that has the PRODUCTION DATABASE_URL
 * set (e.g. via your production .env), so Prisma connects to the same DB
 * the production app uses.
 */
// Prisma auto-loads .env, but the real DB credentials live in .env.local —
// load it explicitly and override anything .env already set.
require('dotenv').config({ path: '.env.local', override: true })

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const rawInput = process.argv[2]

  if (!rawInput) {
    console.log('Usage: node scripts/diagnose-login-issue.js <email>')
    process.exit(1)
  }

  console.log('='.repeat(70))
  console.log('LOGIN DIAGNOSTIC (read-only — no data will be changed)')
  console.log('='.repeat(70))

  // Show which DB we're actually connected to (host/db name only, no credentials)
  const dbUrl = process.env.DATABASE_URL || '(not set)'
  const safeDbUrl = dbUrl.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')
  console.log(`\nDATABASE_URL in use: ${safeDbUrl}`)
  console.log(`NODE_ENV: ${process.env.NODE_ENV || '(not set)'}`)
  console.log(`NEXTAUTH_SECRET set: ${!!process.env.NEXTAUTH_SECRET}`)
  console.log(`NEXTAUTH_URL: ${process.env.NEXTAUTH_URL || '(not set)'}`)

  // 1. Exact match by email
  const exactByEmail = await prisma.users.findUnique({ where: { email: rawInput } })

  // 2. Exact match by username (login also tries this if email lookup fails)
  const exactByUsername = await prisma.users.findUnique({ where: { username: rawInput } })

  // 3. Case-insensitive / fuzzy search, to catch case or whitespace mismatches
  const fuzzyMatches = await prisma.users.findMany({
    where: {
      OR: [
        { email: { equals: rawInput, mode: 'insensitive' } },
        { username: { equals: rawInput, mode: 'insensitive' } },
      ],
    },
  })

  console.log('\n--- Lookup results ---')
  console.log(`Exact email match:    ${exactByEmail ? 'FOUND' : 'not found'}`)
  console.log(`Exact username match: ${exactByUsername ? 'FOUND' : 'not found'}`)
  console.log(`Case-insensitive matches: ${fuzzyMatches.length}`)

  const candidate = exactByEmail || exactByUsername || fuzzyMatches[0]

  if (!candidate) {
    console.log('\n❌ No user record matches this email/username at all (exact or case-insensitive).')
    console.log('   This means the account either does not exist in THIS database,')
    console.log('   or the app is pointed at a different database than you think.')

    // Show a few real emails from this DB so we can sanity-check we're in the right place
    const sample = await prisma.users.findMany({
      select: { email: true },
      take: 5,
      orderBy: { createdAt: 'desc' },
    })
    console.log('\nSample of emails that DO exist in this database (most recent 5):')
    sample.forEach((u) => console.log(`   - ${u.email}`))
    await prisma.$disconnect()
    return
  }

  console.log('\n--- Matched user record ---')
  console.log(`ID:              ${candidate.id}`)
  console.log(`Email (stored):  ${candidate.email}`)
  console.log(`Username (stored): ${candidate.username || '(none)'}`)
  console.log(`Name:            ${candidate.name || '(none)'}`)
  console.log(`Role:            ${candidate.role}`)
  console.log(`isActive:        ${candidate.isActive}`)
  console.log(`passwordResetRequired: ${candidate.passwordResetRequired ?? '(field not set)'}`)
  console.log(`createdAt:       ${candidate.createdAt}`)
  console.log(`updatedAt:       ${candidate.updatedAt}`)

  if (candidate.email !== rawInput) {
    console.log(`\n⚠️  Stored email "${candidate.email}" differs from what you typed "${rawInput}"`)
    console.log('    (different case or whitespace) — login uses an EXACT match, so this alone would cause login to fail.')
  }

  if (!candidate.passwordHash) {
    console.log('\n❌ passwordHash is EMPTY/NULL — this account has no password set at all (cannot log in with a password).')
  } else {
    console.log(`\npasswordHash present: yes (bcrypt hash, length ${candidate.passwordHash.length}, prefix "${candidate.passwordHash.slice(0, 7)}")`)
    const looksLikeBcrypt = /^\$2[aby]\$/.test(candidate.passwordHash)
    console.log(`Looks like a valid bcrypt hash: ${looksLikeBcrypt}`)
  }

  if (!candidate.isActive) {
    console.log('\n❌ isActive is FALSE — login is blocked at src/lib/auth.ts:100 regardless of password correctness.')
  }

  // Business memberships (not required for login itself, but useful context)
  const memberships = await prisma.businessMemberships.findMany({
    where: { userId: candidate.id },
    include: { businesses: { select: { name: true, type: true } } },
  })
  console.log(`\nBusiness memberships: ${memberships.length}`)
  memberships.forEach((m) => {
    console.log(`   - ${m.businesses?.name || '(unknown)'} | role=${m.role} | active=${m.isActive}`)
  })

  console.log('\n--- Summary ---')
  const problems = []
  if (candidate.email !== rawInput) problems.push('email/username casing or whitespace mismatch vs stored value')
  if (!candidate.passwordHash) problems.push('no password hash set')
  else if (!/^\$2[aby]\$/.test(candidate.passwordHash)) problems.push('passwordHash does not look like a valid bcrypt hash')
  if (!candidate.isActive) problems.push('account is inactive (isActive=false)')
  if (!exactByEmail && !exactByUsername) problems.push('no EXACT match by email or username (only case-insensitive) — login would fail on exact lookup')

  if (problems.length === 0) {
    console.log('✅ No structural issue found — account exists, is active, and has a valid-looking password hash.')
    console.log('   The most likely cause is simply an incorrect password being entered.')
    console.log('   Next step: use the in-app admin panel (/admin/users) to set a new password for this user.')
  } else {
    console.log('Issues found:')
    problems.forEach((p) => console.log(`   - ${p}`))
  }

  await prisma.$disconnect()
}

main().catch(async (err) => {
  console.error('❌ Diagnostic script failed:', err)
  await prisma.$disconnect()
  process.exit(1)
})
