/**
 * Smoke test: create a new contract prefilling previousContractId and verify
 * that previousContractId is stored in DB column and not embedded into
 * pdfGenerationData or notes.
 *
 * Usage: node ./scripts/smoke-create-contract.js
 */

const { PrismaClient } = require('@prisma/client')
const { randomUUID } = require('crypto')

async function run() {
  const prisma = new PrismaClient()
  try {
    console.log('🔌 Connected to DB')

    // Pick the first employee in the DB
    const employee = await prisma.employees.findFirst()
    if (!employee) {
      console.error('No employee found in DB. Seed some data first.')
      process.exit(2)
    }
    console.log('👤 Using employee:', employee.id, employee.fullName)

    // Find latest contract for employee
    const latest = await prisma.employeeContracts.findFirst({ where: { employeeId: employee.id }, orderBy: { createdAt: 'desc' } })
    if (!latest) {
      console.error('No existing contract found for employee. Creating a contract without previousContractId for test.')
    } else {
      console.log('🧾 Latest contract:', latest.id, latest.contractNumber)
    }

    const previousId = latest ? latest.id : null

    const createData = {
      id: randomUUID(),
      employeeId: employee.id,
      contractNumber: 'SMK' + Date.now(),
      version: 1,
      jobTitleId: employee.jobTitleId || null,
      compensationTypeId: employee.compensationTypeId || null,
      baseSalary: 1000,
      startDate: new Date(),
      primaryBusinessId: employee.primaryBusinessId || null,
      supervisorId: employee.supervisorId || null,
      previousContractId: previousId,
      isCommissionBased: false,
      isSalaryBased: true,
      createdBy: 'smoke-test',
      status: 'pending_signature',
      pdfGenerationData: { testFlag: true },
      notes: 'Smoke test contract'
    }

    const created = await prisma.employeeContracts.create({ data: createData })
    console.log('✅ Created contract:', created.id, created.contractNumber)

    const fetched = await prisma.employeeContracts.findUnique({ where: { id: created.id } })
    console.log('🔎 Fetched contract from DB:', {
      id: fetched.id,
      previousContractId: fetched.previousContractId,
      hasPdfPrevious: fetched.pdfGenerationData && fetched.pdfGenerationData.previousContractId,
      notes: fetched.notes
    })

    if (previousId) {
      if (fetched.previousContractId === previousId) {
        console.log('✔ previousContractId saved in DB column')
      } else {
        console.error('✖ previousContractId NOT saved in DB column')
      }
    }

    if (fetched.pdfGenerationData && fetched.pdfGenerationData.previousContractId) {
      console.error('✖ previousContractId was embedded into pdfGenerationData (unexpected)')
    } else {
      console.log('✔ pdfGenerationData.previousContractId not present')
    }

    if (typeof fetched.notes === 'string' && fetched.notes.match(/\[BASED_ON:/)) {
      console.error('✖ notes contain [BASED_ON: tag (unexpected)')
    } else {
      console.log('✔ notes do not contain [BASED_ON: tag')
    }

    // Cleanup: delete created contract
    await prisma.employeeContracts.delete({ where: { id: created.id } })
    console.log('🧹 Deleted test contract')

    process.exit(0)
  } catch (err) {
    console.error('Test failed:', err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

run()
