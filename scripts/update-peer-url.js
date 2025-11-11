/**
 * Update Peer Node URL
 * Fix the peer configuration to use the correct port
 */

const { PrismaClient } = require('@prisma/client');

async function updatePeerUrl() {
  const prisma = new PrismaClient();

  try {
    console.log('🔧 Updating Peer Node URL Configuration\n');
    console.log('═══════════════════════════════════════════════════\n');

    // Find the peer node
    const peer = await prisma.syncPeerNodes.findFirst({
      where: {
        nodeName: 'sync-node-DESKTOP-GC8RGAN'
      }
    });

    if (!peer) {
      console.log('❌ Peer node "sync-node-DESKTOP-GC8RGAN" not found!\n');
      return;
    }

    console.log(`Current configuration:`);
    console.log(`   Node ID: ${peer.nodeId}`);
    console.log(`   Name: ${peer.nodeName}`);
    console.log(`   Current URL: ${peer.nodeUrl}`);
    console.log(`   Status: ${peer.status || 'unknown'}\n`);

    const newUrl = 'http://192.168.0.112:8080';

    if (peer.nodeUrl === newUrl) {
      console.log(`✅ URL is already correct: ${newUrl}\n`);
      return;
    }

    // Update the URL
    const updated = await prisma.syncPeerNodes.update({
      where: {
        nodeId: peer.nodeId
      },
      data: {
        nodeUrl: newUrl
      }
    });

    console.log(`✅ Peer URL updated successfully!`);
    console.log(`   Old URL: ${peer.nodeUrl}`);
    console.log(`   New URL: ${updated.nodeUrl}\n`);

    console.log('═══════════════════════════════════════════════════\n');
    console.log('💡 Next step: Test the sync connection with the updated URL\n');

  } catch (error) {
    console.error('❌ Error updating peer URL:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updatePeerUrl().catch(console.error);
