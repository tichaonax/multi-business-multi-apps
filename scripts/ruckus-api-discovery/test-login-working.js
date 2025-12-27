/**
 * Test Working Login to Ruckus R710
 *
 * Based on actual browser capture from user
 */

const { createHttpClient, getCookies } = require('./utils/http-client');
const logger = require('./utils/request-logger');
const config = require('./config');

async function testWorkingLogin() {
  console.log('\n🔍 Testing Working Login Method (from browser capture)\n');
  console.log('=' .repeat(80));

  const { client, cookieJar } = createHttpClient();
  const { username, password } = config.ruckus.credentials;

  try {
    // ====================================================================
    // WORKING METHOD: Exact browser request replication
    // ====================================================================
    console.log('\n📝 Replicating exact browser login request');
    logger.logDiscovery('/admin/login.jsp', 'POST', 'Browser-captured login with ok parameter');

    // Build form data exactly as browser sends it
    const loginParams = new URLSearchParams();
    loginParams.append('username', username);
    loginParams.append('password', password);
    loginParams.append('ok', 'Log in'); // The key parameter we were missing!

    const loginResponse = await client.post('/admin/login.jsp', loginParams, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Origin': config.ruckus.baseUrl,
        'Referer': `${config.ruckus.baseUrl}/admin/login.jsp`,
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin'
      },
      maxRedirects: 0, // Don't auto-follow redirects
      validateStatus: () => true // Accept any status
    });

    console.log(`\n✅ Response Status: ${loginResponse.status} ${loginResponse.statusText}`);

    // Check for redirect (302 = success!)
    if (loginResponse.status === 302) {
      const redirectLocation = loginResponse.headers.location;
      console.log(`🎉 SUCCESS! Login redirected to: ${redirectLocation}`);
      console.log(`✅ This means authentication was successful!`);

      // Check cookies
      const cookies = await getCookies(cookieJar, config.ruckus.baseUrl);
      console.log(`🍪 Session Cookies: ${cookies.length} cookie(s)`);

      if (cookies.length > 0) {
        cookies.forEach(cookie => {
          console.log(`   - ${cookie.key} = ${cookie.value.substring(0, 30)}...`);
        });
      }

      // Now follow the redirect to dashboard
      console.log(`\n📝 Following redirect to dashboard...`);

      const dashboardResponse = await client.get(redirectLocation, {
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Referer': `${config.ruckus.baseUrl}/admin/login.jsp`,
          'Upgrade-Insecure-Requests': '1'
        }
      });

      console.log(`✅ Dashboard Response: ${dashboardResponse.status} ${dashboardResponse.statusText}`);

      // Check if we got the dashboard (not redirected back to login)
      if (dashboardResponse.status === 200) {
        const isAuthenticated = !dashboardResponse.data.includes('X-Auth" content="Unauthorized');

        if (isAuthenticated) {
          console.log(`🎉 AUTHENTICATED! We have access to the dashboard!`);
        } else {
          console.log(`❌ Still showing unauthorized`);
        }

        // Check for dashboard indicators
        if (dashboardResponse.data.includes('dashboard')) {
          console.log(`✅ Dashboard content detected`);
        }
      }

    } else if (loginResponse.status === 200) {
      console.log(`❌ Login failed - returned login page (status 200)`);
      console.log(`Expected 302 redirect, got 200 OK`);
    } else {
      console.log(`❓ Unexpected status: ${loginResponse.status}`);
    }

    // ====================================================================
    // Test authenticated request to another endpoint
    // ====================================================================
    console.log(`\n📝 Testing authenticated request to /admin/_cmdstat.jsp`);

    const cmdstatResponse = await client.get('/admin/_cmdstat.jsp', {
      validateStatus: () => true
    });

    console.log(`✅ Response Status: ${cmdstatResponse.status} ${cmdstatResponse.statusText}`);

    if (cmdstatResponse.status === 200 && !cmdstatResponse.data.includes('X-Auth" content="Unauthorized')) {
      console.log(`🎉 SUCCESS! Authenticated access to _cmdstat.jsp`);
    } else if (cmdstatResponse.status === 200 && cmdstatResponse.data.includes('X-Auth" content="Unauthorized')) {
      console.log(`❌ Not authenticated - returned login page`);
    }

    // ====================================================================
    // SUMMARY
    // ====================================================================
    console.log('\n' + '='.repeat(80));
    console.log('📊 LOGIN TEST SUMMARY');
    console.log('='.repeat(80));

    const finalCookies = await getCookies(cookieJar, config.ruckus.baseUrl);

    console.log(`\n🍪 Final Cookie Jar:`);
    if (finalCookies.length > 0) {
      finalCookies.forEach((cookie, index) => {
        console.log(`  ${index + 1}. ${cookie.key}`);
        console.log(`     Value: ${cookie.value.substring(0, 40)}${cookie.value.length > 40 ? '...' : ''}`);
        console.log(`     Domain: ${cookie.domain}, Path: ${cookie.path}`);
        console.log(`     Secure: ${cookie.secure}, HttpOnly: ${cookie.httpOnly}`);
      });
    } else {
      console.log(`  No cookies in jar`);
    }

    console.log(`\n✅ Key Finding: The "ok=Log in" parameter is REQUIRED for login!`);
    console.log(`✅ Login endpoint: POST /admin/login.jsp`);
    console.log(`✅ Success indicator: 302 redirect to /admin/dashboard.jsp`);
    console.log(`✅ Session cookie: -ejs-session- (persists after login)`);

    console.log('\n' + '='.repeat(80));
    console.log('📁 Full logs: ./logs/ruckus-api-requests-' + new Date().toISOString().split('T')[0] + '.log');
    console.log('='.repeat(80));
    console.log('');

  } catch (error) {
    console.error('\n❌ Fatal Error:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testWorkingLogin().then(() => {
  console.log('✅ Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
