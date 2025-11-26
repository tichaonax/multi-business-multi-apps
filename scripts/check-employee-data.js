const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkEmployeeData() {
  console.log('📊 CHECKING EMPLOYEE DATA QUALITY\n')
  console.log('='.repeat(70))

  try {
    // Get all employees with their contracts
    const employees = await prisma.employees.findMany({
      where: {
        primaryBusinessId: {
          in: ['restaurant-demo-business', 'grocery-demo-business', 'hardware-demo-business', 'clothing-demo-business']
        }
      },
      include: {
        employee_contracts_employee_contracts_employeeIdToemployees: {
          where: { status: 'active' },
          include: {
            job_titles: true,
            compensation_types: true,
          },
        },
        job_titles: true,
        compensation_types: true,
        users: true,
      },
      orderBy: { employeeNumber: 'asc' },
    })

    console.log(`\nFound ${employees.length} employees\n`)

    for (const emp of employees) {
      console.log(`\n📋 ${emp.employeeNumber} - ${emp.fullName}`)
      console.log(`   Business: ${emp.primaryBusinessId}`)
      console.log(`   📧 Email: ${emp.email || 'NOT SET'}`)
      console.log(`   📞 Phone: ${emp.phone || 'NOT SET'}`)
      console.log(`   🆔 National ID: ${emp.nationalId || 'NOT SET'}`)
      console.log(`   🎂 Date of Birth: ${emp.dateOfBirth ? emp.dateOfBirth.toISOString().split('T')[0] : 'NOT SET'}`)
      console.log(`   📅 Hire Date: ${emp.hireDate ? emp.hireDate.toISOString().split('T')[0] : 'NOT SET'}`)
      console.log(`   💼 Job Title: ${emp.job_titles?.title || 'NOT SET'}`)
      console.log(`   💰 Compensation Type: ${emp.compensation_types?.name || 'NOT SET'}`)
      console.log(`   👤 System User: ${emp.users ? `Yes (${emp.users.role})` : 'No'}`)

      if (emp.employee_contracts_employee_contracts_employeeIdToemployees && emp.employee_contracts_employee_contracts_employeeIdToemployees.length > 0) {
        const contract = emp.employee_contracts_employee_contracts_employeeIdToemployees[0]
        console.log(`   📄 Active Contract:`)
        console.log(`      Number: ${contract.contractNumber}`)
        console.log(`      Duration: ${contract.contractDurationMonths || 'NOT SET'} months`)
        console.log(`      Period: ${contract.startDate.toISOString().split('T')[0]} to ${contract.endDate ? contract.endDate.toISOString().split('T')[0] : 'NOT SET'}`)
        console.log(`      Base Salary: $${contract.baseSalary}`)
        console.log(`      Living Allowance: $${contract.livingAllowance || 0}`)
        console.log(`      Commission: ${contract.commissionAmount ? contract.commissionAmount + '%' : 'None'}`)
        console.log(`      Status: ${contract.status}`)
        console.log(`      Signed: Employee=${contract.employeeSignedAt ? 'Yes' : 'No'}, Manager=${contract.managerSignedAt ? 'Yes' : 'No'}`)
      } else {
        console.log(`   ⚠️  NO ACTIVE CONTRACT`)
      }
    }

    console.log('\n' + '='.repeat(70))
    console.log('📊 DATA COMPLETENESS SUMMARY')
    console.log('='.repeat(70))

    const stats = {
      total: employees.length,
      withEmail: employees.filter(e => e.email).length,
      withPhone: employees.filter(e => e.phone).length,
      withNationalId: employees.filter(e => e.nationalId).length,
      withDateOfBirth: employees.filter(e => e.dateOfBirth).length,
      withHireDate: employees.filter(e => e.hireDate).length,
      withJobTitle: employees.filter(e => e.jobTitleId).length,
      withCompensationType: employees.filter(e => e.compensationTypeId).length,
      withActiveContract: employees.filter(e => e.employee_contracts_employee_contracts_employeeIdToemployees && e.employee_contracts_employee_contracts_employeeIdToemployees.length > 0).length,
      withSystemUser: employees.filter(e => e.userId).length,
    }

    console.log(`Total Employees: ${stats.total}`)
    console.log(`With Email: ${stats.withEmail} (${Math.round(stats.withEmail/stats.total*100)}%)`)
    console.log(`With Phone: ${stats.withPhone} (${Math.round(stats.withPhone/stats.total*100)}%)`)
    console.log(`With National ID: ${stats.withNationalId} (${Math.round(stats.withNationalId/stats.total*100)}%)`)
    console.log(`With Date of Birth: ${stats.withDateOfBirth} (${Math.round(stats.withDateOfBirth/stats.total*100)}%)`)
    console.log(`With Hire Date: ${stats.withHireDate} (${Math.round(stats.withHireDate/stats.total*100)}%)`)
    console.log(`With Job Title: ${stats.withJobTitle} (${Math.round(stats.withJobTitle/stats.total*100)}%)`)
    console.log(`With Compensation Type: ${stats.withCompensationType} (${Math.round(stats.withCompensationType/stats.total*100)}%)`)
    console.log(`With Active Contract: ${stats.withActiveContract} (${Math.round(stats.withActiveContract/stats.total*100)}%)`)
    console.log(`With System User: ${stats.withSystemUser} (${Math.round(stats.withSystemUser/stats.total*100)}%)`)

    console.log('\n✅ Employee data check complete!')

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkEmployeeData()
