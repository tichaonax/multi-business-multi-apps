/**
 * Compare working WLAN with test WLAN to find Zero-IT difference
 */

require('dotenv').config({ path: '.env.local' });

const axios = require('axios');
const https = require('https');
const crypto = require('crypto');
const { CookieJar } = require('tough-cookie');
const { PrismaClient } = require('@prisma/client');

function decrypt(encryptedText) {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  const key = Buffer.from(encryptionKey, 'hex');
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedData = parts[1];
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function main() {
  const prisma = new PrismaClient();

  try {
    const device = await prisma.r710DeviceRegistry.findFirst({ where: { ipAddress: '192.168.2.241' } });
    if (!device) {
      console.log('No device found');
      return;
    }

    const password = decrypt(device.encryptedAdminPassword);
    const cookieJar = new CookieJar();
    const baseUrl = 'https://192.168.2.241';

    const client = axios.create({
      baseURL: baseUrl,
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      timeout: 30000
    });

    client.interceptors.request.use(async (config) => {
      const url = baseUrl + config.url;
      const cookieString = await cookieJar.getCookieString(url);
      if (cookieString) config.headers.Cookie = cookieString;
      return config;
    });
    client.interceptors.response.use(async (response) => {
      const setCookieHeaders = response.headers['set-cookie'];
      if (setCookieHeaders) {
        const url = baseUrl + response.config.url;
        for (const c of setCookieHeaders) await cookieJar.setCookie(c, url);
      }
      return response;
    });

    // Login
    console.log('Logging in as', device.adminUsername);
    const loginParams = new URLSearchParams();
    loginParams.append('username', device.adminUsername);
    loginParams.append('password', password);
    loginParams.append('ok', 'Log in');

    const loginRes = await client.post('/admin/login.jsp', loginParams, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      maxRedirects: 0,
      validateStatus: () => true
    });

    const csrfToken = loginRes.headers['http_x_csrf_token'];
    console.log('Login successful');

    // Get all WLANs
    const wlanPayload = `<ajax-request action='getconf' DECRYPT_X='true' caller='unleashed_web' updater='wlan.${Date.now()}' comp='wlansvc-list'/>`;
    const wlanRes = await client.post('/admin/_conf.jsp', wlanPayload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-CSRF-Token': csrfToken || ''
      }
    });

    // Extract full WLAN elements including children
    const workingWlanMatch = wlanRes.data.match(/<wlansvc[^>]*name="Hwandaza Padam Guest WiFi"[^>]*>[\s\S]*?<\/wlansvc>/);
    const testWlanMatch = wlanRes.data.match(/<wlansvc[^>]*name="TEST-ZEROIT[^"]*"[^>]*>[\s\S]*?<\/wlansvc>/);

    if (workingWlanMatch && testWlanMatch) {
      console.log('\n=== WORKING WLAN (Hwandaza Padam Guest WiFi) - FULL CONFIG ===');
      console.log(workingWlanMatch[0]);

      console.log('\n\n=== TEST WLAN (TEST-ZEROIT) - FULL CONFIG ===');
      console.log(testWlanMatch[0]);

      // Parse and compare attributes
      console.log('\n\n=== ATTRIBUTE COMPARISON ===');

      const extractAttrs = (xml) => {
        const attrs = {};
        const attrPattern = /(\w+(?:-\w+)*)="([^"]*)"/g;
        let match;
        while ((match = attrPattern.exec(xml)) !== null) {
          attrs[match[1]] = match[2];
        }
        return attrs;
      };

      const workingAttrs = extractAttrs(workingWlanMatch[0].split('>')[0]);
      const testAttrs = extractAttrs(testWlanMatch[0].split('>')[0]);

      // Find differences
      const allKeys = new Set([...Object.keys(workingAttrs), ...Object.keys(testAttrs)]);

      console.log('\nDifferences:');
      for (const key of allKeys) {
        if (workingAttrs[key] !== testAttrs[key]) {
          console.log(`  ${key}:`);
          console.log(`    Working: "${workingAttrs[key] || 'N/A'}"`);
          console.log(`    Test:    "${testAttrs[key] || 'N/A'}"`);
        }
      }

      // Specifically check Zero-IT related attributes
      console.log('\n\nZero-IT Related Attributes:');
      const zeroItAttrs = ['bypass-cna', 'is-guest', 'web-auth', 'guest-auth', 'guestservice-id', 'enable-type'];
      for (const attr of zeroItAttrs) {
        console.log(`  ${attr}:`);
        console.log(`    Working: "${workingAttrs[attr] || 'N/A'}"`);
        console.log(`    Test:    "${testAttrs[attr] || 'N/A'}"`);
      }
    } else {
      console.log('Could not find one or both WLANs');
      if (!workingWlanMatch) console.log('  - Working WLAN not found');
      if (!testWlanMatch) console.log('  - Test WLAN not found');
    }

  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
