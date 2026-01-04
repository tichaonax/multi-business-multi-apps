const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function auditDemoData() {
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║           📊 DEMO DATA AUDIT REPORT                        ║')
  console.log('╚════════════════════════════════════════════════════════════╝')
  console.log('')

  try {
    // ═══════════════════════════════════════════════════════════
    // 1. Check for Demo Businesses
    // ═══════════════════════════════════════════════════════════
    console.log('1️⃣  DEMO BUSINESSES')
    console.log('═══════════════════════════════════════════════════════════')

    const allBusinesses = await prisma.businesses.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        isDemo: true,
        createdAt: true
      }
    })

    // Check multiple patterns for demo businesses
    const demoByName = allBusinesses.filter(b =>
      b.name.toLowerCase().includes('demo') ||
      b.name.includes('[Demo]')
    )

    const demoByIsDemo = allBusinesses.filter(b => b.isDemo === true)

    const demoById = allBusinesses.filter(b =>
      b.id.includes('-demo-business') ||
      b.id.endsWith('-demo') ||
      b.id.startsWith('demo-')
    )

    console.log(`Total Businesses: ${allBusinesses.length}`)
    console.log(`Demo by Name pattern: ${demoByName.length}`)
    console.log(`Demo by isDemo field: ${demoByIsDemo.length}`)
    console.log(`Demo by ID pattern: ${demoById.length}`)
    console.log('')

    if (demoByIsDemo.length > 0 || demoByName.length > 0 || demoById.length > 0) {
      console.log('✅ Demo Businesses Found:')
      const allDemos = [...new Set([...demoByIsDemo, ...demoByName, ...demoById])]
      allDemos.forEach(b => {
        console.log(`   - ${b.name} (${b.type || 'no type'}) - ${b.id}`)
        console.log(`     isDemo: ${b.isDemo || false}`)
      })
    } else {
      console.log('❌ NO DEMO BUSINESSES FOUND')
      console.log('   Expected: 5 demo businesses (Restaurant, Grocery x2, Hardware, Clothing)')
    }
    console.log('')

    // ═══════════════════════════════════════════════════════════
    // 2. Check for Demo Employees
    // ═══════════════════════════════════════════════════════════
    console.log('2️⃣  DEMO EMPLOYEES')
    console.log('═══════════════════════════════════════════════════════════')

    const allEmployees = await prisma.employees.count()
    console.log(`Total Employees: ${allEmployees}`)
    console.log('')

    // ═══════════════════════════════════════════════════════════
    // 3. Check for Demo Orders
    // ═══════════════════════════════════════════════════════════
    console.log('3️⃣  DEMO SALES ORDERS')
    console.log('═══════════════════════════════════════════════════════════')

    const totalOrders = await prisma.businessOrders.count()
    console.log(`Total Orders: ${totalOrders}`)

    // Check if any orders in last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentOrders = await prisma.businessOrders.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo
        }
      }
    })
    console.log(`Orders in last 30 days: ${recentOrders}`)
    console.log('')

    // ═══════════════════════════════════════════════════════════
    // 4. Check for Demo Expenses
    // ═══════════════════════════════════════════════════════════
    console.log('4️⃣  DEMO BUSINESS EXPENSES')
    console.log('═══════════════════════════════════════════════════════════')

    const totalExpensePayments = await prisma.expenseAccountPayments.count()
    console.log(`Total Expense Payments: ${totalExpensePayments}`)

    const recentExpensePayments = await prisma.expenseAccountPayments.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo
        }
      }
    })
    console.log(`Expense Payments in last 30 days: ${recentExpensePayments}`)
    console.log('')

    // ═══════════════════════════════════════════════════════════
    // 5. Check for Demo Products
    // ═══════════════════════════════════════════════════════════
    console.log('5️⃣  DEMO PRODUCTS')
    console.log('═══════════════════════════════════════════════════════════')

    const totalProducts = await prisma.businessProducts.count()
    console.log(`Total Products: ${totalProducts}`)

    const productsByType = await prisma.businessProducts.groupBy({
      by: ['businessType'],
      _count: true
    })

    console.log('Products by Business Type:')
    productsByType.forEach(p => {
      console.log(`   - ${p.businessType || 'no type'}: ${p._count}`)
    })
    console.log('')

    // ═══════════════════════════════════════════════════════════
    // 6. Check for WiFi Portal Data
    // ═══════════════════════════════════════════════════════════
    console.log('6️⃣  WIFI PORTAL DATA')
    console.log('═══════════════════════════════════════════════════════════')

    const tokenConfigs = await prisma.tokenConfigurations.count()
    const r710Integrations = await prisma.r710BusinessIntegrations.count()
    const wifiTokens = await prisma.wifiTokens.count()
    const r710Tokens = await prisma.r710Tokens.count()
    const wifiTokenSales = await prisma.wifiTokenSales.count()
    const r710TokenSales = await prisma.r710TokenSales.count()

    console.log(`ESP32 Token Configs: ${tokenConfigs}`)
    console.log(`R710 Integrations: ${r710Integrations}`)
    console.log(`WiFi Tokens (ESP32): ${wifiTokens}`)
    console.log(`R710 Tokens: ${r710Tokens}`)
    console.log(`WiFi Token Sales (ESP32): ${wifiTokenSales}`)
    console.log(`R710 Token Sales: ${r710TokenSales}`)
    console.log('')

    // ═══════════════════════════════════════════════════════════
    // 7. Check for Printer Data
    // ═══════════════════════════════════════════════════════════
    console.log('7️⃣  PRINTER SYSTEM DATA')
    console.log('═══════════════════════════════════════════════════════════')

    const networkPrinters = await prisma.networkPrinters.count()
    const barcodeTemplates = await prisma.barcodeTemplates.count()
    const printJobs = await prisma.printJobs.count()

    console.log(`Network Printers: ${networkPrinters}`)
    console.log(`Barcode Templates: ${barcodeTemplates}`)
    console.log(`Print Jobs: ${printJobs}`)
    console.log('')

    // ═══════════════════════════════════════════════════════════
    // 8. Check for Payroll Data
    // ═══════════════════════════════════════════════════════════
    console.log('8️⃣  PAYROLL DATA')
    console.log('═══════════════════════════════════════════════════════════')

    const payrollAccounts = await prisma.payrollAccounts.count()
    const payrollPeriods = await prisma.payrollPeriods.count()
    const payrollEntries = await prisma.payrollEntries.count()

    console.log(`Payroll Accounts: ${payrollAccounts}`)
    console.log(`Payroll Periods: ${payrollPeriods}`)
    console.log(`Payroll Entries: ${payrollEntries}`)
    console.log('')

    // ═══════════════════════════════════════════════════════════
    // 9. Check for HR Features Data
    // ═══════════════════════════════════════════════════════════
    console.log('9️⃣  HR FEATURES DATA')
    console.log('═══════════════════════════════════════════════════════════')

    const benefits = await prisma.employeeBenefits.count()
    const loans = await prisma.employeeLoans.count()
    const leaveRequests = await prisma.employeeLeaveRequests.count()
    const salaryIncreases = await prisma.employeeSalaryIncreases.count()
    const leaveBalance = await prisma.employeeLeaveBalance.count()

    console.log(`Employee Benefits: ${benefits}`)
    console.log(`Employee Loans: ${loans}`)
    console.log(`Leave Requests: ${leaveRequests}`)
    console.log(`Leave Balances: ${leaveBalance}`)
    console.log(`Salary Increases: ${salaryIncreases}`)
    console.log('')

    // ═══════════════════════════════════════════════════════════
    // 10. Summary
    // ═══════════════════════════════════════════════════════════
    console.log('╔════════════════════════════════════════════════════════════╗')
    console.log('║                    📝 SUMMARY                              ║')
    console.log('╚════════════════════════════════════════════════════════════╝')
    console.log('')

    const hasDemo = demoByName.length > 0 || demoByIsDemo.length > 0 || demoById.length > 0
    const hasOrders = totalOrders > 0
    const hasExpenses = totalExpensePayments > 0
    const hasWifi = tokenConfigs > 0 || r710Integrations > 0 || wifiTokens > 0 || r710Tokens > 0
    const hasPrinters = networkPrinters > 0
    const hasPayroll = payrollPeriods > 0
    const hasHR = benefits > 0 || loans > 0 || leaveRequests > 0

    console.log('Feature Coverage:')
    console.log(`   ${hasDemo ? '✅' : '❌'} Demo Businesses`)
    console.log(`   ${hasOrders ? '✅' : '❌'} Sales Orders`)
    console.log(`   ${hasExpenses ? '✅' : '❌'} Business Expenses (Payments)`)
    console.log(`   ${hasWifi ? '✅' : '❌'} WiFi Portal`)
    console.log(`   ${hasPrinters ? '✅' : '❌'} Printer System`)
    console.log(`   ${hasPayroll ? '✅' : '❌'} Payroll`)
    console.log(`   ${hasHR ? '✅' : '❌'} HR Features`)
    console.log('')

    console.log('Recommendation:')
    if (!hasDemo) {
      console.log('   🚨 CRITICAL: No demo businesses found!')
      console.log('   Action: Run demo business creation scripts first')
      console.log('   Command: node scripts/seed-restaurant-demo.js (and others)')
    } else if (!hasWifi && !hasPrinters && !hasPayroll && !hasHR) {
      console.log('   ⚠️  Demo businesses exist but missing new features')
      console.log('   Action: Expand demo data for WiFi, Printers, Payroll, HR')
    } else {
      console.log('   ✅ Demo data looks good! Consider expanding for complete coverage.')
    }
    console.log('')

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

auditDemoData()
