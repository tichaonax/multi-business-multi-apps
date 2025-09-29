import fs from 'fs'
import path from 'path'

// Crosswalk utility to map physical DB table/relation names (snake_case)
// to canonical Prisma/client names (camelCase) and back.

export type MappingEntry = { from: string; to: string }

let MAPPINGS: MappingEntry[] = []

const mappingFile = path.join(process.cwd(), 'scripts', 'prisma-relation-renames-fuzzy-filtered.json')
try {
  if (fs.existsSync(mappingFile)) {
    const raw = fs.readFileSync(mappingFile, 'utf8')
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      MAPPINGS = parsed.filter((p: any) => p && typeof p.from === 'string' && typeof p.to === 'string')
    }
  }
} catch (err) {
  // swallow errors — mapping will be empty
  console.warn('prisma-crosswalk: failed to load mapping file', mappingFile, err)
}

const dbToPrisma = new Map<string, string>()
const prismaToDb = new Map<string, string>()
for (const m of MAPPINGS) {
  dbToPrisma.set(m.from, m.to)
  prismaToDb.set(m.to, m.from)
}

/**
 * Convert a DB table name (snake_case) to the Prisma/client canonical name (camelCase).
 * Returns null if no mapping exists.
 */
export function dbNameToPrisma(dbName: string): string | null {
  return dbToPrisma.get(dbName) ?? null
}

/**
 * Convert a Prisma/client name (camelCase) to DB table name (snake_case).
 * Returns null if no mapping exists.
 */
export function prismaToDbName(prismaName: string): string | null {
  return prismaToDb.get(prismaName) ?? null
}

/**
 * Return the full mapping as an array of { from, to }.
 */
export function listMappings(): MappingEntry[] {
  return Array.from(MAPPINGS)
}

/**
 * Lookup helper that accepts either a DB name or Prisma name and returns the other if possible.
 */
export function lookup(name: string): { db?: string; prisma?: string } {
  if (dbToPrisma.has(name)) return { db: name, prisma: dbToPrisma.get(name) }
  if (prismaToDb.has(name)) return { db: prismaToDb.get(name), prisma: name }
  return {}
}

export default {
  dbNameToPrisma,
  prismaToDbName,
  listMappings,
  lookup,
}
