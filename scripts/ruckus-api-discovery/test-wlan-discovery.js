/**
 * Test Guest WLAN API Discovery
 *
 * This script logs in and then tests WLAN-related endpoints
 */

const { createHttpClient, getCookies } = require('./utils/http-client');
const { login, verifyAuthentication } = require('./utils/auth');
const logger = require('./utils/request-logger');
const config = require('./config');

async function testWlanDiscovery() {
  console.log('\n🔍 Starting Guest WLAN API Discovery\n');
  console.log('=' .repeat(80));

  const { client, cookieJar } = createHttpClient();

  try {
    // ====================================================================
    // STEP 1: Login first
    // ====================================================================
    console.log('\n📝 Step 1: Authenticating...\n');

    const loginSuccess = await login(client);

    if (!loginSuccess) {
      console.error('❌ Login failed. Cannot proceed with WLAN discovery.');
      return;
    }

    // Verify authentication
    const isAuthenticated = await verifyAuthentication(client);

    if (!isAuthenticated) {
      console.error('❌ Authentication verification failed.');
      return;
    }

    console.log('\n✅ Authentication successful. Ready to discover WLAN APIs.\n');

    // ====================================================================
    // STEP 2: Try to discover WLAN list endpoint
    // ====================================================================
    console.log('\n📝 Step 2: Attempting to discover WLAN list endpoint...\n');

    // Common WLAN endpoint patterns to try
    const wlanEndpoints = [
      '/admin/_wlanlist.jsp',
      '/admin/_wla_wlan.jsp',
      '/admin/wlan.jsp',
      '/admin/_cmdstat.jsp?action=getWlans',
      '/forms/wlanForm',
      '/api/wlan',
      '/api/wlans'
    ];

    for (const endpoint of wlanEndpoints) {
      console.log(`\n🔍 Trying: ${endpoint}`);

      try {
        const response = await client.get(endpoint, {
          validateStatus: () => true
        });

        console.log(`   Status: ${response.status} ${response.statusText}`);
        console.log(`   Content-Type: ${response.headers['content-type']}`);
        console.log(`   Content-Length: ${response.headers['content-length'] || 'chunked'}`);

        if (response.status === 200 && response.data) {
          const dataStr = typeof response.data === 'string'
            ? response.data.substring(0, 200)
            : JSON.stringify(response.data).substring(0, 200);

          console.log(`   Preview: ${dataStr}...`);

          // Check if response looks like it contains WLAN data
          if (response.data.includes('wlan') || response.data.includes('ssid')) {
            console.log(`   ⭐ Possible WLAN endpoint found!`);
          }
        }

      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }

    // ====================================================================
    // STEP 3: Test command-based endpoints (like we saw in JS files)
    // ====================================================================
    console.log('\n📝 Step 3: Testing command-based endpoints...\n');

    const commands = [
      {
        endpoint: '/admin/_wla_cmdstat.jsp',
        payload: { action: 'getconf', name: 'wlan' }
      },
      {
        endpoint: '/admin/_wla_cmdstat.jsp',
        payload: { com: 'wlan', action: 'list' }
      },
      {
        endpoint: '/admin/_cmdstat.jsp',
        payload: { action: 'getWlans' }
      }
    ];

    for (const { endpoint, payload } of commands) {
      console.log(`\n🔍 Trying: POST ${endpoint}`);
      console.log(`   Payload: ${JSON.stringify(payload)}`);

      try {
        const response = await client.post(endpoint, payload, {
          headers: {
            'Content-Type': 'application/json'
          },
          validateStatus: () => true
        });

        console.log(`   Status: ${response.status} ${response.statusText}`);

        if (response.status === 200 && response.data) {
          const dataStr = typeof response.data === 'string'
            ? response.data.substring(0, 200)
            : JSON.stringify(response.data).substring(0, 200);

          console.log(`   Response: ${dataStr}...`);
        }

      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }

    // ====================================================================
    // INSTRUCTIONS FOR USER
    // ====================================================================
    console.log('\n' + '='.repeat(80));
    console.log('📋 NEXT STEP: BROWSER CAPTURE REQUIRED');
    console.log('='.repeat(80));
    console.log(`
We've tested common WLAN endpoints, but we need the ACTUAL endpoints used by the UI.

Please perform the following in your browser:

1. Open Chrome/Firefox and go to https://192.168.0.108/admin/login.jsp
2. Open DevTools (F12) → Network tab
3. Check "Preserve log" and filter to XHR/Fetch
4. Login with admin/HelloMotto
5. Navigate to: Wi-Fi Networks (or similar menu)
6. Look for XHR requests that load the WLAN list
7. Then click "Create" or "Add WLAN"
8. Fill in these settings (from your documentation):
   - Name/SSID: HXI Test Guest
   - Usage Type: Guest Access (CRITICAL!)
   - Guest Authentication: Guest Pass
   - Guest Password: Unique password for each guest
9. Click Save/Create
10. Capture the XHR request that creates the WLAN

Then provide:
- List WLAN endpoint (URL, method, response)
- Create WLAN endpoint (URL, method, headers, payload)
- Response format for successful creation

Once you provide this, I'll update the test script and continue discovery!
`);

    console.log('='.repeat(80));
    console.log('📁 Full logs: ./logs/ruckus-api-requests-' + new Date().toISOString().split('T')[0] + '.log');
    console.log('='.repeat(80));
    console.log('');

  } catch (error) {
    console.error('\n❌ Fatal Error:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testWlanDiscovery().then(() => {
  console.log('✅ Discovery test completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
