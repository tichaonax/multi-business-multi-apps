const {createHttpClient} = require('./ruckus-api-discovery/utils/http-client');
const {login} = require('./ruckus-api-discovery/utils/auth');
const xml2js = require('xml2js');

async function test() {
  const {client} = createHttpClient();
  const authResult = await login(client);
  const csrfToken = authResult.csrfToken;

  const xmlPayload = `<ajax-request action='getconf' DECRYPT_X='true' caller='unleashed_web' updater='wlansvc-list.test.1' comp='wlansvc-list'/>`;

  const response = await client.post('/admin/_conf.jsp', xmlPayload, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-CSRF-Token': csrfToken,
      'Referer': 'https://192.168.0.108/admin/dashboard.jsp'
    }
  });

  const parser = new xml2js.Parser();
  const result = await parser.parseStringPromise(response.data);
  const wlanList = result?.['ajax-response']?.response?.[0]?.['wlansvc-list']?.[0]?.wlansvc || [];

  // Get first guest WLAN
  const guestWlan = wlanList.find(w => w.$['is-guest'] === 'true');
  if (guestWlan) {
    console.log('Guest WLAN attributes:');
    const attrs = guestWlan.$;

    // Look for onboarding-related attributes
    console.log('\nOnboarding/Zero-IT/Bypass attributes:');
    Object.keys(attrs).filter(k => k.includes('onboard') || k.includes('zero') || k.includes('bypass')).forEach(key => {
      console.log(`  ${key}: ${attrs[key]}`);
    });

    console.log('\nAll WLAN Attributes:');
    Object.keys(attrs).sort().forEach(key => {
      console.log(`  ${key}: ${attrs[key]}`);
    });
  }
}

test().catch(err => console.error('Error:', err.message));
