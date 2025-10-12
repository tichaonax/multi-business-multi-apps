const { PrismaClient } = require('@prisma/client')
const { generateEmployeeContractPDF } = require('../src/lib/contract-pdf-generator')

const prisma = new PrismaClient()

async function testPDFGeneration() {
  try {
    console.log('🔍 Testing contract PDF generation...')
    
    // Get the test employee and contract
    const employee = await prisma.employees.findFirst({
      where: { employeeNumber: 'EMP001' },
      include: {
        jobTitle: true,
        compensationType: true,
        primaryBusiness: true,
        employeeContracts: {
          where: { status: 'active' },
          include: {
            jobTitle: true,
            compensationType: true,
            primaryBusiness: true
          }
        }
      }
    })
    
    if (!employee) {
      console.log('❌ Test employee not found. Run test-contract-pdf.js first.')
      return
    }
    
    if (employee.employeeContracts.length === 0) {
      console.log('❌ No active contract found for test employee.')
      return
    }
    
    const contract = employee.employeeContracts[0]
    
    console.log(`✅ Found test employee: ${employee.fullName}`)
    console.log(`✅ Found active contract: ${contract.contractNumber}`)
    console.log(`   Basic Salary: $${contract.baseSalary}`)
    console.log(`   Living Allowance: $${contract.livingAllowance}`)
    console.log(`   Commission: $${contract.commissionAmount}`)
    console.log('')
    
    console.log('📄 Generating PDF...')
    
    // Generate the PDF
    const pdfBuffer = await generateEmployeeContractPDF(contract, employee)
    
    if (pdfBuffer && pdfBuffer.length > 0) {
      console.log(`✅ PDF generated successfully!`)
      console.log(`   PDF size: ${pdfBuffer.length} bytes`)
      console.log(`   PDF type: ${typeof pdfBuffer}`)
      
      // Save PDF to a test file
      const fs = require('fs')
      const path = require('path')
      
      const pdfPath = path.join(__dirname, `test-contract-${employee.employeeNumber}.pdf`)
      fs.writeFileSync(pdfPath, pdfBuffer)
      
      console.log(`✅ PDF saved to: ${pdfPath}`)
      console.log('')
      console.log('🎉 Contract PDF generation test completed successfully!')
      console.log('')
      console.log('📋 PDF should contain:')
      console.log(`   - Employee: ${employee.fullName}`)
      console.log(`   - Employee ID: ${employee.employeeNumber}`)
      console.log(`   - Position: ${contract.jobTitle?.title || 'N/A'}`)
      console.log(`   - Basic Salary: $${contract.baseSalary}`)
      console.log(`   - Living Allowance: $${contract.livingAllowance || 0}`)
      console.log(`   - Commission: $${contract.commissionAmount || 0}`)
      console.log(`   - Total Monthly: $${parseFloat(contract.baseSalary) + parseFloat(contract.livingAllowance || 0) + parseFloat(contract.commissionAmount || 0)}`)
      console.log(`   - Contract Duration: ${contract.contractDurationMonths || 'N/A'} months`)
      console.log(`   - Start Date: ${contract.startDate?.toDateString()}`)
      console.log(`   - End Date: ${contract.endDate?.toDateString()}`)
      console.log(`   - Supervisor: ${contract.supervisorName}`)
      console.log(`   - Business: ${contract.primaryBusiness?.name}`)
      
    } else {
      console.log('❌ PDF generation failed - no buffer returned')
    }
    
  } catch (error) {
    console.error('❌ Error testing PDF generation:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  testPDFGeneration()
    .then(() => {
      process.exit(0)
    })
    .catch((error) => {
      console.error('Failed to test PDF generation:', error)
      process.exit(1)
    })
}

module.exports = { testPDFGeneration }