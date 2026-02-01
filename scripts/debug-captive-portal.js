/**
 * Debug Captive Portal Configuration
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
    console.log('Logging in...');
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
    console.log('Login successful\n');

    // Check system configuration
    console.log('=== SYSTEM CONFIGURATION ===');
    const sysPayload = `<ajax-request action='getconf' DECRYPT_X='true' caller='unleashed_web' updater='sys.${Date.now()}' comp='system'/>`;
    const sysRes = await client.post('/admin/_conf.jsp', sysPayload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-CSRF-Token': csrfToken || ''
      }
    });

    // Extract IP configuration
    const ipMatch = sysRes.data.match(/ip="([^"]+)"/);
    const gatewayMatch = sysRes.data.match(/gateway="([^"]+)"/);
    const dnsMatch = sysRes.data.match(/dns[^"]*="([^"]+)"/g);

    console.log('R710 IP:', ipMatch?.[1] || 'Not found');
    console.log('Gateway:', gatewayMatch?.[1] || 'Not found');
    console.log('DNS settings:', dnsMatch || 'Not found');

    // Check hotspot/captive portal configuration
    console.log('\n=== HOTSPOT/CAPTIVE PORTAL CONFIG ===');
    const components = ['hotspot', 'hotspot-list', 'captive-portal', 'walled-garden', 'web-auth'];

    for (const comp of components) {
      const payload = `<ajax-request action='getconf' DECRYPT_X='true' caller='unleashed_web' updater='test.${Date.now()}' comp='${comp}'/>`;
      try {
        const res = await client.post('/admin/_conf.jsp', payload, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-CSRF-Token': csrfToken || ''
          }
        });
        if (!res.data.includes(`<${comp} />`)) {
          console.log(`\n${comp}:`);
          console.log(res.data.substring(0, 800));
        }
      } catch (e) {
        // ignore
      }
    }

    // Check the test WLAN's web-auth and https-redirection settings
    console.log('\n\n=== TEST WLAN WEB-AUTH SETTINGS ===');
    const wlanPayload = `<ajax-request action='getconf' DECRYPT_X='true' caller='unleashed_web' updater='wlan.${Date.now()}' comp='wlansvc-list'/>`;
    const wlanRes = await client.post('/admin/_conf.jsp', wlanPayload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-CSRF-Token': csrfToken || ''
      }
    });

    const testWlanMatch = wlanRes.data.match(/<wlansvc[^>]*name="TEST-ZEROIT[^"]*"[^>]*>/);
    if (testWlanMatch) {
      const webAuthMatch = testWlanMatch[0].match(/web-auth="([^"]+)"/);
      const httpsRedirMatch = testWlanMatch[0].match(/https-redirection="([^"]+)"/);
      const guestAuthMatch = testWlanMatch[0].match(/guest-auth="([^"]+)"/);
      const localBridgeMatch = testWlanMatch[0].match(/local-bridge="([^"]+)"/);
      const forceDhcpMatch = testWlanMatch[0].match(/force-dhcp="([^"]+)"/);

      console.log('web-auth:', webAuthMatch?.[1]);
      console.log('https-redirection:', httpsRedirMatch?.[1]);
      console.log('guest-auth:', guestAuthMatch?.[1]);
      console.log('local-bridge:', localBridgeMatch?.[1]);
      console.log('force-dhcp:', forceDhcpMatch?.[1]);
    }

    // Try to access the guest portal directly
    console.log('\n\n=== TESTING GUEST PORTAL ACCESS ===');
    try {
      const portalRes = await client.get('/user/user.jsp', {
        headers: { 'Accept': 'text/html' },
        validateStatus: () => true
      });
      console.log('Guest portal (/user/user.jsp) status:', portalRes.status);
      console.log('Response length:', portalRes.data.length, 'bytes');
      if (portalRes.data.includes('Guest')) {
        console.log('Guest portal page appears to be working');
      }
    } catch (e) {
      console.log('Error accessing guest portal:', e.message);
    }

  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
