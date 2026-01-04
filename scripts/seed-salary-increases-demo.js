const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * Seed Salary Increases Demo Data
 * Creates salary increase history for demo employees
 */

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomDecimal(min, max, decimals = 2) {
  const value = Math.random() * (max - min) + min
  return parseFloat(value.toFixed(decimals))
}

function getMonthsAgo(months) {
  const date = new Date()
  date.setMonth(date.getMonth() - months)
  return date
}

async function seedSalaryIncreases() {
  console.log('📈 Starting Salary Increases Demo Data Seeding...\n')

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
      console.log('❌ No manager employee found. Cannot create salary increases.')
      return
    }

    console.log(`   Using manager for approvals: ${managerEmployee.fullName}\n`)

    // Get all demo employees with their contracts
    const demoEmployees = await prisma.employees.findMany({
      where: {
        businesses: { isDemo: true }
      },
      include: {
        businesses: {
          select: { name: true }
        },
        job_titles: {
          select: { title: true }
        },
        employee_contracts_employee_contracts_employeeIdToemployees: {
          where: { status: 'active' },
          select: { baseSalary: true },
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        compensation_types: {
          select: { baseAmount: true }
        },
        employee_salary_increases_employee_salary_increases_employeeIdToemployees: true
      }
    })

    console.log(`   Found ${demoEmployees.length} demo employees\n`)

    let totalIncreasesCreated = 0

    // ═══════════════════════════════════════════════════════════
    // CREATE SALARY INCREASE HISTORY
    // ═══════════════════════════════════════════════════════════
    console.log('💰 Creating Salary Increase History...\n')

    const increaseReasons = [
      'Annual performance review',
      'Exceptional performance',
      'Promotion to senior role',
      'Market adjustment',
      'Increased responsibilities',
      'Cost of living adjustment',
      'Completion of probation period'
    ]

    for (const employee of demoEmployees) {
      const isManager = employee.job_titles?.title?.toLowerCase().includes('manager') || false
      const hasExistingIncreases = employee.employee_salary_increases_employee_salary_increases_employeeIdToemployees.length > 0

      // Skip if already has salary increase history
      if (hasExistingIncreases) {
        console.log(`   ⏭️  Skipping ${employee.fullName} - already has salary history`)
        continue
      }

      // Get current salary
      let currentSalary = employee.employee_contracts_employee_contracts_employeeIdToemployees?.[0]?.baseSalary
        ? Number(employee.employee_contracts_employee_contracts_employeeIdToemployees[0].baseSalary)
        : Number(employee.compensation_types?.baseAmount || 3000)

      // Managers get more increases (2-3), staff get fewer (1-2)
      const numIncreases = isManager ? randomInt(2, 3) : randomInt(1, 2)

      console.log(`   👤 Creating ${numIncreases} salary increases for: ${employee.fullName}`)

      // Create increases in reverse chronological order (oldest first)
      for (let i = numIncreases; i > 0; i--) {
        const monthsAgo = i * randomInt(6, 12) // 6-12 months between increases
        const effectiveDate = getMonthsAgo(monthsAgo)

        // Calculate salary before this increase
        // Work backwards from current salary
        const percentageIncrease = randomDecimal(3, 10) // 3-10% increase
        const previousSalary = currentSalary / (1 + (percentageIncrease / 100))
        const increaseAmount = currentSalary - previousSalary

        await prisma.employeeSalaryIncreases.create({
          data: {
            employeeId: employee.id,
            previousSalary: previousSalary,
            newSalary: currentSalary,
            increaseAmount: increaseAmount,
            increasePercent: percentageIncrease,
            effectiveDate: effectiveDate,
            reason: increaseReasons[randomInt(0, increaseReasons.length - 1)],
            approvedBy: managerEmployee.id,
            approvedAt: new Date(effectiveDate.getTime() - (randomInt(7, 14) * 86400000)), // Approved 7-14 days before effective date
            createdAt: new Date(effectiveDate.getTime() - (randomInt(14, 30) * 86400000)) // Created 14-30 days before effective date
          }
        })

        console.log(`      ✅ ${getMonthsAgo(monthsAgo).toLocaleDateString()}: $${previousSalary.toLocaleString()} → $${currentSalary.toLocaleString()} (+${percentageIncrease.toFixed(1)}%)`)
        totalIncreasesCreated++

        // Update current salary for next iteration (going backwards in time)
        currentSalary = previousSalary
      }

      console.log('')
    }

    // ═══════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════
    console.log('╔════════════════════════════════════════════════════════════╗')
    console.log('║    ✅ Salary Increases Demo Seeding Complete!             ║')
    console.log('╚════════════════════════════════════════════════════════════╝')

    console.log('\n📊 Summary:')
    console.log(`   Total Salary Increases Created: ${totalIncreasesCreated}`)

    // Get statistics
    const increaseStats = await prisma.employeeSalaryIncreases.aggregate({
      _count: true,
      _avg: {
        increasePercent: true,
        increaseAmount: true
      },
      _sum: {
        increaseAmount: true
      },
      where: {
        employees_employee_salary_increases_employeeIdToemployees: {
          businesses: { isDemo: true }
        }
      }
    })

    console.log('\n💰 Salary Increase Statistics:')
    console.log(`   Average Increase: ${Number(increaseStats._avg.increasePercent || 0).toFixed(2)}%`)
    console.log(`   Average Amount: $${Number(increaseStats._avg.increaseAmount || 0).toLocaleString()}`)
    console.log(`   Total Amount: $${Number(increaseStats._sum.increaseAmount || 0).toLocaleString()}`)

    // Get sample employee salary history
    const employeesWithIncreases = await prisma.employees.findMany({
      where: {
        businesses: { isDemo: true },
        employee_salary_increases_employee_salary_increases_employeeIdToemployees: {
          some: {}
        }
      },
      include: {
        businesses: { select: { name: true } },
        job_titles: { select: { title: true } },
        employee_salary_increases_employee_salary_increases_employeeIdToemployees: {
          orderBy: { effectiveDate: 'asc' }
        }
      },
      take: 5
    })

    console.log('\n📈 Sample Employee Salary Progression:')
    for (const employee of employeesWithIncreases) {
      console.log(`\n   ${employee.fullName} (${employee.job_titles?.title}) - ${employee.businesses?.name}:`)
      const increases = employee.employee_salary_increases_employee_salary_increases_employeeIdToemployees

      for (let i = 0; i < increases.length; i++) {
        const increase = increases[i]
        const date = new Date(increase.effectiveDate).toLocaleDateString()
        console.log(`     ${i + 1}. ${date}: $${Number(increase.previousSalary).toLocaleString()} → $${Number(increase.newSalary).toLocaleString()} (+${Number(increase.increasePercent).toFixed(1)}%)`)
        console.log(`        Reason: ${increase.reason}`)
      }

      // Show current salary
      if (increases.length > 0) {
        const latestSalary = increases[increases.length - 1].newSalary
        console.log(`     Current Salary: $${Number(latestSalary).toLocaleString()}`)
      }
    }

    // Get salary distribution by business
    console.log('\n💼 Salary Increases by Business:')
    const businesses = await prisma.businesses.findMany({
      where: { isDemo: true },
      select: { id: true, name: true }
    })

    for (const business of businesses) {
      const businessIncreases = await prisma.employeeSalaryIncreases.aggregate({
        _count: true,
        _sum: {
          increaseAmount: true
        },
        where: {
          employees_employee_salary_increases_employeeIdToemployees: {
            primaryBusinessId: business.id
          }
        }
      })

      if (businessIncreases._count > 0) {
        console.log(`   ${business.name}:`)
        console.log(`     - Total Increases: ${businessIncreases._count}`)
        console.log(`     - Total Amount: $${Number(businessIncreases._sum.increaseAmount || 0).toLocaleString()}`)
      }
    }

    console.log('\n🧪 Testing:')
    console.log('   - View employee salary history')
    console.log('   - Process new salary increase requests')
    console.log('   - Check salary progression charts')
    console.log('   - Verify salary increase approvals')
    console.log('   - Test salary adjustment reports')

  } catch (error) {
    console.error('❌ Error seeding salary increases demo data:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seeding function
seedSalaryIncreases()
  .then(() => {
    console.log('\n✨ Seeding script completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Seeding script failed:', error)
    process.exit(1)
  })
