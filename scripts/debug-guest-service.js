/**
 * Debug Guest Service List from R710
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

    // Add cookie interceptors
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

    // Get guest service list
    console.log('\n=== Fetching Guest Service List ===');
    const gsPayload = `<ajax-request action='getconf' DECRYPT_X='true' caller='unleashed_web' updater='gs.${Date.now()}' comp='guestservice-list'/>`;
    const gsRes = await client.post('/admin/_conf.jsp', gsPayload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-CSRF-Token': csrfToken || ''
      }
    });

    console.log('\n=== GUEST SERVICE LIST RAW RESPONSE ===');
    console.log(gsRes.data);

    // Parse and show guest services
    console.log('\n=== PARSED GUEST SERVICES ===');
    const gsMatches = gsRes.data.match(/<guestservice[^>]*>/g);
    if (gsMatches) {
      gsMatches.forEach((match, i) => {
        console.log(`\nGuest Service ${i + 1}:`);
        console.log(match);

        // Extract key attributes
        const idMatch = match.match(/\sid="([^"]+)"/);
        const nameMatch = match.match(/name="([^"]+)"/);
        const onboardingMatch = match.match(/onboarding="([^"]+)"/);
        const aspectMatch = match.match(/onboarding-aspect="([^"]+)"/);

        console.log(`  id: ${idMatch?.[1] || 'NOT FOUND'}`);
        console.log(`  name: ${nameMatch?.[1] || 'NOT FOUND'}`);
        console.log(`  onboarding: ${onboardingMatch?.[1] || 'NOT FOUND'}`);
        console.log(`  onboarding-aspect: ${aspectMatch?.[1] || 'NOT FOUND'}`);
      });
    } else {
      console.log('No <guestservice> elements found');
    }

  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
