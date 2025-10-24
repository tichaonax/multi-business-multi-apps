import { PrismaClient, Prisma } from '@prisma/client'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

async function resolveFetch(): Promise<any> {
  if ((globalThis as any).fetch) return (globalThis as any).fetch
  return undefined
}

/**
 * Create a contract either by POSTing to the contracts API (when SEED_API_KEY is set)
 * or by creating it directly via Prisma. Returns the created contract record.
 */
export async function createContractViaApiOrDb(employeeId: string, payload: any = {}) {
  const seedApiKey = process.env.SEED_API_KEY
  const seedApiBase = process.env.SEED_API_BASE_URL || 'http://localhost:8080'
  // If SEED_API_KEY is provided, prefer calling the contracts API so the
  // server-side behavior (validation, PDF data handling, workflow) runs.
  if (seedApiKey) {
    const fetchFn = await resolveFetch()
    if (!fetchFn) {
      throw new Error('fetch is not available in this runtime. Ensure Node has global fetch or run in an environment with fetch enabled.')
    }

    const res = await fetchFn(`${seedApiBase}/api/employees/${employeeId}/contracts`, {
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

  // Fallback: create contract directly in DB. This helps local seed scripts
  // that run without SEED_API_KEY to still create usable contracts.
  // We keep the created record minimal but include baseSalary and status.
  const contractData: any = {
    id: payload.id || randomUUID(),
    employeeId,
    contractNumber: payload.contractNumber || `CON-${Date.now()}`,
    version: payload.version || 1,
    jobTitleId: payload.jobTitleId || null,
    compensationTypeId: payload.compensationTypeId || null,
    baseSalary: payload.baseSalary != null ? new Prisma.Decimal(Number(payload.baseSalary)) : new Prisma.Decimal(0),
    startDate: payload.startDate ? new Date(payload.startDate) : new Date(),
    primaryBusinessId: payload.primaryBusinessId || null,
    supervisorId: payload.supervisorId || null,
    supervisorName: payload.supervisorName || null,
    supervisorTitle: payload.supervisorTitle || null,
    previousContractId: payload.previousContractId || null,
    isCommissionBased: !!payload.isCommissionBased,
    isSalaryBased: payload.isSalaryBased !== undefined ? !!payload.isSalaryBased : true,
    createdBy: payload.createdBy || 'seed-script',
    status: payload.status || 'active',
    pdfGenerationData: payload.pdfGenerationData || null,
    umbrellaBusinessId: payload.umbrellaBusinessId || null,
    umbrellaBusinessName: payload.umbrellaBusinessName || null,
    businessAssignments: payload.businessAssignments || null,
    notes: payload.notes || ''
  }

  const created = await prisma.employeeContracts.create({ data: contractData })
  return created
}
