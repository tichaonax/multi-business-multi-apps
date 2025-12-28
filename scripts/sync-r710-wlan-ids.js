/**
 * Sync R710 WLAN IDs from Device
 * Query device to get actual numeric IDs and update database
 */

require('dotenv').config({ path: '.env.local' });

const axios = require('axios');
const https = require('https');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const client = axios.create({
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  baseURL: 'https://192.168.0.108',
  headers: { 'User-Agent': 'Mozilla/5.0' }
});

function generateUpdaterId(component) {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${component}.${timestamp}.${random}`;
}

async function login() {
  const loginParams = new URLSearchParams();
  loginParams.append('username', 'admin');
  loginParams.append('password', 'HelloMotto');
  loginParams.append('ok', 'Log in');

  const response = await client.post('/admin/login.jsp', loginParams, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    maxRedirects: 0,
    validateStatus: () => true
  });

  return response.headers['http_x_csrf_token'];
}

async function initializeSession(csrfToken) {
  const updaterId = generateUpdaterId('system');
  const xmlPayload = `<ajax-request action='getstat' updater='${updaterId}' comp='system'><sysinfo/><identity/></ajax-request>`;

  await client.post('/admin/_cmdstat.jsp', xmlPayload, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-CSRF-Token': csrfToken
    }
  });
}

async function queryWLANs(csrfToken) {
  const updaterId = generateUpdaterId('wlansvc-list');
  const xmlPayload = `<ajax-request action='getconf' DECRYPT_X='true' caller='unleashed_web' updater='${updaterId}' comp='wlansvc-list'/>`;

  const response = await client.post('/admin/_conf.jsp', xmlPayload, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-CSRF-Token': csrfToken
    }
  });

  // Parse WLANs
  const wlanPattern = /<wlansvc [^>]+>/g;
  const matches = response.data.match(wlanPattern);

  const wlans = [];
  if (matches) {
    matches.forEach(match => {
      const idMatch = match.match(/id="([^"]+)"/);
      const nameMatch = match.match(/name="([^"]+)"/);
      const ssidMatch = match.match(/ssid="([^"]+)"/);
      const isGuestMatch = match.match(/is-guest="([^"]+)"/);

      if (isGuestMatch && isGuestMatch[1] === 'true') {
        wlans.push({
          id: idMatch ? idMatch[1] : null,
          name: nameMatch ? nameMatch[1] : null,
          ssid: ssidMatch ? ssidMatch[1] : null
        });
      }
    });
  }

  return wlans;
}

async function main() {
  try {
    console.log('\n📡 Connecting to R710 device...\n');

    const csrfToken = await login();
    console.log('✅ Logged in');

    await initializeSession(csrfToken);
    console.log('✅ Session initialized\n');

    const deviceWlans = await queryWLANs(csrfToken);
    console.log('📋 Guest WLANs on device:\n');

    deviceWlans.forEach((wlan, i) => {
      console.log(`${i + 1}. ID: "${wlan.id}" | SSID: "${wlan.ssid}"`);
    });

    console.log(`\nTotal: ${deviceWlans.length} guest WLANs\n`);

    // Get database WLANs
    const dbWlans = await prisma.r710Wlans.findMany();

    console.log('📊 Database WLANs:\n');
    dbWlans.forEach((wlan, i) => {
      console.log(`${i + 1}. wlanId: "${wlan.wlanId}" | ssid: "${wlan.ssid}"`);
    });

    console.log('\n🔄 Syncing database with device...\n');

    // Match and update
    for (const dbWlan of dbWlans) {
      // Find matching WLAN on device by SSID
      const deviceWlan = deviceWlans.find(dw => dw.ssid === dbWlan.ssid);

      if (deviceWlan) {
        if (dbWlan.wlanId !== deviceWlan.id) {
          console.log(`📝 Updating "${dbWlan.ssid}":`);
          console.log(`   Old wlanId: "${dbWlan.wlanId}"`);
          console.log(`   New wlanId: "${deviceWlan.id}"`);

          await prisma.r710Wlans.update({
            where: { id: dbWlan.id },
            data: { wlanId: deviceWlan.id }
          });

          console.log(`   ✅ Updated\n`);
        } else {
          console.log(`✅ "${dbWlan.ssid}" already in sync (ID: ${dbWlan.wlanId})\n`);
        }
      } else {
        console.log(`⚠️  "${dbWlan.ssid}" not found on device - may have been deleted\n`);
      }
    }

    console.log('✅ Sync complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
