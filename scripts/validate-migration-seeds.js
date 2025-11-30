const fs = require('fs')
const path = require('path')

function parsePrismaSchema(schemaPath) {
  const content = fs.readFileSync(schemaPath, 'utf8')
  const modelRegex = /model\s+(\w+)\s+\{([\s\S]*?)^\}/gm
  const fieldRegex = /^\s*([a-zA-Z0-9_]+)\s+/gm
  const models = {}
  let match
  while ((match = modelRegex.exec(content))) {
    const name = match[1]
    const body = match[2]
    const fields = []
    let f
    while ((f = fieldRegex.exec(body))) {
      fields.push(f[1])
    }
    models[name] = new Set(fields)
  }
  return models
}

function scanMigrations(migrationsDir) {
  const files = fs.readdirSync(migrationsDir)
  const results = []
  for (const file of files) {
    const full = path.join(migrationsDir, file)
    if (!fs.lstatSync(full).isDirectory()) continue
    const migrationSql = path.join(full, 'migration.sql')
    if (!fs.existsSync(migrationSql)) continue
    const sql = fs.readFileSync(migrationSql, 'utf8')
    const insertRegex = /INSERT INTO\s+"?([a-zA-Z0-9_]+)"?\s*\(([^\)]*)\)/gi
    let m
    while ((m = insertRegex.exec(sql))) {
      const table = m[1]
      const columns = m[2].split(',').map(c => c.trim().replace(/"/g, ''))
      results.push({ migration: file, table, columns })
    }
  }
  return results
}

function runCheck() {
  const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma')
  const migrationsDir = path.join(__dirname, '..', 'prisma', 'migrations')
  if (!fs.existsSync(schemaPath)) {
    console.error('schema.prisma not found')
    process.exit(1)
  }
  const models = parsePrismaSchema(schemaPath)
  const inserts = scanMigrations(migrationsDir)
  let warnings = 0
  for (const ins of inserts) {
    const modelName = Object.keys(models).find(k => k.toLowerCase() === ins.table.toLowerCase() || k.toLowerCase() + 's' === ins.table.toLowerCase())
    if (!modelName) continue
    const modelFields = models[modelName]
    for (const col of ins.columns) {
      if (!modelFields.has(col) && !['id'].includes(col)) {
        console.warn(`⚠️  Column '${col}' inserted in migration '${ins.migration}' table '${ins.table}' not found in model '${modelName}'`)
        warnings++
      }
    }
  }
  if (warnings === 0) {
    console.log('✅ No obvious seed-to-schema mismatches found')
  } else {
    console.log(`⚠️  Found ${warnings} potential mismatches`) 
  }
}

if (require.main === module) runCheck()
