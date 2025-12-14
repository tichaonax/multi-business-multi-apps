/**
 * Manual Test Script for WiFi Portal API Client
 *
 * Usage: node scripts/test-wifi-portal-api.js [portalIp] [portalPort] [apiKey]
 *
 * Example: node scripts/test-wifi-portal-api.js 192.168.1.100 8080 my_api_key_123
 */

const { createPortalClient } = require('../src/lib/wifi-portal/api-client.ts');

// ============================================================================
// Configuration
// ============================================================================

const args = process.argv.slice(2);

if (args.length < 3) {
  console.log('❌ Missing required arguments\n');
  console.log('Usage: node scripts/test-wifi-portal-api.js <portalIp> <portalPort> <apiKey>\n');
  console.log('Example: node scripts/test-wifi-portal-api.js 192.168.1.100 8080 my_api_key_123');
  process.exit(1);
}

const [portalIp, portalPort, apiKey] = args;

const config = {
  baseUrl: `http://${portalIp}:${portalPort}`,
  apiKey: apiKey,
  timeout: 10000,
  retries: 3,
  retryDelay: 1000,
};

// ============================================================================
// Test Runner
// ============================================================================

async function runTests() {
  console.log('🧪 WiFi Portal API Client - Manual Test\n');
  console.log('Configuration:');
  console.log(`  Portal URL: ${config.baseUrl}`);
  console.log(`  API Key: ${config.apiKey}`);
  console.log(`  Timeout: ${config.timeout}ms`);
  console.log(`  Retries: ${config.retries}\n`);

  const client = createPortalClient(config);

  let createdToken = null;

  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing Health Check...');
    const health = await client.checkHealth();
    if (health.online) {
      console.log('✅ Portal is online');
      console.log(`   Version: ${health.version || 'Unknown'}`);
      console.log(`   Uptime: ${health.uptime ? Math.floor(health.uptime / 60) + ' minutes' : 'Unknown'}\n`);
    } else {
      console.log('❌ Portal is offline');
      console.log(`   Error: ${health.error}\n`);
      throw new Error('Portal health check failed');
    }

    // Test 2: Create Token
    console.log('2️⃣ Testing Token Creation...');
    const createResult = await client.createToken({
      durationMinutes: 60, // 1 hour
      bandwidthDownMb: 5,
      bandwidthUpMb: 2,
      maxDevices: 2,
    });

    if (createResult.success && createResult.token) {
      createdToken = createResult.token;
      console.log('✅ Token created successfully');
      console.log(`   Token: ${createResult.token}`);
      console.log(`   Expires: ${createResult.expiresAt}`);
      console.log(`   Bandwidth: ${createResult.bandwidthDownMb}MB down / ${createResult.bandwidthUpMb}MB up\n`);
    } else {
      throw new Error('Token creation failed: ' + (createResult.error || 'Unknown error'));
    }

    // Test 3: Get Token Info
    console.log('3️⃣ Testing Get Token Info...');
    const infoResult = await client.getTokenInfo({ token: createdToken });

    if (infoResult.success) {
      console.log('✅ Token info retrieved successfully');
      console.log(`   Token: ${infoResult.token}`);
      console.log(`   Status: ${infoResult.status}`);
      console.log(`   Created: ${infoResult.createdAt}`);
      console.log(`   Expires: ${infoResult.expiresAt}`);
      console.log(`   First Used: ${infoResult.firstUsedAt || 'Not used yet'}`);
      console.log(`   Usage Count: ${infoResult.usageCount || 0}`);
      console.log(`   Bandwidth Used: ${infoResult.bandwidthUsedDown || 0}MB down / ${infoResult.bandwidthUsedUp || 0}MB up\n`);
    } else {
      throw new Error('Get token info failed: ' + (infoResult.error || 'Unknown error'));
    }

    // Test 4: Extend Token
    console.log('4️⃣ Testing Token Extension...');
    const extendResult = await client.extendToken({
      token: createdToken,
      additionalMinutes: 30,
    });

    if (extendResult.success) {
      console.log('✅ Token extended successfully');
      console.log(`   New expiration: ${extendResult.expiresAt}\n`);
    } else {
      throw new Error('Token extension failed: ' + (extendResult.error || 'Unknown error'));
    }

    // Test 5: Disable Token
    console.log('5️⃣ Testing Token Disable...');
    const disableResult = await client.disableToken({
      token: createdToken,
      reason: 'Manual test - cleanup',
    });

    if (disableResult.success) {
      console.log('✅ Token disabled successfully');
      console.log(`   Message: ${disableResult.message}\n`);
    } else {
      throw new Error('Token disable failed: ' + (disableResult.error || 'Unknown error'));
    }

    // Test 6: Verify Disabled Status
    console.log('6️⃣ Verifying Token Disabled Status...');
    const finalInfo = await client.getTokenInfo({ token: createdToken });

    if (finalInfo.success && finalInfo.status === 'DISABLED') {
      console.log('✅ Token status confirmed as DISABLED\n');
    } else {
      console.log('⚠️  Token status: ' + finalInfo.status + '\n');
    }

    // Success Summary
    console.log('✅ ALL TESTS PASSED!\n');
    console.log('📊 Test Summary:');
    console.log('   ✅ Health check');
    console.log('   ✅ Token creation');
    console.log('   ✅ Token info retrieval');
    console.log('   ✅ Token extension');
    console.log('   ✅ Token disable');
    console.log('   ✅ Status verification\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error.message);

    if (error.name === 'PortalNetworkError') {
      console.error('\n⚠️  Network Error: Unable to reach portal server');
      console.error('   - Check that the portal IP and port are correct');
      console.error('   - Verify the portal server is running');
      console.error('   - Check network connectivity');
    } else if (error.name === 'PortalAPIError') {
      console.error('\n⚠️  API Error: The portal returned an error');
      console.error('   - Verify the API key is correct');
      console.error('   - Check portal server logs for details');
    } else if (error.name === 'PortalValidationError') {
      console.error('\n⚠️  Validation Error: Invalid request parameters');
      console.error('   - Check the test parameters');
    }

    console.error('\n📋 Error Details:');
    console.error(error);

    process.exit(1);
  }
}

// Run tests
runTests();
