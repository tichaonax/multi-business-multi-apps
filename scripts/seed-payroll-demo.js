const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * Seed Payroll Periods & Calculations Demo Data
 * Creates realistic payroll periods with comprehensive calculations
 */

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomDecimal(min, max, decimals = 2) {
  const value = Math.random() * (max - min) + min
  return parseFloat(value.toFixed(decimals))
}

function getMonthDates(year, month) {
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0)
  return { startDate, endDate }
}

function getCurrentMonth() {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

function getLastMonth() {
  const now = new Date()
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return { year: lastMonth.getFullYear(), month: lastMonth.getMonth() + 1 }
}

async function seedPayrollPeriods() {
  console.log('💰 Starting Payroll Periods & Calculations Demo Data Seeding...\n')

  try {
    // Get admin user for transactions
    const adminUser = await prisma.users.findFirst({
      where: { email: { contains: 'admin' } },
      select: { id: true }
    })

    if (!adminUser) {
      console.log('❌ No admin user found. Cannot create payroll periods.')
      return
    }

    // ═══════════════════════════════════════════════════════════
    // RESTAURANT DEMO - 2 Payroll Periods (Current + Last Month)
    // ═══════════════════════════════════════════════════════════
    const restaurant = await prisma.businesses.findFirst({
      where: { type: 'restaurant', isDemo: true },
      select: { id: true, name: true }
    })

    if (restaurant) {
      console.log(`🍽️  Creating payroll periods for: ${restaurant.name}\n`)

      // Get restaurant employees
      const employees = await prisma.employees.findMany({
        where: { primaryBusinessId: restaurant.id },
        include: {
          compensation_types: {
            select: {
              baseAmount: true,
              commissionPercentage: true,
              frequency: true
            }
          },
          employee_contracts_employee_contracts_employeeIdToemployees: {
            where: { status: 'active' },
            select: { baseSalary: true },
            orderBy: { createdAt: 'desc' },
            take: 1
          },
          employee_allowances_employee_allowances_employeeIdToemployees: {
            select: { amount: true, type: true }
          },
          employee_loans_employee_loans_employeeIdToemployees: {
            where: {
              status: 'active',
              remainingBalance: { gt: 0 }
            },
            select: { monthlyDeduction: true, remainingBalance: true }
          }
        }
      })

      console.log(`   Found ${employees.length} employees\n`)

      // Get payroll account
      const payrollAccount = await prisma.payrollAccounts.findFirst({
        where: { businessId: restaurant.id },
        select: { id: true, accountNumber: true }
      })

      // Create Last Month Payroll Period (Approved & Closed)
      const lastMonth = getLastMonth()
      const lastMonthDates = getMonthDates(lastMonth.year, lastMonth.month)

      let lastMonthPeriod = await prisma.payrollPeriods.findFirst({
        where: {
          businessId: restaurant.id,
          year: lastMonth.year,
          month: lastMonth.month
        }
      })

      if (!lastMonthPeriod) {
        console.log(`   📅 Creating Last Month Period (${lastMonth.year}-${String(lastMonth.month).padStart(2, '0')})`)

        let totalGross = 0
        let totalDeductions = 0
        let totalNet = 0

        // Create period first
        lastMonthPeriod = await prisma.payrollPeriods.create({
          data: {
            businessId: restaurant.id,
            year: lastMonth.year,
            month: lastMonth.month,
            periodStart: lastMonthDates.startDate,
            periodEnd: lastMonthDates.endDate,
            status: 'closed',
            totalEmployees: employees.length,
            totalGrossPay: 0, // Will update after entries
            totalDeductions: 0,
            totalNetPay: 0,
            createdBy: adminUser.id,
            approvedBy: adminUser.id,
            approvedAt: new Date(lastMonthDates.endDate.getTime() + 86400000 * 2), // 2 days after period end
            closedAt: new Date(lastMonthDates.endDate.getTime() + 86400000 * 5), // 5 days after period end
            notes: 'December payroll - All payments completed'
          }
        })

        // Create payroll entries for each employee
        for (const employee of employees) {
          const baseSalary = employee.employee_contracts_employee_contracts_employeeIdToemployees?.[0]?.baseSalary
            ? Number(employee.employee_contracts_employee_contracts_employeeIdToemployees[0].baseSalary)
            : Number(employee.compensation_types?.baseAmount || 3500)

          // Calculate allowances
          let livingAllowance = 0
          let vehicleAllowance = 0
          let travelAllowance = 0

          employee.employee_allowances_employee_allowances_employeeIdToemployees?.forEach(allowance => {
            const amount = Number(allowance.amount)
            if (allowance.type === 'living') livingAllowance += amount
            if (allowance.type === 'vehicle') vehicleAllowance += amount
            if (allowance.type === 'travel') travelAllowance += amount
          })

          // Overtime (random for restaurant workers)
          const overtimeHours = randomDecimal(5, 20)
          const overtimeRate = (baseSalary / 160) * 1.5 // 160 work hours per month, 1.5x rate
          const overtimePay = overtimeHours * overtimeRate

          // Commission (for servers)
          const commission = employee.fullName.includes('Server') ? randomDecimal(200, 500) : 0

          // Benefits (health insurance, etc)
          const benefitsTotal = randomDecimal(150, 300)
          const benefitsBreakdown = {
            healthInsurance: randomDecimal(100, 200),
            lifeInsurance: randomDecimal(50, 100)
          }

          // Deductions
          const loanDeduction = employee.employee_loans_employee_loans_employeeIdToemployees?.[0]?.monthlyDeduction
            ? Number(employee.employee_loans_employee_loans_employeeIdToemployees[0].monthlyDeduction)
            : 0

          const advanceDeduction = randomInt(0, 1) === 1 ? randomDecimal(100, 500) : 0
          const advanceBreakdown = advanceDeduction > 0 ? {
            description: 'Salary advance repayment',
            amount: advanceDeduction
          } : null

          const miscDeductions = randomDecimal(50, 150) // Social security, etc

          // Calculate totals
          const grossPay = baseSalary + commission + livingAllowance + vehicleAllowance +
                          travelAllowance + overtimePay + benefitsTotal

          const totalDeductionsEmp = loanDeduction + advanceDeduction + miscDeductions
          const netPay = grossPay - totalDeductionsEmp

          totalGross += grossPay
          totalDeductions += totalDeductionsEmp
          totalNet += netPay

          // Create payroll entry
          await prisma.payrollEntries.create({
            data: {
              payrollPeriodId: lastMonthPeriod.id,
              employeeId: employee.id,
              employeeNumber: employee.employeeNumber,
              employeeName: employee.fullName,
              nationalId: employee.nationalId,
              dateOfBirth: employee.dateOfBirth,
              hireDate: employee.hireDate,

              baseSalary: baseSalary,
              commission: commission,
              livingAllowance: livingAllowance,
              vehicleAllowance: vehicleAllowance,
              travelAllowance: travelAllowance,
              overtimeHours: overtimeHours,
              overtimePay: overtimePay,

              benefitsTotal: benefitsTotal,
              benefitsBreakdown: benefitsBreakdown,

              loanDeductions: loanDeduction,
              advanceDeductions: advanceDeduction,
              advanceBreakdown: advanceBreakdown,
              miscDeductions: miscDeductions,

              grossPay: grossPay,
              totalDeductions: totalDeductionsEmp,
              netPay: netPay,

              absenceDays: randomInt(0, 2),
              leaveDays: randomInt(0, 1),

              notes: 'Payment completed via bank transfer'
            }
          })

          // Create payment from payroll account
          if (payrollAccount) {
            await prisma.payrollAccountPayments.create({
              data: {
                payrollAccountId: payrollAccount.id,
                employeeId: employee.id,
                amount: netPay,
                paymentDate: new Date(lastMonthDates.endDate.getTime() + 86400000 * 3), // 3 days after period end
                paymentType: 'regular_salary',
                status: 'COMPLETED',
                isAdvance: false,
                isLocked: true,
                createdBy: adminUser.id,
                createdAt: new Date(lastMonthDates.endDate.getTime() + 86400000 * 3)
              }
            })
          }
        }

        // Update period totals
        await prisma.payrollPeriods.update({
          where: { id: lastMonthPeriod.id },
          data: {
            totalGrossPay: totalGross,
            totalDeductions: totalDeductions,
            totalNetPay: totalNet
          }
        })

        console.log(`      ✅ Created ${employees.length} payroll entries`)
        console.log(`      💰 Total Gross: $${totalGross.toLocaleString()}`)
        console.log(`      💸 Total Deductions: $${totalDeductions.toLocaleString()}`)
        console.log(`      💵 Total Net Pay: $${totalNet.toLocaleString()}`)
        console.log(`      📊 Status: Closed (All payments completed)\n`)
      } else {
        console.log(`   ✅ Last month period already exists\n`)
      }

      // Create Current Month Payroll Period (Draft)
      const currentMonth = getCurrentMonth()
      const currentMonthDates = getMonthDates(currentMonth.year, currentMonth.month)

      let currentMonthPeriod = await prisma.payrollPeriods.findFirst({
        where: {
          businessId: restaurant.id,
          year: currentMonth.year,
          month: currentMonth.month
        }
      })

      if (!currentMonthPeriod) {
        console.log(`   📅 Creating Current Month Period (${currentMonth.year}-${String(currentMonth.month).padStart(2, '0')})`)

        let totalGross = 0
        let totalDeductions = 0
        let totalNet = 0

        // Create period first
        currentMonthPeriod = await prisma.payrollPeriods.create({
          data: {
            businessId: restaurant.id,
            year: currentMonth.year,
            month: currentMonth.month,
            periodStart: currentMonthDates.startDate,
            periodEnd: currentMonthDates.endDate,
            status: 'draft',
            totalEmployees: employees.length,
            totalGrossPay: 0,
            totalDeductions: 0,
            totalNetPay: 0,
            createdBy: adminUser.id,
            notes: 'Current month payroll - In progress'
          }
        })

        // Create payroll entries for each employee
        for (const employee of employees) {
          const baseSalary = employee.employee_contracts_employee_contracts_employeeIdToemployees?.[0]?.baseSalary
            ? Number(employee.employee_contracts_employee_contracts_employeeIdToemployees[0].baseSalary)
            : Number(employee.compensation_types?.baseAmount || 3500)

          // Calculate allowances
          let livingAllowance = 0
          let vehicleAllowance = 0
          let travelAllowance = 0

          employee.employee_allowances_employee_allowances_employeeIdToemployees?.forEach(allowance => {
            const amount = Number(allowance.amount)
            if (allowance.type === 'living') livingAllowance += amount
            if (allowance.type === 'vehicle') vehicleAllowance += amount
            if (allowance.type === 'travel') travelAllowance += amount
          })

          // Different overtime for current month
          const overtimeHours = randomDecimal(3, 15)
          const overtimeRate = (baseSalary / 160) * 1.5
          const overtimePay = overtimeHours * overtimeRate

          // Commission
          const commission = employee.fullName.includes('Server') ? randomDecimal(150, 400) : 0

          // Benefits
          const benefitsTotal = randomDecimal(150, 300)
          const benefitsBreakdown = {
            healthInsurance: randomDecimal(100, 200),
            lifeInsurance: randomDecimal(50, 100)
          }

          // Deductions
          const loanDeduction = employee.employee_loans_employee_loans_employeeIdToemployees?.[0]?.monthlyDeduction
            ? Number(employee.employee_loans_employee_loans_employeeIdToemployees[0].monthlyDeduction)
            : 0

          const advanceDeduction = randomInt(0, 1) === 1 ? randomDecimal(100, 400) : 0
          const advanceBreakdown = advanceDeduction > 0 ? {
            description: 'Salary advance repayment',
            amount: advanceDeduction
          } : null

          const miscDeductions = randomDecimal(50, 150)

          // Calculate totals
          const grossPay = baseSalary + commission + livingAllowance + vehicleAllowance +
                          travelAllowance + overtimePay + benefitsTotal

          const totalDeductionsEmp = loanDeduction + advanceDeduction + miscDeductions
          const netPay = grossPay - totalDeductionsEmp

          totalGross += grossPay
          totalDeductions += totalDeductionsEmp
          totalNet += netPay

          // Create payroll entry
          await prisma.payrollEntries.create({
            data: {
              payrollPeriodId: currentMonthPeriod.id,
              employeeId: employee.id,
              employeeNumber: employee.employeeNumber,
              employeeName: employee.fullName,
              nationalId: employee.nationalId,
              dateOfBirth: employee.dateOfBirth,
              hireDate: employee.hireDate,

              baseSalary: baseSalary,
              commission: commission,
              livingAllowance: livingAllowance,
              vehicleAllowance: vehicleAllowance,
              travelAllowance: travelAllowance,
              overtimeHours: overtimeHours,
              overtimePay: overtimePay,

              benefitsTotal: benefitsTotal,
              benefitsBreakdown: benefitsBreakdown,

              loanDeductions: loanDeduction,
              advanceDeductions: advanceDeduction,
              advanceBreakdown: advanceBreakdown,
              miscDeductions: miscDeductions,

              grossPay: grossPay,
              totalDeductions: totalDeductionsEmp,
              netPay: netPay,

              absenceDays: randomInt(0, 1),
              leaveDays: randomInt(0, 1),

              notes: 'Pending approval and payment'
            }
          })
        }

        // Update period totals
        await prisma.payrollPeriods.update({
          where: { id: currentMonthPeriod.id },
          data: {
            totalGrossPay: totalGross,
            totalDeductions: totalDeductions,
            totalNetPay: totalNet
          }
        })

        console.log(`      ✅ Created ${employees.length} payroll entries`)
        console.log(`      💰 Total Gross: $${totalGross.toLocaleString()}`)
        console.log(`      💸 Total Deductions: $${totalDeductions.toLocaleString()}`)
        console.log(`      💵 Total Net Pay: $${totalNet.toLocaleString()}`)
        console.log(`      📊 Status: Draft (Pending approval)\n`)
      } else {
        console.log(`   ✅ Current month period already exists\n`)
      }
    }

    // ═══════════════════════════════════════════════════════════
    // GROCERY DEMO #1 - 1 Payroll Period (Last Month, Closed)
    // ═══════════════════════════════════════════════════════════
    const grocery = await prisma.businesses.findFirst({
      where: { type: 'grocery', isDemo: true },
      select: { id: true, name: true }
    })

    if (grocery) {
      console.log(`🛒 Creating payroll period for: ${grocery.name}\n`)

      // Get grocery employees
      const employees = await prisma.employees.findMany({
        where: { primaryBusinessId: grocery.id },
        include: {
          compensation_types: {
            select: {
              baseAmount: true,
              commissionPercentage: true,
              frequency: true
            }
          },
          employee_contracts_employee_contracts_employeeIdToemployees: {
            where: { status: 'active' },
            select: { baseSalary: true },
            orderBy: { createdAt: 'desc' },
            take: 1
          },
          employee_allowances_employee_allowances_employeeIdToemployees: {
            select: { amount: true, type: true }
          },
          employee_loans_employee_loans_employeeIdToemployees: {
            where: {
              status: 'active',
              remainingBalance: { gt: 0 }
            },
            select: { monthlyDeduction: true, remainingBalance: true }
          }
        }
      })

      console.log(`   Found ${employees.length} employees\n`)

      // Get payroll account
      const payrollAccount = await prisma.payrollAccounts.findFirst({
        where: { businessId: grocery.id },
        select: { id: true, accountNumber: true }
      })

      // Create Last Month Payroll Period (Fully Processed)
      const lastMonth = getLastMonth()
      const lastMonthDates = getMonthDates(lastMonth.year, lastMonth.month)

      let lastMonthPeriod = await prisma.payrollPeriods.findFirst({
        where: {
          businessId: grocery.id,
          year: lastMonth.year,
          month: lastMonth.month
        }
      })

      if (!lastMonthPeriod) {
        console.log(`   📅 Creating Last Month Period (${lastMonth.year}-${String(lastMonth.month).padStart(2, '0')})`)

        let totalGross = 0
        let totalDeductions = 0
        let totalNet = 0

        // Create period first
        lastMonthPeriod = await prisma.payrollPeriods.create({
          data: {
            businessId: grocery.id,
            year: lastMonth.year,
            month: lastMonth.month,
            periodStart: lastMonthDates.startDate,
            periodEnd: lastMonthDates.endDate,
            status: 'closed',
            totalEmployees: employees.length,
            totalGrossPay: 0,
            totalDeductions: 0,
            totalNetPay: 0,
            createdBy: adminUser.id,
            approvedBy: adminUser.id,
            approvedAt: new Date(lastMonthDates.endDate.getTime() + 86400000 * 1),
            closedAt: new Date(lastMonthDates.endDate.getTime() + 86400000 * 3),
            notes: 'December payroll - Fully processed and paid'
          }
        })

        // Create payroll entries for each employee
        for (const employee of employees) {
          const baseSalary = Number(employee.compensation_types?.baseSalary || 3000)

          // Calculate allowances
          let livingAllowance = 0
          let vehicleAllowance = 0
          let travelAllowance = 0

          employee.employee_allowances_employee_allowances_employeeIdToemployees?.forEach(allowance => {
            const amount = Number(allowance.amount)
            if (allowance.type === 'living') livingAllowance += amount
            if (allowance.type === 'vehicle') vehicleAllowance += amount
            if (allowance.type === 'travel') travelAllowance += amount
          })

          // Overtime (common in grocery stores)
          const overtimeHours = randomDecimal(8, 25)
          const overtimeRate = (baseSalary / 160) * 1.5
          const overtimePay = overtimeHours * overtimeRate

          // Commission (for department managers)
          const commission = employee.fullName.includes('Manager') ? randomDecimal(250, 600) : 0

          // Benefits
          const benefitsTotal = randomDecimal(150, 350)
          const benefitsBreakdown = {
            healthInsurance: randomDecimal(120, 250),
            lifeInsurance: randomDecimal(30, 100)
          }

          // Deductions
          const loanDeduction = employee.employee_loans_employee_loans_employeeIdToemployees?.[0]?.monthlyDeduction
            ? Number(employee.employee_loans_employee_loans_employeeIdToemployees[0].monthlyDeduction)
            : 0

          const advanceDeduction = randomInt(0, 1) === 1 ? randomDecimal(150, 550) : 0
          const advanceBreakdown = advanceDeduction > 0 ? {
            description: 'Salary advance repayment',
            amount: advanceDeduction
          } : null

          const miscDeductions = randomDecimal(60, 180)

          // Calculate totals
          const grossPay = baseSalary + commission + livingAllowance + vehicleAllowance +
                          travelAllowance + overtimePay + benefitsTotal

          const totalDeductionsEmp = loanDeduction + advanceDeduction + miscDeductions
          const netPay = grossPay - totalDeductionsEmp

          totalGross += grossPay
          totalDeductions += totalDeductionsEmp
          totalNet += netPay

          // Create payroll entry
          await prisma.payrollEntries.create({
            data: {
              payrollPeriodId: lastMonthPeriod.id,
              employeeId: employee.id,
              employeeNumber: employee.employeeNumber,
              employeeName: employee.fullName,
              nationalId: employee.nationalId,
              dateOfBirth: employee.dateOfBirth,
              hireDate: employee.hireDate,

              baseSalary: baseSalary,
              commission: commission,
              livingAllowance: livingAllowance,
              vehicleAllowance: vehicleAllowance,
              travelAllowance: travelAllowance,
              overtimeHours: overtimeHours,
              overtimePay: overtimePay,

              benefitsTotal: benefitsTotal,
              benefitsBreakdown: benefitsBreakdown,

              loanDeductions: loanDeduction,
              advanceDeductions: advanceDeduction,
              advanceBreakdown: advanceBreakdown,
              miscDeductions: miscDeductions,

              grossPay: grossPay,
              totalDeductions: totalDeductionsEmp,
              netPay: netPay,

              absenceDays: randomInt(0, 2),
              leaveDays: randomInt(0, 2),

              notes: 'Payment completed - All employees paid'
            }
          })

          // Create payment from payroll account
          if (payrollAccount) {
            await prisma.payrollAccountPayments.create({
              data: {
                payrollAccountId: payrollAccount.id,
                employeeId: employee.id,
                amount: netPay,
                paymentDate: new Date(lastMonthDates.endDate.getTime() + 86400000 * 2),
                paymentType: 'regular_salary',
                status: 'COMPLETED',
                isAdvance: false,
                isLocked: true,
                createdBy: adminUser.id,
                createdAt: new Date(lastMonthDates.endDate.getTime() + 86400000 * 2)
              }
            })
          }
        }

        // Update period totals
        await prisma.payrollPeriods.update({
          where: { id: lastMonthPeriod.id },
          data: {
            totalGrossPay: totalGross,
            totalDeductions: totalDeductions,
            totalNetPay: totalNet
          }
        })

        console.log(`      ✅ Created ${employees.length} payroll entries`)
        console.log(`      💰 Total Gross: $${totalGross.toLocaleString()}`)
        console.log(`      💸 Total Deductions: $${totalDeductions.toLocaleString()}`)
        console.log(`      💵 Total Net Pay: $${totalNet.toLocaleString()}`)
        console.log(`      📊 Status: Closed (All employees paid)\n`)
      } else {
        console.log(`   ✅ Payroll period already exists\n`)
      }
    }

    // ═══════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════
    console.log('╔════════════════════════════════════════════════════════════╗')
    console.log('║    ✅ Payroll Periods Demo Seeding Complete!              ║')
    console.log('╚════════════════════════════════════════════════════════════╝')

    // Get final summary
    const allPeriods = await prisma.payrollPeriods.findMany({
      where: {
        businesses: { isDemo: true }
      },
      include: {
        businesses: { select: { name: true } },
        _count: { select: { payroll_entries: true } }
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' }
      ]
    })

    console.log('\n📊 Summary:')
    console.log(`   Total Payroll Periods: ${allPeriods.length}`)

    console.log('\n💼 Payroll Periods Created:')
    for (const period of allPeriods) {
      const monthName = new Date(period.year, period.month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      console.log(`   ${period.businesses?.name}:`)
      console.log(`     - Period: ${monthName}`)
      console.log(`     - Status: ${period.status}`)
      console.log(`     - Employees: ${period._count.payroll_entries}`)
      console.log(`     - Gross Pay: $${Number(period.totalGrossPay).toLocaleString()}`)
      console.log(`     - Deductions: $${Number(period.totalDeductions).toLocaleString()}`)
      console.log(`     - Net Pay: $${Number(period.totalNetPay).toLocaleString()}`)
    }

    console.log('\n🧪 Testing:')
    console.log('   - View payroll periods dashboard')
    console.log('   - Check payroll calculations accuracy')
    console.log('   - Test payroll approval workflow')
    console.log('   - Verify payment tracking')
    console.log('   - Export payroll reports')

  } catch (error) {
    console.error('❌ Error seeding payroll periods demo data:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seeding function
seedPayrollPeriods()
  .then(() => {
    console.log('\n✨ Seeding script completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Seeding script failed:', error)
    process.exit(1)
  })
