#!/usr/bin/env node

/**
 * Schema Model Name Converter
 *
 * Converts snake_case model names to PascalCase with @@map() directives
 * following Prisma best practices and electricity-tokens pattern.
 *
 * Example transformation:
 *   model benefit_types { ... }
 *   → model BenefitType { ... @@map("benefit_types") }
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
  console.log('🔧 Converting Prisma schema to PascalCase models with @@map()...\n');

  // Read schema file
  const schemaContent = fs.readFileSync(SCHEMA_PATH, 'utf-8');


  // Track conversions
  const conversions = [];

  // Convert model declarations
  let convertedSchema = schemaContent.replace(
    /^model\s+([a-z_][a-z0-9_]*)\s*\{/gm,
    (match, modelName) => {
      // Skip if already PascalCase
      if (/^[A-Z]/.test(modelName)) {
        return match;
      }

      const pascalName = toPascalCase(modelName);
      conversions.push({ from: modelName, to: pascalName });

      return `model ${pascalName} {`;
    }
  );

  // Add @@map() directives before closing braces
  convertedSchema = convertedSchema.replace(
    /^model\s+([A-Z][a-zA-Z0-9]*)\s*\{([^}]+)\}/gm,
    (match, modelName, body) => {
      // Check if model was converted (is in conversions list)
      const conversion = conversions.find(c => c.to === modelName);
      if (!conversion) {
        return match; // Already had PascalCase, don't add @@map
      }

      // Check if @@map already exists
      if (body.includes('@@map(')) {
        return match; // Already has @@map
      }

      // Add @@map before closing brace
      const lines = body.split('\n');
      const lastNonEmptyIndex = lines.findLastIndex(line => line.trim() !== '');

      // Insert @@map directive
      const mapDirective = `\n  @@map("${conversion.from}")`;
      lines.splice(lastNonEmptyIndex + 1, 0, mapDirective);

      return `model ${modelName} {${lines.join('\n')}\n}`;
    }
  );

  // Update relation references to use new model names
  conversions.forEach(({ from, to }) => {
    // Update relation field types: oldModelName -> NewModelName
    const relationRegex = new RegExp(`(\\s+)(${from})(\\s+@relation)`, 'g');
    convertedSchema = convertedSchema.replace(relationRegex, `$1${to}$3`);

    // Update relation arrays: oldModelName[] -> NewModelName[]
    const arrayRegex = new RegExp(`(\\s+)(${from})(\\[\\])`, 'g');
    convertedSchema = convertedSchema.replace(arrayRegex, `$1${to}$3`);
  });

  // Write converted schema
  fs.writeFileSync(SCHEMA_PATH, convertedSchema);

  console.log('✅ Schema conversion completed!\n');
  console.log('📋 Converted Models:');
  conversions.forEach(({ from, to }) => {
    console.log(`   ${from} → ${to}`);
  });

  console.log(`\n📊 Total conversions: ${conversions.length}`);
  console.log('\n⚠️  IMPORTANT NEXT STEPS:');
  console.log('1. Review the converted schema: prisma/schema.prisma');
  console.log('2. Regenerate Prisma client: npx prisma generate');
  console.log('3. Update API code to use PascalCase model names');
  console.log('4. Test thoroughly before deploying');
}

// Run conversion
try {
  convertSchema();
} catch (error) {
  console.error('❌ Conversion failed:', error.message);
  process.exit(1);
}
