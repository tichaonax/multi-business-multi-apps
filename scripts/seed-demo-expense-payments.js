const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * Seed demo expense account payments
 * Creates realistic 30-day expense history for each demo business.
 * Payments are constrained to fit within the available expense account deposit.
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
  date.setHours(randomInt(8, 17), randomInt(0, 59), 0, 0)
  return date
}

// Domain name map (business type → ExpenseDomains.name)
const domainNameMap = {
  restaurant: 'Restaurant',
  grocery: 'Groceries',
  hardware: 'Hardware',
  clothing: 'Clothing'
}

async function seedDemoExpensePayments() {
  console.log('💳 Starting demo expense payments seeding...\n')

  try {
    // Find admin/system user for createdBy
    let creatorUser = await prisma.users.findFirst({
      where: { email: 'admin@business.local' },
      select: { id: true, email: true }
    })

    if (!creatorUser) {
      creatorUser = await prisma.users.findFirst({
        where: { role: 'admin' },
        select: { id: true, email: true }
      })
    }

    if (!creatorUser) {
      throw new Error('No admin user found. Seed admin user first.')
    }

    console.log(`👤 Using creator: ${creatorUser.email}\n`)

    // Cleanup existing seeded payments (idempotent: identified by [demo-seed] marker in notes)
    const existingCount = await prisma.expenseAccountPayments.count({
      where: { notes: { contains: '[demo-seed]' } }
    })

    if (existingCount > 0) {
      console.log(`⚠️  Found ${existingCount} existing demo expense payments`)
      console.log('🗑️  Cleaning up...\n')
      await prisma.expenseAccountPayments.deleteMany({
        where: { notes: { contains: '[demo-seed]' } }
      })
      console.log('✅ Cleanup complete\n')
    }

    // Get demo businesses
    const demoBusinesses = await prisma.businesses.findMany({
      where: { isDemo: true },
      select: { id: true, name: true, type: true }
    })

    console.log(`Found ${demoBusinesses.length} demo businesses`)

    let totalPayments = 0
    let totalAmount = 0

    for (const business of demoBusinesses) {
      const businessTypeLower = business.type.toLowerCase()
      const domainName = domainNameMap[businessTypeLower]

      if (!domainName) {
        console.log(`  ⏭️  Skipping ${business.name} (no domain configured for '${business.type}')`)
        continue
      }

      console.log(`\n📦 Processing: ${business.name} (${business.type})`)

      // Find the primary expense account for this business
      const expenseAccount = await prisma.expenseAccounts.findFirst({
        where: { businessId: business.id, isActive: true },
        orderBy: { createdAt: 'asc' }
      })

      if (!expenseAccount) {
        console.log(`  ⚠️  No expense account found. Run the business seed first.`)
        continue
      }

      console.log(`  Account: ${expenseAccount.accountNumber}`)

      // Calculate available balance (total deposits − already-submitted payments)
      const depositsAgg = await prisma.expenseAccountDeposits.aggregate({
        where: { expenseAccountId: expenseAccount.id },
        _sum: { amount: true }
      })
      const existingPaymentsAgg = await prisma.expenseAccountPayments.aggregate({
        where: { expenseAccountId: expenseAccount.id, status: 'SUBMITTED' },
        _sum: { amount: true }
      })
      let availableBalance = parseFloat(
        (Number(depositsAgg._sum?.amount ?? 0) - Number(existingPaymentsAgg._sum?.amount ?? 0)).toFixed(2)
      )

      console.log(`  Available balance (from deposits): $${availableBalance.toFixed(2)}`)

      // If no deposit records exist but the account has a stored balance, create a corrective deposit
      // This handles the case where business seeds set balance directly without creating deposit records
      if (availableBalance === 0 && Number(depositsAgg._sum?.amount ?? 0) === 0) {
        const storedBalance = parseFloat(Number(expenseAccount.balance).toFixed(2))

        // Use stored balance if > 0, otherwise seed a fresh transfer from business revenue
        let depositAmount = storedBalance > 0 ? storedBalance : 0

        if (depositAmount === 0) {
          // Compute business account revenue and use 15% as operating budget
          const bizCredits = await prisma.businessTransactions.aggregate({
            where: { businessId: business.id, type: { in: ['deposit', 'CREDIT', 'transfer', 'loan_received'] } },
            _sum: { amount: true }
          })
          const totalRevenue = Number(bizCredits._sum?.amount ?? 0)
          depositAmount = parseFloat(Math.min(totalRevenue * 0.15, 10000).toFixed(2))
        }

        if (depositAmount > 0) {
          await prisma.expenseAccountDeposits.create({
            data: {
              expenseAccountId: expenseAccount.id,
              sourceType: 'BUSINESS',
              sourceBusinessId: business.id,
              amount: depositAmount,
              depositDate: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000), // 31 days ago
              autoGeneratedNote: `Operating fund transfer for ${business.name} [demo-seed]`,
              createdBy: creatorUser.id,
            }
          })
          console.log(`  ✅ Created corrective deposit: $${depositAmount.toFixed(2)}`)
        }

        // Recalculate available balance after deposit
        const newDepositsAgg = await prisma.expenseAccountDeposits.aggregate({
          where: { expenseAccountId: expenseAccount.id },
          _sum: { amount: true }
        })
        availableBalance = parseFloat(Number(newDepositsAgg._sum?.amount ?? 0).toFixed(2))
      }

      if (availableBalance <= 0) {
        console.log(`  ⚠️  No available balance — skipping payments`)
        continue
      }

      // Budget = 80% of available balance to leave a buffer
      const budget = parseFloat((availableBalance * 0.80).toFixed(2))
      console.log(`  Payment budget (80% of $${availableBalance.toFixed(2)}): $${budget.toFixed(2)}`)

      // Find expense categories for this business type
      const domain = await prisma.expenseDomains.findFirst({
        where: { name: { equals: domainName, mode: 'insensitive' } },
        include: {
          expense_categories: {
            include: { expense_subcategories: true }
          }
        }
      })

      if (!domain || domain.expense_categories.length === 0) {
        console.log(`  ⚠️  No expense categories found for domain '${domainName}'`)
        continue
      }

      console.log(`  Domain: ${domain.name} (${domain.expense_categories.length} categories)`)

      // Fetch real payees for this business
      const suppliers = await prisma.businessSuppliers.findMany({
        where: { businessType: businessTypeLower, isActive: true },
        select: { id: true, name: true }
      })
      const employees = await prisma.employees.findMany({
        where: { primaryBusinessId: business.id, isActive: true },
        select: { id: true, fullName: true }
      })
      console.log(`  Payees: ${suppliers.length} suppliers, ${employees.length} employees`)

      // Category names that map to employee payments (wages, salaries, commissions)
      const employeeCategoryKeywords = ['salary', 'wage', 'commission', 'staff', 'payroll', 'allowance', 'bonus', 'overtime']

      // Distribute budget over 30 days: 2-4 payments per day
      const daysBack = 30
      const dailyBudget = budget / daysBack
      let businessTotal = 0
      let businessPayments = 0

      for (let day = 0; day < daysBack; day++) {
        if (businessTotal >= budget) break

        const paymentsThisDay = randomInt(2, 4)
        const paymentDate = getDaysAgo(daysBack - 1 - day) // oldest first → most recent last

        for (let p = 0; p < paymentsThisDay; p++) {
          const remaining = budget - businessTotal
          if (remaining <= 1) break

          // Pick a random category and subcategory
          const category = randomItem(domain.expense_categories)
          const subcategory = category.expense_subcategories?.length > 0
            ? randomItem(category.expense_subcategories)
            : null

          // Amount: share of daily budget, capped at remaining
          const maxAmount = Math.min(remaining, dailyBudget / paymentsThisDay * 1.5)
          const amount = parseFloat(Math.max(5, randomInt(5, Math.ceil(maxAmount))).toFixed(2))

          const itemName = subcategory ? subcategory.name : category.name
          const notes = `${itemName} — ${category.name} [demo-seed]`

          // Determine payee: employee categories → EMPLOYEE, everything else → SUPPLIER
          const categoryNameLower = category.name.toLowerCase()
          const isEmployeeCategory = employeeCategoryKeywords.some(kw => categoryNameLower.includes(kw))

          let payeeType, payeeSupplierId, payeeEmployeeId
          if (isEmployeeCategory && employees.length > 0) {
            payeeType = 'EMPLOYEE'
            payeeEmployeeId = randomItem(employees).id
          } else if (suppliers.length > 0) {
            payeeType = 'SUPPLIER'
            payeeSupplierId = randomItem(suppliers).id
          } else if (employees.length > 0) {
            // Fallback to employee if no suppliers exist
            payeeType = 'EMPLOYEE'
            payeeEmployeeId = randomItem(employees).id
          } else {
            payeeType = 'SUPPLIER'
          }

          try {
            await prisma.expenseAccountPayments.create({
              data: {
                expenseAccountId: expenseAccount.id,
                payeeType,
                payeeSupplierId: payeeSupplierId || null,
                payeeEmployeeId: payeeEmployeeId || null,
                categoryId: category.id,
                subcategoryId: subcategory?.id || null,
                amount: amount,
                paymentDate: paymentDate,
                notes: notes,
                status: 'SUBMITTED',
                paymentType: 'REGULAR',
                createdBy: creatorUser.id,
                createdAt: paymentDate,
                updatedAt: paymentDate
              }
            })

            businessTotal += amount
            businessPayments++
            totalPayments++
            totalAmount += amount
          } catch (error) {
            console.error(`    ❌ Error creating payment: ${error.message}`)
          }
        }
      }

      // Recalculate and update expense account balance
      const finalDepositsAgg = await prisma.expenseAccountDeposits.aggregate({
        where: { expenseAccountId: expenseAccount.id },
        _sum: { amount: true }
      })
      const finalPaymentsAgg = await prisma.expenseAccountPayments.aggregate({
        where: { expenseAccountId: expenseAccount.id, status: 'SUBMITTED' },
        _sum: { amount: true }
      })
      const finalBalance = parseFloat(
        (Number(finalDepositsAgg._sum?.amount ?? 0) - Number(finalPaymentsAgg._sum?.amount ?? 0)).toFixed(2)
      )
      await prisma.expenseAccounts.update({
        where: { id: expenseAccount.id },
        data: { balance: Math.max(0, finalBalance) }
      })

      console.log(`  ✅ Created ${businessPayments} payments totalling $${businessTotal.toFixed(2)}`)
      console.log(`     Expense account balance: $${Math.max(0, finalBalance).toFixed(2)}`)
    }

    console.log('\n✅ Demo expense payments seeding complete!')
    console.log(`\n📊 Summary:`)
    console.log(`   - Total payments created: ${totalPayments}`)
    console.log(`   - Total amount paid out: $${totalAmount.toFixed(2)}`)
    if (totalPayments > 0) {
      console.log(`   - Average per payment: $${(totalAmount / totalPayments).toFixed(2)}`)
    }

  } catch (error) {
    console.error('❌ Error seeding demo expense payments:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Export for use by API routes
module.exports = { seedDemoExpensePayments }

// Run directly when invoked from CLI
if (require.main === module) {
  seedDemoExpensePayments()
    .then(() => {
      console.log('\n✨ Seeding script completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Seeding script failed:', error)
      process.exit(1)
    })
}
