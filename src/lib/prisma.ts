import { PrismaClient } from '@prisma/client'
import { createSyncPrismaClient, generateNodeId, SyncHelper } from './sync/sync-helper'
import { createSyncExtension } from './sync/prisma-extension'
import { networkInterfaces } from 'os'

console.log('🗄️ Prisma client initializing at:', new Date().toISOString())
console.log('🔗 Database URL configured:', !!process.env.DATABASE_URL)

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient & { syncHelper?: any } | undefined
}

// Get local IP address for sync identification
function getLocalIPAddress(): string {
  const interfaces = networkInterfaces()
  for (const [name, nets] of Object.entries(interfaces)) {
    if (nets) {
      for (const net of nets) {
        if (net.family === 'IPv4' && !net.internal) {
          return net.address
        }
      }
    }
  }
  return '127.0.0.1'
}

export const prisma = globalForPrisma.prisma ?? (() => {
  // Create sync-enabled Prisma client with automatic change tracking
  try {
    const nodeId = process.env.SYNC_NODE_ID || generateNodeId()
    const ipAddress = getLocalIPAddress()
    const registrationKey = process.env.SYNC_REGISTRATION_KEY || 'default-key'

    // Create base client with sync helper
    const baseClient = createSyncPrismaClient({
      nodeId,
      registrationKey,
      enabled: true
    })

    // Get the sync helper from the client
    const syncHelper = (baseClient as any).syncHelper as SyncHelper

    // Apply automatic change tracking extension
    const extendedClient = baseClient.$extends(createSyncExtension(syncHelper))

    // Preserve syncHelper on extended client for manual tracking if needed
    ;(extendedClient as any).syncHelper = syncHelper

    console.log('✅ Sync helper installed with automatic change tracking')
    console.log(`🔧 Node ID: ${nodeId}`)
    console.log(`🌐 IP Address: ${ipAddress}`)
    console.log('🔄 All database changes will be automatically tracked for sync')

    return extendedClient as any

  } catch (error) {
    console.error('❌ Failed to create sync client:', error)
    // Fallback to regular client
    return new PrismaClient()
  }
})()

if (process.env.NODE_ENV !== 'production') {
  console.log('🔧 Development mode: storing Prisma client globally')
  globalForPrisma.prisma = prisma
}

console.log('✅ Prisma client ready')