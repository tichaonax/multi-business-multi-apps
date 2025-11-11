/**
 * Test Sync Endpoint with correct credentials
 */

const crypto = require('crypto');

async function testSyncEndpoint() {
  console.log('🔍 Testing sync endpoint with correct credentials...\n');

  const registrationKey = 'b3f1c9d7a5e4f2c3819d6b7a2e4f0c1d2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7';
  const registrationHash = crypto.createHash('sha256').update(registrationKey).digest('hex');

  console.log(`Registration Hash: ${registrationHash}\n`);

  const testUrl = 'http://localhost:8080/api/sync/request';
  const testPayload = {
    sessionId: 'test-session-' + Date.now(),
    sourceNodeId: 'sync-node-dell-hwandaza',
    lastSyncTime: new Date(0).toISOString(),
    maxEvents: 10
  };

  const headers = {
    'Content-Type': 'application/json',
    'X-Node-ID': 'sync-node-dell-hwandaza',
    'X-Registration-Hash': registrationHash
  };

  console.log(`URL: ${testUrl}`);
  console.log(`Headers:`, JSON.stringify(headers, null, 2));
  console.log(`Payload:`, JSON.stringify(testPayload, null, 2));
  console.log('\n📡 Sending request...\n');

  try {
    const response = await fetch(testUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(testPayload)
    });

    console.log(`Response Status: ${response.status} ${response.statusText}`);
    console.log(`Response Headers:`, Object.fromEntries(response.headers.entries()));

    const contentType = response.headers.get('content-type');
    let data;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
      console.log('\n✅ Response Body (JSON):');
      console.log(JSON.stringify(data, null, 2));
    } else {
      data = await response.text();
      console.log('\n❌ Response Body (Text):');
      console.log(data);
    }

    if (response.status === 500) {
      console.log('\n🔴 500 ERROR CONFIRMED!');
      console.log('The server is returning an internal server error.');
      console.log('Check the Next.js server console for detailed error logs.');
    } else if (response.ok) {
      console.log('\n✅ SUCCESS! Endpoint is working correctly.');
    }
  } catch (error) {
    console.log('\n❌ Request failed:', error.message);
    console.log(error.stack);
  }
}

testSyncEndpoint().catch(console.error);
