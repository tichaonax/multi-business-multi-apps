const { PrismaClient } = require('@prisma/client')

async function testUserUpdates() {
  console.log('🧪 Testing User Updates for Sync Event Generation...\n')
  
  try {
    // Test 1: Direct Prisma client (no middleware expected)
    console.log('📋 Test 1: Direct Prisma Client')
    const directPrisma = new PrismaClient()
    
    const initialEvents = await directPrisma.syncEvents.count()
    console.log(`📊 Initial sync events: ${initialEvents}`)
    
    const user = await directPrisma.users.findFirst()
    if (!user) {
      console.log('❌ No users found to test with')
      return
    }
    
    console.log(`👤 Found user: ${user.name} (${user.email})`)
    
    // Update via direct client
    await directPrisma.users.update({
      where: { id: user.id },
      data: { 
        name: user.name.replace(/ \(Direct.*\)$/, '') + ' (Direct ' + new Date().toISOString().slice(11,19) + ')',
        updatedAt: new Date()
      }
    })
    
    console.log('✅ User updated via direct client')
    
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const afterDirectEvents = await directPrisma.syncEvents.count()
    console.log(`📊 Events after direct update: ${afterDirectEvents}`)
    
    if (afterDirectEvents > initialEvents) {
      console.log('🎉 Direct client generated sync events!')
    } else {
      console.log('ℹ️  No events from direct client (expected)')
    }
    
    await directPrisma.$disconnect()
    
    // Test 2: Main app Prisma client (should have middleware)
    console.log('\n📋 Test 2: Main App Prisma Client')
    
    try {
      const { prisma: mainPrisma } = require('./src/lib/prisma')
      
      // Update via main app client
      await mainPrisma.users.update({
        where: { id: user.id },
        data: { 
          name: user.name.replace(/ \(Main.*\)$/, '') + ' (Main ' + new Date().toISOString().slice(11,19) + ')',
          updatedAt: new Date()
        }
      })
      
      console.log('✅ User updated via main app client')
      
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Check events with fresh client
      const checkPrisma = new PrismaClient()
      const afterMainEvents = await checkPrisma.syncEvents.count()
      console.log(`📊 Events after main app update: ${afterMainEvents}`)
      
      if (afterMainEvents > afterDirectEvents) {
        console.log('🎉 SUCCESS: Main app client generated sync events!')
        
        // Show recent events
        const recentEvents = await checkPrisma.syncEvents.findMany({
          take: 3,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            eventType: true,
            tableName: true,
            operation: true,
            processed: true,
            createdAt: true
          }
        })
        
        console.log('\n📋 Recent sync events:')
        recentEvents.forEach((event, index) => {
          console.log(`${index + 1}. ${event.eventType} on ${event.tableName}`)
          console.log(`   Operation: ${event.operation}`)
          console.log(`   Processed: ${event.processed}`)
          console.log(`   Created: ${event.createdAt}`)
          console.log('')
        })
        
      } else {
        console.log('❌ Main app client did not generate sync events')
        console.log('💡 Sync middleware may not be properly installed')
      }
      
      await checkPrisma.$disconnect()
      
    } catch (mainError) {
      console.error('❌ Error testing main app client:', mainError.message)
      console.log('💡 Main app Prisma client may not be properly configured')
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

testUserUpdates()