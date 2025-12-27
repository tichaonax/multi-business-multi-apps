# Ruckus R710 WLAN API - Working Implementation

**Date:** 2025-12-24
**Firmware:** 200.15.6.12 build 304
**Status:** ✅ VERIFIED WORKING

## Overview

Successfully reverse-engineered the Ruckus R710 Unleashed API for WLAN and Guest Service management through browser traffic capture and systematic testing.

## Key Discovery: Session Initialization Required

**CRITICAL:** After login, a system status call (`action='getstat'`) must be made before any configuration calls (`action='getconf'`) will return data. Without this initialization, API calls return empty responses.

## Complete API Flow

### 1. Authentication

**Endpoint:** `POST /admin/login.jsp`

**Request Headers:**
```
Content-Type: application/x-www-form-urlencoded
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
Origin: https://192.168.0.108
Referer: https://192.168.0.108/admin/login.jsp
```

**Request Body:**
```
username=admin&password=YOUR_PASSWORD&ok=Log%20in
```

**Critical Parameter:** `ok=Log in` - Required for successful login!

**Success Response:**
- Status: `302 Moved Temporarily`
- Location header: `https://192.168.0.108/admin/dashboard.jsp`
- **CSRF Token:** `http_x_csrf_token` header (e.g., "QCsPRNdoNH")
- Session cookie: `-ejs-session-` (HttpOnly, Secure)

### 2. Session Initialization (CRITICAL!)

**Endpoint:** `POST /admin/_cmdstat.jsp`

**Request Headers:**
```
Content-Type: application/x-www-form-urlencoded; charset=UTF-8
Accept: */*
X-CSRF-Token: <token from login>
Referer: https://192.168.0.108/admin/dashboard.jsp
```

**Request Body (XML):**
```xml
<ajax-request action='getstat' updater='system.1766640056948.2614' comp='system'>
  <sysinfo/>
  <identity/>
  <adv-radio/>
  <mgmt-ip/>
  <admin/>
  <WAN/>
  <email-server/>
  <sms-server/>
  <zero-it/>
  <bypassCNA/>
  <internal-gateway/>
  <dual-wan-gateway/>
  <registration-token/>
  <mesh-policy/>
  <aws-sns/>
  <pubnub/>
  <self-heal/>
  <guest-access/>
  <mobile-app-promotion/>
  <ap-policy/>
  <credential-reset/>
  <dhcps/>
  <addif/>
  <remote-mgmt/>
  <log/>
  <time/>
  <unleashed-network/>
  <dhcpp/>
  <background-scan/>
  <wips/>
  <ips/>
  <mdnsproxyrule-enable-ap/>
  <icx/>
  <wlansvc-standard-template/>
  <speedflex/>
  <iotg/>
  <cluster/>
  <onearm-gateway/>
  <tunnel/>
  <dedicated/>
  <tun-cfg/>
  <zd-pif/>
  <client-load-balancing/>
  <band-balancing/>
  <scand/>
  <debug-components/>
  <debug-log/>
  <upload-debug/>
  <snmp/>
  <snmpv3/>
  <snmp-trap/>
  <tr069/>
  <SR-info/>
  <mgmt-vlan/>
</ajax-request>
```

**Updater ID Format:** `<component>.<timestamp>.<random>`
- Example: `system.1766640056948.2614`
- Timestamp: `Date.now()`
- Random: `Math.floor(Math.random() * 10000)`

**Success Response:**
- Status: `200 OK`
- Content-Type: `text/xml`
- Large XML response with system configuration

**Purpose:** Initializes server-side session state required for subsequent configuration queries.

### 3. Get WLAN List

**Endpoint:** `POST /admin/_conf.jsp`

**Request Headers:**
```
Content-Type: application/x-www-form-urlencoded; charset=UTF-8
Accept: */*
X-CSRF-Token: <token from login>
Referer: https://192.168.0.108/admin/dashboard.jsp
Cookie: -ejs-session-=<session cookie>
```

**Request Body (XML):**
```xml
<ajax-request action='getconf' DECRYPT_X='true' caller='unleashed_web'
              updater='wlansvc-list.1766640058088.8081' comp='wlansvc-list'/>
```

**Success Response:**
```xml
<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE ajax-response>
<ajax-response>
  <response type="object" id="wlansvc-list.1766640058088.8081">
    <wlansvc-list>
      <wlansvc name="HXI Fashions"
               ssid="HXI Fashions"
               id="1"
               usage="user"
               is-guest="false"
               authentication="open"
               encryption="wpa2"
               guestservice-id="1" />

      <wlansvc name="HXI Eats Guest"
               ssid="HXI Eats Guest"
               id="2"
               usage="guest"
               is-guest="true"
               authentication="open"
               encryption="none"
               guest-auth="guestpass"
               guestservice-id="2"
               web-auth="enabled" />

      <wlansvc name="Fashions Guest Access"
               ssid="Fashions Guest Access"
               id="3"
               usage="guest"
               is-guest="true"
               authentication="open"
               encryption="none"
               guest-auth="guestpass"
               guestservice-id="3" />
    </wlansvc-list>
  </response>
</ajax-response>
```

**Key WLAN Attributes:**
- `name`: WLAN display name
- `ssid`: Network SSID
- `id`: Unique WLAN identifier
- `usage`: "user" or "guest"
- `is-guest`: "true" for guest networks
- `authentication`: "open", "psk", "802.1x", etc.
- `encryption`: "none", "wpa2", "wpa3", etc.
- `guest-auth`: Guest authentication method (e.g., "guestpass")
- `guestservice-id`: Links to Guest Service configuration
- `web-auth`: "enabled" if captive portal is active

### 4. Get Guest Service List

**Endpoint:** `POST /admin/_conf.jsp`

**Request Headers:** Same as WLAN list

**Request Body (XML):**
```xml
<ajax-request action='getconf' DECRYPT_X='true'
              updater='guestservice-list.1766640058830.4175' comp='guestservice-list'/>
```

**Success Response:**
```xml
<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE ajax-response>
<ajax-response>
  <response type="object" id="guestservice-list.1766640058830.4175">
    <guestservice-list>
      <guestservice name="HXI Fashions"
                    id="1"
                    auth-by="guestpass"
                    valid="7"
                    onboarding="false"
                    show-tou="false" />

      <guestservice name="HXI Eats Guest"
                    id="2"
                    auth-by="guestpass"
                    valid="7"
                    onboarding="false"
                    show-tou="false" />

      <guestservice name="Fashions Guest Access"
                    id="3"
                    auth-by="guestpass"
                    valid="7"
                    onboarding="false"
                    show-tou="false" />
    </guestservice-list>
  </response>
</ajax-response>
```

**Key Guest Service Attributes:**
- `name`: Service display name
- `id`: Unique service identifier
- `auth-by`: Authentication method ("guestpass", "social", etc.)
- `valid`: Validity period in days
- `onboarding`: Whether self-service onboarding is enabled
- `show-tou`: Whether to show Terms of Use
- `tou`: Terms of Use text (HTML encoded)

## Common Headers for All API Calls

**Required:**
- `X-CSRF-Token`: Token from login response
- `Cookie`: Session cookie from login

**Standard:**
- `Content-Type: application/x-www-form-urlencoded; charset=UTF-8`
- `Accept: */*`
- `Referer: https://192.168.0.108/admin/dashboard.jsp`
- `User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36`

**Security:**
- `Origin: https://192.168.0.108`
- `Sec-Fetch-Dest: empty`
- `Sec-Fetch-Mode: cors`
- `Sec-Fetch-Site: same-origin`

## API Request Format

**Action Types:**
- `getstat`: Get status/statistics (used for initialization)
- `getconf`: Get configuration
- `setconf`: Set/modify configuration (untested)
- `updconf`: Update configuration (untested)

**Component Types (comp parameter):**
- `system`: System information and status
- `wlansvc-list`: WLAN configuration list
- `guestservice-list`: Guest service configuration list
- `wlansvc`: Individual WLAN (for CRUD operations)
- `guestservice`: Individual guest service (for CRUD operations)

**Additional Attributes:**
- `DECRYPT_X='true'`: Request decrypted passwords in response
- `caller='unleashed_web'`: Identifies client as web UI
- `updater='component.timestamp.random'`: Unique request identifier

## Error Handling

**Empty Response (Before Session Init):**
```xml
<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE ajax-response>
<ajax-response>
  <response type="object" id="wlansvc-list.xxx.xxx" />
</ajax-response>
```
**Solution:** Ensure system status call is made first!

**401 Unauthorized:** CSRF token missing or invalid
**403 Forbidden:** Session expired or invalid
**302 Redirect to login.jsp:** Not authenticated

## Working Example (Node.js)

```javascript
const axios = require('axios');
const { CookieJar } = require('tough-cookie');
const xml2js = require('xml2js');

// 1. Login
const loginParams = new URLSearchParams();
loginParams.append('username', 'admin');
loginParams.append('password', 'password');
loginParams.append('ok', 'Log in');

const loginResponse = await client.post('/admin/login.jsp', loginParams);
const csrfToken = loginResponse.headers['http_x_csrf_token'];

// 2. Initialize session
const systemPayload = `<ajax-request action='getstat' updater='system.${Date.now()}.${Math.floor(Math.random()*10000)}' comp='system'>...</ajax-request>`;

await client.post('/admin/_cmdstat.jsp', systemPayload, {
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'X-CSRF-Token': csrfToken
  }
});

// 3. Get WLAN list
const wlanPayload = `<ajax-request action='getconf' DECRYPT_X='true' caller='unleashed_web' updater='wlansvc-list.${Date.now()}.${Math.floor(Math.random()*10000)}' comp='wlansvc-list'/>`;

const wlanResponse = await client.post('/admin/_conf.jsp', wlanPayload, {
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'X-CSRF-Token': csrfToken,
    'Referer': 'https://192.168.0.108/admin/dashboard.jsp'
  }
});

// 4. Parse XML
const parser = new xml2js.Parser();
const result = await parser.parseStringPromise(wlanResponse.data);
const wlans = result['ajax-response'].response[0]['wlansvc-list'][0].wlansvc;
```

## Next Steps

- [ ] Discover Guest Pass generation API (token creation)
- [ ] Discover Guest Pass download/export API
- [ ] Test WLAN CRUD operations (create, update, delete)
- [ ] Test Guest Service CRUD operations
- [ ] Document complete API specification
- [ ] Create TypeScript client library

## References

- Test Script: `scripts/ruckus-api-discovery/test-with-session-init-call.js`
- Browser Captures: `ai-contexts/wip/Request-*.txt`
- Login Flow: `docs/ruckus-login-flow.md`
