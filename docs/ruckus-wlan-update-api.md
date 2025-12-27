# Ruckus R710 - Guest WLAN Update/Edit API

**Status:** ✅ WORKING
**Last Updated:** 2025-12-25
**Firmware Version:** 200.15.6.12 build 304

## Overview

This document describes the complete workflow for **updating/editing** an existing Guest WLAN on the Ruckus R710 Unleashed system. Like creation, updating a Guest WLAN is a **two-step process**:

1. **Update Guest Service** - Modify the captive portal configuration
2. **Update WLAN** - Modify the WiFi network configuration

## Key Differences from Creation

| Aspect | Create (addobj) | Update (updobj) |
|--------|-----------------|-----------------|
| **Action** | `addobj` | `updobj` |
| **ID Required** | ❌ No (system assigns) | ✅ **Yes (must specify)** |
| **Response** | Returns new ID | Empty object (`<response ... />`) |
| **All Other Params** | Same | Same |

##CRITICAL Parameters for Guest Portal Functionality

⚠️ **IMPORTANT**: The following parameters are **REQUIRED** for the guest portal to work properly:

###1. `onboarding='true'` ✅ **CRITICAL**
**Purpose**: Enables Zero-IT device registration from the Guest Portal
**Required**: YES - guest tokens will NOT work without this
**UI Label**: "Enable Zero-IT device registration from the Guest Portal"

```xml
<guestservice onboarding='true' ...>
```

### 2. `valid='7'` ✅ **CRITICAL**
**Purpose**: Expire new guest passes if not used within X days
**Default**: 7 days (recommended)
**Required**: YES - must be provided
**UI Label**: "Expire new guest passes if not used within [7] days"

```xml
<guestservice valid='7' ...>
```

**Valid Values**:
- `1` - 1 day
- `7` - 7 days (RECOMMENDED)
- `30` - 30 days

### 3. `show-tou='true'` ✅ **IMPORTANT**
**Purpose**: Show Terms and Conditions on the captive portal
**Required**: Highly recommended for legal compliance
**UI Label**: "Show terms and conditions"

```xml
<guestservice show-tou='true' ...>
```

## Prerequisites

1. **Authentication** - Must be logged in with valid session cookie
2. **CSRF Token** - Required in `X-CSRF-Token` header
3. **Session Initialization** - Must call system status endpoint after login
4. **Know the IDs** - Must know the Guest Service ID and WLAN ID to update

## Optional Pre-Update Step: Get WLAN Stats

The browser calls this before editing (optional):

### Endpoint

```
POST /admin/_cmdstat.jsp
```

### XML Payload

```xml
<ajax-request action='getstat' updater='stamgr.{timestamp}.{random}' comp='stamgr'>
  <client wlan='{wlan_name}' LEVEL='1' USE_REGEX='false'/>
</ajax-request>
```

### Response

```xml
<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE ajax-response>
<ajax-response>
  <response type="object" id="stamgr.XXX">
    <apstamgr-stat />
  </response>
</ajax-response>
```

## Step 1: Update Guest Service

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
<ajax-request action='updobj' updater='guestservice-list.{timestamp}.{random}' comp='guestservice-list'>
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
    valid='7'
    old-self-service='false'
    old-auth-by='guestpass'
    id='{guest_service_id}'>

    <!-- Same firewall rules as creation -->
    <rule action='accept' type='layer 2' ether-type='0x0806'></rule>
    <rule action='accept' type='layer 2' ether-type='0x8863'></rule>
    <rule action='accept' type='layer 2' ether-type='0x8864'></rule>
    <rule action='accept' type='layer 3' protocol='17' dst-port='53'></rule>
    <rule action='accept' type='layer 3' protocol='6' dst-port='53'></rule>
    <rule action='accept' type='layer 3' protocol='' dst-port='67' app='DHCP'></rule>
    <rule action='deny' type='layer 3' protocol='' dst-port='68'></rule>
    <rule action='accept' type='layer 3' protocol='6' dst-addr='host' dst-port='80' app='HTTP'></rule>
    <rule action='accept' type='layer 3' protocol='6' dst-addr='host' dst-port='443' app='HTTPS'></rule>
    <rule action='deny' type='layer 3' dst-addr='local' protocol='' EDITABLE='false'></rule>
    <rule action='deny' type='layer 3' dst-addr='10.0.0.0/8' protocol=''></rule>
    <rule action='deny' type='layer 3' dst-addr='172.16.0.0/12' protocol=''></rule>
    <rule action='deny' type='layer 3' dst-addr='192.168.0.0/16' protocol=''></rule>
    <rule action='accept' type='layer 3' protocol='1'></rule>
    <rule action='accept' type='layer 3' protocol='' dst-port='0'></rule>
  </guestservice>
</ajax-request>
```

### Key Differences from Creation

| Parameter | Create | Update |
|-----------|--------|--------|
| `action` | `addobj` | **`updobj`** |
| `id` | Not present | **Required: `id='{guest_service_id}'`** |
| All others | Same | Same |

### Response (Success)

```xml
<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE ajax-response>
<ajax-response>
  <response type="object" id="guestservice-list.{timestamp}.{random}" />
</ajax-response>
```

**Note**: Empty response object (`/>` self-closing tag) indicates **SUCCESS**.

## Step 2: Update WLAN

### Endpoint

```
POST /admin/_conf.jsp
```

### Headers

Same as Step 1.

### XML Payload Structure

```xml
<ajax-request action='updobj' updater='wlansvc-list.{timestamp}.{random}' comp='wlansvc-list'>
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
    id='{wlan_id}'
    guest-auth='guestpass'
    self-service='false'
    self-service-sponsor-approval='undefined'
    self-service-notification='undefined'
    guestservice-id='{guest_service_id}'>

    <!-- Same sub-elements as creation -->
    <queue-priority voice='0' video='2' data='4' background='6'/>
    <qos uplink-preset='DISABLE' downlink-preset='DISABLE' perssid-uplink-preset='0' perssid-downlink-preset='0'/>
    <rrm neighbor-report='enabled'/>
    <smartcast mcast-filter='disabled'/>
    <wlan-schedule value='0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0'/>
    <avp-policy avp-enabled='disabled' avpdeny-id='0'/>
    <urlfiltering-policy urlfiltering-enabled='disabled' urlfiltering-id='0'/>
    <wificalling-policy wificalling-enabled='disabled' profile-id='0'/>
  </wlansvc>
</ajax-request>
```

### Key Differences from Creation

| Parameter | Create | Update |
|-----------|--------|--------|
| `action` | `addobj` | **`updobj`** |
| `id` | Not present | **Required: `id='{wlan_id}'`** |
| All others | Same | Same |

### Response (Success)

```xml
<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE ajax-response>
<ajax-response>
  <response type="object" id="wlansvc-list.{timestamp}.{random}" />
</ajax-response>
```

**Note**: Empty response object (`/>` self-closing tag) indicates **SUCCESS**.

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
  <sysinfo/><identity/><!-- ... -->
</ajax-request>`;

await client.post('/admin/_cmdstat.jsp', xmlPayload, {
  headers: { 'X-CSRF-Token': csrfToken }
});
```

### 3. (Optional) Get WLAN Stats

```javascript
const statsPayload = `<ajax-request action='getstat' updater='stamgr.${Date.now()}.${Math.random()}' comp='stamgr'>
  <client wlan='${wlanName}' LEVEL='1' USE_REGEX='false'/>
</ajax-request>`;

await client.post('/admin/_cmdstat.jsp', statsPayload, {
  headers: { 'X-CSRF-Token': csrfToken }
});
```

### 4. Update Guest Service

```javascript
const guestServicePayload = `<ajax-request action='updobj' updater='guestservice-list.${Date.now()}.${Math.random()}' comp='guestservice-list'>
  <guestservice name='Updated Name' ... id='${guestServiceId}' valid='7' onboarding='true' show-tou='true' ...>
    <!-- firewall rules -->
  </guestservice>
</ajax-request>`;

const guestServiceResponse = await client.post('/admin/_conf.jsp', guestServicePayload, {
  headers: { 'X-CSRF-Token': csrfToken }
});

// Empty response (<response .../>) means success
const success = guestServiceResponse.data.includes('/>') &&
                !guestServiceResponse.data.includes('<error');
```

### 5. Update WLAN

```javascript
const wlanPayload = `<ajax-request action='updobj' updater='wlansvc-list.${Date.now()}.${Math.random()}' comp='wlansvc-list'>
  <wlansvc name='Updated Name' ssid='Updated SSID' ... id='${wlanId}' guestservice-id='${guestServiceId}' ...>
    <!-- QoS, RRM, etc. -->
  </wlansvc>
</ajax-request>`;

const wlanResponse = await client.post('/admin/_conf.jsp', wlanPayload, {
  headers: { 'X-CSRF-Token': csrfToken }
});

// Empty response means success
const success = wlanResponse.data.includes('/>') &&
                !wlanResponse.data.includes('<error');
```

### 6. Verify Update

```javascript
const verifyPayload = `<ajax-request action='getconf' DECRYPT_X='true' caller='unleashed_web' updater='wlansvc-list.${Date.now()}.${Math.random()}' comp='wlansvc-list'/>`;

const verifyResponse = await client.post('/admin/_conf.jsp', verifyPayload, {
  headers: { 'X-CSRF-Token': csrfToken }
});

// Check if updated name appears
const verified = verifyResponse.data.includes(`name="${updatedName}"`);
```

## Test Script

A complete working test script is available at:

```
scripts/ruckus-api-discovery/test-guest-wlan-update.js
```

**Run with:**

```bash
node scripts/ruckus-api-discovery/test-guest-wlan-update.js
```

**Test Results:**

```
🧪 RUCKUS R710 - GUEST WLAN UPDATE TEST
================================================================================
✅ Login successful!
🔐 CSRF Token received: fwnUQpnhmQ

📡 Initializing session (system status call)...
✅ Session initialized successfully

🎯 Updating WLAN ID 5
   Current Name: "Test-WLAN-2025-12-25T06-48-54"
   New Name: "Test-WLAN-2025-12-25T06-48-54-UPDATED"

🔧 Updating Guest Service ID 1...
✅ Guest Service ID 1 updated successfully

🔧 Updating WLAN ID 5...
✅ WLAN ID 5 updated successfully

🔍 Verifying WLAN ID 5 update...
✅ WLAN ID 5 confirmed in WLAN list
   ✅ WLAN name confirmed: "Test-WLAN-2025-12-25T06-48-54-UPDATED"

📊 TEST SUMMARY
================================================================================
WLAN ID:            5
Guest Service ID:   1
Original Name:      Test-WLAN-2025-12-25T06-48-54
Updated Name:       Test-WLAN-2025-12-25T06-48-54-UPDATED
Guest Service:      ✅ Updated
WLAN:               ✅ Updated
Verified:           ✅ Yes
────────────────────────────────────────────────────────────────────────────────
🎉 SUCCESS! Guest WLAN updated and verified.
```

## Response Format

### Success Response

Both Guest Service and WLAN updates return an empty response object on success:

```xml
<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE ajax-response>
<ajax-response>
  <response type="object" id="..." />
</ajax-response>
```

**Characteristics**:
- Self-closing tag (`/>`)
- No error element
- No content inside response element

### Error Response

```xml
<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE ajax-response>
<ajax-response>
  <error code="..." message="..."/>
</ajax-response>
```

## Common Update Scenarios

### Change WLAN Name/SSID

```xml
<wlansvc name='New Name' ssid='New SSID' ... id='5' ...>
```

### Change Token Validity Period

```xml
<guestservice valid='30' ... id='1' ...>
```
Changes from 7 days to 30 days.

### Change Grace Period

```xml
<wlansvc grace-period-sets='1440' ... id='5' ...>
```
Changes from 480 minutes (8 hours) to 1440 minutes (24 hours).

### Enable/Disable Terms of Use

```xml
<guestservice show-tou='false' ... id='1' ...>
```

### Change Authentication Method

```xml
<guestservice auth-by='social' ... id='1' ...>
```

## Important Notes

1. **ID is REQUIRED**: Both `guestservice` and `wlansvc` MUST include the `id` attribute
2. **Action is 'updobj'**: Use `updobj` instead of `addobj`
3. **Empty Response = Success**: Self-closing `<response ... />` means success
4. **All Parameters Required**: Include all parameters, even if not changing them
5. **Update Both**: If changing the name, update both Guest Service AND WLAN
6. **Critical Parameters**: Always include `onboarding='true'`, `valid='7'`, `show-tou='true'`
7. **Firewall Rules**: Must include all firewall rules even when updating

## Comparison: Create vs Update

### Similarities
- Same endpoint: `/admin/_conf.jsp`
- Same component: `guestservice-list`, `wlansvc-list`
- Same parameters (except `id`)
- Same headers
- Same firewall rules

### Differences
| Feature | Create | Update |
|---------|--------|--------|
| Action | `addobj` | `updobj` |
| ID attribute | ❌ Not included | ✅ **Required** |
| Response | Returns new ID | Empty object |
| Use case | New WLAN | Modify existing |

## Error Handling

### Common Errors

1. **Missing ID**: `updobj` without `id` attribute will fail
2. **Invalid ID**: Non-existent Guest Service/WLAN ID
3. **CSRF Token**: Missing or expired token
4. **Session**: Not initialized

### Validation

```javascript
function validateUpdateResponse(responseData) {
  // Check for error element
  if (responseData.includes('<error')) {
    return { success: false, error: 'API returned error' };
  }

  // Check for empty response (success)
  if (responseData.includes('<response') && responseData.includes('/>')) {
    return { success: true };
  }

  return { success: false, error: 'Unknown response format' };
}
```

## Next Steps

1. **Implement Delete WLAN** - Discover the delete action
2. **Implement Enable/Disable WLAN** - Toggle WLAN status
3. **Generate QR Codes** - Create QR codes for guest access
4. **Bulk Updates** - Update multiple WLANs at once

## Related Documentation

- [WLAN Creation API](./ruckus-wlan-creation-api.md)
- [WLAN Read API](./ruckus-wlan-api-working.md)
- [Guest Pass Token Creation](./ruckus-guest-pass-api.md)
- [Login Authentication Flow](./ruckus-login-flow.md)
- [Project Plan](../ai-contexts/project-plans/active/projectplan-MBM-119-ruckus-r710-integration-2025-12-24.md)

---

**Document Version:** 1.0
**API Version:** Ruckus Unleashed 200.15.6.12 build 304
**Test Status:** ✅ Verified Working on 2025-12-25
**Updated WLAN:** Test-WLAN-2025-12-25T06-48-54 → Test-WLAN-2025-12-25T06-48-54-UPDATED
