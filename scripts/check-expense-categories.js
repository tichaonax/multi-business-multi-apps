const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkExpenseCategories() {
  try {
    console.log('\n=== Expense Category System Check ===\n')

    // Check expense domains
    const domains = await prisma.expenseDomains.findMany({
      orderBy: { name: 'asc' }
    })

    console.log(`📂 Expense Domains: ${domains.length}`)
    if (domains.length > 0) {
      domains.forEach(d => {
        console.log(`  ${d.emoji} ${d.name} - ${d.description}`)
      })
    } else {
      console.log('  ❌ NO DOMAINS FOUND')
    }

    // Check expense categories
    console.log('\n📁 Expense Categories:')
    const categories = await prisma.expenseCategories.findMany({
      include: {
        domain: true,
        expense_subcategories: true
      },
      orderBy: { name: 'asc' }
    })

    console.log(`Total: ${categories.length}`)
    if (categories.length > 0) {
      categories.forEach(cat => {
        const domain = cat.domain ? `${cat.domain.emoji} ${cat.domain.name}` : 'No domain'
        const subCount = cat.expense_subcategories?.length || 0
        console.log(`  ${cat.emoji} ${cat.name} (${domain}) - ${subCount} subcategories`)
      })
    } else {
      console.log('  ❌ NO CATEGORIES FOUND')
    }

    // Check expense subcategories
    console.log('\n📄 Expense Subcategories:')
    const subcategories = await prisma.expenseSubcategories.findMany()
    console.log(`Total: ${subcategories.length}`)
    if (subcategories.length === 0) {
      console.log('  ❌ NO SUBCATEGORIES FOUND')
    }

    // Check if seed data files exist
    console.log('\n\n=== Seed Data Files Check ===\n')
    const fs = require('fs')
    const path = require('path')
    const seedDir = path.join(process.cwd(), 'seed-data', 'expense-types')

    if (fs.existsSync(seedDir)) {
      console.log('✓ seed-data/expense-types directory exists')
      const files = fs.readdirSync(seedDir)
      console.log(`\nFiles found (${files.length}):`)
      files.forEach(f => console.log(`  - ${f}`))
    } else {
      console.log('❌ seed-data/expense-types directory NOT FOUND')
    }

    console.log('\n')

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkExpenseCategories()
