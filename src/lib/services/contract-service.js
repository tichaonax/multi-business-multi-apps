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

  // Enforce API-only behavior
  if (!seedApiKey) {
    throw new Error('SEED_API_KEY is not set. Regeneration requires calling the application contracts API. Set SEED_API_KEY in your environment to enable API-based seeding.')
  }

  if (!fetch) {
    throw new Error('fetch is not available in this runtime. Ensure Node has global fetch or run in an environment with fetch enabled.')
  }

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

module.exports = { createContractViaApiOrDb }
