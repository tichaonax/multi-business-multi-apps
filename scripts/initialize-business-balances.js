#!/usr/bin/env node

/**
 * Business Balance Initialization Script
 *
 * This script initializes business accounts with starting balances for existing businesses.
 * It's safe to run multiple times - will skip businesses that already have accounts.
 *
 * Usage:
 *   node scripts/initialize-business-balances.js
 *   node scripts/initialize-business-balances.js --default-balance 10000
 *   node scripts/initialize-business-balances.js --business-id <id> --balance 5000
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Default starting balance for businesses (can be overridden)
const DEFAULT_BALANCE = 1000.00

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    defaultBalance: DEFAULT_BALANCE,
    businessId: null,
    balance: null,
    help: false,
    dryRun: false
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--default-balance':
        options.defaultBalance = parseFloat(args[++i]) || DEFAULT_BALANCE
        break
      case '--business-id':
        options.businessId = args[++i]
        break
      case '--balance':
        options.balance = parseFloat(args[++i])
        break
      case '--dry-run':
        options.dryRun = true
        break
      case '--help':
      case '-h':
        options.help = true
        break
    }
  }

  return options
}

// Display help information
function showHelp() {
  console.log(`
Business Balance Initialization Script

Usage:
  node scripts/initialize-business-balances.js [options]

Options:
  --default-balance <amount>  Default starting balance for all businesses (default: ${DEFAULT_BALANCE})
  --business-id <id>          Initialize specific business by ID
  --balance <amount>          Balance for specific business (use with --business-id)
  --dry-run                   Show what would be done without making changes
  --help, -h                  Show this help message

Examples:
  # Initialize all businesses with default balance
  node scripts/initialize-business-balances.js

  # Initialize all businesses with $5000 starting balance
  node scripts/initialize-business-balances.js --default-balance 5000

  # Initialize specific business with custom balance
  node scripts/initialize-business-balances.js --business-id abc123 --balance 2500

  # Dry run to see what would be done
  node scripts/initialize-business-balances.js --dry-run
`)
}

// Initialize business account with starting balance
async function initializeBusinessAccount(businessId, balance, createdBy, dryRun = false) {
  try {
    // Check if account already exists
    const existing = await prisma.businessAccount.findUnique({
      where: { businessId }
    })

    if (existing) {
      console.log(`✓ Business ${businessId} already has account with balance $${Number(existing.balance).toFixed(2)}`)
      return { success: true, skipped: true, balance: Number(existing.balance) }
    }

    if (dryRun) {
      console.log(`[DRY RUN] Would create account for business ${businessId} with balance $${balance.toFixed(2)}`)
      return { success: true, dryRun: true }
    }

    // Create new account
    const account = await prisma.businessAccount.create({
      data: {
        businessId,
        balance: balance,
        createdBy
      }
    })

    // Create initial transaction if balance > 0
    if (balance > 0) {
      await prisma.businessTransaction.create({
        data: {
          businessId,
          amount: balance,
          type: 'deposit',
          description: 'Initial account setup - System initialization',
          balanceAfter: balance,
          createdBy,
          notes: 'Account initialization via script'
        }
      })
    }

    console.log(`✓ Created account for business ${businessId} with balance $${balance.toFixed(2)}`)
    return { success: true, created: true, balance }

  } catch (error) {
    console.error(`✗ Error initializing account for business ${businessId}:`, error.message)
    return { success: false, error: error.message }
  }
}

// Get system admin user for audit trail
async function getSystemAdminUser() {
  const adminUser = await prisma.users.findFirst({
    where: {
      OR: [
        { role: 'admin' },
        { email: 'admin@business.local' }
      ],
      isActive: true
    },
    select: { id: true, name: true, email: true }
  })

  if (!adminUser) {
    throw new Error('No admin user found. Please create an admin user first using: npm run create-admin')
  }

  return adminUser
}

// Main execution function
async function main() {
  const options = parseArgs()

  if (options.help) {
    showHelp()
    return
  }

  console.log('🏦 Business Balance Initialization Script')
  console.log('=========================================')

  if (options.dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made')
  }

  try {
    // Get admin user for audit trail
    const adminUser = await getSystemAdminUser()
    console.log(`📝 Using admin user: ${adminUser.name} (${adminUser.email})`)

    let results = {
      total: 0,
      created: 0,
      skipped: 0,
      errors: 0,
      totalBalance: 0
    }

    if (options.businessId) {
      // Initialize specific business
      console.log(`\n🎯 Initializing specific business: ${options.businessId}`)

      const business = await prisma.businesses.findUnique({
        where: { id: options.businessId },
        select: { id: true, name: true, type: true }
      })

      if (!business) {
        console.error(`✗ Business with ID ${options.businessId} not found`)
        process.exit(1)
      }

      const balance = options.balance || options.defaultBalance
      console.log(`📋 Business: ${business.name} (${business.type})`)

      const result = await initializeBusinessAccount(
        business.id,
        balance,
        adminUser.id,
        options.dryRun
      )

      if (result.success) {
        results.total = 1
        if (result.created) results.created = 1
        if (result.skipped) results.skipped = 1
        if (!result.dryRun && !result.skipped) results.totalBalance = balance
      } else {
        results.errors = 1
      }

    } else {
      // Initialize all businesses
      console.log(`\n🏢 Finding all active businesses...`)

      const businesses = await prisma.businesses.findMany({
        where: { isActive: true },
        select: { id: true, name: true, type: true },
        orderBy: { name: 'asc' }
      })

      console.log(`📊 Found ${businesses.length} active businesses`)
      console.log(`💰 Default balance: $${options.defaultBalance.toFixed(2)}`)

      if (businesses.length === 0) {
        console.log('ℹ️  No businesses found to initialize')
        return
      }

      console.log('\n🚀 Initializing business accounts...')

      for (const business of businesses) {
        console.log(`\n📋 Processing: ${business.name} (${business.type})`)

        const result = await initializeBusinessAccount(
          business.id,
          options.defaultBalance,
          adminUser.id,
          options.dryRun
        )

        results.total++
        if (result.success) {
          if (result.created) {
            results.created++
            if (!result.dryRun) results.totalBalance += options.defaultBalance
          }
          if (result.skipped) results.skipped++
        } else {
          results.errors++
        }

        // Small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    // Summary
    console.log('\n📈 Initialization Summary')
    console.log('========================')
    console.log(`Total businesses processed: ${results.total}`)
    console.log(`✓ Accounts created: ${results.created}`)
    console.log(`- Already existed: ${results.skipped}`)
    console.log(`✗ Errors: ${results.errors}`)

    if (!options.dryRun && results.created > 0) {
      console.log(`💵 Total balance allocated: $${results.totalBalance.toFixed(2)}`)
    }

    if (options.dryRun) {
      console.log('\n💡 Run without --dry-run to actually create the accounts')
    } else if (results.created > 0) {
      console.log('\n✅ Business balance initialization completed successfully!')
      console.log('💡 Businesses can now create loans and make payments with balance validation')
    }

  } catch (error) {
    console.error('\n💥 Script execution failed:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Handle script interruption
process.on('SIGINT', async () => {
  console.log('\n\n⚠️  Script interrupted by user')
  await prisma.$disconnect()
  process.exit(0)
})

// Execute main function
main().catch(async (error) => {
  console.error('💥 Unhandled error:', error)
  await prisma.$disconnect()
  process.exit(1)
})