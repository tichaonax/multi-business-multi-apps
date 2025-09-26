#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function listModels() {
  console.log('\n🔎 Listing Prisma client keys and accessible models (non-destructive counts)')
  const keys = Object.keys(prisma).filter(k => !k.startsWith('$'))
  for (const key of keys.sort()) {
    const val = prisma[key]
    const isModelLike = val && typeof val.count === 'function'
    if (isModelLike) {
      try {
        const count = await val.count()
        console.log(`  ✓ ${key} — accessible, count = ${count}`)
      } catch (err) {
        console.log(`  ⚠ ${key} — model present on client but count failed: ${err.message}`)
      }
    } else {
      // Non-model keys (e.g. $connect, $disconnect, raw queries)
      // We skip printing those to reduce noise
    }
  }
  await prisma.$disconnect()
}

listModels().catch(err => {
  console.error('Failed to list models:', err.message)
  process.exit(1)
})
