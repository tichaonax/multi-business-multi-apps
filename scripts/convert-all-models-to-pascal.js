#!/usr/bin/env node

/**
 * Comprehensive Schema Model Name Converter
 *
 * Converts ALL snake_case model names to PascalCase with @@map() directives.
 * Follows the electricity-tokens pattern for Prisma best practices.
 *
 * CRITICAL: This ensures Prisma client uses camelCase model accessors
 * (e.g., prisma.benefitType instead of prisma.benefit_types)
 */

const fs = require('fs');
const path = require('path');

const SCHEMA_PATH = path.join(__dirname, '..', 'prisma', 'schema.prisma');

function toPascalCase(snakeCaseStr) {
  return snakeCaseStr
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

function convertSchema() {
  console.log('🔧 Converting ALL Prisma models to PascalCase with @@map()...\n');

  // Read schema file
  let schemaContent = fs.readFileSync(SCHEMA_PATH, 'utf-8');


  // Track all conversions for relation updates
  const conversions = new Map();

  // Step 1: Convert all snake_case model declarations to PascalCase
  schemaContent = schemaContent.replace(
    /^model\s+([a-z_][a-z0-9_]*)\s*\{/gm,
    (match, modelName) => {
      // Skip if already PascalCase
      if (/^[A-Z]/.test(modelName)) {
        return match;
      }

      const pascalName = toPascalCase(modelName);
      conversions.set(modelName, pascalName);

      console.log(`📝 ${modelName} → ${pascalName}`);
      return `model ${pascalName} {`;
    }
  );

  // Step 2: Add @@map() directives to converted models
  const lines = schemaContent.split('\n');
  const result = [];
  let currentModel = null;
  let modelStartLine = -1;
  let bracketDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Track model blocks
    if (trimmed.startsWith('model ')) {
      const modelMatch = trimmed.match(/^model\s+([A-Za-z0-9_]+)/);
      if (modelMatch) {
        currentModel = modelMatch[1];
        modelStartLine = i;
        bracketDepth = 0;
      }
    }

    // Count braces to find model end
    if (currentModel) {
      bracketDepth += (line.match(/\{/g) || []).length;
      bracketDepth -= (line.match(/\}/g) || []).length;

      // End of model block
      if (bracketDepth === 0 && line.includes('}')) {
        // Check if this model needs @@map
        const originalName = Array.from(conversions.entries())
          .find(([snake, pascal]) => pascal === currentModel)?.[0];

        if (originalName) {
          // Check if @@map already exists in this model
          const modelContent = lines.slice(modelStartLine, i + 1).join('\n');

          if (!modelContent.includes('@@map(')) {
            // Add @@map before closing brace
            const indent = line.match(/^(\s*)/)[1];
            result.push(`${indent}@@map("${originalName}")`);
          }
        }

        currentModel = null;
      }
    }

    result.push(line);
  }

  schemaContent = result.join('\n');

  // Step 3: Update all relation field types
  conversions.forEach((pascalName, snakeName) => {
    // Update relation field types: oldModelName -> NewModelName
    // Match: fieldName OldModelName @relation OR fieldName OldModelName?
    const typeRegex = new RegExp(
      `(\\s+\\w+\\s+)(${snakeName})(\\??\\s+@relation|\\??\\s*\\[\\]|\\?\\s|\\s+@|\\s*$)`,
      'g'
    );
    schemaContent = schemaContent.replace(typeRegex, `$1${pascalName}$3`);

    // Update arrays: oldModelName[] -> NewModelName[]
    const arrayRegex = new RegExp(`(\\s+\\w+\\s+)(${snakeName})(\\[\\])`, 'g');
    schemaContent = schemaContent.replace(arrayRegex, `$1${pascalName}$3`);
  });

  // Write converted schema
  fs.writeFileSync(SCHEMA_PATH, schemaContent);

  console.log('\n✅ Schema conversion completed!');
  console.log(`\n📊 Total models converted: ${conversions.size}`);

  console.log('\n⚠️  CRITICAL NEXT STEPS:');
  console.log('1. Review the converted schema: prisma/schema.prisma');
  console.log('2. Regenerate Prisma client: npx prisma generate');
  console.log('3. Create migration: npx prisma migrate dev --name convert_to_pascal_case');
  console.log('   (Note: This is a schema-only change, no DB structure changes)');
  console.log('4. Test with: node scripts/production-setup.js --dry-run');

  return conversions;
}

// Run conversion
try {
  const conversions = convertSchema();

  console.log('\n📋 Conversion Summary:');
  console.log('The following model names will be used in Prisma client (camelCase):');

  // Show camelCase accessor names (what Prisma client will use)
  const grouped = new Map();
  conversions.forEach((pascalName, snakeName) => {
    const camelCase = pascalName.charAt(0).toLowerCase() + pascalName.slice(1);
    grouped.set(snakeName, { pascal: pascalName, camel: camelCase });
  });

  Array.from(grouped.entries())
    .slice(0, 10)
    .forEach(([snake, { pascal, camel }]) => {
      console.log(`   ${snake} → prisma.${camel} (model ${pascal})`);
    });

  if (grouped.size > 10) {
    console.log(`   ... and ${grouped.size - 10} more models`);
  }

  process.exit(0);
} catch (error) {
  console.error('❌ Conversion failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
