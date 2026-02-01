/**
 * Debug WLAN Configuration to find Guest Service setup
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

    // Get the test WLAN we just created
    console.log('\n=== Fetching WLAN List ===');
    const wlanPayload = `<ajax-request action='getconf' DECRYPT_X='true' caller='unleashed_web' updater='wlan.${Date.now()}' comp='wlansvc-list'/>`;
    const wlanRes = await client.post('/admin/_conf.jsp', wlanPayload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-CSRF-Token': csrfToken || ''
      }
    });

    // Find the TEST-ZEROIT WLAN
    const testWlanMatch = wlanRes.data.match(/<wlansvc[^>]*name="TEST-ZEROIT[^"]*"[^>]*>/);
    if (testWlanMatch) {
      console.log('\n=== TEST WLAN CONFIG ===');
      console.log(testWlanMatch[0]);

      // Extract key attributes
      const idMatch = testWlanMatch[0].match(/\sid="([^"]+)"/);
      const gsIdMatch = testWlanMatch[0].match(/guestservice-id="([^"]+)"/);
      const bypassCnaMatch = testWlanMatch[0].match(/bypass-cna="([^"]+)"/);
      const webAuthMatch = testWlanMatch[0].match(/web-auth="([^"]+)"/);
      const isGuestMatch = testWlanMatch[0].match(/is-guest="([^"]+)"/);

      console.log('\n  Key attributes:');
      console.log(`  id: ${idMatch?.[1] || 'NOT FOUND'}`);
      console.log(`  guestservice-id: ${gsIdMatch?.[1] || 'NOT FOUND'}`);
      console.log(`  bypass-cna: ${bypassCnaMatch?.[1] || 'NOT FOUND'}`);
      console.log(`  web-auth: ${webAuthMatch?.[1] || 'NOT FOUND'}`);
      console.log(`  is-guest: ${isGuestMatch?.[1] || 'NOT FOUND'}`);
    }

    // Try to get guestsvc (different component name)
    console.log('\n=== Trying guestsvc component ===');
    const guestsvcPayload = `<ajax-request action='getconf' DECRYPT_X='true' caller='unleashed_web' updater='guestsvc.${Date.now()}' comp='guestsvc'/>`;
    const guestsvcRes = await client.post('/admin/_conf.jsp', guestsvcPayload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-CSRF-Token': csrfToken || ''
      }
    });
    console.log('guestsvc response:', guestsvcRes.data.substring(0, 500));

    // Try guestpass component
    console.log('\n=== Trying guestpass component ===');
    const guestpassPayload = `<ajax-request action='getconf' DECRYPT_X='true' caller='unleashed_web' updater='guestpass.${Date.now()}' comp='guestpass'/>`;
    const guestpassRes = await client.post('/admin/_conf.jsp', guestpassPayload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-CSRF-Token': csrfToken || ''
      }
    });
    console.log('guestpass response:', guestpassRes.data.substring(0, 500));

    // Try guest-access component
    console.log('\n=== Trying guest-access component ===');
    const guestAccessPayload = `<ajax-request action='getconf' DECRYPT_X='true' caller='unleashed_web' updater='ga.${Date.now()}' comp='guest-access'/>`;
    const gaRes = await client.post('/admin/_conf.jsp', guestAccessPayload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-CSRF-Token': csrfToken || ''
      }
    });
    console.log('guest-access response:', gaRes.data.substring(0, 1000));

  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
