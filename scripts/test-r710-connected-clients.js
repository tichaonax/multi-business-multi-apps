const {createHttpClient} = require('./ruckus-api-discovery/utils/http-client');
const {login} = require('./ruckus-api-discovery/utils/auth');
const xml2js = require('xml2js');

async function test() {
  const {client} = createHttpClient();
  const authResult = await login(client);
  const csrfToken = authResult.csrfToken;

  console.log('\n=== R710 Connected Clients Test ===\n');

  const updaterId = `stamgr.${Date.now()}.9993`;

  // This is the exact payload from the UI
  const xmlPayload = `<ajax-request action='getstat' caller='unleashed_web' updater='${updaterId}' comp='stamgr'><wlan LEVEL='1' PERIOD='3600'/><ap LEVEL='1' PERIOD='3600'/><client LEVEL='1' client-type='3'/><wireclient LEVEL='1'/><zt-mesh-list/><apsummary/></ajax-request>`;

  console.log('Fetching connected clients from R710...\n');

  const response = await client.post('/admin/_cmdstat.jsp', xmlPayload, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-CSRF-Token': csrfToken,
      'Referer': 'https://192.168.0.108/admin/dashboard.jsp'
    }
  });

  const parser = new xml2js.Parser();
  const result = await parser.parseStringPromise(response.data);

  const statData = result?.['ajax-response']?.response?.[0]?.['apstamgr-stat']?.[0];

  if (!statData) {
    console.error('Failed to parse response');
    return;
  }

  // Extract WLANs
  const wlans = statData.wlan || [];
  console.log('=== WLANs ===');
  wlans.forEach(wlan => {
    const attrs = wlan.$;
    console.log(`WLAN ID: ${attrs.id}`);
    console.log(`  SSID: ${attrs.ssid}`);
    console.log(`  Associated Clients: ${attrs['assoc-stas']}`);
    console.log(`  State: ${attrs.state}`);
    console.log('');
  });

  // Extract Connected Clients
  const clients = statData.client || [];
  console.log('=== Connected Clients ===');

  if (clients.length === 0) {
    console.log('No clients currently connected\n');
  } else {
    clients.forEach(clientData => {
      const attrs = clientData.$;
      console.log(`Client MAC: ${attrs.mac}`);
      console.log(`  Hostname: ${attrs.hostname}`);
      console.log(`  IP: ${attrs.ip}`);
      console.log(`  SSID: ${attrs.ssid}`);
      console.log(`  WLAN ID: ${attrs['wlan-id']}`);
      console.log(`  Device Type: ${attrs.dvctype}`);
      console.log(`  Device Info: ${attrs.dvcinfo}`);
      console.log(`  RSSI: ${attrs.rssi} (${attrs['rssi-level']})`);
      console.log(`  Auth Method: ${attrs['auth-method']}`);
      console.log(`  User: ${attrs.user}`);
      console.log(`  Status: ${attrs.status}`);
      console.log(`  Channel: ${attrs.channel}`);
      console.log(`  Radio: ${attrs['radio-type']} (${attrs['radio-band']})`);
      console.log(`  First Associated: ${new Date(parseInt(attrs['first-assoc']) * 1000).toLocaleString()}`);
      console.log('');
    });
  }

  // Find "Mvimvi Groceries Guest WiFi"
  const mvimviWlan = wlans.find(w => w.$.ssid === 'Mvimvi Groceries Guest WiFi');
  if (mvimviWlan) {
    console.log('=== Mvimvi Groceries Guest WiFi Status ===');
    console.log(`WLAN ID: ${mvimviWlan.$.id}`);
    console.log(`Associated Clients: ${mvimviWlan.$['assoc-stas']}`);

    const mvimviClients = clients.filter(c => c.$['wlan-id'] === mvimviWlan.$.id);
    if (mvimviClients.length > 0) {
      console.log(`\nClients on this WLAN:`);
      mvimviClients.forEach(c => {
        console.log(`  - ${c.$.hostname} (${c.$.mac}) - ${c.$.ip}`);
      });
    } else {
      console.log('\nNo clients found on this WLAN (but assoc-stas says there are some!)');
      console.log('This might be a timing issue or the client list is filtered.');
    }
  } else {
    console.log('❌ "Mvimvi Groceries Guest WiFi" WLAN not found!');
  }

  console.log('\n=== Summary ===');
  console.log(`Total WLANs: ${wlans.length}`);
  console.log(`Total Connected Clients: ${clients.length}`);
}

test().catch(err => console.error('Error:', err.message));
