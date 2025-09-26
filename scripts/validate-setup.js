#!/usr/bin/env node

/**
 * Production Setup Validation Script
 *
 * This script validates that the production setup completed successfully
 * and all required data is present in the database.
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Console colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

function log(message, color = colors.cyan) {
  console.log(`${color}${message}${colors.reset}`)
}

function success(message) {
  log(`✅ ${message}`, colors.green)
}

function warning(message) {
  log(`⚠️ ${message}`, colors.yellow)
}

function error(message) {
  log(`❌ ${message}`, colors.red)
}

async function validateDatabaseTables(remap = {}) {
  log('\n🔍 Validating database tables...', colors.blue)

  const checks = [
    { name: 'Users', model: 'user' },
    { name: 'ID Format Templates', model: 'idFormatTemplate' },
    { name: 'Phone Number Templates', model: 'phoneNumberTemplate' },
    { name: 'Date Format Templates', model: 'dateFormatTemplate' },
    { name: 'Driver License Templates', model: 'driverLicenseTemplate' },
    { name: 'Job Titles', model: 'jobTitle' },
    { name: 'Compensation Types', model: 'compensationType' },
    { name: 'Benefit Types', model: 'benefitType' },
    { name: 'Project Types', model: 'projectType' },
    { name: 'Personal Categories', model: 'personalCategory' }
  ]

  let allValid = true

  // Helper to resolve remaps (user-supplied then defaults)
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

  for (const check of checks) {
    try {
      const resolved = resolveModelName(check.model)
      if (typeof prisma[resolved] === 'undefined') {
        error(`  ${check.name}: Model not found on Prisma client (prisma.${resolved} is undefined)`)
        allValid = false
        continue
      }
      const count = await prisma[resolved].count()
      if (count > 0) {
        success(`  ${check.name}: ${count} records (prisma.${resolved})`)
      } else {
        error(`  ${check.name}: No records found (prisma.${resolved})`)
        allValid = false
      }
    } catch (err) {
      error(`  ${check.name}: Error - ${err.message}`)
      allValid = false
    }
  }

  return allValid
}

async function validateSystemAdmin() {
  log('\n👤 Validating system administrator...', colors.blue)

  try {
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@business.local' }
    })

    if (admin) {
      success('  System administrator account exists')

      if (admin.role === 'admin') {
        success('  Administrator has correct role')
      } else {
        warning(`  Administrator role is '${admin.role}', expected 'admin'`)
      }

      if (admin.isActive) {
        success('  Administrator account is active')
      } else {
        error('  Administrator account is inactive')
        return false
      }

      return true
    } else {
      error('  System administrator account not found')
      return false
    }
  } catch (err) {
    error(`  Error checking administrator: ${err.message}`)
    return false
  }
}

async function validateReferenceData() {
  log('\n📋 Validating reference data quality...', colors.blue)

  try {
    // Check ID templates have required fields
    const idTemplates = await prisma.idFormatTemplate.findMany()
    if (idTemplates.every(t => t.countryCode && t.format && t.example)) {
      success('  ID format templates have all required fields')
    } else {
      warning('  Some ID format templates are missing required fields')
    }

    // Check phone templates have required fields
    const phoneTemplates = await prisma.phoneNumberTemplate.findMany()
    if (phoneTemplates.every(t => t.countryCode && t.callingCode && t.format)) {
      success('  Phone number templates have all required fields')
    } else {
      warning('  Some phone number templates are missing required fields')
    }

    // Check project types cover all business types
    const projectTypes = await prisma.projectType.findMany()
    const businessTypes = ['personal', 'construction', 'restaurant', 'grocery', 'clothing', 'hardware']
    const missingBusinessTypes = businessTypes.filter(bt =>
      !projectTypes.some(pt => pt.businessType === bt)
    )

    if (missingBusinessTypes.length === 0) {
      success('  Project types exist for all business types')
    } else {
      warning(`  Missing project types for: ${missingBusinessTypes.join(', ')}`)
    }

    return true
  } catch (err) {
    error(`  Error validating reference data: ${err.message}`)
    return false
  }
}

async function validateDatabaseConnection() {
  log('\n🔌 Testing database connection...', colors.blue)

  try {
    await prisma.$connect()
    success('  Database connection successful')

    // Test a simple query
    await prisma.$queryRaw`SELECT 1 as test`
    success('  Database queries working')

    return true
  } catch (err) {
    error(`  Database connection failed: ${err.message}`)
    return false
  }
}

async function showSetupSummary() {
  log('\n📊 Setup Summary:', colors.blue)

  try {
    const counts = {
      users: await prisma.user.count(),
      idTemplates: await prisma.idFormatTemplate.count(),
      phoneTemplates: await prisma.phoneNumberTemplate.count(),
      dateTemplates: await prisma.dateFormatTemplate.count(),
      jobTitles: await prisma.jobTitle.count(),
      compensationTypes: await prisma.compensationType.count(),
      benefitTypes: await prisma.benefitType.count(),
      projectTypes: await prisma.projectType.count(),
      categories: await prisma.personalCategory.count()
    }

    log(`  • Users: ${counts.users}`)
    log(`  • ID Format Templates: ${counts.idTemplates}`)
    log(`  • Phone Number Templates: ${counts.phoneTemplates}`)
    log(`  • Date Format Templates: ${counts.dateTemplates}`)
    log(`  • Job Titles: ${counts.jobTitles}`)
    log(`  • Compensation Types: ${counts.compensationTypes}`)
    log(`  • Benefit Types: ${counts.benefitTypes}`)
    log(`  • Project Types: ${counts.projectTypes}`)
    log(`  • Personal Categories: ${counts.categories}`)

    const total = Object.values(counts).reduce((sum, count) => sum + count, 0)
    log(`  • Total Records: ${total}`)

  } catch (err) {
    error(`Error generating summary: ${err.message}`)
  }
}

async function main() {
  log('🚀 Multi-Business Management Platform - Setup Validation', colors.blue)
  log('='*60, colors.blue)

  let allChecksPass = true

  // Run all validation checks
  if (!await validateDatabaseConnection()) allChecksPass = false
  if (!await validateDatabaseTables()) allChecksPass = false
  if (!await validateSystemAdmin()) allChecksPass = false
  if (!await validateReferenceData()) allChecksPass = false

  // Show summary
  await showSetupSummary()

  // Final result
  if (allChecksPass) {
    log('\n🎉 VALIDATION SUCCESSFUL!', colors.green)
    log('='*60, colors.green)
    success('Your Multi-Business Management Platform is ready for production!')
    log('\nNext steps:')
    log('1. Start the application: npm run dev (development) or npm start (production)')
    log('2. Login with: admin@business.local / admin123')
    log('3. Change the default admin password immediately')
    log('4. Create your businesses and users')
  } else {
    log('\n❌ VALIDATION FAILED!', colors.red)
    log('='*60, colors.red)
    error('Some validation checks failed. Please review the errors above.')
    log('\nTo fix issues:')
    log('1. Check database connection and permissions')
    log('2. Re-run production setup: npm run setup:production')
    log('3. Check for any error messages during setup')
    process.exit(1)
  }
}

// Handle cleanup
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})

// Handle errors
process.on('unhandledRejection', async (reason, promise) => {
  error(`Unhandled rejection: ${reason}`)
  await prisma.$disconnect()
  process.exit(1)
})

// Run validation
main().catch(async (err) => {
  error(`Validation failed: ${err.message}`)
  await prisma.$disconnect()
  process.exit(1)
})