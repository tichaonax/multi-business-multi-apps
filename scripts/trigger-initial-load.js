/**
 * Trigger Initial Load Between Sync Peers
 * This performs a one-time transfer of existing data from source to target
 */

const { PrismaClient } = require('@prisma/client')
require('dotenv').config({ path: '.env.local' })

const prisma = new PrismaClient()

async function triggerInitialLoad() {
  console.log('🔄 Triggering Initial Load for Sync Service')
  console.log('═══════════════════════════════════════════════════\n')

  try {
    // Get this node's info
    const thisNodeId = process.env.SYNC_NODE_ID
    console.log(`📍 This Node: ${thisNodeId}\n`)

    // Get all active peers
    const peers = await prisma.syncNodes.findMany({
      where: {
        isActive: true,
        nodeId: { not: thisNodeId }
      }
    })

    if (peers.length === 0) {
      console.log('❌ No active peers found!')
      console.log('   Make sure the other machine is running and sync service is active.\n')
      await prisma.$disconnect()
      return
    }

    console.log(`📊 Found ${peers.length} active peer(s):\n`)
    peers.forEach((peer, index) => {
      console.log(`${index + 1}. ${peer.nodeName}`)
      console.log(`   Node ID: ${peer.nodeId}`)
      console.log(`   IP: ${peer.ipAddress}:${peer.port}`)
      console.log(`   Last Seen: ${new Date(peer.lastSeen).toLocaleString()}`)
      console.log('')
    })

    // For now, just log what needs to happen
    console.log('═══════════════════════════════════════════════════')
    console.log('⚠️  INITIAL LOAD NOT YET IMPLEMENTED VIA SCRIPT')
    console.log('═══════════════════════════════════════════════════\n')

    console.log('The initial load system exists in the code but:')
    console.log('  1. The API endpoints are not implemented yet (just mocks)')
    console.log('  2. The sync service needs to expose initial load triggers')
    console.log('  3. There may be a UI admin panel to trigger it\n')

    console.log('🔍 CURRENT SITUATION:')
    console.log('  • Ongoing sync: WORKING ✅ (tracks new changes)')
    console.log('  • Initial load: NOT RUN ❌ (existing data not transferred)\n')

    console.log('📝 WORKAROUND OPTIONS:\n')

    console.log('Option 1: Manual Database Copy (Recommended)')
    console.log('─────────────────────────────────────────────────────')
    console.log('If both machines should have the SAME data:')
    console.log('  1. On Machine A (source):')
    console.log('     pg_dump multi_business_db > backup.sql')
    console.log('  2. Copy backup.sql to Machine B')
    console.log('  3. On Machine B (target):')
    console.log('     psql multi_business_db < backup.sql')
    console.log('  4. Restart sync service on both machines')
    console.log('')

    console.log('Option 2: Create Missing Records via UI')
    console.log('─────────────────────────────────────────────────────')
    console.log('Manually recreate the missing businesses on Machine B')
    console.log('through the web UI. The sync will then keep them updated.')
    console.log('')

    console.log('Option 3: SQL INSERT (For Testing)')
    console.log('─────────────────────────────────────────────────────')
    console.log('Copy specific records using SQL:')
    console.log('')
    console.log('-- On Machine A, export specific business:')
    console.log('SELECT * FROM businesses WHERE name = \'HXI Eats\';')
    console.log('')
    console.log('-- On Machine B, insert with same ID:')
    console.log('INSERT INTO businesses (id, name, type, created_at, updated_at)')
    console.log('VALUES (\'<same-id>\', \'HXI Eats\', \'restaurant\', NOW(), NOW());')
    console.log('')

    console.log('Option 4: Wait for Initial Load Implementation')
    console.log('─────────────────────────────────────────────────────')
    console.log('The initial load system code exists but needs:')
    console.log('  • API endpoint implementation (/api/sync/request-initial-load)')
    console.log('  • UI admin panel integration')
    console.log('  • Testing and validation')
    console.log('')

    console.log('═══════════════════════════════════════════════════')
    console.log('💡 RECOMMENDATION')
    console.log('═══════════════════════════════════════════════════\n')

    console.log('For immediate testing:')
    console.log('  1. Use Option 3 (SQL INSERT) to manually copy HXI Eats')
    console.log('  2. Then create a NEW business on Machine A')
    console.log('  3. Watch it automatically sync to Machine B (within 30 sec)')
    console.log('  4. This proves ongoing sync is working\n')

    console.log('For production setup:')
    console.log('  1. Use Option 1 (pg_dump/restore) to ensure both start identical')
    console.log('  2. Then rely on ongoing sync for all future changes\n')

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

triggerInitialLoad()
