import { PrismaClient } from '@prisma/client'

declare module '@prisma/client' {
  interface PrismaClient {
    // Allow access to sync-related models even if generated types are missing
    [model: string]: any
  }
}
