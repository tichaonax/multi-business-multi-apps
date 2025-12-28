/**
 * Query R710 Device for Current WLANs
 */

const axios = require('axios');
const https = require('https');

const agent = new https.Agent({
  rejectUnauthorized: false
});

const client = axios.create({
  httpsAgent: agent,
  baseURL: 'https://192.168.0.108',
  headers: {
    'User-Agent': 'Mozilla/5.0'
  }
});

function generateUpdaterId(component) {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${component}.${timestamp}.${random}`;
}

async function login() {
  const response = await client.post('/admin/index.jsp', 'username=admin&password=Ticha%402000&ok=Log+In', {
    maxRedirects: 0,
    validateStatus: (status) => status === 302,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });

  const cookies = response.headers['set-cookie'];
  const sessionCookie = cookies.find(c => c.includes('-ejs-session-'));
  const csrfCookie = cookies.find(c => c.includes('http_x_csrf_token'));

  if (!sessionCookie || !csrfCookie) {
    throw new Error('Login failed - no cookies');
  }

  const csrfMatch = csrfCookie.match(/http_x_csrf_token=([^;]+)/);
  const csrfToken = csrfMatch ? csrfMatch[1] : null;

  client.defaults.headers.common['Cookie'] = cookies.join('; ');

  return { csrfToken };
}

async function initializeSession(csrfToken) {
  const updaterId = generateUpdaterId('system');
  const xmlPayload = `<ajax-request action='getstat' updater='${updaterId}' comp='system'><sysinfo/><identity/><adv-radio/><mgmt-ip/><admin/><WAN/><email-server/><sms-server/><zero-it/><bypassCNA/><dfs/><country-code/><tz/><ntp/><client-dns-server/><dhcpsvr-list/><dosdefense/><rogue/><l2acl-default/><l3acl-default/><mesh/><tunnelprofile-list/><wlangroup-list/><wlansvc-list/><adv-wlan/><appmesh/><policy-list/><role-based-access-control/><precedence-default/><client-mac-oui/><adv-client-isolation/><guestpass/><wispr/><hotspot-list/><dpsk/><ruckusplus-service/><avp-list/><urlfiltering-policy-list/><clientFWLog/><clientAAALog/><clientApLog/></ajax-request>`;

  await client.post('/admin/_cmdstat.jsp', xmlPayload, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-CSRF-Token': csrfToken
    }
  });
}

async function queryWlans(csrfToken) {
  const updaterId = generateUpdaterId('wlansvc-list');
  const xmlPayload = `<ajax-request action='getconf' DECRYPT_X='true' caller='unleashed_web' updater='${updaterId}' comp='wlansvc-list'/>`;

  const response = await client.post('/admin/_conf.jsp', xmlPayload, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-CSRF-Token': csrfToken
    }
  });

  return response.data;
}

async function main() {
  try {
    console.log('\n📡 Connecting to R710 device...\n');

    const { csrfToken } = await login();
    console.log('✅ Logged in');

    await initializeSession(csrfToken);
    console.log('✅ Session initialized');

    const wlansXml = await queryWlans(csrfToken);
    console.log('\n📋 WLANs on device:\n');

    // Parse WLANs
    const wlanPattern = /<wlansvc [^>]+>/g;
    const matches = wlansXml.match(wlanPattern);

    if (matches) {
      matches.forEach((match, i) => {
        const idMatch = match.match(/id="([^"]+)"/);
        const nameMatch = match.match(/name="([^"]+)"/);
        const ssidMatch = match.match(/ssid="([^"]+)"/);

        console.log(`${i + 1}. ID: "${idMatch ? idMatch[1] : 'N/A'}"`);
        console.log(`   Name: "${nameMatch ? nameMatch[1] : 'N/A'}"`);
        console.log(`   SSID: "${ssidMatch ? ssidMatch[1] : 'N/A'}"`);
        console.log('');
      });
    } else {
      console.log('No WLANs found');
    }

    console.log(`Total WLANs: ${matches ? matches.length : 0}\n`);

  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
    }
  }
}

main();
