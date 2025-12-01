import { readFileSync } from 'fs'
import { join } from 'path'

// Parses prisma schema to get field types for BigInt and Decimal so we can
// convert JSON strings back to these appropriate types during restore.

export type FieldType = 'BigInt' | 'Decimal' | 'Other'
export type SchemaMap = Record<string, Record<string, FieldType>>

function pascalToSnake(s: string) {
  return s
    .split('')
    .map((char, idx) => {
      if (idx > 0 && char >= 'A' && char <= 'Z') {
        return '_' + char.toLowerCase()
      }
      return char.toLowerCase()
    })
    .join('')
}

export function parsePrismaSchemaForTypes(schemaPath?: string): SchemaMap {
  const path = schemaPath || join(process.cwd(), 'prisma', 'schema.prisma')
  const schema = readFileSync(path, 'utf8')

  const lines = schema.split('\n')
  const map: SchemaMap = {}

  let currentModel = ''
  let currentTable = ''

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const line = raw.trim()

    // detect model
    const modelMatch = line.match(/^model\s+(\w+)\s+\{/) // model MyModel {
    if (modelMatch) {
      currentModel = modelMatch[1]
      currentTable = pascalToSnake(currentModel)
      map[currentTable] = map[currentTable] || {}
      continue
    }

    // detect @@map("table_name") mapping inside model block
    const mapMatch = line.match(/^@@map\("([a-z0-9_]+)"\)/i)
    if (mapMatch && currentModel) {
      currentTable = mapMatch[1]
      map[currentTable] = map[currentTable] || {}
      continue
    }

    // end of model block
    if (line.startsWith('}')) {
      currentModel = ''
      currentTable = ''
      continue
    }

    // detect fields with type BigInt or Decimal
    const fieldMatch = line.match(/^(\w+)\s+(\w+)(\?|\s)/)
    if (fieldMatch && currentTable) {
      const fieldName = fieldMatch[1]
      const fieldType = fieldMatch[2]
      if (fieldType === 'BigInt') {
        map[currentTable][fieldName] = 'BigInt'
      } else if (fieldType === 'Decimal') {
        map[currentTable][fieldName] = 'Decimal'
      } else {
        // other types ignored
      }
    }
  }

  return map
}

export function convertBackupTypes(backupData: any, schemaMap?: SchemaMap): any {
  const map = schemaMap || parsePrismaSchemaForTypes()

  // For each top-level key (table name) in backupData, try to convert fields
  const converted = { ...backupData }

  for (const [key, value] of Object.entries(backupData)) {
    // We expect many top-level keys to be plural forms of model names: e.g., "businesses" maps to `businesses` table
    // We'll try to match to our schema map by directly looking for key or fallback to snake_case singular
    const tableName = key // keys are usually the actual table keys used in backup
    if (!map[tableName]) {
      // try to singularize/convert basic camelCase or Pascal case to snake case
      const fallback = tableName
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
      if (!map[fallback]) continue
      // else use fallback
    }

    const modelMap = map[tableName] || map[tableName]
    if (!modelMap) continue

    if (Array.isArray(value)) {
      converted[tableName] = value.map((row: any) => convertRowTypes(row, modelMap))
    } else if (typeof value === 'object' && value !== null) {
      converted[tableName] = convertRowTypes(value, modelMap)
    }
  }

  return converted
}

function convertRowTypes(row: any, modelMap: Record<string, FieldType>) {
  if (!row || typeof row !== 'object') return row
  const convertedRow = { ...row }

  for (const [col, typ] of Object.entries(modelMap)) {
    if (!(col in convertedRow)) continue
    const val = convertedRow[col]
    if (val === null || val === undefined) continue

    if (typ === 'BigInt') {
      // If val is a string, try to convert to BigInt
      if (typeof val === 'string') {
        try {
          convertedRow[col] = BigInt(val)
        } catch (err) {
          // fallback: if val contains non-digits, skip conversion
        }
      } else if (typeof val === 'number') {
        try { convertedRow[col] = BigInt(val) } catch (err) { }
      }
    } else if (typ === 'Decimal') {
      // Prisma Decimal is often passed as string; if it's a number convert to string, else leave string
      if (typeof val === 'number') {
        // keep as string
        convertedRow[col] = val.toString()
      } else if (typeof val === 'string') {
        // nothing
      }
    }
  }

  // Walk nested objects/arrays to convert deeper types that might be included as relations
  for (const k of Object.keys(convertedRow)) {
    const v = convertedRow[k]
    if (Array.isArray(v)) {
      convertedRow[k] = v.map(e => (typeof e === 'object' ? convertRowTypes(e, modelMap) : e))
    } else if (typeof v === 'object' && v !== null) {
      convertedRow[k] = convertRowTypes(v, modelMap)
    }
  }

  return convertedRow
}

export default { parsePrismaSchemaForTypes, convertBackupTypes }
