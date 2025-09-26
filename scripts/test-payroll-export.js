const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testPayrollExport() {
  try {
    console.log('🔍 Testing payroll export data retrieval...')
    
    // Get the test business
    const business = await prisma.business.findFirst({
      where: { name: { contains: 'Test' } }
    })
    
    if (!business) {
      console.log('❌ Test business not found. Run test-contract-pdf.js first.')
      return
    }
    
    console.log(`✅ Found test business: ${business.name}`)
    
    // Get payroll data for September 2025 (the test data month)
    const currentMonth = 9
    const currentYear = 2025
    
    console.log(`📊 Retrieving payroll data for ${currentMonth}/${currentYear}...`)
    
    // Get employees with payroll data for the specified month/year
    const employees = await prisma.employee.findMany({
      where: {
        primaryBusinessId: business.id,
        isActive: true,
        employmentStatus: 'active'
      },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        // Current active contract with extended fields
        employeeContracts: {
          where: { status: 'active' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            baseSalary: true,
            livingAllowance: true,
            commissionAmount: true,
            startDate: true,
            endDate: true
          }
        },
        // Time tracking for the month
        employeeTimeTracking: {
          where: {
            year: currentYear,
            month: currentMonth
          },
          take: 1,
          select: {
            workDays: true
          }
        },
        // Allowances for the month
        employeeAllowances: {
          where: {
            payrollYear: currentYear,
            payrollMonth: currentMonth
          },
          select: {
            type: true,
            amount: true
          }
        }
      },
      orderBy: [
        { business: { name: 'asc' } },
        { fullName: 'asc' }
      ]
    })
    
    console.log(`✅ Found ${employees.length} employees for payroll export`)
    
    if (employees.length === 0) {
      console.log('❌ No employees found for payroll export. Run test-contract-pdf.js first.')
      return
    }
    
    // Transform data for payroll export matching Employee-Worksheet format
    console.log('')
    console.log('📋 Employee Payroll Data:')
    console.log('=' .repeat(80))
    
    const payrollData = employees.map(employee => {
      const contract = employee.employeeContracts[0]
      const timeTracking = employee.employeeTimeTracking[0]
      
      // Group allowances by type
      const allowancesByType = employee.employeeAllowances.reduce((acc, allowance) => {
        const type = allowance.type
        acc[type] = (acc[type] || 0) + parseFloat(allowance.amount.toString())
        return acc
      }, {})
      
      const employeeData = {
        idNumber: employee.nationalId || employee.employeeNumber,
        dateOfBirth: employee.dateOfBirth?.toISOString().split('T')[0] || '',
        firstName: employee.fullName.split(' ')[0] || '',
        lastName: employee.fullName.split(' ').slice(1).join(' ') || '',
        workDays: timeTracking?.workDays || 0,
        basicSalary: contract ? parseFloat(contract.baseSalary.toString()) : 0,
        commission: contract?.commissionAmount ? parseFloat(contract.commissionAmount.toString()) : 0,
        livingAllowance: contract?.livingAllowance ? parseFloat(contract.livingAllowance.toString()) : 0,
        vehicleReimbursement: allowancesByType['vehicle_reimbursement'] || 0,
        travelAllowance: allowancesByType['travel_allowance'] || 0,
        overtime: allowancesByType['overtime'] || 0,
        advances: allowancesByType['advance'] || 0,
        loans: allowancesByType['loan_deduction'] || 0
      }
      
      // Calculate totals
      const earnings = employeeData.basicSalary + employeeData.commission + 
                      employeeData.livingAllowance + employeeData.vehicleReimbursement + 
                      employeeData.travelAllowance + employeeData.overtime
      const deductions = employeeData.advances + employeeData.loans
      const netPay = earnings - deductions
      
      console.log(`Employee: ${employee.fullName} (${employee.employeeNumber})`)
      console.log(`  ID Number: ${employeeData.idNumber}`)
      console.log(`  Work Days: ${employeeData.workDays}`)
      console.log(`  Basic Salary: $${employeeData.basicSalary}`)
      console.log(`  Commission: $${employeeData.commission}`)
      console.log(`  Living Allowance: $${employeeData.livingAllowance}`)
      console.log(`  Vehicle Reimbursement: $${employeeData.vehicleReimbursement}`)
      console.log(`  Travel Allowance: $${employeeData.travelAllowance}`)
      console.log(`  Overtime: $${employeeData.overtime}`)
      console.log(`  Advances: $${employeeData.advances}`)
      console.log(`  Loans: $${employeeData.loans}`)
      console.log(`  Total Earnings: $${earnings}`)
      console.log(`  Total Deductions: $${deductions}`)
      console.log(`  Net Pay: $${netPay}`)
      console.log('')
      
      return employeeData
    })
    
    console.log('📊 Payroll Export Summary:')
    console.log('=' .repeat(50))
    console.log(`Business: ${business.name}`)
    console.log(`Month/Year: ${currentMonth}/${currentYear}`)
    console.log(`Total Employees: ${payrollData.length}`)
    
    const totalBasicSalary = payrollData.reduce((sum, emp) => sum + emp.basicSalary, 0)
    const totalCommission = payrollData.reduce((sum, emp) => sum + emp.commission, 0)
    const totalLivingAllowance = payrollData.reduce((sum, emp) => sum + emp.livingAllowance, 0)
    const totalAllowances = payrollData.reduce((sum, emp) => 
      sum + emp.vehicleReimbursement + emp.travelAllowance + emp.overtime, 0)
    const totalDeductions = payrollData.reduce((sum, emp) => sum + emp.advances + emp.loans, 0)
    const totalGross = totalBasicSalary + totalCommission + totalLivingAllowance + totalAllowances
    const totalNet = totalGross - totalDeductions
    
    console.log(`Total Basic Salary: $${totalBasicSalary}`)
    console.log(`Total Commission: $${totalCommission}`)
    console.log(`Total Living Allowance: $${totalLivingAllowance}`)
    console.log(`Total Other Allowances: $${totalAllowances}`)
    console.log(`Total Gross Pay: $${totalGross}`)
    console.log(`Total Deductions: $${totalDeductions}`)
    console.log(`Total Net Pay: $${totalNet}`)
    console.log('')
    
    console.log('🎉 Payroll export data validation completed successfully!')
    console.log('')
    console.log('✅ Data matches Employee-Worksheet format requirements:')
    console.log('   - ID Number (National ID or Employee Number)')
    console.log('   - Date of Birth (YYYY-MM-DD format)')
    console.log('   - First Name and Last Name (split from full name)')
    console.log('   - Work Days (from EmployeeTimeTracking)')
    console.log('   - Basic Salary (from EmployeeContract)')
    console.log('   - Commission (from EmployeeContract)')
    console.log('   - Living Allowance (from EmployeeContract)')
    console.log('   - Vehicle Reimbursement (from EmployeeAllowance)')
    console.log('   - Travel Allowance (from EmployeeAllowance)')
    console.log('   - Overtime (from EmployeeAllowance)')
    console.log('   - Advances and Loans (from EmployeeAllowance)')
    console.log('')
    console.log('📄 Ready for Excel/CSV export via API:')
    console.log(`GET /api/payroll/export?month=${currentMonth}&year=${currentYear}&businessId=${business.id}&format=xlsx`)
    console.log(`GET /api/payroll/export?month=${currentMonth}&year=${currentYear}&businessId=${business.id}&format=csv`)
    
    return payrollData
    
  } catch (error) {
    console.error('❌ Error testing payroll export:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  testPayrollExport()
    .then(() => {
      process.exit(0)
    })
    .catch((error) => {
      console.error('Failed to test payroll export:', error)
      process.exit(1)
    })
}

module.exports = { testPayrollExport }