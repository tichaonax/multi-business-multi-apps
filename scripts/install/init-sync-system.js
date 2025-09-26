/**
 * Initialize Sync System
 * Sets up initial sync configuration and node state
 */

const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')
const os = require('os')

async function initializeSyncSystem() {
  const prisma = new PrismaClient()

  try {
    console.log('🔄 Initializing sync system...')

    // Generate node ID for this installation
    const nodeId = crypto.randomUUID()
    const nodeName = os.hostname() || 'Unknown Node'

    // Initialize node state
    await prisma.nodeState.upsert({
      where: { nodeId },
      update: {
        nodeName,
        lastSeen: new Date(),
        isOnline: true,
        syncVersion: '1.0.0'
      },
      create: {
        id: crypto.randomUUID(),
        nodeId,
        nodeName,
        lastSeen: new Date(),
        isOnline: true,
        syncVersion: '1.0.0',
        metadata: {
          installDate: new Date().toISOString(),
          platform: os.platform(),
          arch: os.arch()
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    console.log(`✅ Sync system initialized for node: ${nodeId}`)
    console.log(`   Node name: ${nodeName}`)

  } catch (error) {
    console.error('❌ Error initializing sync system:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  initializeSyncSystem()
}

module.exports = { initializeSyncSystem }