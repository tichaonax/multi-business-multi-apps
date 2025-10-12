#!/usr/bin/env node
const { createContractViaApiOrDb } = require('../src/lib/services/contract-service')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const SEEDED = ['EMP001','EMP002','EMP003','EMP004','EMP1009']

async function main() {
  try {
    const employees = await prisma.employees.findMany({ where: { employeeNumber: { in: SEEDED } } })
    let regenerated = 0
    for (const emp of employees) {
      const latest = await prisma.employeeContracts.findFirst({ where: { employeeId: emp.id }, orderBy: { createdAt: 'desc' } })
      if (!latest) {
        console.log('No contract found for', emp.employeeNumber)
        continue
      }
      const benefits = await prisma.contractBenefit.findMany({ where: { contractId: latest.id } }).catch(() => [])
      const payload = {
        jobTitleId: latest.jobTitleId,
        compensationTypeId: latest.compensationTypeId,
        baseSalary: latest.baseSalary ? String(latest.baseSalary) : undefined,
        startDate: latest.startDate ? latest.startDate.toISOString() : undefined,
        primaryBusinessId: latest.primaryBusinessId,
        supervisorId: latest.supervisorId || null,
        pdfContractData: latest.pdfGenerationData || null,
        umbrellaBusinessId: latest.umbrellaBusinessId || undefined,
        businessAssignments: latest.businessAssignments || undefined,
        contractBenefits: benefits.map(b => ({ benefitTypeId: b.benefitTypeId, amount: String(b.amount), isPercentage: !!b.isPercentage }))
      }

      await createContractViaApiOrDb(emp.id, payload)
      regenerated++
      console.log('Regenerated contract for', emp.employeeNumber)
    }
    console.log('Total regenerated:', regenerated)
    process.exit(0)
  } catch (err) {
    console.error('Error:', err)
    process.exit(1)
  }
}

main()
