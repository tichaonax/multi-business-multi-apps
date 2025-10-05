/**
 * Fix Customer Management Schema - Remove @map from fields
 *
 * The correct pattern is:
 * - Field names: camelCase (no @map needed)
 * - Table names: @@map("snake_case")
 * - Database columns are automatically mapped to snake_case by Prisma
 */

const fs = require('fs')
const path = require('path')

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma')
let schema = fs.readFileSync(schemaPath, 'utf8')

// Remove all @map("...") from field definitions (but keep @@map for tables)
// This regex matches @map("...") that appears in field lines (not @@map lines)
schema = schema.replace(/(\s+\w+\s+\S+(?:\s+\S+)*?)\s+@map\("[^"]+"\)/g, '$1')

// Write the corrected schema
fs.writeFileSync(schemaPath, schema, 'utf8')

console.log('✅ Customer management schema corrected!')
console.log('   - Removed @map() from all field definitions')
console.log('   - Kept @@map() for table names')
console.log('   - Fields use camelCase, Prisma handles snake_case mapping')
