async function investigateMiddleware() {
  console.log('🔧 Investigating Sync Middleware Issue...\n')

  // Let's check if the middleware is actually being installed
  console.log('📋 Step 1: Checking sync middleware installation')

  try {
  // Try to import and use the middleware directly
  const { installSyncMiddleware, generateNodeId } = require('./src/lib/sync/database-hooks')
  const { PrismaClient } = require('@prisma/client')
  
  console.log('✅ Successfully imported sync middleware functions')
  
  // Create a test client
  const testClient = new PrismaClient()
  
  // Generate node ID
  const nodeId = generateNodeId()
  console.log(`🔧 Generated Node ID: ${nodeId}`)
  
  // Try to install middleware
  console.log('🔧 Installing sync middleware...')
  
  const config = {
    nodeId,
    registrationKey: 'test-key',
    enabled: true
  }
  
  installSyncMiddleware(testClient, config)
  console.log('✅ Sync middleware installed successfully')
  
  // Test if middleware is actually working
  console.log('\n📋 Step 2: Testing middleware functionality')
  
  const user = await testClient.users.findFirst()
  if (!user) {
    console.log('❌ No users found to test with')
    return
  }
  
  console.log(`👤 Found user: ${user.name}`)
  
  // Count sync events before
  const beforeCount = await testClient.syncEvents.count()
  console.log(`📊 Sync events before update: ${beforeCount}`)
  
  // Update user
  console.log('🔄 Updating user to trigger middleware...')
  await testClient.users.update({
    where: { id: user.id },
    data: { 
      name: user.name + ' (Middleware Test)',
      updatedAt: new Date()
    }
  })
  
  console.log('✅ User update completed')
  
  // Wait for potential async processing
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // Count sync events after
  const afterCount = await testClient.syncEvents.count()
  console.log(`📊 Sync events after update: ${afterCount}`)
  
  if (afterCount > beforeCount) {
    console.log('🎉 SUCCESS: Middleware is working!')
    console.log(`   Generated ${afterCount - beforeCount} sync event(s)`)
  } else {
    console.log('❌ FAILED: Middleware did not generate sync events')
    console.log('💡 This suggests the middleware is not properly capturing database operations')
  }
  
  await testClient.$disconnect()
  
  } catch (error) {
  console.error('❌ Investigation failed:', error)
  
  if (error.message.includes('Cannot find module')) {
    console.log('💡 The sync middleware module cannot be imported')
    console.log('   This suggests compilation issues with TypeScript files')
  } else if (error.message.includes('$use')) {
    console.log('💡 Prisma middleware ($use) is not available or compatible')
    console.log('   This might be a Prisma version compatibility issue')
  } else {
    console.log('💡 Unknown error occurred during middleware testing')
  }
}

investigateMiddleware()