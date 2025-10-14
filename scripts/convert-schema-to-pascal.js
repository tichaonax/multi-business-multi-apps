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
 * Convert snake_case to PascalCase, but preserve existing PascalCase names
 */
function snakeToPascal(str) {
  // If it contains underscores, it's snake_case - convert it
  if (str.includes('_')) {
    return str
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('')
  }
  
  // If it doesn't contain underscores, check if it's already PascalCase
  if (str.charAt(0) === str.charAt(0).toUpperCase()) {
    // Already PascalCase, return as-is
    return str
  }
  
  // Otherwise, capitalize first letter (camelCase -> PascalCase)
  return str.charAt(0).toUpperCase() + str.slice(1)
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
 * Convert schema with proper @@map directives and fix relation field types
 */
function convertSchema(schemaContent) {
  const lines = schemaContent.split('\n')
  const models = parseModels(schemaContent)

  console.log(`\n📊 Found ${models.length} models to process\n`)

  // Create mapping of snake_case to PascalCase for all models
  const modelTypeMapping = new Map()
  models.forEach(model => {
    const snakeCaseName = model.originalName.replace(/([A-Z])/g, (match, letter, index) => 
      index === 0 ? letter.toLowerCase() : '_' + letter.toLowerCase())
    modelTypeMapping.set(snakeCaseName, model.pascalName)
    // Also map the original name if it's different
    if (model.originalName !== model.pascalName) {
      modelTypeMapping.set(model.originalName, model.pascalName)
    }
  })

  console.log('🔗 Relation type mappings:')
  modelTypeMapping.forEach((pascalCase, snakeCase) => {
    if (snakeCase !== pascalCase) {
      console.log(`   ${snakeCase} -> ${pascalCase}`)
    }
  })
  console.log('')

  // Process models in reverse order to maintain line numbers
  for (let i = models.length - 1; i >= 0; i--) {
    const model = models[i]

    // Skip if already PascalCase with @@map
    if (model.originalName === model.pascalName && model.hasMapDirective) {
      console.log(`✓ ${model.originalName} - Already correct`)
      continue
    }

    // Skip if already PascalCase and no underscores (no need for @@map)
    if (model.originalName === model.pascalName && !model.originalName.includes('_')) {
      console.log(`✓ ${model.originalName} - Already PascalCase`)
      continue
    }

    // Skip if already PascalCase but has underscores (rare edge case)
    if (model.originalName === model.pascalName && model.originalName.includes('_')) {
      console.log(`⚠ ${model.originalName} - PascalCase with underscores (skipping for safety)`)
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

  // Fix relation field types throughout the entire schema
  console.log('🔗 Fixing relation field types...')
  let relationFixCount = 0
  
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex]
    let updatedLine = line
    
    // Match relation field patterns: fieldName relationTypeName[@relation, [], ?]
    // This regex matches: spaces + field_name + spaces + type_name + optional modifiers
    const relationPattern = /^(\s+)([a-zA-Z_][a-zA-Z0-9_]*)\s+([a-zA-Z_][a-zA-Z0-9_]*)(\[\]|\?)?\s*(@relation.*|$)/
    const match = line.match(relationPattern)
    
    if (match) {
      const [, indent, fieldName, typeName, modifier = '', rest] = match
      
      // Check if this type name should be converted
      if (modelTypeMapping.has(typeName)) {
        const correctTypeName = modelTypeMapping.get(typeName)
        if (typeName !== correctTypeName) {
          updatedLine = `${indent}${fieldName} ${correctTypeName}${modifier}${rest ? ' ' + rest : ''}`
          lines[lineIndex] = updatedLine
          relationFixCount++
          console.log(`   Fixed: ${fieldName} ${typeName}${modifier} -> ${fieldName} ${correctTypeName}${modifier}`)
        }
      }
    }
  }
  
  if (relationFixCount > 0) {
    console.log(`✓ Fixed ${relationFixCount} relation field types`)
  } else {
    console.log('✓ All relation field types already correct')
  }
  console.log('')

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

    // Format the schema using Prisma's built-in formatter
    console.log('🎨 Formatting schema with Prisma formatter...')
    try {
      const { execSync } = require('child_process')
      execSync('npx prisma format', {
        cwd: process.cwd(),
        stdio: 'pipe',
        env: { ...process.env }
      })
      console.log('✅ Schema formatted successfully')
    } catch (formatError) {
      console.warn('⚠️  Warning: Schema formatting failed:', formatError.message)
      console.warn('   Schema conversion completed but formatting skipped')
    }

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
