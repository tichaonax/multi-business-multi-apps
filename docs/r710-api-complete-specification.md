# Ruckus R710 Unleashed API - Complete Specification

**Date:** 2025-12-28
**Status:** ✅ VERIFIED - Tested and Working
**Author:** Documented from working test scripts and production implementation

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Authentication](#authentication)
3. [Session Management](#session-management)
4. [WLAN Operations](#wlan-operations)
5. [Guest Service Operations](#guest-service-operations)
6. [Verification Workflows](#verification-workflows)
7. [Critical Patterns](#critical-patterns)
8. [Common Pitfalls](#common-pitfalls)

---

## Architecture Overview

### Two-Component System

The R710 API manages guest WiFi through **TWO separate but interconnected components**:

1. **Guest Service** (Portal Configuration)
   - Controls the captive portal appearance
   - Manages: `title`, `validDays`, `logoType`
   - Portal branding and terms of service
   - Guest pass configuration

2. **WLAN** (Network Configuration)
   - Controls the wireless network settings
   - Manages: `ssid`, `enableFriendlyKey`, network security
   - VLAN assignment and client limits
   - References the Guest Service by ID

**CRITICAL UNDERSTANDING:**
- Guest Service = "What users see on the portal"
- WLAN = "The WiFi network itself"
- **BOTH must be updated together** for changes to take effect!

---

## Authentication

### Login Flow

**Endpoint:** `/admin/index.jsp`
**Method:** POST
**Content-Type:** `application/x-www-form-urlencoded`

**Payload:**
```
username={username}&password={password}&ok=Log+In
```

**Response:** HTTP 302 Redirect with two critical cookies:
- `-ejs-session-` - Session identifier
- `http_x_csrf_token` - CSRF protection token

**Implementation:**
```typescript
const response = await axios.post('/admin/index.jsp', formData, {
  maxRedirects: 0,
  validateStatus: (status) => status === 302
});

const cookies = response.headers['set-cookie'];
const sessionCookie = cookies.find(c => c.includes('-ejs-session-'));
const csrfCookie = cookies.find(c => c.includes('http_x_csrf_token'));
```

---

## Session Management

### Session Initialization

**CRITICAL:** After login, you **MUST** call the session initialization endpoint before any configuration queries!

**Endpoint:** `/admin/_cmdstat.jsp`
**Method:** POST
**Action:** `getstat`
**Component:** `system`

**Payload:**
```xml
<ajax-request action='getstat' updater='system.{timestamp}.{random}' comp='system'>
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
  <dfs/>
  <country-code/>
  <tz/>
  <ntp/>
  <client-dns-server/>
  <dhcpsvr-list/>
  <dosdefense/>
  <rogue/>
  <l2acl-default/>
  <l3acl-default/>
  <mesh/>
  <tunnelprofile-list/>
  <wlangroup-list/>
  <wlansvc-list/>
  <adv-wlan/>
  <appmesh/>
  <policy-list/>
  <role-based-access-control/>
  <precedence-default/>
  <client-mac-oui/>
  <adv-client-isolation/>
  <guestpass/>
  <wispr/>
  <hotspot-list/>
  <dpsk/>
  <ruckusplus-service/>
  <avp-list/>
  <urlfiltering-policy-list/>
  <clientFWLog/>
  <clientAAALog/>
  <clientApLog/>
</ajax-request>
```

**Headers:**
```javascript
{
  'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
  'Accept': '*/*',
  'X-CSRF-Token': csrfToken,
  'X-Requested-With': 'XMLHttpRequest',
  'Referer': 'https://{ipAddress}/admin/dashboard.jsp'
}
```

**Why Required:**
- Initializes server-side session state
- Loads all component configurations into memory
- Without this, configuration queries will fail or return empty results

---

## WLAN Operations

### Create WLAN

**Endpoint:** `/admin/_conf.jsp`
**Method:** POST
**Action:** `addobj`
**Component:** `wlansvc-list`

**Complete XML Payload:**
```xml
<ajax-request action='addobj' updater='wlansvc-list.{timestamp}.{random}' comp='wlansvc-list'>
  <wlansvc
    name='{ssid}'
    ssid='{ssid}'
    description='{ssid}'
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
    vlan-id='{vlanId}'
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
    enable-friendly-key='{enableFriendlyKey}'
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
    guestservice-id='{guestServiceId}'>
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

**Success Response:**
```xml
<response type="object" id="{wlanId}" />
```

**CRITICAL NOTES:**
- The WLAN ID is the **SSID itself**, not a numeric ID
- All nested elements (`<queue-priority>`, `<qos>`, etc.) are **REQUIRED**
- Missing any nested element will cause silent failure

### Update WLAN

**Endpoint:** `/admin/_conf.jsp`
**Method:** POST
**Action:** `updobj`
**Component:** `wlansvc-list`

**XML Payload:**
```xml
<ajax-request action='updobj' updater='wlansvc-list.{timestamp}.{random}' comp='wlansvc-list'>
  <wlansvc
    id='{wlanId}'
    name='{newSsid}'
    ssid='{newSsid}'
    [... same attributes as create ...]>
    [... same nested elements as create ...]
  </wlansvc>
</ajax-request>
```

**CRITICAL DIFFERENCES FROM CREATE:**
- Action is `updobj` instead of `addobj`
- **MUST include `id='{wlanId}'` attribute** to specify which WLAN to update
- The `id` value is the **current SSID** (before update)
- All other attributes and nested elements are identical to create

**Success Response:**
```xml
<response type="object" id="{wlanId}" />
```

### Delete WLAN

**Endpoint:** `/admin/_conf.jsp`
**Method:** POST
**Action:** `delobj`
**Component:** `wlansvc-list`

**XML Payload:**
```xml
<ajax-request action='delobj' updater='wlansvc-list.{timestamp}.{random}' comp='wlansvc-list'>
  <wlansvc id='{wlanId}'/>
</ajax-request>
```

**Success Response:**
```xml
<response type="object" id="{wlanId}" />
```

### Query WLANs

**Endpoint:** `/admin/_conf.jsp`
**Method:** POST
**Action:** `getconf`
**Component:** `wlansvc-list`

**XML Payload:**
```xml
<ajax-request action='getconf' DECRYPT_X='true' caller='unleashed_web' updater='wlansvc-list.{timestamp}.{random}' comp='wlansvc-list'/>
```

**Response:** XML with all WLANs:
```xml
<ajax-response>
  <wlansvc-list>
    <wlansvc name="SSID1" ssid="SSID1" id="SSID1" ... />
    <wlansvc name="SSID2" ssid="SSID2" id="SSID2" ... />
  </wlansvc-list>
</ajax-response>
```

**Parsing Pattern:**
```javascript
const wlanPattern = /<wlansvc [^>]+>/g;
const matches = responseText.match(wlanPattern);
```

---

## Guest Service Operations

### Create Guest Service

**Endpoint:** `/admin/_conf.jsp`
**Method:** POST
**Action:** `addobj`
**Component:** `guestservice-list`

**Complete XML Payload:**
```xml
<ajax-request action='addobj' updater='guestservice-list.{timestamp}.{random}' comp='guestservice-list'>
  <guestservice
    name='{serviceName}'
    onboarding='true'
    onboarding-aspect='both'
    auth-by='guestpass'
    countdown-by-issued='false'
    show-tou='true'
    tou='Terms of Use

By accepting this agreement and accessing the wireless network, you acknowledge that you are of legal age, you have read and understood, and agree to be bound by this agreement.
(*) The wireless network service is provided by the property owners and is completely at their discretion. Your access to the network may be blocked, suspended, or terminated at any time for any reason.
(*) You agree not to use the wireless network for any purpose that is unlawful or otherwise prohibited and you are fully responsible for your use.
(*) The wireless network is provided &quot;as is&quot; without warranties of any kind, either expressed or implied.'
    redirect='orig'
    redirect-url=''
    company-logo='ruckus'
    poweredby='Ruckus Wireless'
    poweredby-url='http://www.ruckuswireless.com/'
    desc='Type or paste in the text of your guest pass.'
    self-service='false'
    rule6=''
    title='{title}'
    opacity='1.0'
    background-opacity='1'
    background-color='#516a8c'
    logo-type='{logoType}'
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
    valid='{validDays}'
    old-self-service='false'
    old-auth-by='guestpass'>
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

**Success Response:**
```xml
<response type="object" id="{guestServiceId}" />
```

### Update Guest Service

**Endpoint:** `/admin/_conf.jsp`
**Method:** POST
**Action:** `updobj`
**Component:** `guestservice-list`

**XML Payload:**
```xml
<ajax-request action='updobj' updater='guestservice-list.{timestamp}.{random}' comp='guestservice-list'>
  <guestservice
    id='{guestServiceId}'
    name='{serviceName}'
    [... same attributes as create ...]>
    [... same rule elements as create ...]
  </guestservice>
</ajax-request>
```

**CRITICAL:** Must include `id='{guestServiceId}'` attribute

---

## Verification Workflows

### Verify WLAN Update

**CRITICAL STEP:** After updating a WLAN, you **MUST** query the device to confirm the change was applied!

**Why Necessary:**
- Update API returns success even if change didn't apply
- Device may reject changes silently
- Database should only be updated if device confirms the change

**Verification Query:**

**Endpoint:** `/admin/_conf.jsp`
**Method:** POST
**Action:** `getconf`

**XML Payload:**
```xml
<ajax-request action='getconf' DECRYPT_X='true' caller='unleashed_web' updater='wlansvc-list.{timestamp}.{random}' comp='wlansvc-list'/>
```

**Verification Logic:**
```typescript
const responseText = response.data;

// Check if WLAN ID exists
if (responseText.includes(`id="${wlanId}"`)) {
  // Check if name was updated
  if (responseText.includes(`name="${expectedNewName}"`)) {
    // ✅ Update confirmed
    return { verified: true };
  } else {
    // ❌ WLAN exists but name didn't change
    return { verified: false, error: 'Name mismatch' };
  }
} else {
  // ❌ WLAN not found on device
  return { verified: false, error: 'WLAN not found' };
}
```

---

## Critical Patterns

### Complete Update Workflow (3 Steps)

**IMPORTANT:** Updating a WLAN requires **THREE sequential steps**:

```typescript
async function updateWlan(wlanId: string, newConfig: WlanConfig) {
  // Step 1: Update Guest Service (Portal Configuration)
  const guestServiceResult = await updateGuestService(guestServiceId, {
    serviceName: newConfig.ssid,
    title: newConfig.title,
    validDays: newConfig.validDays,
    logoType: newConfig.logoType
  });

  if (!guestServiceResult.success) {
    throw new Error('Guest Service update failed');
  }

  // Step 2: Update WLAN (Network Configuration)
  const wlanResult = await updateWlan(wlanId, {
    ssid: newConfig.ssid,
    enableFriendlyKey: newConfig.enableFriendlyKey,
    guestServiceId: guestServiceId,
    // ... all other attributes
  });

  if (!wlanResult.success) {
    throw new Error('WLAN update failed');
  }

  // Step 3: Verify update by querying device
  const verificationResult = await verifyWlanUpdate(wlanId, newConfig.ssid);

  if (!verificationResult.verified) {
    throw new Error('Update verification failed - change not confirmed on device');
  }

  // ✅ All steps succeeded - now safe to update database
  await database.updateWlan(wlanId, newConfig);
}
```

**Why All Three Steps?**
1. Guest Service controls portal appearance (title, validDays, logoType)
2. WLAN controls network settings (ssid, enableFriendlyKey)
3. Verification confirms device actually applied the changes

**Failure Without All Three:**
- Skip Step 1: Portal shows old title/settings even though network renamed
- Skip Step 2: Network doesn't change (the actual issue we fixed)
- Skip Step 3: Database updated but device silently rejected change

### Updater ID Generation

**Format:** `{component}.{timestamp}.{random}`

**Implementation:**
```typescript
function generateUpdaterId(component: string): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${component}.${timestamp}.${random}`;
}
```

**Examples:**
- `wlansvc-list.1735385234567.7891`
- `guestservice-list.1735385234678.3421`
- `system.1735385234789.9012`

**Purpose:**
- Tracks which request is being processed
- Prevents cache conflicts
- Links response to specific request

### Device-as-Source-of-Truth Pattern

**CRITICAL ARCHITECTURAL PRINCIPLE:**

```
Device API Call → Verification → Database Update
     ↓              ↓                  ↓
   Primary      Confirmation      Secondary
```

**Implementation:**
```typescript
// ❌ WRONG: Update database first
await database.update();
await device.update(); // Might fail, database now inconsistent

// ✅ CORRECT: Update device first, verify, then update database
await device.update();
const verified = await device.verify();
if (verified) {
  await database.update(); // Only if device confirmed
}
```

**Why This Matters:**
- R710 device is the authoritative source
- Database is a cache/index for faster queries
- Device can reject changes that appear to succeed
- Verification is the only way to know truth

---

## Common Pitfalls

### 1. ❌ Missing Session Initialization

**Problem:**
```typescript
await login();
await queryWlans(); // ❌ Returns empty or fails
```

**Solution:**
```typescript
await login();
await initializeSession(); // ✅ Required step
await queryWlans(); // Now works
```

### 2. ❌ Updating Only WLAN (Not Guest Service)

**Problem:**
```typescript
await updateWlan(wlanId, { ssid: newName }); // ❌ Incomplete
// Device shows new SSID but portal still has old title
```

**Solution:**
```typescript
await updateGuestService(guestServiceId, {
  serviceName: newName,
  title: newTitle
}); // ✅ Step 1

await updateWlan(wlanId, { ssid: newName }); // ✅ Step 2
await verifyWlanUpdate(wlanId, newName); // ✅ Step 3
```

### 3. ❌ No Verification After Update

**Problem:**
```typescript
const result = await updateWlan(wlanId, config);
if (result.success) {
  await database.update(); // ❌ Trusting API response
}
// Device might have silently rejected the change!
```

**Solution:**
```typescript
const result = await updateWlan(wlanId, config);
if (result.success) {
  const verified = await verifyWlanUpdate(wlanId, config.ssid);
  if (verified) {
    await database.update(); // ✅ Only after device confirms
  }
}
```

### 4. ❌ Missing Nested Elements in XML

**Problem:**
```typescript
const xml = `<wlansvc name='Test' ssid='Test' .../>`; // ❌ No nested elements
// Silent failure - WLAN not created
```

**Solution:**
```typescript
const xml = `<wlansvc name='Test' ssid='Test' ...>
  <queue-priority voice='0' video='2' data='4' background='6'/>
  <qos uplink-preset='DISABLE' ... />
  <rrm neighbor-report='enabled'/>
  <smartcast mcast-filter='disabled'/>
  <wlan-schedule value='0x0:...'/>
  <avp-policy avp-enabled='disabled' ... />
  <urlfiltering-policy urlfiltering-enabled='disabled' ... />
  <wificalling-policy wificalling-enabled='disabled' ... />
</wlansvc>`; // ✅ All required nested elements
```

### 5. ❌ Using Numeric IDs for WLANs

**Problem:**
```typescript
const wlanId = 1; // ❌ Numeric ID
await updateWlan(wlanId, config); // Fails - WLAN not found
```

**Solution:**
```typescript
const wlanId = "Guest WiFi Network"; // ✅ SSID is the ID
await updateWlan(wlanId, config); // Works
```

### 6. ❌ Missing `id` Attribute in Update

**Problem:**
```typescript
const xml = `<ajax-request action='updobj' ...>
  <wlansvc name='New Name' ssid='New Name' .../>
</ajax-request>`; // ❌ No id attribute - creates new WLAN instead of updating!
```

**Solution:**
```typescript
const xml = `<ajax-request action='updobj' ...>
  <wlansvc id='Old Name' name='New Name' ssid='New Name' .../>
</ajax-request>`; // ✅ id attribute specifies which WLAN to update
```

### 7. ❌ Database-First Updates

**Problem:**
```typescript
// ❌ Anti-pattern: "Fake Updates"
await database.update(wlanId, newConfig); // Database updated
return { success: true }; // User sees success
// Device never touched - out of sync!
```

**Solution:**
```typescript
// ✅ Device-first pattern
await device.updateGuestService(...);
await device.updateWlan(...);
await device.verify(...);
await database.update(...); // Only after device confirms
```

---

## Summary Checklist

### For WLAN Creation:
- [ ] Login and get CSRF token
- [ ] Initialize session (call system getstat)
- [ ] Create Guest Service (get back guestServiceId)
- [ ] Create WLAN (reference guestServiceId)
- [ ] Include all required nested XML elements
- [ ] Query device to verify WLAN was created
- [ ] Only then create database record

### For WLAN Update:
- [ ] Login and get CSRF token
- [ ] Initialize session
- [ ] **Step 1:** Update Guest Service (serviceName, title, validDays, logoType)
- [ ] **Step 2:** Update WLAN (ssid, enableFriendlyKey, all attributes)
- [ ] **Step 3:** Verify update by querying device
- [ ] Only update database after all 3 steps succeed

### For WLAN Deletion:
- [ ] Login and get CSRF token
- [ ] Initialize session
- [ ] Delete WLAN from device
- [ ] Verify WLAN no longer in device query
- [ ] Only then delete from database

---

## Implementation References

**Test Scripts (Proven Working):**
- `scripts/ruckus-api-discovery/test-guest-wlan-creation.js` - Complete creation workflow
- `scripts/ruckus-api-discovery/test-guest-wlan-update.js` - Complete update workflow with verification
- `scripts/ruckus-api-discovery/test-guest-service-update.js` - Guest Service updates

**Production Code:**
- `src/services/ruckus-r710-api.ts` - R710 API service implementation
- `src/app/api/r710/wlans/[id]/route.ts` - Update endpoint with 3-step workflow
- `src/app/api/r710/integration/route.ts` - Creation workflow

---

## Version History

- **2025-12-28:** Initial documentation based on working implementation
- **Critical Finding:** Three-step update workflow (Guest Service → WLAN → Verification)
- **Critical Finding:** Device verification is mandatory, not optional
- **Critical Finding:** Two-component architecture (Guest Service + WLAN must both be updated)

---

**This specification is verified and production-ready. Follow these patterns exactly to avoid the common pitfalls documented above.**
