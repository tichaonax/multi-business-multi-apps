const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function createTestData() {
  console.log('=== Creating Test Expense Payment Data ===\n')

  try {
    // Check if expense account exists
    let expenseAccount = await prisma.expenseAccounts.findFirst({
      select: { id: true, accountName: true, accountNumber: true, balance: true },
    })

    if (!expenseAccount) {
      console.log('⚠️  No expense account found. Please create one through the UI first.')
      return
    }

    console.log(`✅ Found expense account: ${expenseAccount.accountName} (${expenseAccount.accountNumber})`)
    console.log(`   Current Balance: $${expenseAccount.balance}\n`)

    // Check balance
    if (Number(expenseAccount.balance) < 5000) {
      console.log('⚠️  Account balance is too low to create test payments.')
      console.log('   Please add a deposit through the UI first.')
      console.log(`   Recommended: Add at least $5000 to account ${expenseAccount.accountNumber}`)
      return
    }

    // Find an employee
    const employee = await prisma.employees.findFirst({
      select: { id: true, fullName: true, employeeNumber: true },
    })

    if (!employee) {
      console.log('⚠️  No employees found. Cannot create test payments.')
      return
    }

    console.log(`✅ Found employee: ${employee.fullName} (${employee.employeeNumber})\n`)

    // Find a person/contractor
    const person = await prisma.persons.findFirst({
      select: { id: true, fullName: true, nationalId: true },
    })

    if (person) {
      console.log(`✅ Found person: ${person.fullName} (${person.nationalId})\n`)
    }

    // Find a business
    const business = await prisma.business.findFirst({
      where: { type: { not: null } },
      select: { id: true, name: true, type: true },
    })

    if (business) {
      console.log(`✅ Found business: ${business.name} (${business.type})\n`)
    }

    // Find an admin user for creator
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      select: { id: true, name: true, email: true },
    })

    if (!adminUser) {
      console.log('⚠️  No admin user found. Cannot create test payments.')
      return
    }

    console.log(`✅ Found admin user: ${adminUser.name}\n`)

    // Find or create expense categories
    let salaryCategory = await prisma.expenseCategories.findFirst({
      where: { name: 'Salary & Wages' },
    })

    if (!salaryCategory) {
      salaryCategory = await prisma.expenseCategories.create({
        data: {
          name: 'Salary & Wages',
          emoji: '💵',
          description: 'Employee salaries and wages',
        },
      })
      console.log('✅ Created category: Salary & Wages')
    }

    let consultingCategory = await prisma.expenseCategories.findFirst({
      where: { name: 'Consulting Services' },
    })

    if (!consultingCategory) {
      consultingCategory = await prisma.expenseCategories.create({
        data: {
          name: 'Consulting Services',
          emoji: '📊',
          description: 'External consulting and contractor fees',
        },
      })
      console.log('✅ Created category: Consulting Services')
    }

    let suppliesCategory = await prisma.expenseCategories.findFirst({
      where: { name: 'Office Supplies' },
    })

    if (!suppliesCategory) {
      suppliesCategory = await prisma.expenseCategories.create({
        data: {
          name: 'Office Supplies',
          emoji: '📎',
          description: 'Office supplies and materials',
        },
      })
      console.log('✅ Created category: Office Supplies\n')
    }

    console.log('Creating test payments...\n')

    // Create 3 payments to the employee
    const employeePayments = []
    for (let i = 1; i <= 3; i++) {
      const payment = await prisma.expenseAccountPayments.create({
        data: {
          expenseAccountId: expenseAccount.id,
          amount: 500 + (i * 100), // $600, $700, $800
          paymentDate: new Date(Date.now() - (30 - i * 10) * 24 * 60 * 60 * 1000), // Spread over last month
          payeeType: 'EMPLOYEE',
          payeeEmployeeId: employee.id,
          categoryId: salaryCategory.id,
          notes: `Test salary payment #${i}`,
          status: 'SUBMITTED',
          createdById: adminUser.id,
        },
      })
      employeePayments.push(payment)
      console.log(`✅ Created payment ${i}/3 to ${employee.fullName}: $${payment.amount}`)
    }

    // Create payments to person if available
    if (person) {
      const personPayments = []
      for (let i = 1; i <= 2; i++) {
        const payment = await prisma.expenseAccountPayments.create({
          data: {
            expenseAccountId: expenseAccount.id,
            amount: 400 + (i * 50), // $450, $500
            paymentDate: new Date(Date.now() - (25 - i * 5) * 24 * 60 * 60 * 1000),
            payeeType: 'PERSON',
            payeePersonId: person.id,
            categoryId: consultingCategory.id,
            notes: `Test consulting payment #${i}`,
            status: 'SUBMITTED',
            createdById: adminUser.id,
          },
        })
        personPayments.push(payment)
        console.log(`✅ Created payment ${i}/2 to ${person.fullName}: $${payment.amount}`)
      }
    }

    // Create payment to business if available
    if (business) {
      const businessPayment = await prisma.expenseAccountPayments.create({
        data: {
          expenseAccountId: expenseAccount.id,
          amount: 1200,
          paymentDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          payeeType: 'BUSINESS',
          payeeBusinessId: business.id,
          categoryId: suppliesCategory.id,
          notes: 'Test supplier payment',
          status: 'SUBMITTED',
          createdById: adminUser.id,
        },
      })
      console.log(`✅ Created payment to ${business.name}: $${businessPayment.amount}`)
    }

    // Update expense account balance
    const totalPayments = await prisma.expenseAccountPayments.aggregate({
      where: {
        expenseAccountId: expenseAccount.id,
        status: 'SUBMITTED',
      },
      _sum: { amount: true },
    })

    const totalDeposits = await prisma.expenseAccountDeposits.aggregate({
      where: { expenseAccountId: expenseAccount.id },
      _sum: { amount: true },
    })

    const newBalance =
      Number(totalDeposits._sum.amount || 0) -
      Number(totalPayments._sum.amount || 0)

    await prisma.expenseAccounts.update({
      where: { id: expenseAccount.id },
      data: { balance: newBalance },
    })

    console.log(`\n✅ Updated account balance: $${newBalance}`)

    console.log('\n=== Test Data Created Successfully! ===\n')
    console.log('📋 Test API URLs:')
    console.log(`   Employee Payments: /api/expense-account/payees/EMPLOYEE/${employee.id}/payments`)
    console.log(`   Employee Reports:  /api/expense-account/payees/EMPLOYEE/${employee.id}/reports`)
    if (person) {
      console.log(`   Person Payments:   /api/expense-account/payees/PERSON/${person.id}/payments`)
      console.log(`   Person Reports:    /api/expense-account/payees/PERSON/${person.id}/reports`)
    }
    if (business) {
      console.log(`   Business Payments: /api/expense-account/payees/BUSINESS/${business.id}/payments`)
      console.log(`   Business Reports:  /api/expense-account/payees/BUSINESS/${business.id}/reports`)
    }
    console.log()

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTestData()
