import { PrismaClient } from '@prisma/client'

console.log('🗄️ Prisma client initializing at:', new Date().toISOString())
console.log('🔗 Database URL configured:', !!process.env.DATABASE_URL)

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  console.log('🔧 Development mode: storing Prisma client globally')
  globalForPrisma.prisma = prisma
}

console.log('✅ Prisma client ready')