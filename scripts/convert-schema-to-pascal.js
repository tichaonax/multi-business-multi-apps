#!/usr/bin/env node

/**
 * Schema Model Naming Convention Converter
 *
 * Converts Prisma schema models from snake_case to PascalCase with @@map() directive
 *
 * BEFORE:
 * model benefit_types {
 *   id String @id
 *   ...
 * }
 *
 * AFTER:
 * model BenefitTypes {
 *   id String @id
 *   ...
 *   @@map("benefit_types")
 * }
 */

const fs = require('fs')
const path = require('path')

const SCHEMA_PATH = path.join(__dirname, '..', 'prisma', 'schema.prisma')

/**
 * Convert snake_case to PascalCase
 */
function snakeToPascal(snakeStr) {
  return snakeStr
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('')
}

/**
 * Find all model definitions and their closing braces
 */
function parseModels(schemaContent) {
  const lines = schemaContent.split('\n')
  const models = []
  let currentModel = null
  let braceCount = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmedLine = line.trim()

    // Detect model start
    const modelMatch = trimmedLine.match(/^model\s+(\w+)\s*\{/)
    if (modelMatch) {
      const modelName = modelMatch[1]
      currentModel = {
        originalName: modelName,
        pascalName: snakeToPascal(modelName),
        startLine: i,
        endLine: null,
        hasMapDirective: false
      }
      braceCount = 1
      continue
    }

    // Track brace depth when inside a model
    if (currentModel) {
      // Count opening braces
      const openBraces = (line.match(/\{/g) || []).length
      braceCount += openBraces

      // Count closing braces
      const closeBraces = (line.match(/\}/g) || []).length
      braceCount -= closeBraces

      // Check for existing @@map directive
      if (trimmedLine.includes('@@map(')) {
        currentModel.hasMapDirective = true
      }

      // Model ends when braces balance
      if (braceCount === 0) {
        currentModel.endLine = i
        models.push(currentModel)
        currentModel = null
      }
    }
  }

  return models
}

/**
 * Convert schema with proper @@map directives
 */
function convertSchema(schemaContent) {
  const lines = schemaContent.split('\n')
  const models = parseModels(schemaContent)

  console.log(`\n📊 Found ${models.length} models to process\n`)

  // Process models in reverse order to maintain line numbers
  for (let i = models.length - 1; i >= 0; i--) {
    const model = models[i]

    // Skip if already PascalCase with @@map
    if (model.originalName === model.pascalName && model.hasMapDirective) {
      console.log(`✓ ${model.originalName} - Already correct`)
      continue
    }

    // Skip if already PascalCase (but might need @@map)
    if (model.originalName === model.pascalName && !model.hasMapDirective) {
      console.log(`⚠ ${model.originalName} - PascalCase but missing @@map (skipping for safety)`)
      continue
    }

    console.log(`🔄 ${model.originalName} → ${model.pascalName}`)

    // 1. Update model declaration line
    const declarationLine = lines[model.startLine]
    lines[model.startLine] = declarationLine.replace(
      `model ${model.originalName}`,
      `model ${model.pascalName}`
    )

    // 2. Find the closing brace line and add @@map before it
    const closingBraceLine = model.endLine
    const closingBraceIndent = lines[closingBraceLine].match(/^(\s*)/)[1]

    // Find last non-empty, non-closing-brace line in model
    let lastContentLine = closingBraceLine - 1
    while (lastContentLine > model.startLine && lines[lastContentLine].trim() === '') {
      lastContentLine--
    }

    // Insert @@map directive before closing brace
    const mapDirective = `${closingBraceIndent}  @@map("${model.originalName}")`
    lines.splice(closingBraceLine, 0, mapDirective)
  }

  return lines.join('\n')
}

/**
 * Create backup of original schema
 */
function createBackup() {
  const backupPath = SCHEMA_PATH + '.backup-' + Date.now()
  fs.copyFileSync(SCHEMA_PATH, backupPath)
  console.log(`\n✅ Backup created: ${backupPath}\n`)
  return backupPath
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🚀 Prisma Schema Model Converter')
    console.log('================================\n')
    console.log('Converting snake_case models to PascalCase with @@map()\n')

    // Read original schema
    console.log(`📖 Reading schema: ${SCHEMA_PATH}`)
    const originalSchema = fs.readFileSync(SCHEMA_PATH, 'utf8')

    // Create backup
    const backupPath = createBackup()

    // Convert schema
    const convertedSchema = convertSchema(originalSchema)

    // Write converted schema
    fs.writeFileSync(SCHEMA_PATH, convertedSchema, 'utf8')

    console.log('\n✅ Schema conversion completed!')
    console.log('\n📝 Next steps:')
    console.log('   1. Review the schema changes: git diff prisma/schema.prisma')
    console.log('   2. Update seed scripts to use camelCase: node scripts/update-seed-scripts.js')
    console.log('   3. Regenerate Prisma client: npx prisma generate')
    console.log('   4. Update API routes to use new model names')
    console.log(`\n💾 Backup location: ${backupPath}`)
    console.log('   (Restore with: cp backup-file prisma/schema.prisma)\n')

  } catch (error) {
    console.error('❌ Conversion failed:', error.message)
    process.exit(1)
  }
}

main()
