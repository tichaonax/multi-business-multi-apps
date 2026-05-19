import { PrismaClient } from '@prisma/client'
import { toTitleCase } from '@/utils/titleCase'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
  })

  // Ensure product/category/inventory names are always stored in Title Case.
  client.$use(async (params, next) => {
    const titleCaseModels = ['BusinessProducts', 'BusinessCategories', 'BarcodeInventoryItems']
    if (titleCaseModels.includes(params.model ?? '') && ['create', 'update', 'upsert'].includes(params.action)) {
      const data = params.args?.data
      if (typeof data?.name === 'string') data.name = toTitleCase(data.name)
      if (params.action === 'upsert') {
        if (typeof params.args?.create?.name === 'string') params.args.create.name = toTitleCase(params.args.create.name)
        if (typeof params.args?.update?.name === 'string') params.args.update.name = toTitleCase(params.args.update.name)
      }
    }
    return next(params)
  })

  return client
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
