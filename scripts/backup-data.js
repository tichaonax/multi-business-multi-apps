const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function backupData() {
  try {
    console.log('Starting data backup...')
    
    const backup = {
      timestamp: new Date().toISOString(),
      users: await prisma.users.findMany(),
      businesses: await prisma.businesses.findMany(),
      businessMemberships: await prisma.businessMemberships.findMany(),
      permissionTemplates: await prisma.permissionTemplates.findMany(),
      constructionProjects: await prisma.constructionProjects.findMany(),
      constructionExpenses: await prisma.constructionExpenses.findMany(),
      personalExpenses: await prisma.personalExpenses.findMany(),
      expenseCategories: await prisma.expenseCategories.findMany(),
      personalBudgets: await prisma.personalBudgets.findMany(),
      fundSources: await prisma.fundSources.findMany(),
      menuItems: await prisma.menuItems.findMany(),
      orders: await prisma.orders.findMany(),
      orderItems: await prisma.orderItems.findMany(),

      // Expense account loans & transfers
      expenseAccountLenders: await prisma.expenseAccountLenders.findMany(),
      expenseAccountLoans: await prisma.expenseAccountLoans.findMany(),
      businessTransferLedger: await prisma.businessTransferLedger.findMany(),
      accountOutgoingLoans: await prisma.accountOutgoingLoans.findMany(),
      accountOutgoingLoanPayments: await prisma.accountOutgoingLoanPayments.findMany(),

      // Payroll additions
      payrollSlips: await prisma.payrollSlips.findMany(),
      payrollZimraRemittances: await prisma.payrollZimraRemittances.findMany(),
      payrollPaymentVouchers: await prisma.payrollPaymentVouchers.findMany(),
    }

    const backupDir = path.join(__dirname, '..', 'backups')
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }

    const filename = `MultiBusinessSyncService-backup_pre-migration_${new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)}.json`
    const filepath = path.join(backupDir, filename)
    
    fs.writeFileSync(filepath, JSON.stringify(backup, null, 2))
    
    console.log(`Backup completed successfully: ${filepath}`)
    console.log(`Total records backed up: ${Object.values(backup).reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0)}`)
    
  } catch (error) {
    console.error('Backup failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

backupData()