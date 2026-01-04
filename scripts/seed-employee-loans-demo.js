const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * Seed Employee Loans Demo Data
 * Creates employee loans with various statuses and payment history
 */

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomDecimal(min, max, decimals = 2) {
  const value = Math.random() * (max - min) + min
  return parseFloat(value.toFixed(decimals))
}

function getDaysAgo(days) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

function getMonthsAgo(months) {
  const date = new Date()
  date.setMonth(date.getMonth() - months)
  return date
}

async function seedEmployeeLoans() {
  console.log('💰 Starting Employee Loans Demo Data Seeding...\n')

  try {
    // Get a manager employee for approvals
    const managerEmployee = await prisma.employees.findFirst({
      where: {
        businesses: { isDemo: true },
        job_titles: {
          title: { contains: 'Manager' }
        }
      },
      select: { id: true, fullName: true }
    })

    if (!managerEmployee) {
      console.log('❌ No manager employee found. Cannot create employee loans.')
      return
    }

    console.log(`   Using manager for approvals: ${managerEmployee.fullName}\n`)

    // Get all demo businesses
    const demoBusinesses = await prisma.businesses.findMany({
      where: { isDemo: true },
      select: { id: true, name: true, type: true }
    })

    let totalLoansCreated = 0
    let totalPaymentsCreated = 0

    // ═══════════════════════════════════════════════════════════
    // CREATE EMPLOYEE LOANS WITH DIFFERENT STATUSES
    // ═══════════════════════════════════════════════════════════
    console.log('📋 Creating Employee Loans...\n')

    for (const business of demoBusinesses) {
      console.log(`   💼 Processing loans for: ${business.name}`)

      // Get employees for this business
      const employees = await prisma.employees.findMany({
        where: { primaryBusinessId: business.id },
        include: {
          employee_loans_employee_loans_employeeIdToemployees: true
        },
        take: 3 // Limit to 3 employees per business for demo
      })

      console.log(`      Found ${employees.length} employees`)

      // Scenario 1: FULLY PAID LOAN (shows in history)
      if (employees.length > 0 && employees[0].employee_loans_employee_loans_employeeIdToemployees.length === 0) {
        const loanAmount = randomDecimal(2000, 5000)
        const totalMonths = 12
        const monthlyDeduction = loanAmount / totalMonths

        const loan = await prisma.employeeLoans.create({
          data: {
            employeeId: employees[0].id,
            loanAmount: loanAmount,
            totalMonths: totalMonths,
            monthlyDeduction: monthlyDeduction,
            remainingBalance: 0, // Fully paid
            remainingMonths: 0,
            status: 'completed',
            approvedBy: managerEmployee.id,
            approvedAt: getMonthsAgo(13),
            createdAt: getMonthsAgo(13),
            updatedAt: getDaysAgo(30)
          }
        })

        // Create payment history for all months
        for (let i = 0; i < totalMonths; i++) {
          await prisma.employeeLoanPayments.create({
            data: {
              loanId: loan.id,
              amount: monthlyDeduction,
              paymentDate: getMonthsAgo(12 - i),
              processedBy: managerEmployee.id,
              createdAt: getMonthsAgo(12 - i)
            }
          })
          totalPaymentsCreated++
        }

        console.log(`      ✅ Created FULLY PAID loan: $${loanAmount.toLocaleString()} (${employees[0].fullName})`)
        totalLoansCreated++
      }

      // Scenario 2: ACTIVE LOAN #1 (50% paid)
      if (employees.length > 1 && employees[1].employee_loans_employee_loans_employeeIdToemployees.length === 0) {
        const loanAmount = randomDecimal(3000, 6000)
        const totalMonths = 18
        const monthlyDeduction = loanAmount / totalMonths
        const paymentsMade = 9 // 50% paid
        const remainingBalance = loanAmount - (monthlyDeduction * paymentsMade)

        const loan = await prisma.employeeLoans.create({
          data: {
            employeeId: employees[1].id,
            loanAmount: loanAmount,
            totalMonths: totalMonths,
            monthlyDeduction: monthlyDeduction,
            remainingBalance: remainingBalance,
            remainingMonths: totalMonths - paymentsMade,
            status: 'active',
            approvedBy: managerEmployee.id,
            approvedAt: getMonthsAgo(10),
            createdAt: getMonthsAgo(10),
            updatedAt: getDaysAgo(5)
          }
        })

        // Create payment history for first 9 months
        for (let i = 0; i < paymentsMade; i++) {
          await prisma.employeeLoanPayments.create({
            data: {
              loanId: loan.id,
              amount: monthlyDeduction,
              paymentDate: getMonthsAgo(paymentsMade - i),
              processedBy: managerEmployee.id,
              createdAt: getMonthsAgo(paymentsMade - i)
            }
          })
          totalPaymentsCreated++
        }

        console.log(`      ✅ Created ACTIVE loan (50% paid): $${loanAmount.toLocaleString()} (${employees[1].fullName})`)
        console.log(`         Remaining: $${remainingBalance.toLocaleString()} over ${totalMonths - paymentsMade} months`)
        totalLoansCreated++
      }

      // Scenario 3: ACTIVE LOAN #2 (just started)
      if (employees.length > 2 && employees[2].employee_loans_employee_loans_employeeIdToemployees.length === 0) {
        const loanAmount = randomDecimal(1500, 3500)
        const totalMonths = 12
        const monthlyDeduction = loanAmount / totalMonths
        const paymentsMade = randomInt(1, 3)
        const remainingBalance = loanAmount - (monthlyDeduction * paymentsMade)

        const loan = await prisma.employeeLoans.create({
          data: {
            employeeId: employees[2].id,
            loanAmount: loanAmount,
            totalMonths: totalMonths,
            monthlyDeduction: monthlyDeduction,
            remainingBalance: remainingBalance,
            remainingMonths: totalMonths - paymentsMade,
            status: 'active',
            approvedBy: managerEmployee.id,
            approvedAt: getMonthsAgo(paymentsMade + 1),
            createdAt: getMonthsAgo(paymentsMade + 1),
            updatedAt: getDaysAgo(3)
          }
        })

        // Create payment history
        for (let i = 0; i < paymentsMade; i++) {
          await prisma.employeeLoanPayments.create({
            data: {
              loanId: loan.id,
              amount: monthlyDeduction,
              paymentDate: getMonthsAgo(paymentsMade - i),
              processedBy: managerEmployee.id,
              createdAt: getMonthsAgo(paymentsMade - i)
            }
          })
          totalPaymentsCreated++
        }

        console.log(`      ✅ Created ACTIVE loan (recently started): $${loanAmount.toLocaleString()} (${employees[2].fullName})`)
        console.log(`         Remaining: $${remainingBalance.toLocaleString()} over ${totalMonths - paymentsMade} months`)
        totalLoansCreated++
      }

      console.log('')
    }

    // ═══════════════════════════════════════════════════════════
    // CREATE A DEFAULTED LOAN (from Restaurant Demo)
    // ═══════════════════════════════════════════════════════════
    const restaurant = demoBusinesses.find(b => b.type === 'restaurant')
    if (restaurant) {
      const restaurantEmployees = await prisma.employees.findMany({
        where: {
          primaryBusinessId: restaurant.id,
          employee_loans_employee_loans_employeeIdToemployees: {
            none: {}
          }
        },
        take: 1
      })

      if (restaurantEmployees.length > 0) {
        const loanAmount = randomDecimal(4000, 7000)
        const totalMonths = 24
        const monthlyDeduction = loanAmount / totalMonths
        const paymentsMade = randomInt(6, 10) // Made some payments then defaulted
        const remainingBalance = loanAmount - (monthlyDeduction * paymentsMade)

        const loan = await prisma.employeeLoans.create({
          data: {
            employeeId: restaurantEmployees[0].id,
            loanAmount: loanAmount,
            totalMonths: totalMonths,
            monthlyDeduction: monthlyDeduction,
            remainingBalance: remainingBalance,
            remainingMonths: totalMonths - paymentsMade,
            status: 'defaulted',
            approvedBy: managerEmployee.id,
            approvedAt: getMonthsAgo(paymentsMade + 3),
            createdAt: getMonthsAgo(paymentsMade + 3),
            updatedAt: getDaysAgo(45) // Last updated 45 days ago
          }
        })

        // Create payment history for the payments that were made
        for (let i = 0; i < paymentsMade; i++) {
          await prisma.employeeLoanPayments.create({
            data: {
              loanId: loan.id,
              amount: monthlyDeduction,
              paymentDate: getMonthsAgo(paymentsMade - i),
              processedBy: managerEmployee.id,
              createdAt: getMonthsAgo(paymentsMade - i)
            }
          })
          totalPaymentsCreated++
        }

        console.log(`   💼 Restaurant [Demo]:`)
        console.log(`      ✅ Created DEFAULTED loan: $${loanAmount.toLocaleString()} (${restaurantEmployees[0].fullName})`)
        console.log(`         Made ${paymentsMade} payments, then defaulted`)
        console.log(`         Outstanding: $${remainingBalance.toLocaleString()}\n`)
        totalLoansCreated++
      }
    }

    // ═══════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════
    console.log('╔════════════════════════════════════════════════════════════╗')
    console.log('║    ✅ Employee Loans Demo Seeding Complete!               ║')
    console.log('╚════════════════════════════════════════════════════════════╝')

    console.log('\n📊 Summary:')
    console.log(`   Total Loans Created: ${totalLoansCreated}`)
    console.log(`   Total Loan Payments: ${totalPaymentsCreated}`)

    // Get loan statistics
    const loanStats = await prisma.employeeLoans.groupBy({
      by: ['status'],
      _count: true,
      _sum: {
        loanAmount: true,
        remainingBalance: true
      },
      where: {
        employees_employee_loans_employeeIdToemployees: {
          businesses: { isDemo: true }
        }
      }
    })

    console.log('\n💰 Loan Status Distribution:')
    for (const stat of loanStats) {
      console.log(`   ${stat.status.toUpperCase()}:`)
      console.log(`     - Count: ${stat._count} loans`)
      console.log(`     - Total Amount: $${Number(stat._sum.loanAmount || 0).toLocaleString()}`)
      console.log(`     - Remaining Balance: $${Number(stat._sum.remainingBalance || 0).toLocaleString()}`)
    }

    // Get detailed loan breakdown per business
    console.log('\n📋 Loan Breakdown by Business:')
    for (const business of demoBusinesses) {
      const businessLoans = await prisma.employeeLoans.findMany({
        where: {
          employees_employee_loans_employeeIdToemployees: {
            primaryBusinessId: business.id
          }
        },
        include: {
          employees_employee_loans_employeeIdToemployees: {
            select: { fullName: true }
          },
          _count: {
            select: { employee_loan_payments: true }
          }
        }
      })

      if (businessLoans.length > 0) {
        console.log(`\n   ${business.name}:`)
        for (const loan of businessLoans) {
          const paymentCount = loan._count.employee_loan_payments
          console.log(`     - ${loan.employees_employee_loans_employeeIdToemployees.fullName}:`)
          console.log(`       Loan: $${Number(loan.loanAmount).toLocaleString()} (${loan.status})`)
          console.log(`       Remaining: $${Number(loan.remainingBalance).toLocaleString()}`)
          console.log(`       Payments Made: ${paymentCount}/${loan.totalMonths}`)
        }
      }
    }

    console.log('\n🧪 Testing:')
    console.log('   - View employee loan dashboard')
    console.log('   - Check loan payment schedules')
    console.log('   - Test loan approval workflow')
    console.log('   - Verify loan deductions in payroll')
    console.log('   - View loan payment history')
    console.log('   - Test defaulted loan management')

  } catch (error) {
    console.error('❌ Error seeding employee loans demo data:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seeding function
seedEmployeeLoans()
  .then(() => {
    console.log('\n✨ Seeding script completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Seeding script failed:', error)
    process.exit(1)
  })
