#!/usr/bin/env node

/**
 * Test Script: Verify Prisma Client Model Names
 *
 * This script checks what model names are available on the generated Prisma client.
 * After schema conversion to PascalCase, Prisma client should use camelCase accessors.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

console.log('🔍 Testing Prisma Client Model Names\n');

// Get all available model delegates on prisma client
const modelNames = Object.keys(prisma).filter(key => {
  try {
    const maybe = prisma[key];
    return maybe && (typeof maybe.count === 'function' || typeof maybe.findMany === 'function');
  } catch {
    return false;
  }
});

console.log(`✅ Found ${modelNames.length} model delegates on Prisma client:\n`);

// Show first 20 models
const samplesToShow = modelNames.slice(0, 20);
samplesToShow.forEach((name, index) => {
  console.log(`  ${(index + 1).toString().padStart(2, ' ')}. prisma.${name}`);
});

if (modelNames.length > 20) {
  console.log(`  ... and ${modelNames.length - 20} more models`);
}

// Test specific models that were converted
console.log('\n📋 Testing Specific Converted Models:');

const testModels = [
  'benefitTypes',      // Was: benefit_types
  'compensationTypes', // Was: compensation_types
  'jobTitles',         // Was: job_titles
  'idFormatTemplates', // Was: id_format_templates
  'employees',         // Was: employees (singular)
  'users'              // Was: users
];

testModels.forEach(modelName => {
  const exists = modelNames.includes(modelName);
  const status = exists ? '✅' : '❌';
  console.log(`  ${status} prisma.${modelName} ${exists ? 'EXISTS' : 'NOT FOUND'}`);
});

// Check if old snake_case names still work (they shouldn't)
console.log('\n🚫 Verifying Old snake_case Names Are Gone:');

const oldNames = [
  'benefit_types',
  'compensation_types',
  'job_titles',
  'id_format_templates'
];

oldNames.forEach(oldName => {
  const exists = modelNames.includes(oldName);
  const status = exists ? '❌ STILL EXISTS (BAD)' : '✅ REMOVED (GOOD)';
  console.log(`  ${status}: prisma.${oldName}`);
});

console.log('\n✅ Test complete!');
prisma.$disconnect();
