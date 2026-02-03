/**
 * Test R710 Guest Service Firewall Rules
 *
 * Connects to the real R710 device, reads guest service config,
 * validates subnet access rules, and applies fix if needed.
 *
 * Usage: node scripts/test-r710-firewall-rules.js
 */

require('dotenv').config({ path: '.env.local' });

const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const https = require('https');
const crypto = require('crypto');
const { CookieJar } = require('tough-cookie');

const prisma = new PrismaClient();
const TARGET_IP = '192.168.2.77';

function decrypt(encryptedText) {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) throw new Error('ENCRYPTION_KEY not set');
  const key = Buffer.from(encryptionKey, 'hex');
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(parts[1], 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function main() {
  console.log('='.repeat(80));
  console.log('TEST: R710 Guest Service Firewall Rules');
  console.log('='.repeat(80));
  console.log(`Target: ${TARGET_IP}\n`);

  // Get credentials from DB
  const device = await prisma.r710DeviceRegistry.findFirst({
    where: { ipAddress: TARGET_IP }
  });
  if (!device) throw new Error(`Device ${TARGET_IP} not found`);

  const adminPassword = decrypt(device.encryptedAdminPassword);
  console.log(`Device: ${device.description || device.ipAddress}`);
  console.log(`Username: ${device.adminUsername}\n`);

  // Set up axios client with cookie jar (same as RuckusR710ApiService)
  const baseUrl = `https://${TARGET_IP}`;
  const cookieJar = new CookieJar();

  const client = axios.create({
    baseURL: baseUrl,
    timeout: 30000,
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json, text/plain, */*',
    }
  });

  // Cookie interceptors
  client.interceptors.request.use(async (config) => {
    const url = `${config.baseURL}${config.url}`;
    const cookieString = await cookieJar.getCookieString(url);
    if (cookieString) config.headers.Cookie = cookieString;
    return config;
  });

  client.interceptors.response.use(async (response) => {
    const setCookieHeaders = response.headers['set-cookie'];
    if (setCookieHeaders) {
      const url = `${response.config.baseURL}${response.config.url}`;
      for (const c of setCookieHeaders) {
        await cookieJar.setCookie(c, url);
      }
    }
    return response;
  }, async (error) => {
    if (error.response?.headers['set-cookie']) {
      const url = `${error.response.config.baseURL}${error.response.config.url}`;
      for (const c of error.response.headers['set-cookie']) {
        await cookieJar.setCookie(c, url);
      }
    }
    return Promise.reject(error);
  });

  // Step 1: Login
  console.log('Step 1: Logging in...');
  const loginParams = new URLSearchParams();
  loginParams.append('username', device.adminUsername);
  loginParams.append('password', adminPassword);
  loginParams.append('ok', 'Log in');

  const loginResp = await client.post('/admin/login.jsp', loginParams, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Origin': baseUrl,
      'Referer': `${baseUrl}/admin/login.jsp`,
    },
    maxRedirects: 0,
    validateStatus: () => true
  });

  const csrfToken = loginResp.headers['http_x_csrf_token'];
  if (!csrfToken) {
    console.log('Response status:', loginResp.status);
    console.log('Response headers:', JSON.stringify(loginResp.headers, null, 2));
    throw new Error('Login failed - no CSRF token');
  }
  console.log(`   Login OK. CSRF token: ${csrfToken}\n`);

  // Helper for XML API calls
  async function xmlRequest(payload) {
    const resp = await client.post('/admin/_conf.jsp', payload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Accept': '*/*',
        'X-CSRF-Token': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': `${baseUrl}/admin/dashboard.jsp`
      }
    });
    return resp.data;
  }

  // Step 2: Fetch guest service config
  console.log('Step 2: Fetching Guest Service configuration...');
  const updaterId = `guestservice-list.${Date.now()}.${Math.floor(Math.random() * 10000)}`;
  let configXml = await xmlRequest(
    `<ajax-request action='getconf' DECRYPT_X='true' updater='${updaterId}' comp='guestservice-list'/>`
  );
  console.log(`   Response length: ${configXml.length} chars\n`);

  // Step 3: Check if guest service exists, create if not
  console.log('Step 3: Checking for Guest Service...');
  console.log('-'.repeat(60));

  const isEmptyList = configXml.includes('<guestservice-list />') ||
                      configXml.includes('<guestservice-list/>') ||
                      !configXml.includes('<guestservice');

  if (isEmptyList) {
    console.log('\n*** NO GUEST SERVICES FOUND - CREATING ONE ***\n');
    const createUpdaterId = `guestservice-list.${Date.now()}.${Math.floor(Math.random() * 10000)}`;
    const createPayload = `<ajax-request action='addobj' updater='${createUpdaterId}' comp='guestservice-list'><guestservice name='Guest Access 1' onboarding='true' onboarding-aspect='both' auth-by='guestpass' countdown-by-issued='false' show-tou='true' tou='Terms of Use

By accepting this agreement and accessing the wireless network, you acknowledge that you are of legal age, you have read and understood, and agree to be bound by this agreement.
(*) The wireless network service is provided by the property owners and is completely at their discretion. Your access to the network may be blocked, suspended, or terminated at any time for any reason.
(*) You agree not to use the wireless network for any purpose that is unlawful or otherwise prohibited and you are fully responsible for your use.
(*) The wireless network is provided &quot;as is&quot; without warranties of any kind, either expressed or implied.' redirect='orig' redirect-url='' company-logo='ruckus' poweredby='Ruckus Wireless' poweredby-url='http://www.ruckuswireless.com/' desc='Type or paste in the text of your guest pass.' self-service='false' rule6='' title='Welcome to Guest WiFi !' opacity='1.0' background-opacity='1' background-color='#516a8c' logo-type='none' banner-type='default' bgimage-type='default' bgimage-display-type='fill' enable-portal='true' wifi4eu='false' wifi4eu-network-id='' wifi4eu-language='en' wifi4eu-debug='false' wg='' show-lang='true' portal-lang='en_US' random-key='999' valid='1' old-self-service='false' old-auth-by='guestpass'><rule action='accept' type='layer 2' ether-type='0x0806'></rule><rule action='accept' type='layer 2' ether-type='0x8863'></rule><rule action='accept' type='layer 2' ether-type='0x8864'></rule><rule action='accept' type='layer 3' protocol='17' dst-port='53'></rule><rule action='accept' type='layer 3' protocol='6' dst-port='53'></rule><rule action='accept' type='layer 3' protocol='' dst-port='67' app='DHCP'></rule><rule action='deny' type='layer 3' protocol='' dst-port='68'></rule><rule action='accept' type='layer 3' protocol='6' dst-addr='host' dst-port='80' app='HTTP'></rule><rule action='accept' type='layer 3' protocol='6' dst-addr='host' dst-port='443' app='HTTPS'></rule><rule action='deny' type='layer 3' dst-addr='local' protocol='' EDITABLE='false'></rule><rule action='accept' type='layer 3' dst-addr='10.0.0.0/8' protocol=''></rule><rule action='deny' type='layer 3' dst-addr='172.16.0.0/12' protocol=''></rule><rule action='accept' type='layer 3' dst-addr='192.168.0.0/16' protocol=''></rule><rule action='accept' type='layer 3' protocol='1'></rule><rule action='accept' type='layer 3' protocol='' dst-port='0'></rule></guestservice></ajax-request>`;

    const createResult = await xmlRequest(createPayload);
    console.log('Create response:', createResult.substring(0, 300));
    const createOk = createResult.includes('<response') && !createResult.includes('<error');
    const idMatch = createResult.match(/id="(\d+)"/);
    console.log(`Create result: ${createOk ? 'SUCCESS' : 'FAILED'}, ID: ${idMatch ? idMatch[1] : 'unknown'}\n`);

    if (!createOk) {
      console.log('GUEST SERVICE CREATION FAILED');
      return;
    }

    // Wait for R710 to settle, then re-fetch
    console.log('Waiting 3 seconds for R710 to apply...');
    await new Promise(r => setTimeout(r, 3000));

    const refetchUpdaterId = `guestservice-list.${Date.now()}.${Math.floor(Math.random() * 10000)}`;
    configXml = await xmlRequest(
      `<ajax-request action='getconf' DECRYPT_X='true' updater='${refetchUpdaterId}' comp='guestservice-list'/>`
    );
    console.log(`Re-fetched config length: ${configXml.length} chars\n`);
  }

  console.log('Analyzing firewall rules...');

  // Try to find any guest service (ID may vary after creation)
  let gsRegex = /<guestservice[^>]*\sid=["'](\d+)["'][^>]*>([\s\S]*?)<\/guestservice>/i;
  let gsMatch = configXml.match(gsRegex);
  if (!gsMatch) {
    console.log('RAW (first 2000 chars):', configXml.substring(0, 2000));
    throw new Error('No Guest Service found after creation attempt');
  }
  const foundGsId = gsMatch[1];
  console.log(`Found Guest Service ID: ${foundGsId}`);

  const gsBlock = gsMatch[0];
  console.log('\nGuest Service block (first 1000 chars):');
  console.log(gsBlock.substring(0, 1000));
  console.log('\n');

  // Extract rules with dst-addr
  const ruleRegex = /<rule[^>]*>/gi;
  const rules = gsBlock.match(ruleRegex) || [];

  const subnetsExpected = {
    '10.0.0.0/8': 'accept',
    '192.168.0.0/16': 'accept',
    '172.16.0.0/12': 'deny',
  };

  console.log(`Found ${rules.length} rules:\n`);

  let allCorrect = true;
  for (const rule of rules) {
    const addrMatch = rule.match(/dst-addr=['"]([^'"]*)['"]/);
    const actionMatch = rule.match(/action=['"]([^'"]*)['"]/);
    const typeMatch = rule.match(/type=['"]([^'"]*)['"]/);
    const portMatch = rule.match(/dst-port=['"]([^'"]*)['"]/);

    if (addrMatch && actionMatch) {
      const addr = addrMatch[1];
      const action = actionMatch[1];
      const expected = subnetsExpected[addr];
      const marker = expected ? (action === expected ? '  OK' : '  WRONG') : '    ';
      console.log(`   ${marker}  action=${action.padEnd(7)} dst-addr=${addr}`);
      if (expected && action !== expected) allCorrect = false;
    } else if (actionMatch) {
      const action = actionMatch[1];
      const type = typeMatch ? typeMatch[1] : '';
      const port = portMatch ? portMatch[1] : '';
      console.log(`         action=${action.padEnd(7)} type=${type} ${port ? 'port=' + port : ''}`);
    }
  }

  console.log('\n' + '-'.repeat(60));

  if (allCorrect) {
    console.log('\n*** ALL SUBNET RULES ARE CORRECT ***\n');
    console.log('='.repeat(80));
    return;
  }

  console.log('\n*** SUBNET RULES ARE MISCONFIGURED - APPLYING FIX ***\n');

  // Step 4: Get guest service name
  const nameMatch = gsBlock.match(/name=['"]([^'"]*)['"]/);
  const serviceName = nameMatch ? nameMatch[1] : 'Guest Access 1';
  console.log(`Guest Service name: "${serviceName}"`);

  // Step 5: Apply fix using the found guest service ID
  console.log('Sending update with correct accept rules...');
  const fixUpdaterId = `guestservice-list.${Date.now()}.${Math.floor(Math.random() * 10000)}`;
  const fixPayload = `<ajax-request action='updobj' updater='${fixUpdaterId}' comp='guestservice-list'><guestservice name='${serviceName}' onboarding='true' onboarding-aspect='both' auth-by='guestpass' countdown-by-issued='false' show-tou='true' tou='Terms of Use

By accepting this agreement and accessing the wireless network, you acknowledge that you are of legal age, you have read and understood, and agree to be bound by this agreement.
(*) The wireless network service is provided by the property owners and is completely at their discretion. Your access to the network may be blocked, suspended, or terminated at any time for any reason.
(*) You agree not to use the wireless network for any purpose that is unlawful or otherwise prohibited and you are fully responsible for your use.
(*) The wireless network is provided &quot;as is&quot; without warranties of any kind, either expressed or implied.' redirect='orig' redirect-url='' company-logo='ruckus' poweredby='Ruckus Wireless' poweredby-url='http://www.ruckuswireless.com/' desc='Type or paste in the text of your guest pass.' self-service='false' rule6='' title='Welcome to Guest WiFi !' opacity='1.0' background-opacity='1' background-color='#516a8c' logo-type='none' banner-type='default' bgimage-type='default' bgimage-display-type='fill' enable-portal='true' wifi4eu='false' wifi4eu-network-id='' wifi4eu-language='en' wifi4eu-debug='false' wg='' show-lang='true' portal-lang='en_US' random-key='999' valid='1' old-self-service='false' old-auth-by='guestpass' id='${foundGsId}'><rule action='accept' type='layer 2' ether-type='0x0806'></rule><rule action='accept' type='layer 2' ether-type='0x8863'></rule><rule action='accept' type='layer 2' ether-type='0x8864'></rule><rule action='accept' type='layer 3' protocol='17' dst-port='53'></rule><rule action='accept' type='layer 3' protocol='6' dst-port='53'></rule><rule action='accept' type='layer 3' protocol='' dst-port='67' app='DHCP'></rule><rule action='deny' type='layer 3' protocol='' dst-port='68'></rule><rule action='accept' type='layer 3' protocol='6' dst-addr='host' dst-port='80' app='HTTP'></rule><rule action='accept' type='layer 3' protocol='6' dst-addr='host' dst-port='443' app='HTTPS'></rule><rule action='deny' type='layer 3' dst-addr='local' protocol='' EDITABLE='false'></rule><rule action='accept' type='layer 3' dst-addr='10.0.0.0/8' protocol=''></rule><rule action='deny' type='layer 3' dst-addr='172.16.0.0/12' protocol=''></rule><rule action='accept' type='layer 3' dst-addr='192.168.0.0/16' protocol=''></rule><rule action='accept' type='layer 3' protocol='1'></rule><rule action='accept' type='layer 3' protocol='' dst-port='0'></rule></guestservice></ajax-request>`;

  const fixResult = await xmlRequest(fixPayload);
  const fixOk = fixResult.includes('<response') && !fixResult.includes('<error');
  console.log(`Update response: ${fixResult.substring(0, 300)}`);
  console.log(`Update result: ${fixOk ? 'SUCCESS' : 'FAILED'}\n`);

  if (!fixOk) {
    console.log('FIX FAILED - check response above');
    return;
  }

  // Step 6: Wait and re-validate
  console.log('Waiting 3 seconds for R710 to apply...');
  await new Promise(r => setTimeout(r, 3000));

  console.log('Re-reading guest service config...');
  const revalUpdaterId = `guestservice-list.${Date.now()}.${Math.floor(Math.random() * 10000)}`;
  const revalXml = await xmlRequest(
    `<ajax-request action='getconf' DECRYPT_X='true' updater='${revalUpdaterId}' comp='guestservice-list'/>`
  );

  const revalGsRegex = /<guestservice[^>]*\sid=["']\d+["'][^>]*>([\s\S]*?)<\/guestservice>/i;
  const gsMatch2 = revalXml.match(revalGsRegex);
  if (!gsMatch2) {
    console.log('Could not find Guest Service after fix');
    return;
  }

  const gsBlock2 = gsMatch2[0];
  const rules2 = gsBlock2.match(ruleRegex) || [];

  console.log('\nRules after fix:\n');
  let fixVerified = true;
  for (const rule of rules2) {
    const addrMatch = rule.match(/dst-addr=['"]([^'"]*)['"]/);
    const actionMatch = rule.match(/action=['"]([^'"]*)['"]/);
    if (addrMatch && actionMatch && subnetsExpected[addrMatch[1]]) {
      const correct = actionMatch[1] === subnetsExpected[addrMatch[1]];
      console.log(`   ${correct ? 'OK   ' : 'WRONG'} ${addrMatch[1]}: ${actionMatch[1]} (expected: ${subnetsExpected[addrMatch[1]]})`);
      if (!correct) fixVerified = false;
    }
  }

  console.log(`\n${fixVerified ? '*** FIX VERIFIED - ALL RULES CORRECT ***' : '*** FIX DID NOT WORK ***'}\n`);
  console.log('='.repeat(80));
}

main()
  .catch(err => { console.error('\nERROR:', err.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
