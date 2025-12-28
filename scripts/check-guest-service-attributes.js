const {createHttpClient} = require('./ruckus-api-discovery/utils/http-client');
const {login} = require('./ruckus-api-discovery/utils/auth');
const xml2js = require('xml2js');

async function test() {
  const {client} = createHttpClient();
  const authResult = await login(client);
  const csrfToken = authResult.csrfToken;

  const xmlPayload = `<ajax-request action='getconf' DECRYPT_X='true' caller='unleashed_web' updater='guestservice-list.test.1' comp='guestservice-list'/>`;

  const response = await client.post('/admin/_conf.jsp', xmlPayload, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-CSRF-Token': csrfToken,
      'Referer': 'https://192.168.0.108/admin/dashboard.jsp'
    }
  });

  const parser = new xml2js.Parser();
  const result = await parser.parseStringPromise(response.data);
  const guestServiceList = result?.['ajax-response']?.response?.[0]?.['guestservice-list']?.[0]?.guestservice || [];

  if (guestServiceList.length > 0) {
    const guestService = guestServiceList[0];
    console.log('Guest Service attributes:');
    const attrs = guestService.$;

    // Look for onboarding-related attributes
    console.log('\nOnboarding/Zero-IT attributes:');
    Object.keys(attrs).filter(k => k.includes('onboard') || k.includes('zero')).forEach(key => {
      console.log(`  ${key}: ${attrs[key]}`);
    });

    console.log('\nAll Guest Service Attributes:');
    Object.keys(attrs).sort().forEach(key => {
      console.log(`  ${key}: ${attrs[key]}`);
    });
  }
}

test().catch(err => console.error('Error:', err.message));
