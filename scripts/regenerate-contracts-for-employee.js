#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function buildPdfData(employee, jobTitle, compensationType, business) {
  return {
    date: new Date().toLocaleDateString('en-GB'),
    employeeName: employee.fullName,
    employeeNumber: employee.employeeNumber,
    address: employee.address || null,
    phone: employee.phone || null,
    email: employee.email || null,
    jobTitle: jobTitle ? jobTitle.title : null,
    contractStartDate: employee.hireDate ? employee.hireDate.toISOString().split('T')[0] : null,
    contractEndDate: null,
    basicSalary: 800.00,
    compensationType: compensationType ? (compensationType.name || compensationType.type) : null,
    benefits: [
      { name: 'Transport Allowance', amount: 100.00, isPercentage: false, frequency: 'monthly' },
      { name: 'Housing Allowance', amount: 200.00, isPercentage: false, frequency: 'monthly' },
      { name: 'Performance Bonus', amount: 5.00, isPercentage: true, frequency: 'annual' }
    ],
    businessName: business ? business.name : null,
    businessType: business ? business.type : null,
    contractNumber: null,
    version: 1,
    umbrellaBusinessName: business ? (business.umbrellaBusinessName || 'Demo Umbrella Company') : null,
    notes: 'Regenerated pdfGenerationData'
  }
}

async function regenerate(employeeNumber = 'EMP1009') {
  try {
    console.log(`🔁 Regenerating contract pdfGenerationData for employee ${employeeNumber}...`)

    const employee = await prisma.employees.findUnique({ where: { employeeNumber } })
    if (!employee) {
      console.error(`❌ Employee not found: ${employeeNumber}`)
      return
    }

    const [jobTitle, compensationType, business] = await Promise.all([
      prisma.jobTitle.findUnique({ where: { id: employee.jobTitleId } }).catch(() => null),
      prisma.compensationType.findUnique({ where: { id: employee.compensationTypeId } }).catch(() => null),
      prisma.businesses.findUnique({ where: { id: employee.primaryBusinessId } }).catch(() => null)
    ])

    const contracts = await prisma.employeeContracts.findMany({ where: { employeeId: employee.id } })
    if (!contracts || contracts.length === 0) {
      console.log('ℹ️  No contracts found for employee; nothing to regenerate')
      return
    }

    for (const contract of contracts) {
      const pdfData = await buildPdfData(employee, jobTitle, compensationType, business)
      pdfData.contractNumber = contract.contractNumber || pdfData.contractNumber || `CT-${employee.employeeNumber}`

      await prisma.employeeContracts.update({
        where: { id: contract.id },
        data: {
          pdfGenerationData: pdfData,
          updatedAt: new Date()
        }
      })

      const fetched = await prisma.employeeContracts.findUnique({ where: { id: contract.id }, select: { contractNumber: true, pdfGenerationData: true } })
      console.log('✅ Regenerated for contract:', fetched.contractNumber)
      console.log('   pdfGenerationData:', fetched.pdfGenerationData)
    }

  } catch (err) {
    console.error('❌ Error regenerating contracts:', err)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  const argv = process.argv.slice(2)
  const emp = argv[0] || 'EMP1009'
  regenerate(emp)
}
