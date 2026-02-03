/**
 * Cleanup script to delete test WLAN from R710 device
 */
require('dotenv').config({ path: '.env.local' });

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const axios = require('axios');
const https = require('https');

const prisma = new PrismaClient();

function decrypt(encryptedText) {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  const key = Buffer.from(encryptionKey, 'hex');
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(parts[1], 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function cleanup() {
  console.log('🧹 Cleaning up test WLAN...\n');

  const business = await prisma.businesses.findFirst({ where: { name: { contains: 'Hwandaza' } } });
  const integration = await prisma.r710BusinessIntegrations.findFirst({
    where: { businessId: business.id },
    include: { device_registry: true }
  });

  const device = integration.device_registry;
  console.log(`Device: ${device.ipAddress}`);

  const password = decrypt(device.encryptedAdminPassword);

  const client = axios.create({
    baseURL: `https://${device.ipAddress}`,
    timeout: 30000,
    httpsAgent: new https.Agent({ rejectUnauthorized: false })
  });

  // Login
  const loginParams = new URLSearchParams();
  loginParams.append('username', device.adminUsername);
  loginParams.append('password', password);
  loginParams.append('ok', 'Log in');

  const loginResp = await client.post('/admin/login.jsp', loginParams, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    maxRedirects: 0,
    validateStatus: () => true
  });

  const csrfToken = loginResp.headers['http_x_csrf_token'];
  const cookies = loginResp.headers['set-cookie']?.join('; ') || '';

  console.log(`Logged in, CSRF: ${csrfToken}`);

  // Delete WLAN ID 4 (the test WLAN we created)
  const deletePayload = `<ajax-request action='delobj' updater='wlansvc-list.cleanup' comp='wlansvc-list'><wlansvc id='4'></wlansvc></ajax-request>`;

  const deleteResp = await client.post('/admin/_conf.jsp', deletePayload, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-CSRF-Token': csrfToken,
      'Cookie': cookies
    }
  });

  if (deleteResp.data.includes('<response') && !deleteResp.data.includes('<error')) {
    console.log('\n✅ Test WLAN (ID 4) deleted successfully');
  } else {
    console.log('\n⚠️  Delete response:', deleteResp.data.substring(0, 300));
  }
}

cleanup()
  .catch(e => console.error('Error:', e.message))
  .finally(() => prisma.$disconnect());
