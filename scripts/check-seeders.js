#!/usr/bin/env node
/**
 * Non-destructive seeder verification
 * - Confirms `production-setup.js` exports the expected seeder functions
 * - Runs safe `.count()` checks against Prisma models referenced by the seeders
 *
 * Usage:
 *   node scripts/check-seeders.js
 *
 * This script does NOT modify the database.
 */

const path = require('path')
const { PrismaClient } = require('@prisma/client')

async function main() {
  console.log('\n🔎 Seeder verification starting...')

  let setup
  try {
    setup = require(path.join(__dirname, 'production-setup'))
  } catch (err) {
    console.error('❌ Failed to require production-setup.js:', err.message)
    process.exit(2)
  }

  const expectedExports = [
    'runProductionSetup',
    'seedIdFormatTemplates',
    'seedPhoneNumberTemplates',
    'seedDateFormatTemplates',
    'seedDriverLicenseTemplates',
    'seedJobTitles',
    'seedCompensationTypes',
    'seedBenefitTypes',
    'seedProjectTypes',
    'seedDefaultPersonalCategories'
  ]

  console.log('✓ production-setup.js exports available keys:')
  console.log('  ', Object.keys(setup).sort())

  // Validate expected exports
  for (const key of expectedExports) {
    const ok = typeof setup[key] === 'function'
    console.log(`${ok ? '✔' : '✖'} ${key} ${ok ? '' : '- MISSING or not a function'}`)
  }

  // Parse optional --remap CLI flag to align model names
  const argv = process.argv.slice(2)
  let remap = {}
  const remapIndex = argv.findIndex(a => a === '--remap')
  if (remapIndex !== -1 && argv[remapIndex + 1]) {
    try { remap = JSON.parse(argv[remapIndex + 1]) } catch (e) { console.warn('Failed to parse --remap JSON, ignoring') }
  }

  // Default internal remaps for legacy seeder names
  const DEFAULT_MODEL_REMAP = {
    phoneNumberTemplate: 'idFormatTemplate',
    dateFormatTemplate: 'idFormatTemplate',
    personalCategory: 'expenseCategory'
  }

  function resolveModelName(modelName) {
    if (remap && remap[modelName]) return remap[modelName]
    if (DEFAULT_MODEL_REMAP[modelName]) return DEFAULT_MODEL_REMAP[modelName]
    return modelName
  }

  // Now run non-destructive model checks via Prisma
  const prisma = new PrismaClient()

  // Map model names to friendly labels
  const checks = [
    { model: 'idFormatTemplate', label: 'ID Format Templates' },
    { model: 'phoneNumberTemplate', label: 'Phone Number Templates' },
    { model: 'dateFormatTemplate', label: 'Date Format Templates' },
    { model: 'driverLicenseTemplate', label: 'Driver License Templates' },
    { model: 'jobTitle', label: 'Job Titles' },
    { model: 'compensationType', label: 'Compensation Types' },
    { model: 'benefitType', label: 'Benefit Types' },
    { model: 'projectType', label: 'Project Types' },
    { model: 'personalCategory', label: 'Personal Categories' },
    { model: 'user', label: 'Users' }
  ]

  try {
    await prisma.$connect()
  } catch (err) {
    console.error('❌ Could not connect to database. Ensure DATABASE_URL is set and reachable.')
    console.error('   Connection error:', err.message)
    process.exitCode = 3
    try { await prisma.$disconnect() } catch(e){}
    return
  }

  console.log('\n🔬 Running non-destructive Prisma model checks (counts)')

  for (const chk of checks) {
    try {
      const resolved = resolveModelName(chk.model)
      if (typeof prisma[resolved] === 'undefined') {
        console.log(`✖ ${chk.label}: model not found on Prisma client (prisma.${resolved} is undefined)`)
        continue
      }

      const count = await prisma[resolved].count()
      console.log(`✔ ${chk.label}: accessible — current count = ${count} (prisma.${resolved})`)
    } catch (err) {
      console.log(`✖ ${chk.label}: Prisma error — ${err.message}`)
    }
  }

  await prisma.$disconnect()

  console.log('\n✅ Seeder verification completed (non-destructive)')
}

main().catch((err) => {
  console.error('Unhandled error in check-seeders:', err)
  process.exit(1)
})
