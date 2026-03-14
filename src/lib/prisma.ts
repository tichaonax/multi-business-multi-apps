import { PrismaClient } from '@prisma/client'

// NOTE: Database replication/sync is temporarily disabled (buggy — to be reworked).
// Using plain PrismaClient until a working solution is implemented.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}