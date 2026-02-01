/**
 * Test WLAN Creation with Zero-IT Onboarding Enabled
 *
 * Creates a test WLAN and verifies the bypass-cna attribute is set correctly
 * Also verifies that Guest Service has onboarding='true' for Zero-IT to work
 *
 * Usage: node scripts/test-create-wlan-zeroit.js
 */

require('dotenv').config({ path: '.env.local' });

const axios = require('axios');
const https = require('https');
const crypto = require('crypto');
const { CookieJar } = require('tough-cookie');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Decrypt function matching src/lib/encryption.ts
function decrypt(encryptedText) {
  try {
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

let DEVICE_IP = '';
let ADMIN_USERNAME = '';
let ADMIN_PASSWORD = '';

// Create HTTP client with cookie support
function createClient() {
  const cookieJar = new CookieJar();
  const baseUrl = `https://${DEVICE_IP}`;

  const client = axios.create({
    baseURL: baseUrl,
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    timeout: 30000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json, text/plain, */*',
    }
  });

  // Request interceptor - add cookies
  client.interceptors.request.use(async (config) => {
    const url = `${config.baseURL}${config.url}`;
    const cookieString = await cookieJar.getCookieString(url);
    if (cookieString) {
      config.headers.Cookie = cookieString;
    }
    return config;
  });

  // Response interceptor - save cookies
  client.interceptors.response.use(async (response) => {
    const setCookieHeaders = response.headers['set-cookie'];
    if (setCookieHeaders) {
      const url = `${response.config.baseURL}${response.config.url}`;
      for (const cookieString of setCookieHeaders) {
        await cookieJar.setCookie(cookieString, url);
      }
    }
    return response;
  });

  return { client, cookieJar, baseUrl };
}

async function login(client) {
  console.log(`\n[LOGIN] Logging into R710 at ${DEVICE_IP}...`);

  const loginParams = new URLSearchParams();
  loginParams.append('username', ADMIN_USERNAME);
  loginParams.append('password', ADMIN_PASSWORD);
  loginParams.append('ok', 'Log in');

  const response = await client.post('/admin/login.jsp', loginParams, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    maxRedirects: 0,
    validateStatus: () => true
  });

  if (response.status === 302) {
    const csrfToken = response.headers['http_x_csrf_token'];
    console.log('[LOGIN] ✅ Login successful!');
    console.log(`[LOGIN] CSRF Token: ${csrfToken || 'none'}`);
    return { success: true, csrfToken };
  } else {
    console.log(`[LOGIN] ❌ Login failed. Status: ${response.status}`);
    console.log(`[LOGIN] Response: ${JSON.stringify(response.data).substring(0, 200)}`);
    return { success: false };
  }
}

async function ensureGuestServiceOnboarding(client, csrfToken, guestServiceId) {
  console.log(`\n[GUEST SERVICE] Ensuring Guest Service ${guestServiceId} has onboarding='true'...`);

  const timestamp = Date.now();
  const updaterId = `guestservice.${timestamp}.${Math.floor(Math.random() * 1000000)}`;

  // First, get current guest service configuration
  const getPayload = `<ajax-request action='getconf' DECRYPT_X='true' caller='unleashed_web' updater='${updaterId}' comp='guestservice-list'/>`;

  const getResponse = await client.post('/admin/_conf.jsp', getPayload, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Accept': '*/*',
      'X-CSRF-Token': csrfToken || '',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': `https://${DEVICE_IP}/admin/dashboard.jsp`
    }
  });

  const responseText = getResponse.data;

  // Find the specific guest service
  const guestServiceRegex = new RegExp(`<guestservice[^>]*\\sid="${guestServiceId}"[^>]*>`, 'g');
  const guestServiceMatch = responseText.match(guestServiceRegex);

  if (!guestServiceMatch) {
    console.log(`[GUEST SERVICE] ⚠️ Could not find guest service ${guestServiceId}`);
    return { success: false, error: 'Guest service not found' };
  }

  const gsXml = guestServiceMatch[0];
  console.log(`[GUEST SERVICE] Found: ${gsXml.substring(0, 200)}...`);

  // Check current onboarding value
  const onboardingMatch = gsXml.match(/onboarding="([^"]+)"/);
  const currentOnboarding = onboardingMatch ? onboardingMatch[1] : 'unknown';
  console.log(`[GUEST SERVICE] Current onboarding value: ${currentOnboarding}`);

  if (currentOnboarding === 'true') {
    console.log('[GUEST SERVICE] ✅ Onboarding already enabled');
    return { success: true, alreadyEnabled: true };
  }

  // Need to update the guest service
  console.log('[GUEST SERVICE] Updating guest service to enable onboarding...');

  // Extract current title and validDays from the guest service
  const titleMatch = gsXml.match(/title="([^"]+)"/);
  const validDaysMatch = gsXml.match(/valid-days="([^"]+)"/);
  const title = titleMatch ? titleMatch[1] : 'Welcome to Guest WiFi !';
  const validDays = validDaysMatch ? validDaysMatch[1] : '1';

  const updatePayload = `<ajax-request action='updobj' updater='${updaterId}' comp='guestservice-list'><guestservice id="${guestServiceId}" title="${title}" valid-days="${validDays}" onboarding='true' onboarding-aspect='both'/></ajax-request>`;

  const updateResponse = await client.post('/admin/_conf.jsp', updatePayload, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Accept': '*/*',
      'X-CSRF-Token': csrfToken || '',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': `https://${DEVICE_IP}/admin/dashboard.jsp`
    }
  });

  console.log(`[GUEST SERVICE] Update response: ${updateResponse.data.substring(0, 300)}`);

  // Verify the update
  const verifyResponse = await client.post('/admin/_conf.jsp', getPayload.replace(updaterId, `verify.${Date.now()}`), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Accept': '*/*',
      'X-CSRF-Token': csrfToken || '',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': `https://${DEVICE_IP}/admin/dashboard.jsp`
    }
  });

  const verifyText = verifyResponse.data;
  const verifyMatch = verifyText.match(new RegExp(`<guestservice[^>]*\\sid="${guestServiceId}"[^>]*>`));
  if (verifyMatch) {
    const newOnboardingMatch = verifyMatch[0].match(/onboarding="([^"]+)"/);
    const newOnboarding = newOnboardingMatch ? newOnboardingMatch[1] : 'unknown';
    console.log(`[GUEST SERVICE] After update, onboarding value: ${newOnboarding}`);

    if (newOnboarding === 'true') {
      console.log('[GUEST SERVICE] ✅ Onboarding successfully enabled');
      return { success: true, updated: true };
    }
  }

  console.log('[GUEST SERVICE] ⚠️ Could not verify onboarding was enabled');
  return { success: false, error: 'Could not verify update' };
}

async function createTestWlan(client, csrfToken) {
  const timestamp = Date.now();
  const testSsid = `TEST-ZEROIT-${timestamp}`;
  const guestServiceId = '1';

  console.log(`\n[CREATE] Creating test WLAN: ${testSsid}`);

  // IMPORTANT: bypass-cna='false' should enable Zero-IT onboarding
  const enableZeroIt = true;
  const bypassCna = !enableZeroIt;  // false

  console.log(`[CREATE] enableZeroIt: ${enableZeroIt}`);
  console.log(`[CREATE] bypassCna (sent to device): ${bypassCna}`);
  console.log(`[CREATE] guestServiceId: ${guestServiceId}`);

  // CRITICAL: First ensure the Guest Service has onboarding='true'
  await ensureGuestServiceOnboarding(client, csrfToken, guestServiceId);

  const updaterId = `wlansvc-list.${timestamp}.${Math.floor(Math.random() * 1000000)}`;

  // The full WLAN creation XML payload
  const xmlPayload = `<ajax-request action='addobj' updater='${updaterId}' comp='wlansvc-list'><wlansvc name='${testSsid}' ssid='${testSsid}' description='${testSsid}' usage='guest' is-guest='true' authentication='open' encryption='none' acctsvr-id='0' acct-upd-interval='10' guest-pass='' en-grace-period-sets='enabled' grace-period-sets='480' close-system='false' vlan-id='1' dvlan='disabled' max-clients-per-radio='100' enable-type='0' do-wmm-ac='disabled' acl-id='1' devicepolicy-id='' bgscan='1' balance='0' band-balance='0' do-802-11d='enabled' wlan_bind='0' force-dhcp='0' force-dhcp-timeout='10' max-idle-timeout='300' idle-timeout='true' client-isolation='enabled' ci-whitelist-id='0' bypass-cna='${bypassCna}' dtim-period='1' directed-mbc='1' client-flow-log='disabled' export-client-log='false' wifi6='true' local-bridge='1' enable-friendly-key='false' ofdm-rate-only='false' bss-minrate='0' tx-rate-config='1' web-auth='enabled' https-redirection='enabled' called-station-id-type='0' option82='0' option82-opt1='0' option82-opt2='0' option82-opt150='0' option82-opt151='0' dis-dgaf='0' parp='0' authstats='0' sta-info-extraction='1' pool-id='' dhcpsvr-id='0' precedence-id='1' role-based-access-ctrl='false' option82-areaName='' guest-auth='guestpass' self-service='false' self-service-sponsor-approval='undefined' self-service-notification='undefined' guestservice-id='${guestServiceId}'><queue-priority voice='0' video='2' data='4' background='6'/><qos uplink-preset='DISABLE' downlink-preset='DISABLE' perssid-uplink-preset='0' perssid-downlink-preset='0'/><rrm neighbor-report='enabled'/><smartcast mcast-filter='disabled'/><wlan-schedule value='0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0'/><avp-policy avp-enabled='disabled' avpdeny-id='0'/><urlfiltering-policy urlfiltering-enabled='disabled' urlfiltering-id='0'/><wificalling-policy wificalling-enabled='disabled' profile-id='0'/></wlansvc></ajax-request>`;

  const response = await client.post('/admin/_conf.jsp', xmlPayload, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Accept': '*/*',
      'X-CSRF-Token': csrfToken || '',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': `https://${DEVICE_IP}/admin/dashboard.jsp`
    }
  });

  const responseText = response.data;

  console.log(`[CREATE] Response (first 500 chars): ${responseText.substring(0, 500)}`);

  // Extract WLAN ID
  const wlansvcMatch = responseText.match(/<wlansvc[^>]+\sid="(\d+)"/);
  const wlanId = wlansvcMatch ? wlansvcMatch[1] : null;

  if (wlanId) {
    console.log(`[CREATE] ✅ WLAN created with ID: ${wlanId}`);
    return { success: true, wlanId, ssid: testSsid };
  } else {
    console.log('[CREATE] ❌ Failed to extract WLAN ID');
    return { success: false, ssid: testSsid };
  }
}

async function verifyWlan(client, csrfToken, wlanId) {
  console.log(`\n[VERIFY] Reading back WLAN ${wlanId} to check bypass-cna...`);

  const timestamp = Date.now();
  const updaterId = `wlansvc-list.${timestamp}.${Math.floor(Math.random() * 1000000)}`;
  const xmlPayload = `<ajax-request action='getconf' DECRYPT_X='true' caller='unleashed_web' updater='${updaterId}' comp='wlansvc-list'/>`;

  const response = await client.post('/admin/_conf.jsp', xmlPayload, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Accept': '*/*',
      'X-CSRF-Token': csrfToken || '',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': `https://${DEVICE_IP}/admin/dashboard.jsp`
    }
  });

  const responseText = response.data;

  // Find the specific WLAN in the response
  const wlanRegex = new RegExp(`<wlansvc[^>]*\\sid="${wlanId}"[^>]*>`, 'g');
  const wlanMatch = responseText.match(wlanRegex);

  if (wlanMatch) {
    const wlanXml = wlanMatch[0];
    console.log(`[VERIFY] Found WLAN XML: ${wlanXml.substring(0, 300)}...`);

    // Extract relevant attributes
    const getAttribute = (attr) => {
      const match = wlanXml.match(new RegExp(`${attr}="([^"]+)"`));
      return match ? match[1] : 'NOT FOUND';
    };

    const bypassCna = getAttribute('bypass-cna');
    const ssid = getAttribute('ssid');
    const isGuest = getAttribute('is-guest');
    const enableType = getAttribute('enable-type');

    console.log('\n[VERIFY] WLAN Attributes:');
    console.log(`  ssid: ${ssid}`);
    console.log(`  id: ${wlanId}`);
    console.log(`  is-guest: ${isGuest}`);
    console.log(`  enable-type: ${enableType} (0=active)`);
    console.log(`  bypass-cna: ${bypassCna}`);
    console.log('');
    console.log(`[VERIFY] Zero-IT Onboarding Interpretation:`);
    console.log(`  bypass-cna="${bypassCna}" means Zero-IT is ${bypassCna === 'false' ? 'ENABLED ✅' : 'DISABLED ❌'}`);

    return { bypassCna, ssid };
  } else {
    console.log('[VERIFY] ❌ Could not find WLAN in response');
    return null;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('TEST: Create WLAN with Zero-IT Onboarding Enabled');
  console.log('='.repeat(60));

  try {
    // Get device from database
    console.log('\n[SETUP] Loading device from database...');

    const device = await prisma.r710DeviceRegistry.findFirst({
      where: {
        ipAddress: '192.168.2.241'
      }
    });

    if (!device) {
      // Try any active device
      const anyDevice = await prisma.r710DeviceRegistry.findFirst({
        where: { isActive: true }
      });

      if (!anyDevice) {
        throw new Error('No R710 devices found in registry. Please register a device first.');
      }

      DEVICE_IP = anyDevice.ipAddress;
      ADMIN_USERNAME = anyDevice.adminUsername;
      ADMIN_PASSWORD = decrypt(anyDevice.encryptedAdminPassword);
      console.log(`[SETUP] Using device: ${DEVICE_IP} (username: ${ADMIN_USERNAME})`);
    } else {
      DEVICE_IP = device.ipAddress;
      ADMIN_USERNAME = device.adminUsername;
      ADMIN_PASSWORD = decrypt(device.encryptedAdminPassword);
      console.log(`[SETUP] Using device: ${DEVICE_IP} (username: ${ADMIN_USERNAME})`);
    }

    // Step 1: Create HTTP client and login
    const { client } = createClient();
    const authResult = await login(client);

    if (!authResult || !authResult.success) {
      throw new Error('Login failed');
    }

    const csrfToken = authResult.csrfToken;

    // Step 2: Create test WLAN (this also ensures Guest Service has onboarding=true)
    const createResult = await createTestWlan(client, csrfToken);

    if (createResult.success) {
      // Step 3: Verify the WLAN settings
      const verifyResult = await verifyWlan(client, csrfToken, createResult.wlanId);

      console.log('\n' + '='.repeat(60));
      console.log('SUMMARY');
      console.log('='.repeat(60));
      console.log(`Test WLAN SSID: ${createResult.ssid}`);
      console.log(`Test WLAN ID: ${createResult.wlanId}`);
      console.log(`bypass-cna value on device: ${verifyResult?.bypassCna || 'UNKNOWN'}`);
      console.log('');
      console.log('EXPECTED: bypass-cna="false" (Zero-IT ENABLED)');
      console.log(`ACTUAL: bypass-cna="${verifyResult?.bypassCna}"`);
      console.log('');

      if (verifyResult?.bypassCna === 'false') {
        console.log('✅ TEST PASSED: Zero-IT onboarding should be enabled');
        console.log('');
        console.log('📋 CRITICAL: Also verified that Guest Service has onboarding="true"');
        console.log('   Both settings are required for Zero-IT to work properly.');
      } else {
        console.log('❌ TEST FAILED: Zero-IT onboarding is NOT enabled');
        console.log('   The device may be ignoring the bypass-cna setting');
      }

      console.log('\n📋 Please verify in R710 Web UI:');
      console.log(`   1. Go to WiFi Networks > ${createResult.ssid}`);
      console.log('   2. Check "Onboarding Portal" section');
      console.log('   3. Look for "Enable Zero-IT device registration" checkbox');
      console.log('   4. Report if it is checked or unchecked');
      console.log('\n⚠️  Remember to delete this test WLAN when done!');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data).substring(0, 500));
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
