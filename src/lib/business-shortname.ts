import { PrismaClient } from '@prisma/client'

export function computeShortName(name?: string | null) {
  if (!name) return null
  const parts = String(name).split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 4).toUpperCase()
  const acronym = parts.map((p) => p[0]).join('').slice(0, 4).toUpperCase()
  return acronym
}

/**
 * Generate a shortName based on the business name and ensure it doesn't clash with existing records.
 * If the base shortName exists, append a numeric suffix (1,2,3...) until unique.
 */
export async function generateUniqueShortName(prisma: PrismaClient, name?: string | null) {
  const base = computeShortName(name) || 'BUS'
  let candidate = base
  let suffix = 1
  // Loop until we find a candidate that doesn't exist yet
  // Defensive cap to avoid infinite loops
  // Use a raw query to check existence to avoid compile-time Prisma client schema mismatch
  // (shortName was recently added to the Prisma schema and client may not be regenerated locally yet)
  // The query returns rows if a business with the shortName exists.
  // We limit attempts with a safe upper bound.
  while (true) {
    // Note: table name and column names are quoted for Postgres compatibility
    const rows: Array<{ id: string }> = (await prisma.$queryRaw`
      SELECT id FROM "businesses" WHERE "shortName" = ${candidate} LIMIT 1
    `) as any
    if (!rows || rows.length === 0) break
    candidate = `${base}${suffix}`
    suffix += 1
    if (suffix > 1000) break
  }
  return candidate
}
