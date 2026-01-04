const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * Seed demo expense account payments
 * Uses the current ExpenseAccounts + ExpenseAccountPayments schema
 */

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)]
}

function getDaysAgo(days) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

function getRealisticAmount(subcategoryName, categoryName) {
  const ranges = {
    'Rent': [500, 2000],
    'Utilities': [50, 300],
    'Salaries': [1000, 5000],
    'Office Supplies': [20, 200],
    'Marketing': [100, 1000],
    'Equipment': [200, 3000],
    'Maintenance': [100, 800],
    'Insurance': [200, 1000],
    'Food Supplies': [100, 800],
    'Inventory': [500, 2000]
  }

  for (const [key, range] of Object.entries(ranges)) {
    if (subcategoryName.includes(key) || categoryName.includes(key)) {
      return (Math.random() * (range[1] - range[0]) + range[0]).toFixed(2)
    }
  }

  return (Math.random() * 200 + 50).toFixed(2)
}

async function seedDemoExpensePayments() {
  console.log('🌱 Starting demo expense account payments seeding...\n')

  try {
    // Get demo businesses
    const demoBusinesses = await prisma.businesses.findMany({
      where: { isDemo: true },
      select: { id: true, name: true, type: true }
    })

    console.log(`Found ${demoBusinesses.length} demo businesses\n`)

    if (demoBusinesses.length === 0) {
      console.log('❌ No demo businesses found. Please run business seed scripts first.')
      return
    }

    let totalPaymentsCreated = 0

    for (const business of demoBusinesses) {
      console.log(`📦 Processing: ${business.name} (${business.type})`)

      // Get or create expense account for this business
      let expenseAccount = await prisma.expenseAccounts.findFirst({
        where: { businessId: business.id }
      })

      if (!expenseAccount) {
        console.log(`  Creating expense account...`)
        expenseAccount = await prisma.expenseAccounts.create({
          data: {
            businessId: business.id,
            accountName: `${business.name} - General Expenses`,
            accountNumber: `EXP-${business.id.substring(0, 8).toUpperCase()}`,
            balance: 0,
            currency: 'USD',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })
        console.log(`  ✅ Created expense account: ${expenseAccount.accountNumber}`)
      } else {
        console.log(`  ✅ Found existing expense account: ${expenseAccount.accountNumber}`)
      }

      // Get expense categories for this business type
      const domainNameMap = {
        'restaurant': 'Restaurant',
        'grocery': 'Groceries',
        'hardware': 'Hardware',
        'clothing': 'Clothing'
      }

      const domainName = domainNameMap[business.type] || business.type

      const categories = await prisma.expenseCategories.findMany({
        where: {
          expense_domains: {
            name: { equals: domainName, mode: 'insensitive' }
          }
        },
        include: {
          expense_subcategories: true
        },
        take: 10
      })

      if (categories.length === 0) {
        console.log(`  ⚠️  No categories found for domain: ${domainName}`)
        continue
      }

      console.log(`  Found ${categories.length} expense categories`)

      // Get employees for this business
      const employees = await prisma.employees.findMany({
        where: { primaryBusinessId: business.id },
        select: { id: true, fullName: true }
      })

      if (employees.length === 0) {
        console.log(`  ⚠️  No employees found, skipping expense payments`)
        continue
      }

      console.log(`  Found ${employees.length} employees`)

      // Get persons for payees
      const persons = await prisma.persons.findMany({
        take: 20,
        select: { id: true, fullName: true }
      })

      let businessPaymentCount = 0

      // Generate expense payments for last 30 days
      for (let day = 0; day < 30; day++) {
        const dailyPaymentCount = randomInt(3, 8)
        const paymentDate = getDaysAgo(day)

        for (let i = 0; i < dailyPaymentCount; i++) {
          const category = randomItem(categories)
          const subcategory = category.expense_subcategories?.length > 0
            ? randomItem(category.expense_subcategories)
            : null

          const amount = parseFloat(getRealisticAmount(
            subcategory?.name || '',
            category.name
          ))

          const employee = randomItem(employees)
          const payee = persons.length > 0 ? randomItem(persons) : null

          try {
            await prisma.expenseAccountPayments.create({
              data: {
                expenseAccountId: expenseAccount.id,
                amount: amount,
                categoryId: category.id,
                subcategoryId: subcategory?.id || null,
                payeeId: payee?.id || null,
                employeeId: employee.id,
                description: subcategory
                  ? `${subcategory.name} - ${category.name}`
                  : category.name,
                paymentMethod: randomItem(['CASH', 'CHECK', 'CREDIT_CARD', 'BANK_TRANSFER']),
                status: 'COMPLETED',
                createdAt: paymentDate,
                updatedAt: paymentDate
              }
            })

            businessPaymentCount++
            totalPaymentsCreated++

            // Update account balance
            await prisma.expenseAccounts.update({
              where: { id: expenseAccount.id },
              data: {
                balance: {
                  decrement: amount
                },
                updatedAt: paymentDate
              }
            })

          } catch (error) {
            console.error(`    ❌ Error creating payment: ${error.message}`)
          }
        }
      }

      console.log(`  ✅ Created ${businessPaymentCount} expense payments\n`)
    }

    console.log('✅ Demo expense account payments seeding complete!')
    console.log(`\n📊 Summary:`)
    console.log(`   Total payments created: ${totalPaymentsCreated}`)
    console.log(`   Average per business: ${(totalPaymentsCreated / demoBusinesses.length).toFixed(0)}`)
    console.log('')

  } catch (error) {
    console.error('❌ Error seeding expense payments:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

seedDemoExpensePayments()
