const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkContractData() {
  try {
    const contractNumber = 'CON1763863031107'

    console.log(`\n🔍 Checking contract: ${contractNumber}\n`)

    const contract = await prisma.employeeContracts.findFirst({
      where: { contractNumber },
      include: {
        job_titles: true,
        businesses_employee_contracts_primaryBusinessIdTobusinesses: true,
        employees_employee_contracts_employeeIdToemployees: {
          select: { fullName: true, employeeNumber: true }
        }
      }
    })

    if (!contract) {
      console.log('❌ Contract not found')
      return
    }

    console.log('Contract Data:')
    console.log('─'.repeat(50))
    console.log(`Contract Number: ${contract.contractNumber}`)
    console.log(`Status: ${contract.status}`)
    console.log(`Employee: ${contract.employees_employee_contracts_employeeIdToemployees?.fullName || 'N/A'}`)
    console.log(`\nForeign Keys in Database:`)
    console.log(`  jobTitleId: ${contract.jobTitleId || 'NULL ❌'}`)
    console.log(`  primaryBusinessId: ${contract.primaryBusinessId || 'NULL ❌'}`)
    console.log(`\nJoined Data:`)
    console.log(`  Job Title: ${contract.job_titles?.title || 'N/A (no join result)'}`)
    console.log(`  Business: ${contract.businesses_employee_contracts_primaryBusinessIdTobusinesses?.name || 'N/A (no join result)'}`)
    console.log(`\nDates:`)
    console.log(`  Start Date: ${contract.startDate}`)
    console.log(`  End Date: ${contract.endDate || 'NULL (Ongoing)'}`)
    console.log(`\nSignatures:`)
    console.log(`  Employee Signed: ${contract.employeeSignedAt || 'Not signed'}`)
    console.log(`  Manager Signed: ${contract.managerSignedAt || 'Not signed'}`)

    // Check if we can find the data from pdfGenerationData
    if (contract.pdfGenerationData) {
      console.log(`\n📄 PDF Generation Data (fallback):`)
      const pdfData = contract.pdfGenerationData
      console.log(`  Job Title: ${pdfData.jobTitle?.title || 'N/A'}`)
      console.log(`  Business: ${pdfData.business?.name || 'N/A'}`)
      console.log(`  End Date: ${pdfData.endDate || 'N/A'}`)
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkContractData()
