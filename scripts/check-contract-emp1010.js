import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkContract() {
  try {
    const employee = await prisma.employees.findFirst({
      where: { employeeNumber: 'EMP1010' },
      include: {
        employee_contracts_employee_contracts_employeeIdToemployees: {
          where: { contractNumber: 'CT-EMP1010' },
          select: {
            id: true,
            contractNumber: true,
            status: true,
            employeeSignedAt: true,
            managerSignedAt: true,
            createdAt: true
          }
        }
      }
    })

    if (!employee) {
      console.log('❌ Employee EMP1010 not found')
      return
    }

    console.log('\n=== EMPLOYEE INFO ===')
    console.log(`Name: ${employee.fullName}`)
    console.log(`Employee Number: ${employee.employeeNumber}`)
    console.log(`Status: ${employee.employmentStatus}`)

    const contracts = employee.employee_contracts_employee_contracts_employeeIdToemployees
    if (!contracts || contracts.length === 0) {
      console.log('\n❌ No contract CT-EMP1010 found')
      return
    }

    const contract = contracts[0]
    console.log('\n=== CONTRACT INFO ===')
    console.log(`Contract Number: ${contract.contractNumber}`)
    console.log(`Status: ${contract.status}`)
    console.log(`Created: ${contract.createdAt}`)
    console.log(`\n📝 SIGNATURES:`)
    console.log(`  Employee Signed: ${contract.employeeSignedAt ? '✅ ' + contract.employeeSignedAt : '❌ NOT SIGNED'}`)
    console.log(`  Manager Signed: ${contract.managerSignedAt ? '✅ ' + contract.managerSignedAt : '❌ NOT SIGNED'}`)

    console.log('\n=== APPROVE BUTTON LOGIC ===')
    console.log(`Should show "✓ Approve" button if:`)
    console.log(`  ✓ User has canApproveEmployeeContracts permission`)
    console.log(`  ${contract.employeeSignedAt ? '✅' : '❌'} contract.employeeSignedAt exists`)
    console.log(`  ${!contract.managerSignedAt ? '✅' : '❌'} contract.managerSignedAt is null`)

    const shouldShow = contract.employeeSignedAt && !contract.managerSignedAt
    console.log(`\n${shouldShow ? '✅ BUTTON SHOULD SHOW' : '❌ BUTTON SHOULD NOT SHOW'}`)

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkContract()
