const { PrismaClient } = require('@prisma/client')
const { randomUUID } = require('crypto')
const prisma = new PrismaClient()

async function run({ employeeNumber, apply = false, createMissingTypes = false }) {
  try {
    // Find employee
    const employee = await prisma.employees.findUnique({
      where: { employeeNumber },
      include: {
        employee_contracts_employee_contracts_employeeIdToemployees: {
          include: { contract_benefits: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!employee) return console.log('Employee not found:', employeeNumber)

    const toCreate = []

    for (const c of (employee.employee_contracts_employee_contracts_employeeIdToemployees || [])) {
      const existing = c.contract_benefits || []
      const pd = c.pdfGenerationData || {}
      const benefits = Array.isArray(pd.benefits) ? pd.benefits : []

      if (existing.length > 0) continue // already has benefits relation rows
      if (!benefits.length) continue // nothing to migrate

      for (const b of benefits) {
        // normalize
        const name = b.name || (b.benefitType && b.benefitType.name) || null
        const amt = b.amount != null ? Number(b.amount) : null
        const isPercentage = !!b.isPercentage
        const notes = b.notes || null
        const benefitTypeIdFromPdf = b.benefitTypeId || null

        let benefitTypeId = null

        if (benefitTypeIdFromPdf) {
          // check exists
          const bt = await prisma.benefitType.findUnique({ where: { id: benefitTypeIdFromPdf } })
          if (bt) benefitTypeId = bt.id
        }

        if (!benefitTypeId && name) {
          // try find by name
          const btByName = await prisma.benefitType.findFirst({ where: { name } })
          if (btByName) benefitTypeId = btByName.id
        }

        if (!benefitTypeId && createMissingTypes && name) {
          // create a new benefit type
          const newId = randomUUID()
          const created = await prisma.benefitType.create({ data: { id: newId, name, type: 'other', isActive: true, createdAt: new Date(), updatedAt: new Date() } })
          benefitTypeId = created.id
        }

        toCreate.push({ contractId: c.id, benefitTypeId, amount: amt, isPercentage, notes, benefitName: name })
      }
    }

    if (toCreate.length === 0) {
      console.log('No contract benefits to migrate for', employeeNumber)
      return
    }

    console.log('Dry-run results: the following contract_benefits would be created:')
    for (const t of toCreate) {
      console.log('-', t)
    }

    if (!apply) {
      console.log('\nRun with --apply to persist changes. Use --create-types to create missing BenefitType entries when necessary.')
      return
    }

    // Apply changes in a transaction
    await prisma.$transaction(async (tx) => {
      for (const t of toCreate) {
        if (!t.benefitTypeId) {
          // if we can't resolve benefitTypeId stop to avoid FK violation
          throw new Error(`Cannot create contract_benefit for contract ${t.contractId} - benefitTypeId not resolved for benefit "${t.benefitName}". Re-run with --create-types to auto-create types.`)
        }

        await tx.contractBenefit.create({
          data: {
            id: randomUUID(),
            amount: t.amount != null ? t.amount : 0,
            notes: t.notes,
            benefitTypeId: t.benefitTypeId,
            contractId: t.contractId,
            createdAt: new Date(),
            isPercentage: t.isPercentage
          }
        })
        console.log('Created contract_benefit for contract', t.contractId, 'benefitTypeId', t.benefitTypeId)
      }
    })

    console.log('Migration applied successfully')
  } catch (err) {
    console.error('Migration error:', err)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  const argv = process.argv.slice(2)
  const opts = { employeeNumber: null, apply: false, createMissingTypes: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--apply') opts.apply = true
    else if (a === '--create-types') opts.createMissingTypes = true
    else if (a.startsWith('--employee=')) opts.employeeNumber = a.split('=')[1]
    else if (!opts.employeeNumber) opts.employeeNumber = a
  }
  if (!opts.employeeNumber) {
    console.log('Usage: node migrate-pdf-benefits-to-contract_benefits.js <EMPLOYEE_NUMBER> [--apply] [--create-types]')
    process.exit(1)
  }
  run(opts)
}

module.exports = { run }
