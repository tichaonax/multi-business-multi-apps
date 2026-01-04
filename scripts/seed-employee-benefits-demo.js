const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * Seed Employee Benefits Demo Data
 * Creates benefit types and assigns benefits to demo employees
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

async function seedEmployeeBenefits() {
  console.log('💼 Starting Employee Benefits Demo Data Seeding...\n')

  try {
    // ═══════════════════════════════════════════════════════════
    // CREATE BENEFIT TYPES (if they don't exist)
    // ═══════════════════════════════════════════════════════════
    console.log('📋 Creating Benefit Types...\n')

    const benefitTypesData = [
      {
        name: 'Health Insurance',
        description: 'Medical and hospital coverage',
        type: 'insurance',
        defaultAmount: 250.00,
        isPercentage: false
      },
      {
        name: 'Dental Insurance',
        description: 'Dental care coverage',
        type: 'insurance',
        defaultAmount: 75.00,
        isPercentage: false
      },
      {
        name: 'Life Insurance',
        description: 'Life insurance coverage',
        type: 'insurance',
        defaultAmount: 50.00,
        isPercentage: false
      },
      {
        name: 'Retirement Plan',
        description: '401(k) matching contribution',
        type: 'retirement',
        defaultAmount: 5.00,
        isPercentage: true
      },
      {
        name: 'Transportation Allowance',
        description: 'Monthly transportation stipend',
        type: 'allowance',
        defaultAmount: 100.00,
        isPercentage: false
      },
      {
        name: 'Meal Allowance',
        description: 'Daily meal stipend for restaurant employees',
        type: 'allowance',
        defaultAmount: 150.00,
        isPercentage: false
      },
      {
        name: 'Housing Allowance',
        description: 'Monthly housing assistance',
        type: 'allowance',
        defaultAmount: 500.00,
        isPercentage: false
      },
      {
        name: 'Professional Development',
        description: 'Training and education budget',
        type: 'development',
        defaultAmount: 1000.00,
        isPercentage: false
      }
    ]

    const benefitTypes = {}
    let benefitTypesCreated = 0

    for (const benefitData of benefitTypesData) {
      let benefitType = await prisma.benefitTypes.findUnique({
        where: { name: benefitData.name }
      })

      if (!benefitType) {
        benefitType = await prisma.benefitTypes.create({
          data: benefitData
        })
        console.log(`   ✅ Created benefit type: ${benefitData.name}`)
        benefitTypesCreated++
      } else {
        console.log(`   ✅ Using existing benefit type: ${benefitData.name}`)
      }

      benefitTypes[benefitData.name] = benefitType
    }

    console.log(`\n   📊 Total benefit types: ${Object.keys(benefitTypes).length} (${benefitTypesCreated} new)\n`)

    // ═══════════════════════════════════════════════════════════
    // ASSIGN BENEFITS TO DEMO EMPLOYEES
    // ═══════════════════════════════════════════════════════════
    console.log('👥 Assigning Benefits to Demo Employees...\n')

    // Get all demo businesses
    const demoBusinesses = await prisma.businesses.findMany({
      where: { isDemo: true },
      select: { id: true, name: true, type: true }
    })

    let totalBenefitsAssigned = 0

    for (const business of demoBusinesses) {
      console.log(`   💼 Processing employees for: ${business.name}`)

      // Get employees for this business
      const employees = await prisma.employees.findMany({
        where: { primaryBusinessId: business.id },
        include: {
          job_titles: {
            select: { title: true }
          },
          employee_benefits: {
            select: { benefitTypeId: true }
          }
        }
      })

      console.log(`      Found ${employees.length} employees`)

      for (const employee of employees) {
        const isManager = employee.job_titles?.title?.toLowerCase().includes('manager') || false
        const existingBenefitTypeIds = employee.employee_benefits.map(b => b.benefitTypeId)

        // HEALTH INSURANCE - For managers and some senior staff
        if (isManager || randomInt(0, 2) === 1) {
          if (!existingBenefitTypeIds.includes(benefitTypes['Health Insurance'].id)) {
            await prisma.employeeBenefits.create({
              data: {
                employeeId: employee.id,
                benefitTypeId: benefitTypes['Health Insurance'].id,
                amount: randomDecimal(200, 300),
                effectiveDate: getDaysAgo(randomInt(90, 365)),
                isActive: true,
                isPercentage: false,
                notes: 'Full medical and hospital coverage'
              }
            })
            totalBenefitsAssigned++
          }
        }

        // DENTAL INSURANCE - For managers and half of staff
        if (isManager || randomInt(0, 1) === 1) {
          if (!existingBenefitTypeIds.includes(benefitTypes['Dental Insurance'].id)) {
            await prisma.employeeBenefits.create({
              data: {
                employeeId: employee.id,
                benefitTypeId: benefitTypes['Dental Insurance'].id,
                amount: randomDecimal(60, 90),
                effectiveDate: getDaysAgo(randomInt(90, 365)),
                isActive: true,
                isPercentage: false,
                notes: 'Dental care and orthodontics coverage'
              }
            })
            totalBenefitsAssigned++
          }
        }

        // LIFE INSURANCE - For all employees
        if (!existingBenefitTypeIds.includes(benefitTypes['Life Insurance'].id)) {
          await prisma.employeeBenefits.create({
            data: {
              employeeId: employee.id,
              benefitTypeId: benefitTypes['Life Insurance'].id,
              amount: isManager ? randomDecimal(75, 100) : randomDecimal(40, 60),
              effectiveDate: getDaysAgo(randomInt(90, 365)),
              isActive: true,
              isPercentage: false,
              notes: 'Basic life insurance coverage'
            }
          })
          totalBenefitsAssigned++
        }

        // RETIREMENT PLAN - For managers
        if (isManager) {
          if (!existingBenefitTypeIds.includes(benefitTypes['Retirement Plan'].id)) {
            await prisma.employeeBenefits.create({
              data: {
                employeeId: employee.id,
                benefitTypeId: benefitTypes['Retirement Plan'].id,
                amount: randomDecimal(4, 6),
                effectiveDate: getDaysAgo(randomInt(180, 365)),
                isActive: true,
                isPercentage: true,
                notes: 'Company matching up to 5% of salary'
              }
            })
            totalBenefitsAssigned++
          }
        }

        // TRANSPORTATION ALLOWANCE - For all staff
        if (!existingBenefitTypeIds.includes(benefitTypes['Transportation Allowance'].id)) {
          await prisma.employeeBenefits.create({
            data: {
              employeeId: employee.id,
              benefitTypeId: benefitTypes['Transportation Allowance'].id,
              amount: isManager ? randomDecimal(120, 150) : randomDecimal(80, 120),
              effectiveDate: getDaysAgo(randomInt(60, 180)),
              isActive: true,
              isPercentage: false,
              notes: 'Monthly public transportation or fuel allowance'
            }
          })
          totalBenefitsAssigned++
        }

        // MEAL ALLOWANCE - For restaurant employees
        if (business.type === 'restaurant') {
          if (!existingBenefitTypeIds.includes(benefitTypes['Meal Allowance'].id)) {
            await prisma.employeeBenefits.create({
              data: {
                employeeId: employee.id,
                benefitTypeId: benefitTypes['Meal Allowance'].id,
                amount: randomDecimal(120, 180),
                effectiveDate: getDaysAgo(randomInt(30, 180)),
                isActive: true,
                isPercentage: false,
                notes: 'Daily meal allowance for restaurant staff'
              }
            })
            totalBenefitsAssigned++
          }
        }

        // HOUSING ALLOWANCE - For managers only
        if (isManager && randomInt(0, 1) === 1) {
          if (!existingBenefitTypeIds.includes(benefitTypes['Housing Allowance'].id)) {
            await prisma.employeeBenefits.create({
              data: {
                employeeId: employee.id,
                benefitTypeId: benefitTypes['Housing Allowance'].id,
                amount: randomDecimal(400, 600),
                effectiveDate: getDaysAgo(randomInt(180, 365)),
                isActive: true,
                isPercentage: false,
                notes: 'Monthly housing assistance for management'
              }
            })
            totalBenefitsAssigned++
          }
        }

        // PROFESSIONAL DEVELOPMENT - For some managers
        if (isManager && randomInt(0, 2) === 1) {
          if (!existingBenefitTypeIds.includes(benefitTypes['Professional Development'].id)) {
            await prisma.employeeBenefits.create({
              data: {
                employeeId: employee.id,
                benefitTypeId: benefitTypes['Professional Development'].id,
                amount: randomDecimal(800, 1500),
                effectiveDate: getDaysAgo(randomInt(60, 180)),
                isActive: true,
                isPercentage: false,
                notes: 'Annual training and certification budget'
              }
            })
            totalBenefitsAssigned++
          }
        }
      }

      console.log(`      ✅ Benefits assigned\n`)
    }

    // ═══════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════
    console.log('╔════════════════════════════════════════════════════════════╗')
    console.log('║    ✅ Employee Benefits Demo Seeding Complete!            ║')
    console.log('╚════════════════════════════════════════════════════════════╝')

    console.log('\n📊 Summary:')
    console.log(`   Benefit Types Created: ${benefitTypesCreated}`)
    console.log(`   Total Benefits Assigned: ${totalBenefitsAssigned}`)

    // Get final statistics
    const benefitStats = await prisma.employeeBenefits.groupBy({
      by: ['benefitTypeId'],
      _count: true,
      where: {
        employees: {
          businesses: { isDemo: true }
        }
      }
    })

    console.log('\n💰 Benefits Distribution:')
    for (const stat of benefitStats) {
      const benefitType = Object.values(benefitTypes).find(bt => bt.id === stat.benefitTypeId)
      console.log(`   ${benefitType?.name}: ${stat._count} employees`)
    }

    // Get total benefit cost per business
    console.log('\n💵 Monthly Benefit Costs by Business:')
    for (const business of demoBusinesses) {
      const employeesWithBenefits = await prisma.employees.findMany({
        where: { primaryBusinessId: business.id },
        include: {
          employee_benefits: {
            where: { isActive: true },
            include: {
              benefit_types: true
            }
          }
        }
      })

      let totalCost = 0
      for (const employee of employeesWithBenefits) {
        for (const benefit of employee.employee_benefits) {
          if (benefit.isPercentage) {
            // For percentage benefits, use a sample salary for demo
            totalCost += (3500 * (Number(benefit.amount) / 100))
          } else {
            totalCost += Number(benefit.amount)
          }
        }
      }

      console.log(`   ${business.name}: $${totalCost.toLocaleString()} per month`)
    }

    console.log('\n🧪 Testing:')
    console.log('   - View employee benefits dashboard')
    console.log('   - Add/remove benefits for employees')
    console.log('   - Check benefit cost calculations')
    console.log('   - Test benefit activation/deactivation')
    console.log('   - Verify benefits appear in payroll calculations')

  } catch (error) {
    console.error('❌ Error seeding employee benefits demo data:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seeding function
seedEmployeeBenefits()
  .then(() => {
    console.log('\n✨ Seeding script completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Seeding script failed:', error)
    process.exit(1)
  })
