/**
 * Test WLAN Creation with Fixed Firewall Rules
 *
 * This script:
 * 1. Retrieves R710 device credentials from database
 * 2. Creates a test WLAN with corrected Guest Service firewall rules
 * 3. Validates the WLAN was created successfully
 *
 * Run: node scripts/test-wlan-creation-with-fixed-rules.js
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const axios = require('axios');
const https = require('https');
const { CookieJar } = require('tough-cookie');

const prisma = new PrismaClient();

/**
 * Decrypt password using the same method as the app (from src/lib/encryption.ts)
 */
function decrypt(encryptedText) {
  const encryptionKey = process.env.ENCRYPTION_KEY;

  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY environment variable not set');
  }

  if (encryptionKey.length !== 64) {
    throw new Error(`ENCRYPTION_KEY must be 64 characters (hex), got ${encryptionKey.length}`);
  }

  const key = Buffer.from(encryptionKey, 'hex');
  const parts = encryptedText.split(':');

  if (parts.length !== 2) {
    throw new Error('Invalid encrypted text format (expected: iv:encryptedData)');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const encryptedData = parts[1];

  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generate updater ID for R710 API calls
 */
function generateUpdaterId(component) {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${component}.${timestamp}.${random}`;
}

/**
 * R710 API Client
 */
class R710Client {
  constructor(ipAddress) {
    this.baseUrl = `https://${ipAddress}`;
    this.cookieJar = new CookieJar();
    this.csrfToken = null;

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json, text/plain, */*'
      }
    });

    // Cookie interceptors
    this.client.interceptors.request.use(async (config) => {
      const url = `${config.baseURL}${config.url}`;
      const cookieString = await this.cookieJar.getCookieString(url);
      if (cookieString) {
        config.headers.Cookie = cookieString;
      }
      return config;
    });

    this.client.interceptors.response.use(async (response) => {
      const setCookieHeaders = response.headers['set-cookie'];
      if (setCookieHeaders) {
        const url = `${response.config.baseURL}${response.config.url}`;
        for (const cookieString of setCookieHeaders) {
          await this.cookieJar.setCookie(cookieString, url);
        }
      }
      return response;
    });
  }

  async login(username, password) {
    console.log(`[R710] Logging in to ${this.baseUrl}...`);

    const loginParams = new URLSearchParams();
    loginParams.append('username', username);
    loginParams.append('password', password);
    loginParams.append('ok', 'Log in');

    const response = await this.client.post('/admin/login.jsp', loginParams, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'text/html,application/xhtml+xml',
        'Origin': this.baseUrl,
        'Referer': `${this.baseUrl}/admin/login.jsp`
      },
      maxRedirects: 0,
      validateStatus: () => true
    });

    this.csrfToken = response.headers['http_x_csrf_token'];

    if ((response.status === 302 || response.status === 200) && this.csrfToken) {
      console.log(`[R710] ✅ Login successful! CSRF Token: ${this.csrfToken}`);
      return true;
    }

    throw new Error(`Login failed - status ${response.status}`);
  }

  async initializeSession() {
    console.log('[R710] Initializing session...');

    const updaterId = generateUpdaterId('system');
    const xmlPayload = `<ajax-request action='getstat' updater='${updaterId}' comp='system'><sysinfo/><identity/><guest-access/></ajax-request>`;

    await this.client.post('/admin/_cmdstat.jsp', xmlPayload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-CSRF-Token': this.csrfToken,
        'Referer': `${this.baseUrl}/admin/dashboard.jsp`
      }
    });

    console.log('[R710] ✅ Session initialized');
  }

  async createGuestService(serviceName) {
    console.log(`[R710] Creating Guest Service "${serviceName}" with FIXED firewall rules...`);

    const updaterId = generateUpdaterId('guestservice-list');

    // CRITICAL: Using ACCEPT for 10.0.0.0/8 and 192.168.0.0/16
    // Only 172.16.0.0/12 remains as DENY
    const xmlPayload = `<ajax-request action='addobj' updater='${updaterId}' comp='guestservice-list'><guestservice name='${serviceName}' onboarding='true' onboarding-aspect='both' auth-by='guestpass' countdown-by-issued='false' show-tou='true' tou='Terms of Use

By accepting this agreement and accessing the wireless network, you acknowledge that you are of legal age, you have read and understood, and agree to be bound by this agreement.
(*) The wireless network service is provided by the property owners and is completely at their discretion. Your access to the network may be blocked, suspended, or terminated at any time for any reason.
(*) You agree not to use the wireless network for any purpose that is unlawful or otherwise prohibited and you are fully responsible for your use.
(*) The wireless network is provided &quot;as is&quot; without warranties of any kind, either expressed or implied.' redirect='orig' redirect-url='' company-logo='ruckus' poweredby='Ruckus Wireless' poweredby-url='http://www.ruckuswireless.com/' desc='Type or paste in the text of your guest pass.' self-service='false' rule6='' title='Welcome to Guest WiFi !' opacity='1.0' background-opacity='1' background-color='#516a8c' logo-type='default' banner-type='default' bgimage-type='default' bgimage-display-type='fill' enable-portal='true' wifi4eu='false' wifi4eu-network-id='' wifi4eu-language='en' wifi4eu-debug='false' wg='' show-lang='true' portal-lang='en_US' random-key='999' valid='1' old-self-service='false' old-auth-by='guestpass'><rule action='accept' type='layer 2' ether-type='0x0806'></rule><rule action='accept' type='layer 2' ether-type='0x8863'></rule><rule action='accept' type='layer 2' ether-type='0x8864'></rule><rule action='accept' type='layer 3' protocol='17' dst-port='53'></rule><rule action='accept' type='layer 3' protocol='6' dst-port='53'></rule><rule action='accept' type='layer 3' protocol='' dst-port='67' app='DHCP'></rule><rule action='deny' type='layer 3' protocol='' dst-port='68'></rule><rule action='accept' type='layer 3' protocol='6' dst-addr='host' dst-port='80' app='HTTP'></rule><rule action='accept' type='layer 3' protocol='6' dst-addr='host' dst-port='443' app='HTTPS'></rule><rule action='deny' type='layer 3' dst-addr='local' protocol='' EDITABLE='false'></rule><rule action='accept' type='layer 3' dst-addr='10.0.0.0/8' protocol=''></rule><rule action='deny' type='layer 3' dst-addr='172.16.0.0/12' protocol=''></rule><rule action='accept' type='layer 3' dst-addr='192.168.0.0/16' protocol=''></rule><rule action='accept' type='layer 3' protocol='1'></rule><rule action='accept' type='layer 3' protocol='' dst-port='0'></rule></guestservice></ajax-request>`;

    const response = await this.client.post('/admin/_conf.jsp', xmlPayload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-CSRF-Token': this.csrfToken,
        'Referer': `${this.baseUrl}/admin/dashboard.jsp`
      }
    });

    const idMatch = response.data.match(/id="(\d+)"/);
    if (idMatch) {
      console.log(`[R710] ✅ Guest Service created with ID: ${idMatch[1]}`);
      console.log('[R710] ✅ FIREWALL RULES:');
      console.log('       - 10.0.0.0/8:      ACCEPT ✓');
      console.log('       - 172.16.0.0/12:   DENY');
      console.log('       - 192.168.0.0/16:  ACCEPT ✓');
      return idMatch[1];
    }

    throw new Error('Failed to create Guest Service - no ID in response');
  }

  async createWlan(wlanName, guestServiceId) {
    console.log(`[R710] Creating WLAN "${wlanName}"...`);

    const updaterId = generateUpdaterId('wlansvc-list');

    const xmlPayload = `<ajax-request action='addobj' updater='${updaterId}' comp='wlansvc-list'><wlansvc name='${wlanName}' ssid='${wlanName}' description='${wlanName}' usage='guest' is-guest='true' authentication='open' encryption='none' acctsvr-id='0' acct-upd-interval='10' guest-pass='' en-grace-period-sets='enabled' grace-period-sets='480' close-system='false' vlan-id='1' dvlan='disabled' max-clients-per-radio='100' enable-type='0' do-wmm-ac='disabled' acl-id='1' devicepolicy-id='' bgscan='1' balance='0' band-balance='0' do-802-11d='enabled' wlan_bind='0' force-dhcp='0' force-dhcp-timeout='10' max-idle-timeout='300' idle-timeout='true' client-isolation='enabled' ci-whitelist-id='0' bypass-cna='false' dtim-period='1' directed-mbc='1' client-flow-log='disabled' export-client-log='false' wifi6='true' local-bridge='1' enable-friendly-key='false' ofdm-rate-only='false' bss-minrate='0' tx-rate-config='1' web-auth='enabled' https-redirection='enabled' called-station-id-type='0' option82='0' option82-opt1='0' option82-opt2='0' option82-opt150='0' option82-opt151='0' dis-dgaf='0' parp='0' authstats='0' sta-info-extraction='1' pool-id='' dhcpsvr-id='0' precedence-id='1' role-based-access-ctrl='false' option82-areaName='' guest-auth='guestpass' self-service='false' self-service-sponsor-approval='undefined' self-service-notification='undefined' guestservice-id='${guestServiceId}'><queue-priority voice='0' video='2' data='4' background='6'/><qos uplink-preset='DISABLE' downlink-preset='DISABLE' perssid-uplink-preset='0' perssid-downlink-preset='0'/><rrm neighbor-report='enabled'/><smartcast mcast-filter='disabled'/><wlan-schedule value='0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0'/><avp-policy avp-enabled='disabled' avpdeny-id='0'/><urlfiltering-policy urlfiltering-enabled='disabled' urlfiltering-id='0'/><wificalling-policy wificalling-enabled='disabled' profile-id='0'/></wlansvc></ajax-request>`;

    const response = await this.client.post('/admin/_conf.jsp', xmlPayload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-CSRF-Token': this.csrfToken,
        'Referer': `${this.baseUrl}/admin/dashboard.jsp`
      }
    });

    const idMatch = response.data.match(/\sid="(\d+)"/);
    if (idMatch) {
      console.log(`[R710] ✅ WLAN created with ID: ${idMatch[1]}`);
      return idMatch[1];
    }

    throw new Error('Failed to create WLAN - no ID in response');
  }

  async deleteWlan(wlanId) {
    console.log(`[R710] Deleting WLAN ID ${wlanId}...`);

    const updaterId = generateUpdaterId('wlansvc-list');
    const xmlPayload = `<ajax-request action='delobj' updater='${updaterId}' comp='wlansvc-list'><wlansvc id='${wlanId}'></wlansvc></ajax-request>`;

    await this.client.post('/admin/_conf.jsp', xmlPayload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-CSRF-Token': this.csrfToken,
        'Referer': `${this.baseUrl}/admin/dashboard.jsp`
      }
    });

    console.log(`[R710] ✅ WLAN deleted`);
  }
}

async function main() {
  console.log('═'.repeat(70));
  console.log('🧪 TEST: WLAN Creation with Fixed Firewall Rules');
  console.log('═'.repeat(70));

  try {
    // Get device for Hwandaza Padam (192.168.2.241) via business integration
    console.log('\n📋 Fetching R710 device for Hwandaza Padam...');

    // Find the business first
    const business = await prisma.businesses.findFirst({
      where: { name: { contains: 'Hwandaza' } }
    });

    if (!business) {
      throw new Error('Hwandaza business not found');
    }

    console.log(`[DB] Found business: ${business.name}`);

    // Get integration for this business
    const integration = await prisma.r710BusinessIntegrations.findFirst({
      where: { businessId: business.id },
      include: {
        device_registry: {
          select: {
            id: true,
            ipAddress: true,
            adminUsername: true,
            encryptedAdminPassword: true,
            description: true
          }
        }
      }
    });

    if (!integration) {
      throw new Error('No R710 integration found for Hwandaza business');
    }

    const device = integration.device_registry;

    if (!device) {
      throw new Error('No R710 device found in registry');
    }

    console.log(`[DB] Found device: ${device.description || device.ipAddress}`);
    console.log(`[DB] IP Address: ${device.ipAddress}`);

    // Decrypt password
    const adminPassword = decrypt(device.encryptedAdminPassword);
    console.log(`[DB] ✅ Password decrypted successfully`);

    // Create R710 client and login
    const r710 = new R710Client(device.ipAddress);
    await r710.login(device.adminUsername, adminPassword);
    await r710.initializeSession();

    // Generate unique test name
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const testWlanName = `Test-Fixed-Rules-${timestamp}`;

    console.log('\n' + '─'.repeat(70));
    console.log(`🎯 Creating test WLAN: "${testWlanName}"`);
    console.log('─'.repeat(70));

    // Create Guest Service with fixed rules
    const guestServiceId = await r710.createGuestService(testWlanName);

    // Create WLAN
    const wlanId = await r710.createWlan(testWlanName, guestServiceId);

    // Summary
    console.log('\n' + '═'.repeat(70));
    console.log('📊 TEST RESULTS');
    console.log('═'.repeat(70));
    console.log(`✅ Guest Service Created:  ID ${guestServiceId}`);
    console.log(`✅ WLAN Created:           ID ${wlanId}`);
    console.log(`✅ SSID:                   ${testWlanName}`);
    console.log('─'.repeat(70));
    console.log('');
    console.log('🔥 FIREWALL RULES (FIXED):');
    console.log('   ✅ 10.0.0.0/8      → ACCEPT (allows local network access)');
    console.log('   ❌ 172.16.0.0/12   → DENY');
    console.log('   ✅ 192.168.0.0/16  → ACCEPT (allows local network access)');
    console.log('');
    console.log('📋 NEXT STEPS:');
    console.log(`   1. Connect a device to SSID: "${testWlanName}"`);
    console.log('   2. Verify you can reach the server from guest WiFi');
    console.log('   3. If working, recreate existing WLANs via the app');
    console.log('   4. Delete this test WLAN when done');
    console.log('═'.repeat(70));

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data?.substring?.(0, 500));
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
