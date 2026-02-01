/**
 * Test Zero-IT by updating an existing WLAN
 *
 * This script will:
 * 1. Find the test WLAN
 * 2. Try to update it with explicit Zero-IT settings
 * 3. Verify the changes
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
    console.log('Login status:', loginRes.status, 'CSRF:', csrfToken);

    // Get existing WLANs to compare
    console.log('\n=== Getting all WLANs to compare settings ===');
    const wlanPayload = `<ajax-request action='getconf' DECRYPT_X='true' caller='unleashed_web' updater='wlan.${Date.now()}' comp='wlansvc-list'/>`;
    const wlanRes = await client.post('/admin/_conf.jsp', wlanPayload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-CSRF-Token': csrfToken || ''
      }
    });

    // Find all WLANs and show their Zero-IT related attributes
    const wlanMatches = wlanRes.data.match(/<wlansvc[^>]+>/g);
    if (wlanMatches) {
      wlanMatches.forEach((wlan, i) => {
        const nameMatch = wlan.match(/name="([^"]+)"/);
        const bypassCnaMatch = wlan.match(/bypass-cna="([^"]+)"/);
        const isGuestMatch = wlan.match(/is-guest="([^"]+)"/);
        const webAuthMatch = wlan.match(/web-auth="([^"]+)"/);

        console.log(`\nWLAN ${i + 1}: ${nameMatch?.[1] || 'unknown'}`);
        console.log(`  is-guest: ${isGuestMatch?.[1] || 'N/A'}`);
        console.log(`  bypass-cna: ${bypassCnaMatch?.[1] || 'N/A'}`);
        console.log(`  web-auth: ${webAuthMatch?.[1] || 'N/A'}`);
      });
    }

    // Now let's try updating the test WLAN with different Zero-IT settings
    console.log('\n\n=== Attempting to update TEST WLAN with Zero-IT settings ===');

    // First, let's try with bypass-cna='true' to see if it toggles the checkbox
    const updatePayload1 = `<ajax-request action='updobj' updater='wlan.${Date.now()}' comp='wlansvc-list'>
      <wlansvc id='3' bypass-cna='true'/>
    </ajax-request>`;

    console.log('\nStep 1: Setting bypass-cna="true" (should DISABLE Zero-IT)');
    const updateRes1 = await client.post('/admin/_conf.jsp', updatePayload1, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-CSRF-Token': csrfToken || ''
      }
    });
    console.log('Response:', updateRes1.data.substring(0, 500));

    // Wait a bit
    await new Promise(r => setTimeout(r, 1000));

    // Now set it back to false
    const updatePayload2 = `<ajax-request action='updobj' updater='wlan.${Date.now()}' comp='wlansvc-list'>
      <wlansvc id='3' bypass-cna='false'/>
    </ajax-request>`;

    console.log('\nStep 2: Setting bypass-cna="false" (should ENABLE Zero-IT)');
    const updateRes2 = await client.post('/admin/_conf.jsp', updatePayload2, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-CSRF-Token': csrfToken || ''
      }
    });
    console.log('Response:', updateRes2.data.substring(0, 500));

    // Verify final state
    console.log('\n\n=== Verifying final state ===');
    const verifyRes = await client.post('/admin/_conf.jsp', wlanPayload.replace('wlan.', 'verify.'), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-CSRF-Token': csrfToken || ''
      }
    });

    const testWlanMatch = verifyRes.data.match(/<wlansvc[^>]*name="TEST-ZEROIT[^"]*"[^>]*>/);
    if (testWlanMatch) {
      console.log('TEST WLAN current state:');
      console.log(testWlanMatch[0].substring(0, 500));

      const bypassCnaFinal = testWlanMatch[0].match(/bypass-cna="([^"]+)"/);
      console.log(`\nFinal bypass-cna value: ${bypassCnaFinal?.[1]}`);
      console.log(`Expected for Zero-IT enabled: "false"`);
    }

    console.log('\n\n*** Please check the R710 UI now to see if Zero-IT checkbox changed ***');

  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
