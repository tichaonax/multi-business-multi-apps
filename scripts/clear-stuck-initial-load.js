/**
 * Clear stuck initial load session
 */

const { PrismaClient } = require('@prisma/client')

async function clearStuckSession() {
  const prisma = new PrismaClient()

  try {
    console.log('🔍 Finding stuck initial load sessions...\n')

    // Find sessions stuck in PREPARING or TRANSFERRING
    const stuckSessions = await prisma.initialLoadSessions.findMany({
      where: {
        status: {
          in: ['PREPARING', 'TRANSFERRING']
        }
      },
      orderBy: { startedAt: 'desc' }
    })

    if (stuckSessions.length === 0) {
      console.log('✅ No stuck sessions found')
      return
    }

    console.log(`Found ${stuckSessions.length} stuck session(s):\n`)

    for (const session of stuckSessions) {
      const duration = Math.round((Date.now() - session.startedAt.getTime()) / 1000 / 60)
      console.log(`📦 Session: ${session.sessionId}`)
      console.log(`   Status: ${session.status}`)
      console.log(`   Progress: ${session.progress}%`)
      console.log(`   Duration: ${duration} minutes`)
      console.log(`   Step: ${session.currentStep}`)
      console.log(`   Records: ${session.transferredRecords}/${session.totalRecords}`)
      console.log()
    }

    // Mark all as FAILED
    const result = await prisma.initialLoadSessions.updateMany({
      where: {
        status: {
          in: ['PREPARING', 'TRANSFERRING']
        }
      },
      data: {
        status: 'FAILED',
        errorMessage: 'Manually cleared - session was stuck',
        completedAt: new Date()
      }
    })

    console.log(`✅ Cleared ${result.count} stuck session(s)`)
    console.log('\nYou can now start a new initial load.')

  } catch (error) {
    console.error('❌ Error:', error.message)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

clearStuckSession().catch(err => {
  console.error('Failed:', err)
  process.exit(1)
})
