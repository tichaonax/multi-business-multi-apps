const { randomUUID } = require('crypto')
const { prisma } = require('../src/lib/prisma')

async function callSeed() {
  // Import the route handler compiled to JS — since this is TypeScript source in /src, it won't run directly.
  console.log('Cannot reliably import TS route in this environment without build step.');
}

callSeed()
  .catch(err => { console.error(err); process.exit(1) })
  .finally(() => prisma.$disconnect())
