/**
 * Test Peer Server API Status
 * Check if the peer server has the same 500 error or if it's fixed
 */

const crypto = require('crypto');

async function testPeerApi() {
  console.log('🔍 Testing Peer Server API Status\n');
  console.log('═══════════════════════════════════════════════════\n');

  const peerUrl = 'http://192.168.0.112:8080'; // DESKTOP-GC8RGAN
  const registrationKey = 'b3f1c9d7a5e4f2c3819d6b7a2e4f0c1d2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7';
  const registrationHash = crypto.createHash('sha256').update(registrationKey).digest('hex');

  console.log(`Testing: ${peerUrl}/api/sync/request`);
  console.log(`Using Registration Hash: ${registrationHash.substring(0, 20)}...\n`);

  const testPayload = {
    sessionId: 'test-' + Date.now(),
    sourceNodeId: 'sync-node-dell-hwandaza',
    lastSyncTime: new Date(0).toISOString(),
    maxEvents: 10
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

    console.log(`Status: ${response.status} ${response.statusText}\n`);

    if (response.status === 500) {
      console.log('❌ PEER SERVER HAS THE SAME 500 ERROR!\n');
      console.log('📝 Solution:');
      console.log('   You need to apply the same fix to the peer server.');
      console.log('   Copy the updated /src/app/api/sync/request/route.ts');
      console.log('   to the peer server and restart it.\n');

      const text = await response.text();
      console.log(`Error response: ${text}\n`);

    } else if (response.ok) {
      const data = await response.json();
      console.log('✅ PEER SERVER IS WORKING!\n');
      console.log(`Response:`, JSON.stringify(data, null, 2));
      console.log('\n💡 Both servers are now working. Sync should be functional!');

    } else {
      const text = await response.text();
      console.log(`⚠️  Unexpected response: ${response.status}`);
      console.log(`Body: ${text}\n`);
    }

  } catch (error) {
    console.error(`❌ Request failed: ${error.message}\n`);
  }

  console.log('═══════════════════════════════════════════════════\n');
}

testPeerApi().catch(console.error);
