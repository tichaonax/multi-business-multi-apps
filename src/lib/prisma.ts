import { PrismaClient } from '@prisma/client'
import { toTitleCase } from '@/utils/titleCase'

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined
}

const TITLE_CASE_MODELS = ['BusinessProducts', 'BusinessCategories', 'BarcodeInventoryItems']

function createPrismaClient() {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
  })

  // Ensure name fields on product/category/inventory models are always Title Case.
  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (TITLE_CASE_MODELS.includes(model ?? '')) {
            const a = args as any
            if ((operation === 'create' || operation === 'update') && typeof a?.data?.name === 'string') {
              a.data.name = toTitleCase(a.data.name)
            }
            if (operation === 'upsert') {
              if (typeof a?.create?.name === 'string') a.create.name = toTitleCase(a.create.name)
              if (typeof a?.update?.name === 'string') a.update.name = toTitleCase(a.update.name)
            }
          }
          return query(args)
        },
      },
    },
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
