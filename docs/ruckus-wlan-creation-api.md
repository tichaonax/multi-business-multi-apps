# Ruckus R710 - Guest WLAN Creation API

**Status:** ✅ WORKING
**Last Updated:** 2025-12-25
**Firmware Version:** 200.15.6.12 build 304

## Overview

This document describes the complete workflow for creating a new Guest WLAN on the Ruckus R710 Unleashed system. Guest WLAN creation is a **two-step process**:

1. **Create Guest Service** - Configure the captive portal (branding, Terms of Use, firewall rules)
2. **Create WLAN** - Configure the WiFi network and link it to the guest service

## Prerequisites

1. **Authentication** - Must be logged in with valid session cookie
2. **CSRF Token** - Required in `X-CSRF-Token` header (obtained during login)
3. **Session Initialization** - Must call system status endpoint after login

## Step 1: Create Guest Service (Portal Configuration)

The Guest Service defines the captive portal configuration, including branding, Terms of Use, and firewall rules for guest access.

### Endpoint

```
POST /admin/_conf.jsp
```

### Headers

```
Content-Type: application/x-www-form-urlencoded; charset=UTF-8
Accept: */*
X-CSRF-Token: {csrf_token}
X-Requested-With: XMLHttpRequest
Referer: https://192.168.0.108/admin/dashboard.jsp
Cookie: -ejs-session-={session_cookie}
```

### XML Payload Structure

```xml
<ajax-request action='addobj' updater='guestservice-list.{timestamp}.{random}' comp='guestservice-list'>
  <guestservice
    name='{service_name}'
    onboarding='true'
    onboarding-aspect='both'
    auth-by='guestpass'
    countdown-by-issued='false'
    show-tou='true'
    tou='Terms of Use...'
    redirect='orig'
    redirect-url=''
    company-logo='ruckus'
    poweredby='Ruckus Wireless'
    poweredby-url='http://www.ruckuswireless.com/'
    desc='Type or paste in the text of your guest pass.'
    self-service='false'
    rule6=''
    title='Welcome to Guest WiFi !'
    opacity='1.0'
    background-opacity='1'
    background-color='#516a8c'
    logo-type='default'
    banner-type='default'
    bgimage-type='default'
    bgimage-display-type='fill'
    enable-portal='true'
    wifi4eu='false'
    wifi4eu-network-id=''
    wifi4eu-language='en'
    wifi4eu-debug='false'
    wg=''
    show-lang='true'
    portal-lang='en_US'
    random-key='999'
    valid='1'
    old-self-service='false'
    old-auth-by='guestpass'>

    <!-- Firewall Rules for Guest Access -->
    <rule action='accept' type='layer 2' ether-type='0x0806'></rule>  <!-- ARP -->
    <rule action='accept' type='layer 2' ether-type='0x8863'></rule>  <!-- PPPoE Discovery -->
    <rule action='accept' type='layer 2' ether-type='0x8864'></rule>  <!-- PPPoE Session -->
    <rule action='accept' type='layer 3' protocol='17' dst-port='53'></rule>  <!-- DNS UDP -->
    <rule action='accept' type='layer 3' protocol='6' dst-port='53'></rule>   <!-- DNS TCP -->
    <rule action='accept' type='layer 3' protocol='' dst-port='67' app='DHCP'></rule>
    <rule action='deny' type='layer 3' protocol='' dst-port='68'></rule>
    <rule action='accept' type='layer 3' protocol='6' dst-addr='host' dst-port='80' app='HTTP'></rule>
    <rule action='accept' type='layer 3' protocol='6' dst-addr='host' dst-port='443' app='HTTPS'></rule>
    <rule action='deny' type='layer 3' dst-addr='local' protocol='' EDITABLE='false'></rule>
    <rule action='deny' type='layer 3' dst-addr='10.0.0.0/8' protocol=''></rule>
    <rule action='deny' type='layer 3' dst-addr='172.16.0.0/12' protocol=''></rule>
    <rule action='deny' type='layer 3' dst-addr='192.168.0.0/16' protocol=''></rule>
    <rule action='accept' type='layer 3' protocol='1'></rule>  <!-- ICMP -->
    <rule action='accept' type='layer 3' protocol='' dst-port='0'></rule>
  </guestservice>
</ajax-request>
```

### Key Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | Name of the guest service (shown in admin UI) |
| `onboarding` | boolean | Enable Zero-IT device registration |
| `auth-by` | string | Authentication method: `guestpass`, `social`, etc. |
| `show-tou` | boolean | Show Terms of Use on portal |
| `tou` | string | Terms of Use text (can include newlines) |
| `title` | string | Portal welcome title |
| `valid` | integer | Token validity period in days |
| `portal-lang` | string | Portal language code (e.g., `en_US`) |
| `enable-portal` | boolean | Enable captive portal |

### Response

```xml
<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE ajax-response>
<ajax-response>
  <response type="object" id="guestservice-list.{timestamp}.{random}">
    <guestservice name="..." ... id="{guest_service_id}">
      <!-- Full configuration echoed back -->
    </guestservice>
  </response>
</ajax-response>
```

**Extract the `id` attribute** - this is the Guest Service ID needed for Step 2.

### Example Response (Success)

```xml
<guestservice name="Test-WLAN-2025-12-25T06-48-54" ... id="5">
```

Guest Service ID: **5**

## Step 2: Create WLAN (Network Configuration)

The WLAN configuration defines the actual WiFi network and links it to the Guest Service created in Step 1.

### Endpoint

```
POST /admin/_conf.jsp
```

### Headers

Same as Step 1.

### XML Payload Structure

```xml
<ajax-request action='addobj' updater='wlansvc-list.{timestamp}.{random}' comp='wlansvc-list'>
  <wlansvc
    name='{wlan_name}'
    ssid='{ssid}'
    description='{description}'
    usage='guest'
    is-guest='true'
    authentication='open'
    encryption='none'
    acctsvr-id='0'
    acct-upd-interval='10'
    guest-pass=''
    en-grace-period-sets='enabled'
    grace-period-sets='480'
    close-system='false'
    vlan-id='1'
    dvlan='disabled'
    max-clients-per-radio='100'
    enable-type='0'
    do-wmm-ac='disabled'
    acl-id='1'
    devicepolicy-id=''
    bgscan='1'
    balance='0'
    band-balance='0'
    do-802-11d='enabled'
    wlan_bind='0'
    force-dhcp='0'
    force-dhcp-timeout='10'
    max-idle-timeout='300'
    idle-timeout='true'
    client-isolation='enabled'
    ci-whitelist-id='0'
    bypass-cna='false'
    dtim-period='1'
    directed-mbc='1'
    client-flow-log='disabled'
    export-client-log='false'
    wifi6='true'
    local-bridge='1'
    enable-friendly-key='true'
    ofdm-rate-only='false'
    bss-minrate='0'
    tx-rate-config='1'
    web-auth='enabled'
    https-redirection='enabled'
    called-station-id-type='0'
    option82='0'
    option82-opt1='0'
    option82-opt2='0'
    option82-opt150='0'
    option82-opt151='0'
    dis-dgaf='0'
    parp='0'
    authstats='0'
    sta-info-extraction='1'
    pool-id=''
    dhcpsvr-id='0'
    precedence-id='1'
    role-based-access-ctrl='false'
    option82-areaName=''
    guest-auth='guestpass'
    self-service='false'
    self-service-sponsor-approval='undefined'
    self-service-notification='undefined'
    guestservice-id='{guest_service_id}'>

    <!-- QoS Configuration -->
    <queue-priority voice='0' video='2' data='4' background='6'/>
    <qos uplink-preset='DISABLE' downlink-preset='DISABLE' perssid-uplink-preset='0' perssid-downlink-preset='0'/>

    <!-- Radio Resource Management -->
    <rrm neighbor-report='enabled'/>

    <!-- Multicast -->
    <smartcast mcast-filter='disabled'/>

    <!-- Schedule (always on: all 0x0) -->
    <wlan-schedule value='0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0'/>

    <!-- Advanced Policies -->
    <avp-policy avp-enabled='disabled' avpdeny-id='0'/>
    <urlfiltering-policy urlfiltering-enabled='disabled' urlfiltering-id='0'/>
    <wificalling-policy wificalling-enabled='disabled' profile-id='0'/>
  </wlansvc>
</ajax-request>
```

### Key Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | WLAN name (admin UI) |
| `ssid` | string | WiFi SSID (broadcast name) |
| `description` | string | WLAN description |
| `usage` | string | Must be `guest` for guest WLANs |
| `is-guest` | boolean | Must be `true` for guest WLANs |
| `authentication` | string | Auth method: `open`, `psk`, `802.1x` |
| `encryption` | string | Encryption: `none`, `wpa2`, `wpa3` |
| `guestservice-id` | integer | **Guest Service ID from Step 1** |
| `grace-period-sets` | integer | Grace period in minutes (default: 480) |
| `client-isolation` | string | `enabled` or `disabled` |
| `enable-friendly-key` | boolean | Use friendly token format |
| `web-auth` | string | Enable captive portal: `enabled`/`disabled` |
| `https-redirection` | string | HTTPS redirect: `enabled`/`disabled` |

### Response

```xml
<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE ajax-response>
<ajax-response>
  <response type="object" id="wlansvc-list.{timestamp}.{random}">
    <wlansvc name="..." ssid="..." ... id="{wlan_id}">
      <!-- Full configuration echoed back -->
    </wlansvc>
  </response>
</ajax-response>
```

**Extract the `id` attribute** - this is the WLAN ID.

### Example Response (Success)

```xml
<wlansvc name="Test-WLAN-2025-12-25T06-48-54" ssid="Test-WLAN-2025-12-25T06-48-54" ... id="5">
```

WLAN ID: **5**

## Complete Workflow Example

### 1. Login

```javascript
const loginResponse = await client.post('/admin/login.jsp',
  'username=admin&password=HelloMotto&ok=Log+in'
);
const csrfToken = loginResponse.headers['http_x_csrf_token'];
```

### 2. Initialize Session

```javascript
const xmlPayload = `<ajax-request action='getstat' updater='system.${Date.now()}.${Math.random()}' comp='system'>
  <sysinfo/><identity/><!-- ... many components ... -->
</ajax-request>`;

await client.post('/admin/_cmdstat.jsp', xmlPayload, {
  headers: { 'X-CSRF-Token': csrfToken }
});
```

### 3. Create Guest Service

```javascript
const guestServicePayload = `<ajax-request action='addobj' updater='guestservice-list.${Date.now()}.${Math.random()}' comp='guestservice-list'>
  <guestservice name='My Guest WiFi' auth-by='guestpass' ...>
    <!-- firewall rules -->
  </guestservice>
</ajax-request>`;

const guestServiceResponse = await client.post('/admin/_conf.jsp', guestServicePayload, {
  headers: { 'X-CSRF-Token': csrfToken }
});

// Extract Guest Service ID from response
const guestServiceId = extractIdFromResponse(guestServiceResponse.data);
```

### 4. Create WLAN

```javascript
const wlanPayload = `<ajax-request action='addobj' updater='wlansvc-list.${Date.now()}.${Math.random()}' comp='wlansvc-list'>
  <wlansvc name='My Guest WiFi' ssid='My Guest WiFi' usage='guest' guestservice-id='${guestServiceId}' ...>
    <!-- QoS, RRM, etc. -->
  </wlansvc>
</ajax-request>`;

const wlanResponse = await client.post('/admin/_conf.jsp', wlanPayload, {
  headers: { 'X-CSRF-Token': csrfToken }
});

// Extract WLAN ID from response
const wlanId = extractIdFromResponse(wlanResponse.data);
```

### 5. Verify WLAN Creation

```javascript
const verifyPayload = `<ajax-request action='getconf' DECRYPT_X='true' caller='unleashed_web' updater='wlansvc-list.${Date.now()}.${Math.random()}' comp='wlansvc-list'/>`;

const verifyResponse = await client.post('/admin/_conf.jsp', verifyPayload, {
  headers: { 'X-CSRF-Token': csrfToken }
});

// Check if WLAN appears in list
const wlanExists = verifyResponse.data.includes(`id="${wlanId}"`);
```

## Test Script

A complete working test script is available at:

```
scripts/ruckus-api-discovery/test-guest-wlan-creation.js
```

**Run with:**

```bash
node scripts/ruckus-api-discovery/test-guest-wlan-creation.js
```

**Output Example:**

```
🧪 RUCKUS R710 - GUEST WLAN CREATION TEST
================================================================================
🔐 Attempting login to Ruckus R710...
✅ Login successful! Redirected to: https://192.168.0.108/admin/dashboard.jsp
🔐 CSRF Token received: hKhgz5RO36

📡 Initializing session (system status call)...
✅ Session initialized successfully

🎯 Creating Guest WLAN: "Test-WLAN-2025-12-25T06-48-54"
────────────────────────────────────────────────────────────────────────────────

🔧 Step 1: Creating Guest Service "Test-WLAN-2025-12-25T06-48-54"...
✅ Guest Service created successfully with ID: 1

🔧 Step 2: Creating WLAN "Test-WLAN-2025-12-25T06-48-54" (linked to Guest Service ID: 1)...
✅ WLAN created successfully with ID: 0

🔍 Verifying WLAN ID 0 appears in WLAN list...
✅ WLAN ID 0 confirmed in WLAN list

📊 TEST SUMMARY
================================================================================
WLAN Name:          Test-WLAN-2025-12-25T06-48-54
Guest Service ID:   1
WLAN ID:            0
Verified:           ✅ Yes
────────────────────────────────────────────────────────────────────────────────
🎉 SUCCESS! Guest WLAN created and verified.

💡 Next Steps:
   1. Check Ruckus admin panel to confirm WLAN appears
   2. Test guest pass generation for this WLAN
   3. Implement edit/update WLAN workflow
```

## Important Notes

1. **Guest Service First**: Always create the Guest Service before creating the WLAN
2. **Link Guest Service ID**: The WLAN's `guestservice-id` parameter must match the Guest Service ID
3. **Updater ID Format**: `{component}.{timestamp}.{random}` is required for all requests
4. **Content-Type**: Must be `application/x-www-form-urlencoded; charset=UTF-8` even though payload is XML
5. **Session Initialization**: Don't forget the system status call after login
6. **Firewall Rules**: Guest Services require proper firewall rules for captive portal to work
7. **Default Settings**: The example uses secure defaults (client isolation enabled, open auth with captive portal)

## Configuration Options

### Authentication Methods

- `open` - Open network (used with captive portal)
- `psk` - Pre-shared key (WPA2/WPA3 Personal)
- `802.1x` - Enterprise authentication

### Encryption Methods

- `none` - No encryption (open network)
- `wpa2` - WPA2 encryption
- `wpa3` - WPA3 encryption
- `aes` - AES encryption

### Guest Pass Authentication

- `guestpass` - Token-based (our use case)
- `social` - Social media login
- `sms` - SMS verification
- `email` - Email verification

### Grace Period

The `grace-period-sets` parameter defines how long (in minutes) a device can reconnect without re-authenticating:

- `480` - 8 hours (default)
- `1440` - 24 hours
- `10080` - 7 days

### Token Validity

The `valid` parameter in Guest Service defines token lifespan in days:

- `1` - 1 day
- `7` - 7 days
- `30` - 30 days

## Error Handling

### Common Errors

1. **401 Unauthorized**: CSRF token missing or invalid
2. **403 Forbidden**: Session expired, need to re-login
3. **200 OK with error XML**: Invalid configuration parameters
4. **Empty response**: Missing session initialization call

### Error Response Format

```xml
<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE ajax-response>
<ajax-response>
  <error code="..." message="..."/>
</ajax-response>
```

## Next Steps

1. **Edit/Update WLAN** - Discover the `updconf` action for editing existing WLANs
2. **Delete WLAN** - Discover the delete action
3. **Enable/Disable WLAN** - Toggle WLAN status without deleting
4. **QR Code Generation** - Generate QR codes for guest access
5. **Token Management** - Create tokens for the new WLAN

## Related Documentation

- [Login Authentication Flow](./ruckus-login-flow.md)
- [WLAN Read API](./ruckus-wlan-api-working.md)
- [Guest Pass Token Creation](./ruckus-guest-pass-api.md)
- [Project Plan](../ai-contexts/project-plans/active/projectplan-MBM-119-ruckus-r710-integration-2025-12-24.md)

---

**Document Version:** 1.0
**API Version:** Ruckus Unleashed 200.15.6.12 build 304
**Test Status:** ✅ Verified Working on 2025-12-25
