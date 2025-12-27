/**
 * Test R710 Device Connectivity
 *
 * Tests if registered R710 devices are actually reachable
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const { PrismaClient } = require('@prisma/client');
const https = require('https');

const prisma = new PrismaClient();

// Decrypt function matching src/lib/encryption.ts
function decrypt(encryptedText) {
  try {
    const crypto = require('crypto');
    const encryptionKey = process.env.ENCRYPTION_KEY;

    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY environment variable is not set');
    }

    if (encryptionKey.length !== 64) {
      throw new Error(`ENCRYPTION_KEY must be 64 chars hex. Current: ${encryptionKey.length}`);
    }

    const key = Buffer.from(encryptionKey, 'hex');
    const algorithm = 'aes-256-cbc';

    // Split IV and encrypted data
    const parts = encryptedText.split(':');

    if (parts.length !== 2) {
      throw new Error('Invalid encrypted text format (expected: iv:encryptedData)');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encryptedData = parts[1];

    const decipher = crypto.createDecipheriv(algorithm, key, iv);

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;

  } catch (error) {
    console.error('Decryption error:', error);
    throw error;
  }
}

// Simple connection test function
async function testDeviceConnection(ipAddress, username, password) {
  return new Promise((resolve) => {
    const authString = Buffer.from(`${username}:${password}`).toString('base64');

    const options = {
      hostname: ipAddress,
      port: 443, // Standard HTTPS port
      path: '/api/scg/v1/session',
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json'
      },
      rejectUnauthorized: false,
      timeout: 10000
    };

    const startTime = Date.now();

    const req = https.request(options, (res) => {
      const responseTime = Date.now() - startTime;

      if (res.statusCode === 200 || res.statusCode === 204) {
        resolve({ online: true, authenticated: true, responseTime });
      } else if (res.statusCode === 401) {
        resolve({ online: true, authenticated: false, error: 'Authentication failed', responseTime });
      } else {
        resolve({ online: true, authenticated: false, error: `HTTP ${res.statusCode}`, responseTime });
      }
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ online: false, authenticated: false, error: 'Connection timeout (10s)' });
    });

    req.on('error', (error) => {
      resolve({
        online: false,
        authenticated: false,
        error: error.message,
        code: error.code
      });
    });

    req.end();
  });
}

async function testDeviceConnectivity() {
  try {
    console.log('🔍 Testing R710 Device Connectivity...\n');

    const devices = await prisma.r710DeviceRegistry.findMany({
      where: { isActive: true },
      select: {
        id: true,
        ipAddress: true,
        adminUsername: true,
        encryptedAdminPassword: true,
        description: true,
        model: true
      }
    });

    if (devices.length === 0) {
      console.log('❌ No active devices found in registry\n');
      return;
    }

    console.log(`Found ${devices.length} active device(s)\n`);

    for (const device of devices) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Testing: ${device.ipAddress} - ${device.description || 'N/A'}`);
      console.log('='.repeat(60));
      console.log(`IP Address: ${device.ipAddress}`);
      console.log(`Username: ${device.adminUsername}`);
      console.log(`Model: ${device.model || 'N/A'}`);

      try {
        // Decrypt password
        const adminPassword = decrypt(device.encryptedAdminPassword);
        console.log(`Password: ${'*'.repeat(adminPassword.length)} (encrypted)`);

        console.log('\n🔌 Testing connection...');
        console.log(`   URL: https://${device.ipAddress}:443/api/scg/v1/session`);

        const result = await testDeviceConnection(device.ipAddress, device.adminUsername, adminPassword);

        if (result.online && result.authenticated) {
          console.log('✅ SUCCESS - Device is reachable and authenticated');
          console.log(`   Response time: ${result.responseTime || 'N/A'}ms`);
          if (result.deviceInfo) {
            console.log(`   Device Info:`, result.deviceInfo);
          }
        } else if (result.online && !result.authenticated) {
          console.log('⚠️  PARTIAL - Device is online but authentication failed');
          console.log(`   Error: ${result.error || 'Unknown authentication error'}`);
          console.log('   → Check username/password in device registry');
        } else {
          console.log('❌ FAILED - Device is not reachable');
          console.log(`   Error: ${result.error || 'Connection timeout or network unreachable'}`);
          console.log('   → Check if device IP is correct');
          console.log('   → Verify device is powered on');
          console.log('   → Check network connectivity from this machine');
        }

      } catch (error) {
        console.log('❌ ERROR during test:');
        console.log(`   ${error.message}`);

        if (error.code === 'ENOTFOUND') {
          console.log('   → DNS resolution failed - check hostname/IP');
        } else if (error.code === 'ETIMEDOUT') {
          console.log('   → Connection timed out - device may be offline or firewall blocking');
        } else if (error.code === 'ECONNREFUSED') {
          console.log('   → Connection refused - check if service is running on device');
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('Test complete');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDeviceConnectivity();
