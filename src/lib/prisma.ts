import { PrismaClient } from '@prisma/client'
import { createSyncPrismaClient, generateNodeId } from './sync/sync-helper'
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
  // Create sync-enabled Prisma client
  try {
    const nodeId = generateNodeId()
    const ipAddress = getLocalIPAddress()
    
    const client = createSyncPrismaClient({
      nodeId,
      registrationKey: process.env.SYNC_REGISTRATION_KEY || 'default-key',
      enabled: true
    })
    
    console.log('✅ Sync helper installed for main app')
    console.log(`🔧 Node ID: ${nodeId}`)
    console.log(`🌐 IP Address: ${ipAddress}`)
    
    return client
    
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