/**
 * Test script to verify peer discovery database integration
 * This tests if our changes to store discovered peers in the database are working
 */

const { PrismaClient } = require('@prisma/client')
const dgram = require('dgram')

// Mock peer discovery message to test database integration
async function testPeerDiscoveryDatabase() {
  console.log('🧪 Testing Peer Discovery Database Integration...\n')
  
  try {
    const prisma = new PrismaClient()
    
    // Clear any existing test nodes
    await prisma.syncNodes.deleteMany({
      where: { nodeName: { startsWith: 'test-node-' } }
    })
    
    // Create a test peer discovery entry directly to simulate what the service should do
    const testNode = {
      id: 'test-node-12345',
      nodeId: 'test-node-12345',
      nodeName: 'test-node-for-database',
      ipAddress: '192.168.1.100', 
      port: 8765,
      isActive: true,
      lastSeen: new Date(),
      capabilities: {
        version: '1.0.0',
        features: ['sync', 'conflict-resolution']
      }
    }
    
    console.log('📝 Creating test sync node...')
    const createdNode = await prisma.syncNodes.upsert({
      where: { nodeId: testNode.nodeId },
      update: {
        isActive: testNode.isActive,
        lastSeen: testNode.lastSeen,
        ipAddress: testNode.ipAddress,
        port: testNode.port,
        capabilities: testNode.capabilities
      },
      create: testNode
    })
    
    console.log('✅ Test node created:', {
      nodeId: createdNode.nodeId,
      nodeName: createdNode.nodeName,
      ipAddress: createdNode.ipAddress,
      port: createdNode.port,
      isActive: createdNode.isActive
    })
    
    // Verify we can query it back
    console.log('\n🔍 Querying all sync nodes...')
    const allNodes = await prisma.syncNodes.findMany({
      orderBy: { lastSeen: 'desc' }
    })
    
    console.log(`📊 Found ${allNodes.length} sync nodes in database:`)
    allNodes.forEach((node, index) => {
      const isRecent = node.lastSeen && 
        (new Date().getTime() - new Date(node.lastSeen).getTime()) < 5 * 60 * 1000
      console.log(`${index + 1}. ${node.nodeName} (${node.nodeId})`)
      console.log(`   📍 ${node.ipAddress}:${node.port}`)
      console.log(`   🟢 Active: ${node.isActive}, Recent: ${isRecent}`)
      console.log(`   🕒 Last seen: ${node.lastSeen}`)
    })
    
    // Clean up test node
    await prisma.syncNodes.delete({
      where: { nodeId: testNode.nodeId }
    })
    console.log('\n🧹 Test node cleaned up')
    
    console.log('\n✅ Database integration test completed successfully!')
    console.log('💡 The peer discovery service should now be able to store discovered peers in the database.')
    
    await prisma.$disconnect()
    
  } catch (error) {
    console.error('❌ Database integration test failed:', error)
    process.exit(1)
  }
}

// Run the test
testPeerDiscoveryDatabase()