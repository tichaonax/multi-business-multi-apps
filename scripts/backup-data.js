const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function backupData() {
  try {
    console.log('Starting data backup...')
    
    const backup = {
      timestamp: new Date().toISOString(),
      users: await prisma.user.findMany(),
      businesses: await prisma.business.findMany(),
      businessMemberships: await prisma.businessMembership.findMany(),
      permissionTemplates: await prisma.permissionTemplate.findMany(),
      constructionProjects: await prisma.constructionProject.findMany(),
      constructionExpenses: await prisma.constructionExpense.findMany(),
      contractors: await prisma.contractor.findMany(),
      projectPayments: await prisma.projectPayment.findMany(),
      personalExpenses: await prisma.personalExpense.findMany(),
      expenseCategories: await prisma.expenseCategory.findMany(),
      personalBudgets: await prisma.personalBudget.findMany(),
      fundSources: await prisma.fundSource.findMany(),
      menuItems: await prisma.menuItem.findMany(),
      orders: await prisma.order.findMany(),
      orderItems: await prisma.orderItem.findMany(),
    }

    const backupDir = path.join(__dirname, '..', 'backups')
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }

    const filename = `multi-business-multi-apps-backup_pre_migration_${new Date().toISOString().replace(/[:.]/g, '-')}.json`
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