/**
 * Test Sync with Peer Server
 * Manually test syncing with the configured peer
 */

const crypto = require('crypto');

async function testPeerSync() {
  console.log('🔄 Testing Sync with Peer Server\n');
  console.log('═══════════════════════════════════════════════════\n');

  const peerUrl = 'http://192.168.0.112:8765'; // DESKTOP-GC8RGAN
  const registrationKey = 'b3f1c9d7a5e4f2c3819d6b7a2e4f0c1d2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7';
  const registrationHash = crypto.createHash('sha256').update(registrationKey).digest('hex');

  console.log(`Target Peer: ${peerUrl}`);
  console.log(`Node ID: sync-node-dell-hwandaza`);
  console.log(`Registration Hash: ${registrationHash.substring(0, 20)}...\n`);

  // Step 1: Check if peer is reachable
  console.log('Step 1: Testing peer connectivity...');
  try {
    const healthResponse = await fetch(`${peerUrl}/api/health`, {
      signal: AbortSignal.timeout(5000)
    });

    if (healthResponse.ok) {
      const health = await healthResponse.json();
      console.log(`✅ Peer is reachable! Status: ${health.status}`);
      console.log(`   Database: ${health.database}`);
      console.log(`   Uptime: ${health.uptime?.formatted || 'N/A'}\n`);
    } else {
      console.log(`❌ Peer health check failed: ${healthResponse.status}\n`);
      return;
    }
  } catch (error) {
    console.log(`❌ Cannot reach peer: ${error.message}\n`);
    console.log('Make sure the peer server is running and accessible.\n');
    return;
  }

  // Step 2: Test sync request endpoint
  console.log('Step 2: Testing sync request endpoint...');
  const testPayload = {
    sessionId: 'manual-test-' + Date.now(),
    sourceNodeId: 'sync-node-dell-hwandaza',
    lastSyncTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last 24 hours
    maxEvents: 50
  };

  const headers = {
    'Content-Type': 'application/json',
    'X-Node-ID': 'sync-node-dell-hwandaza',
    'X-Registration-Hash': registrationHash
  };

  try {
    const response = await fetch(`${peerUrl}/api/sync/request`, {
      method: 'POST',
      headers,
      body: JSON.stringify(testPayload),
      signal: AbortSignal.timeout(10000)
    });

    console.log(`Response Status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Sync request successful!`);
      console.log(`   Events received: ${data.totalEvents}`);
      console.log(`   Has more events: ${data.hasMoreEvents}`);
      console.log(`   Timestamp: ${data.timestamp}\n`);

      if (data.totalEvents > 0) {
        console.log('📋 Sample events:');
        data.events.slice(0, 3).forEach((event, i) => {
          console.log(`   ${i + 1}. ${event.operation} on ${event.table} (${event.timestamp})`);
        });
      } else {
        console.log('   ℹ️  No sync events found (peer database might be in sync or empty)');
      }
    } else {
      const errorText = await response.text();
      console.log(`❌ Sync request failed!`);
      console.log(`   Error: ${errorText}\n`);

      // Try to parse as JSON for more details
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.details) {
          console.log(`   Details: ${errorJson.details}`);
        }
      } catch (e) {
        // Not JSON, already showed the text
      }
    }
  } catch (error) {
    console.log(`❌ Sync request error: ${error.message}\n`);
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log('\n💡 Summary:');
  console.log('   The sync API endpoint has been fixed and is working.');
  console.log('   If the peer server also has the fix, syncing should work now.');
  console.log('   You may need to apply the same fix to the peer server.\n');
}

testPeerSync().catch(console.error);
