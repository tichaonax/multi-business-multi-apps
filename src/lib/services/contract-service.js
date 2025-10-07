const fetch = globalThis.fetch || undefined
const { PrismaClient, Prisma } = require('@prisma/client')
const { randomUUID } = require('crypto')

const prisma = new PrismaClient()

/**
 * Create a contract either by POSTing to the contracts API (when SEED_API_KEY is set)
 * or by creating it directly via Prisma. Returns the created contract record.
 */
async function createContractViaApiOrDb(employeeId, payload = {}) {
  const seedApiKey = process.env.SEED_API_KEY
  const seedApiBase = process.env.SEED_API_BASE_URL || 'http://localhost:3000'

  // If SEED_API_KEY is present, prefer posting to the running app's contracts API
  if (seedApiKey && fetch) {
    const res = await fetch(`${seedApiBase}/api/employees/${employeeId}/contracts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-seed-api-key': seedApiKey },
      body: JSON.stringify(payload)
    })

    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      throw new Error(`Contracts API returned ${res.status}: ${txt}`)
    }

    return await res.json()
  }

  // Fallback: create directly in DB (useful for local seeding without running API)
  // Validate required fields
  const { jobTitleId, compensationTypeId, baseSalary, startDate, primaryBusinessId } = payload
  if (!jobTitleId || !compensationTypeId || !baseSalary || !startDate || !primaryBusinessId) {
    throw new Error('Missing required contract fields for DB fallback: jobTitleId, compensationTypeId, baseSalary, startDate, primaryBusinessId')
  }

  const numericSalary = Number(baseSalary)
  if (!isFinite(numericSalary) || numericSalary <= 0) {
    throw new Error('Invalid baseSalary for DB fallback; must be a positive number')
  }

  const createData = {
    id: payload.id || randomUUID(),
    employeeId,
    contractNumber: payload.contractNumber || `CON${Date.now()}`,
    version: payload.version || 1,
    jobTitleId,
    compensationTypeId,
    baseSalary: new Prisma.Decimal(numericSalary),
    startDate: new Date(startDate),
    primaryBusinessId,
    supervisorId: payload.supervisorId || null,
    supervisorName: payload.supervisorName || null,
    supervisorTitle: payload.supervisorTitle || null,
    previousContractId: payload.previousContractId || null,
    isCommissionBased: payload.isCommissionBased || false,
    isSalaryBased: payload.isSalaryBased !== undefined ? payload.isSalaryBased : true,
    createdBy: payload.createdBy || 'seed-fallback',
    status: payload.status || 'active',
    pdfGenerationData: payload.pdfGenerationData || null,
    umbrellaBusinessId: payload.umbrellaBusinessId || null,
    umbrellaBusinessName: payload.umbrellaBusinessName || null,
    businessAssignments: payload.businessAssignments || null,
    notes: payload.notes || ''
  }

  return await prisma.employeeContract.create({ data: createData })
}

module.exports = { createContractViaApiOrDb }
