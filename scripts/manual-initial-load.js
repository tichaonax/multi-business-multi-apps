/**
 * Manual Initial Load - Copy Existing Data to Peer
 * This script exports data from this machine and sends it to a peer node
 * Use this until the built-in Initial Load system is fully implemented
 */

const { PrismaClient } = require('@prisma/client')
require('dotenv').config({ path: '.env.local' })
const crypto = require('crypto')

const prisma = new PrismaClient()

// Tables to sync (excluding demo businesses and system tables)
const TABLES_TO_SYNC = [
  'businesses',
  // Add more tables as needed:
  // 'employees',
  // 'projects',
  // etc.
]

async function manualInitialLoad() {
  console.log('🔄 Manual Initial Load Process')
  console.log('═══════════════════════════════════════════════════\n')

  try {
    // Get target peer info
    const thisNodeId = process.env.SYNC_NODE_ID
    const regKey = process.env.SYNC_REGISTRATION_KEY || ''
    const regHash = crypto.createHash('sha256').update(regKey).digest('hex')

    console.log(`📍 Source Node: ${thisNodeId}\n`)

    // Get active peers
    const peers = await prisma.syncNodes.findMany({
      where: {
        isActive: true,
        nodeId: { not: thisNodeId }
      }
    })

    if (peers.length === 0) {
      console.log('❌ No active peers found!')
      console.log('   Make sure the target machine sync service is running.\n')
      await prisma.$disconnect()
      return
    }

    console.log(`📊 Found ${peers.length} peer(s):\n`)
    peers.forEach((peer, index) => {
      console.log(`${index + 1}. ${peer.nodeName}`)
      console.log(`   IP: ${peer.ipAddress}:${peer.port}`)
      console.log(`   Node ID: ${peer.nodeId}`)
      console.log('')
    })

    // Use first peer as target
    const targetPeer = peers[0]
    const targetPort = 8080 // HTTP port for Next.js app

    console.log(`🎯 Target: ${targetPeer.nodeName} (${targetPeer.ipAddress}:${targetPort})\n`)

    // Export businesses (excluding demo type)
    console.log('📦 Exporting businesses...\n')

    const businesses = await prisma.businesses.findMany({
      where: {
        type: { not: 'demo' }
      }
    })

    console.log(`   Found ${businesses.length} non-demo businesses\n`)

    if (businesses.length === 0) {
      console.log('⚠️  No businesses to sync!')
      await prisma.$disconnect()
      return
    }

    // Show what will be synced
    console.log('📋 Businesses to sync:')
    businesses.forEach((b, i) => {
      console.log(`   ${i + 1}. ${b.name} (${b.type})`)
    })
    console.log('')

    console.log('═══════════════════════════════════════════════════')
    console.log('🚀 Starting Transfer...\n')

    let successCount = 0
    let skipCount = 0
    let errorCount = 0

    // Send each business to the target
    for (const business of businesses) {
      try {
        // Convert business to sync event format
        const syncEvent = {
          id: crypto.randomUUID(),
          sourceNodeId: thisNodeId,
          table: 'businesses',
          recordId: business.id,
          operation: 'CREATE',
          data: {
            id: business.id,
            name: business.name,
            type: business.type,
            address: business.address,
            phone: business.phone,
            email: business.email,
            website: business.website,
            logo: business.logo,
            createdAt: business.createdAt,
            updatedAt: business.updatedAt
          },
          checksum: crypto.createHash('md5')
            .update(JSON.stringify(business))
            .digest('hex')
        }

        // Send to target peer via sync API
        const response = await fetch(`http://${targetPeer.ipAddress}:${targetPort}/api/sync/receive`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Node-ID': thisNodeId,
            'X-Registration-Hash': regHash
          },
          body: JSON.stringify({
            sessionId: 'manual-initial-load-' + Date.now(),
            sourceNodeId: thisNodeId,
            events: [syncEvent]
          })
        })

        if (response.ok) {
          const result = await response.json()
          if (result.success && result.processedCount > 0) {
            console.log(`   ✅ ${business.name}`)
            successCount++
          } else {
            console.log(`   ⚠️  ${business.name} - Already exists (skipped)`)
            skipCount++
          }
        } else {
          const error = await response.text()
          console.log(`   ❌ ${business.name} - HTTP ${response.status}`)
          errorCount++
        }

        // Small delay to avoid overwhelming the target
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        console.log(`   ❌ ${business.name} - ${error.message}`)
        errorCount++
      }
    }

    console.log('\n═══════════════════════════════════════════════════')
    console.log('📊 Transfer Complete!\n')
    console.log(`   ✅ Synced: ${successCount}`)
    console.log(`   ⚠️  Skipped: ${skipCount} (already exist)`)
    console.log(`   ❌ Failed: ${errorCount}`)
    console.log('')

    if (successCount > 0 || skipCount > 0) {
      console.log('🎉 Initial load completed!')
      console.log(`\n   Check ${targetPeer.nodeName} database for the businesses.\n`)
      console.log('   Going forward, ongoing sync will handle new changes automatically.\n')
    } else {
      console.log('⚠️  No data was transferred.')
      console.log('   Check for errors above or verify network connectivity.\n')
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('\nFull error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

manualInitialLoad()
