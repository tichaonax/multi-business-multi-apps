/**
 * Fix Duplicate Active Contracts
 *
 * This script finds employees with multiple active contracts and marks
 * older ones as expired, keeping only the most recent active contract.
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixDuplicateActiveContracts() {
  console.log('🔍 Finding employees with duplicate active contracts...\n')

  try {
    // Get all employees with their active contracts
    const employees = await prisma.employee.findMany({
      include: {
        employee_contracts_employee_contracts_employeeIdToemployees: {
          where: {
            status: 'active'
          },
          orderBy: {
            createdAt: 'desc' // Most recent first
          },
          select: {
            id: true,
            contractNumber: true,
            createdAt: true,
            startDate: true,
            endDate: true
          }
        }
      }
    })

    let fixedCount = 0
    let employeesWithDuplicates = 0

    for (const employee of employees) {
      const activeContracts = employee.employee_contracts_employee_contracts_employeeIdToemployees

      // If employee has more than one active contract
      if (activeContracts.length > 1) {
        employeesWithDuplicates++
        console.log(`👤 Employee: ${employee.fullName} (${employee.employeeNumber})`)
        console.log(`   Found ${activeContracts.length} active contracts:`)

        // Keep the first one (most recent), expire the rest
        const [keepContract, ...expireContracts] = activeContracts

        console.log(`   ✅ KEEPING: ${keepContract.contractNumber} (created ${keepContract.createdAt.toISOString()})`)

        for (const oldContract of expireContracts) {
          console.log(`   ❌ EXPIRING: ${oldContract.contractNumber} (created ${oldContract.createdAt.toISOString()})`)

          // Set end date to the start date of the newer contract, or today if no start date
          const endDate = keepContract.startDate || new Date()

          await prisma.employeeContract.update({
            where: { id: oldContract.id },
            data: {
              status: 'expired',
              endDate: endDate
            }
          })

          fixedCount++
        }

        console.log('')
      }
    }

    console.log('\n✅ Cleanup Complete!')
    console.log(`   Employees with duplicates: ${employeesWithDuplicates}`)
    console.log(`   Contracts expired: ${fixedCount}`)

  } catch (error) {
    console.error('❌ Error fixing duplicate contracts:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
fixDuplicateActiveContracts()
  .then(() => {
    console.log('\n✨ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error)
    process.exit(1)
  })
