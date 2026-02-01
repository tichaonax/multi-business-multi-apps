/**
 * Debug Full R710 Configuration to find Zero-IT setting
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
    console.log('Login status:', loginRes.status);

    // Try various component names for guest service configuration
    const components = [
      'guestaccess-list',
      'hotspot-list',
      'captive-portal',
      'dpsk',
      'zeroit',
      'onboarding',
      'device-onboarding',
      'zeroit-onboarding',
      'client-onboarding',
      'wireless-guest',
      'guestportal',
      'guestportals',
      'guest-portal',
      'guest-portals'
    ];

    for (const comp of components) {
      const payload = `<ajax-request action='getconf' DECRYPT_X='true' caller='unleashed_web' updater='test.${Date.now()}' comp='${comp}'/>`;
      try {
        const res = await client.post('/admin/_conf.jsp', payload, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-CSRF-Token': csrfToken || ''
          }
        });

        // Only show non-empty responses
        if (!res.data.includes(`<${comp} />`)) {
          console.log(`\n=== ${comp} ===`);
          console.log(res.data.substring(0, 1000));
        }
      } catch (e) {
        // Ignore errors
      }
    }

    // Let's also look for the specific WLAN we created and see if there's more config inside the wlansvc element
    console.log('\n\n=== FULL WLAN CONFIG FOR TEST WLAN ===');
    const wlanPayload = `<ajax-request action='getconf' DECRYPT_X='true' caller='unleashed_web' updater='wlan.${Date.now()}' comp='wlansvc-list'/>`;
    const wlanRes = await client.post('/admin/_conf.jsp', wlanPayload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-CSRF-Token': csrfToken || ''
      }
    });

    // Extract the full TEST-ZEROIT WLAN element including children
    const fullWlanMatch = wlanRes.data.match(/<wlansvc[^>]*name="TEST-ZEROIT[^"]*"[^>]*>[\s\S]*?<\/wlansvc>/);
    if (fullWlanMatch) {
      console.log(fullWlanMatch[0]);
    }

    // Check if there's a guestservice element inside the WLAN
    console.log('\n\n=== Looking for guestservice inside WLAN ===');
    const gsInsideWlan = wlanRes.data.match(/<guestservice[^>]*>/g);
    if (gsInsideWlan) {
      gsInsideWlan.forEach((gs, i) => {
        console.log(`Guest service ${i + 1}:`, gs);
      });
    } else {
      console.log('No guestservice elements found in WLAN config');
    }

    // Try to get the full configuration dump
    console.log('\n\n=== Searching for onboarding/zeroit in full WLAN response ===');
    const onboardingMatches = wlanRes.data.match(/onboarding[^"]*="[^"]*"/g);
    const zeroitMatches = wlanRes.data.match(/zeroit[^"]*="[^"]*"/gi);

    if (onboardingMatches) {
      console.log('Onboarding attributes:', onboardingMatches);
    }
    if (zeroitMatches) {
      console.log('ZeroIT attributes:', zeroitMatches);
    }

  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
