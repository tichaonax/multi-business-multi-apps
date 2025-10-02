const { PrismaClient, Prisma } = require('@prisma/client')
const { randomUUID } = require('crypto')

const prisma = new PrismaClient()

async function seedContractCTEMP1009(options = {}) {
  console.log('🔧 Seeding contract CT-EMP1009...')

  if (options.dryRun) {
    console.log('(dry-run) Skipping CT-EMP1009 seed')
    }
  // Reasonable assumption: employeeNumber EMP1009 for this seeded contract
  const employeeNumber = 'EMP1009'

  let employee = await prisma.employee.findUnique({ where: { employeeNumber } })
  if (!employee) {
    const newEmp = {
      id: randomUUID(),
      employeeNumber,
      // Use realistic employee details requested by the user
      fullName: 'Michael Davis',
      firstName: 'Michael',
      lastName: 'Davis',
      email: 'michael.davis@techcorp.com',
      phone: '+263-78-545-3103',
      address: '789 Pine St, City, State 12345',
      nationalId: `SEED-1009-${Date.now().toString().slice(-4)}`,
      primaryBusinessId: business.id,
      compensationTypeId: compensationType.id,
      jobTitleId: jobTitle.id,
      hireDate: new Date('2025-09-29'),
      isActive: true,
      createdAt: new Date('2025-09-29'),
      updatedAt: new Date('2025-09-29')
    }

    employee = await prisma.employee.create({ data: newEmp })
    console.log(`✅ Created employee ${employee.fullName} (${employee.employeeNumber})`)
  } else {
    console.log(`ℹ️  Employee ${employee.fullName} (${employee.employeeNumber}) already exists`)
    // Update existing employee with more realistic contact/address details requested
    try {
      const updatedEmp = await prisma.employee.update({ where: { id: employee.id }, data: {
        fullName: 'Michael Davis',
        firstName: 'Michael',
        lastName: 'Davis',
        email: 'michael.davis@techcorp.com',
        phone: '+263-78-545-3103',
        address: '789 Pine St, City, State 12345',
        updatedAt: new Date('2025-09-29')
      }})
      employee = updatedEmp
      console.log(`✅ Updated employee contact details for ${employee.employeeNumber}`)
    } catch (err) {
      console.error('⚠️ Failed to update existing employee details:', err.message)
    }
  }

  // Prepare pdfGenerationData payload expected by the client PDF generator
  const pdfGenerationData = {
    date: '29/09/2025',
    employeeName: employee.fullName,
    employeeNumber: employee.employeeNumber,
    // Fix field mappings to match PDF generator expectations
    employeeAddress: employee.address || null,
    employeePhone: employee.phone || null,
    employeeEmail: employee.email || null,
    nationalId: employee.nationalId || null,
    jobTitle: jobTitle.title,
    contractStartDate: '2025-09-29',
    contractEndDate: null,
    basicSalary: 800.00,
    compensationType: compensationType.name || compensationType.type || 'Salary',
    // Helpful for the PDF renderer: include some common benefits so the PDF shows them
    benefits: [
      {
        name: 'Transport Allowance',
        amount: 100.00,
        isPercentage: false,
        frequency: 'monthly',
        description: 'Monthly transport allowance for work-related travel'
      },
      {
        name: 'Housing Allowance',
        amount: 200.00,
        isPercentage: false,
        frequency: 'monthly',
        description: 'Monthly housing allowance'
      },
      {
        name: 'Performance Bonus',
        amount: 5.00,
        isPercentage: true,
        frequency: 'annual',
        description: 'Annual performance-based bonus (% of basic salary)'
      }
    ],
    businessName: business.name,
    businessType: business.type,
    contractNumber: 'CT-EMP1009',
    version: 1,
    umbrellaBusinessName: business.umbrellaBusinessName || 'Demo Umbrella Company',
    notes: 'Seeded contract for UI PDF test'
  }

  // Upsert contract by contractNumber
  // Prefer creating the contract via the application's contracts API so that
  // the same server-side logic runs as when users create contracts. When a
  // SEED_API_KEY is present in env, include it as a header for a dev-only flow.
  const seedApiKey = process.env.SEED_API_KEY
  const apiUrl = process.env.SEED_API_BASE_URL || 'http://localhost:8080'

  let apiSucceeded = false
  // get dev manager fallback
  const { getOrCreateDevManager } = require('../src/lib/dev/dev-manager')
  const devMgr = await getOrCreateDevManager(prisma)
  if (seedApiKey) {
    try {
      console.log('🔌 Attempting to POST contract via contracts API')
      const response = await fetch(`${apiUrl}/api/employees/${employee.id}/contracts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-seed-api-key': seedApiKey
        },
        body: JSON.stringify({
          jobTitleId: jobTitle.id,
          compensationTypeId: compensationType.id,
          baseSalary: 800.00,
          startDate: '2025-09-29',
              primaryBusinessId: business.id,
              // Ensure supervisorId is present; fall back to employee supervisor or dev manager if missing
              supervisorId: employee.supervisorId || devMgr?.id || null,
          pdfContractData: pdfGenerationData,
          umbrellaBusinessId: business.umbrellaBusinessId || null,
          businessAssignments: null
        })
      })

      if (response.ok) {
        const r = await response.json()
        console.log('✅ Contracts API created contract:', r.contractNumber || r.id || '(no contractNumber returned)')
        apiSucceeded = true
      } else {
        console.warn('⚠️ Contracts API returned non-OK status:', response.status)
        const body = await response.text().catch(() => '')
        console.warn('Contracts API response body:', body)
      }
    } catch (err) {
      console.warn('⚠️ Failed to POST to contracts API, falling back to direct DB upsert:', err.message)
    }
  } else {
    console.log('ℹ️ SEED_API_KEY not configured; skipping API POST and using DB upsert')
  }

    if (!apiSucceeded) {
      const existing = await prisma.employeeContract.findUnique({ where: { contractNumber: 'CT-EMP1009' } })
      if (existing) {
        const updated = await prisma.employeeContract.update({
          where: { id: existing.id },
          data: {
            pdfGenerationData,
            baseSalary: new Prisma.Decimal(800.00),
            status: 'active',
            startDate: new Date('2025-09-29'),
            updatedAt: new Date('2025-09-29')
          }
        })
        console.log(`✅ Updated existing contract ${updated.contractNumber} (id: ${updated.id}) with pdfGenerationData`)
      } else {
        try {
          const { createContractViaApiOrDb } = require('../src/lib/services/contract-service')
          const created = await createContractViaApiOrDb(employee.id, {
            contractNumber: 'CT-EMP1009',
            version: 1,
            baseSalary: 800.0,
            compensationTypeId: compensationType.id,
            jobTitleId: jobTitle.id,
            startDate: '2025-09-29',
            status: 'active',
            createdBy: 'seed-script',
            pdfGenerationData,
            primaryBusinessId: business.id
          ,
            supervisorId: employee.supervisorId || devMgr?.id || null
          })
          console.log(`✅ Created contract ${created.contractNumber || created.id} (id: ${created.id || 'n/a'}) with pdfGenerationData`)
        } catch (err) {
          console.error('\u274c Failed to create contract via helper in upsert fallback:', err && err.message ? err.message : err)
        }
      }
    }

  // Quick verification read
  const fetched = await prisma.employeeContract.findUnique({ where: { contractNumber: 'CT-EMP1009' }, select: { id: true, contractNumber: true, pdfGenerationData: true, baseSalary: true, status: true, startDate: true } })
  console.log('📋 Verification fetch:', fetched)

  await prisma.$disconnect()
}

// Allow programmatic import
module.exports = { seedContractCTEMP1009 }

// Execute when run directly
if (require.main === module) {
  seedContractCTEMP1009().catch((err) => {
    console.error('Seed script error:', err)
    prisma.$disconnect().finally(() => process.exit(1))
  })
}
