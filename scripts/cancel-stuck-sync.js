/**
 * Cancel Stuck Sync Script
 *
 * Cancels stuck full sync sessions that are blocking new syncs
 *
 * Usage:
 *   node scripts/cancel-stuck-sync.js [sessionId]
 *
 * If no sessionId provided, cancels all stuck sessions (PREPARING or TRANSFERRING)
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function cancelStuckSync(specificSessionId = null) {
  try {
    console.log('🔍 Checking for stuck sync sessions...\n')

    // Find stuck sessions
    const whereClause = specificSessionId
      ? { sessionId: specificSessionId }
      : {
          status: {
            in: ['PREPARING', 'TRANSFERRING']
          }
        }

    const stuckSessions = await prisma.fullSyncSessions.findMany({
      where: whereClause,
      orderBy: { startedAt: 'desc' }
    })

    if (stuckSessions.length === 0) {
      console.log('✅ No stuck sync sessions found.')
      return
    }

    console.log(`Found ${stuckSessions.length} stuck session(s):\n`)

    for (const session of stuckSessions) {
      console.log(`Session ID: ${session.sessionId}`)
      console.log(`  Status: ${session.status}`)
      console.log(`  Progress: ${session.progress}%`)
      console.log(`  Current Step: ${session.currentStep}`)
      console.log(`  Started: ${session.startedAt}`)
      console.log(`  Direction: ${session.direction}`)
      console.log(`  Source: ${session.sourceNodeId}`)
      console.log(`  Target: ${session.targetNodeId}`)
      console.log('')
    }

    // Cancel the sessions
    const sessionIds = stuckSessions.map(s => s.sessionId)

    const result = await prisma.fullSyncSessions.updateMany({
      where: {
        sessionId: {
          in: sessionIds
        }
      },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
        errorMessage: 'Cancelled manually via cancel-stuck-sync.js script'
      }
    })

    console.log(`✅ Successfully cancelled ${result.count} sync session(s).\n`)
    console.log('You can now start a new sync from the UI.')

  } catch (error) {
    console.error('❌ Error cancelling stuck sync:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Get sessionId from command line argument if provided
const sessionId = process.argv[2]

if (sessionId) {
  console.log(`Cancelling specific session: ${sessionId}\n`)
}

cancelStuckSync(sessionId)
