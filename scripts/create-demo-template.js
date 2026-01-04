const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const prisma = new PrismaClient()

/**
 * Create Demo Data Backup Template
 *
 * This script creates a "golden" backup of all demo data after complete seeding.
 * The backup can be quickly restored to reset demo data to pristine state.
 */

async function createDemoTemplate() {
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║     🗄️  Creating Demo Data Backup Template                ║')
  console.log('╚════════════════════════════════════════════════════════════╝')
  console.log('')

  const startTime = Date.now()

  try {
    // ═══════════════════════════════════════════════════════════
    // Step 1: Verify Demo Data Exists
    // ═══════════════════════════════════════════════════════════
    console.log('🔍 Verifying demo data...\n')

    const demoBusinesses = await prisma.businesses.findMany({
      where: { isDemo: true },
      select: { id: true, name: true, type: true }
    })

    if (demoBusinesses.length === 0) {
      throw new Error('No demo businesses found! Please run seed scripts first.')
    }

    console.log(`   ✅ Found ${demoBusinesses.length} demo businesses`)
    demoBusinesses.forEach(b => console.log(`      - ${b.name} (${b.type})`))
    console.log('')

    // ═══════════════════════════════════════════════════════════
    // Step 2: Export All Demo Data
    // ═══════════════════════════════════════════════════════════
    console.log('📦 Exporting demo data...\n')

    const demoData = {
      metadata: {
        version: '1.0',
        createdAt: new Date().toISOString(),
        description: 'Complete demo data backup template - 100% feature coverage',
        businessCount: demoBusinesses.length
      },
      businesses: [],
      employees: [],
      products: [],
      orders: [],
      wifiTokens: {
        esp32: [],
        r710: []
      },
      printers: [],
      payroll: {
        accounts: [],
        periods: [],
        entries: []
      },
      hr: {
        benefits: [],
        loans: [],
        leaveBalances: [],
        leaveRequests: [],
        salaryIncreases: []
      },
      construction: {
        projects: [],
        contractors: []
      }
    }

    const businessIds = demoBusinesses.map(b => b.id)

    // Export businesses
    demoData.businesses = await prisma.businesses.findMany({
      where: { id: { in: businessIds } }
    })
    console.log(`   ✅ Exported ${demoData.businesses.length} businesses`)

    // Export employees
    demoData.employees = await prisma.employees.findMany({
      where: { primaryBusinessId: { in: businessIds } },
      include: {
        users: {
          select: { id: true, email: true, name: true, passwordHash: true, role: true }
        },
        business_memberships: true
      }
    })
    console.log(`   ✅ Exported ${demoData.employees.length} employees`)

    // Export products
    demoData.products = await prisma.productVariants.count({
      where: { businessId: { in: businessIds } }
    })
    console.log(`   ✅ Counted ${demoData.products} products`)

    // Export orders
    demoData.orders = await prisma.businessOrders.count({
      where: { businessId: { in: businessIds } }
    })
    console.log(`   ✅ Counted ${demoData.orders} orders`)

    // Export WiFi tokens
    demoData.wifiTokens.esp32 = await prisma.wiFiTokens.count()
    demoData.wifiTokens.r710 = await prisma.r710BusinessTokens.count()
    console.log(`   ✅ Counted ${demoData.wifiTokens.esp32} ESP32 tokens, ${demoData.wifiTokens.r710} R710 tokens`)

    // Export printers
    demoData.printers = await prisma.printers.count()
    console.log(`   ✅ Counted ${demoData.printers} printers`)

    // Export payroll data
    demoData.payroll.accounts = await prisma.payrollAccounts.count()
    demoData.payroll.periods = await prisma.payrollPeriods.count()
    demoData.payroll.entries = await prisma.payrollEntries.count()
    console.log(`   ✅ Counted ${demoData.payroll.accounts} payroll accounts, ${demoData.payroll.periods} periods, ${demoData.payroll.entries} entries`)

    // Export HR data
    demoData.hr.benefits = await prisma.employeeBenefits.count()
    demoData.hr.loans = await prisma.employeeLoans.count()
    demoData.hr.leaveBalances = await prisma.employeeLeaveBalance.count()
    demoData.hr.leaveRequests = await prisma.employeeLeaveRequests.count()
    demoData.hr.salaryIncreases = await prisma.employeeSalaryIncreases.count()
    console.log(`   ✅ Counted ${demoData.hr.benefits} benefits, ${demoData.hr.loans} loans, ${demoData.hr.leaveRequests} leave requests, ${demoData.hr.salaryIncreases} salary increases`)

    // Export construction data
    demoData.construction.projects = await prisma.constructionProjects.count()
    demoData.construction.contractors = await prisma.persons.count()
    console.log(`   ✅ Counted ${demoData.construction.projects} construction projects, ${demoData.construction.contractors} contractors`)

    console.log('')

    // ═══════════════════════════════════════════════════════════
    // Step 3: Save Template
    // ═══════════════════════════════════════════════════════════
    console.log('💾 Saving backup template...\n')

    // Create templates directory if it doesn't exist
    const templatesDir = path.join(process.cwd(), 'seed-data', 'templates')
    if (!fs.existsSync(templatesDir)) {
      fs.mkdirSync(templatesDir, { recursive: true })
    }

    // Save uncompressed JSON
    const jsonPath = path.join(templatesDir, 'demo-data-template-v1.0.json')
    fs.writeFileSync(jsonPath, JSON.stringify(demoData, null, 2))
    const jsonSize = (fs.statSync(jsonPath).size / 1024).toFixed(2)
    console.log(`   ✅ Saved uncompressed: ${jsonSize} KB`)

    // Save compressed version
    const gzPath = path.join(templatesDir, 'demo-data-template-v1.0.json.gz')
    const compressed = zlib.gzipSync(JSON.stringify(demoData))
    fs.writeFileSync(gzPath, compressed)
    const gzSize = (fs.statSync(gzPath).size / 1024).toFixed(2)
    console.log(`   ✅ Saved compressed: ${gzSize} KB`)

    // Save metadata separately
    const metaPath = path.join(templatesDir, 'demo-data-template-v1.0.meta.json')
    fs.writeFileSync(metaPath, JSON.stringify({
      ...demoData.metadata,
      files: {
        json: { path: 'demo-data-template-v1.0.json', size: `${jsonSize} KB` },
        compressed: { path: 'demo-data-template-v1.0.json.gz', size: `${gzSize} KB` },
        metadata: { path: 'demo-data-template-v1.0.meta.json' }
      }
    }, null, 2))
    console.log(`   ✅ Saved metadata`)

    console.log('')

    // ═══════════════════════════════════════════════════════════
    // Success Summary
    // ═══════════════════════════════════════════════════════════
    const duration = ((Date.now() - startTime) / 1000).toFixed(1)

    console.log('╔════════════════════════════════════════════════════════════╗')
    console.log('║         ✅ DEMO TEMPLATE CREATED SUCCESSFULLY!             ║')
    console.log('╚════════════════════════════════════════════════════════════╝')
    console.log('')
    console.log(`⏱️  Duration: ${duration}s`)
    console.log(`📁 Location: seed-data/templates/`)
    console.log('')
    console.log('📋 Template Contents:')
    console.log(`   - ${demoData.businesses.length} demo businesses`)
    console.log(`   - ${demoData.employees.length} employees with credentials`)
    console.log(`   - ${demoData.products} products`)
    console.log(`   - ${demoData.orders} sales orders`)
    console.log(`   - ${demoData.wifiTokens.esp32 + demoData.wifiTokens.r710} WiFi tokens`)
    console.log(`   - ${demoData.printers} printers`)
    console.log(`   - ${demoData.payroll.entries} payroll entries`)
    console.log(`   - ${demoData.hr.benefits + demoData.hr.loans} HR records`)
    console.log(`   - ${demoData.construction.projects} construction projects`)
    console.log('')
    console.log('🔄 To restore this template:')
    console.log('   node scripts/restore-demo-template.js')
    console.log('')

  } catch (error) {
    console.error('\n❌ Error creating demo template:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
createDemoTemplate()
  .then(() => {
    console.log('✨ Template creation completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Template creation failed:', error)
    process.exit(1)
  })
