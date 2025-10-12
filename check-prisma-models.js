const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

console.log('='.repeat(60));
console.log('AVAILABLE PRISMA CLIENT MODELS');
console.log('='.repeat(60));

const models = Object.keys(prisma)
  .filter(k => !k.startsWith('$') && !k.startsWith('_'))
  .sort();

console.log('\nTotal models:', models.length);
console.log('\nModels:\n');
models.forEach(m => console.log(`  - ${m}`));

console.log('\n' + '='.repeat(60));
