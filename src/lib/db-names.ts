import fs from 'fs'
import path from 'path'

type MappingEntry = { from: string; to: string | null }

const mappingPath = path.join(process.cwd(), 'scripts', 'prisma-relation-renames-fuzzy-filtered.json')
let RAW: MappingEntry[] = []
try {
  if (fs.existsSync(mappingPath)) {
    const raw = fs.readFileSync(mappingPath, 'utf8')
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) RAW = parsed as MappingEntry[]
  }
} catch (err) {
  // noop - mapping may not exist in some environments
}

// Build prisma->db map and db->prisma map
const PRISMA_TO_DB = new Map<string, string>()
const DB_TO_PRISMA = new Map<string, string>()

for (const m of RAW) {
  if (!m || typeof m.from !== 'string') continue
  const db = m.from
  const prisma = typeof m.to === 'string' ? m.to : null
  if (prisma) {
    PRISMA_TO_DB.set(prisma, db)
    DB_TO_PRISMA.set(db, prisma)
  }
}

// Helper that given a prisma name or a db name returns the physical DB name.
export function getDbName(name: string): string {
  // if it's already a known db name, return it
  if (DB_TO_PRISMA.has(name)) return name
  // if it's a prisma name, map to db
  if (PRISMA_TO_DB.has(name)) return PRISMA_TO_DB.get(name) as string
  // fallback: return the input unchanged
  return name
}

// Convenience exported constants for commonly-used names (if present)
export const db = Object.fromEntries(Array.from(PRISMA_TO_DB.entries()).map(([p, d]) => [p, d])) as Record<string, string>

export default {
  getDbName,
  db,
}
