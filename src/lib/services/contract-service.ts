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
  const seedApiBase = process.env.SEED_API_BASE_URL || 'http://localhost:3000'

  // Enforce API-only behavior: require SEED_API_KEY and a fetch implementation
  if (!seedApiKey) {
    throw new Error('SEED_API_KEY is not set. Regeneration requires calling the application contracts API. Set SEED_API_KEY in your environment to enable API-based seeding.')
  }

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
