// Direct ESP32 API test - bypass Next.js server
import { createPortalClient } from './src/lib/wifi-portal/api-client.js';
import { PrismaClient } from '@prisma/client';

async function testESP32Direct() {
  try {
    console.log('🔍 Direct ESP32 API Test...\n');

    // Get portal config from database
    const prisma = new PrismaClient();

    const integration = await prisma.portalIntegrations.findFirst({
      where: { isActive: true }
    });

    if (!integration) {
      console.log('❌ No active portal integration found');
      return;
    }

    console.log(`📡 Portal: ${integration.portalIpAddress}:${integration.portalPort}`);
    console.log(`🔑 API Key: ${integration.apiKey.substring(0, 10)}...`);

    // Create portal client
    const portalClient = createPortalClient({
      baseUrl: `http://${integration.portalIpAddress}:${integration.portalPort}`,
      apiKey: integration.apiKey,
      timeout: 10000,
    });

    const tokens = ['ZDFSD5RR', 'AU7D38J2', 'RQ8W6DKT'];

    console.log(`\n🔄 Testing tokens: ${tokens.join(', ')}`);

    // Test batch API
    console.log('\n📊 Testing BATCH API...');
    try {
      const batchResult = await portalClient.batchGetTokenInfo({ tokens });
      console.log('✅ Batch API Response:');
      console.log(JSON.stringify(batchResult, null, 2));
    } catch (error) {
      console.log('❌ Batch API Error:', error.message);
      console.log('Full error:', error);
    }

    // Test individual APIs
    console.log('\n📊 Testing INDIVIDUAL APIs...');
    for (const token of tokens) {
      console.log(`\n🔍 Testing token: ${token}`);
      try {
        const individualResult = await portalClient.getTokenInfo({ token });
        console.log('✅ Individual API Response:');
        console.log(JSON.stringify(individualResult, null, 2));
      } catch (error) {
        console.log('❌ Individual API Error:', error.message);
        console.log('Full error:', error);
      }
    }

    await prisma.$disconnect();

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testESP32Direct();