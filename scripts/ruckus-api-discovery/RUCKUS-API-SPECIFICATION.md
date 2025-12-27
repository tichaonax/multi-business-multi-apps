# Ruckus R710 Unleashed - Complete API Specification

**Firmware Version:** 200.15.6.12 build 304
**Device Model:** Ruckus R710
**API Type:** XML-based AJAX over HTTPS
**Authentication:** Session-based with CSRF tokens

---

## Table of Contents

1. [Authentication](#authentication)
2. [Session Initialization](#session-initialization)
3. [Guest Service Management](#guest-service-management)
4. [WLAN Management](#wlan-management)
5. [Guest Pass Token Generation](#guest-pass-token-generation)
6. [Query Guest Pass Tokens](#query-guest-pass-tokens)
7. [Statistics & Monitoring](#statistics--monitoring)
8. [MAC Access Control (ACL)](#mac-access-control-acl)
9. [Complete Workflows](#complete-workflows)

---

## Authentication

### Login

**Endpoint:** `POST /admin/login.jsp`

**Request:**
```
POST /admin/login.jsp HTTP/1.1
Host: 192.168.0.108
Content-Type: application/x-www-form-urlencoded

username={admin_username}&password={admin_password}
```

**Response:**
```
HTTP/1.1 302 Moved Temporarily
Location: https://192.168.0.108/admin/dashboard.jsp
HTTP_X_CSRF_TOKEN: {csrf_token}
Set-Cookie: -ejs-session-={session_id}; path=/; httponly; secure
```

**Important:**
- Extract CSRF token from `HTTP_X_CSRF_TOKEN` header
- Store session cookie for all subsequent requests
- Include CSRF token in `X-CSRF-Token` header for all API calls

---

## Session Initialization

### Initialize Session

**CRITICAL:** Must be called after login and before any configuration queries.

**Endpoint:** `POST /admin/_cmdstat.jsp`

**Request:**
```xml
<ajax-request action='getstat' updater='system.{timestamp}.{random}' comp='system'>
  <sysinfo/>
  <identity/>
</ajax-request>
```

**Headers:**
```
Content-Type: application/x-www-form-urlencoded; charset=UTF-8
X-CSRF-Token: {csrf_token}
Referer: https://192.168.0.108/admin/dashboard.jsp
```

**Response:**
```xml
<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE ajax-response>
<ajax-response>
  <response type="object" id="system.{timestamp}.{random}">
    <response>
      <sysinfo uptime="..." version="200.15.6.12 build 304" .../>
      <identity name="Ruckus-Unleashed" />
    </response>
  </response>
</ajax-response>
```

---

## Guest Service Management

### Create Guest Service (Captive Portal Configuration)

**Endpoint:** `POST /admin/_conf.jsp`

**Request:**
```xml
<ajax-request action='addobj' updater='guestservice-list.{timestamp}.{random}' comp='guestservice-list'>
  <guestservice
    name='{service_name}'
    onboarding='true'
    onboarding-aspect='both'
    auth-by='guestpass'
    countdown-by-issued='false'
    show-tou='true'
    tou='Terms of Use&#x0A;&#x0A;By accepting this agreement...'
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

    <!-- Firewall Rules -->
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

**Response:**
```xml
<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE ajax-response>
<ajax-response>
  <response type="object" id="guestservice-list.{timestamp}.{random}">
    <guestservice ... id="{guest_service_id}" .../>
  </response>
</ajax-response>
```

**Extract:** Guest Service ID from response `id` attribute.

**Key Parameters:**
- `valid`: Token validity in days (default: `'1'`)
- `tou`: Terms of Use text (HTML encoded with `&#x0A;` for newlines)
- `title`: Captive portal title
- `desc`: Description text shown to users

---

## WLAN Management

### 1. Create WLAN

**Endpoint:** `POST /admin/_conf.jsp`

**Request:**
```xml
<ajax-request action='addobj' updater='wlansvc-list.{timestamp}.{random}' comp='wlansvc-list'>
  <wlansvc
    name='{wlan_name}'
    ssid='{wlan_name}'
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
    enable-friendly-key='false'
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

**Response:**
```xml
<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE ajax-response>
<ajax-response>
  <response type="object" id="wlansvc-list.{timestamp}.{random}">
    <wlansvc ... id="{wlan_id}" .../>
  </response>
</ajax-response>
```

**CRITICAL Parameter:**
- `enable-friendly-key='false'` → Generates **TEXT-based tokens** (XXXXX-XXXXX format) ✅ **RECOMMENDED**
- `enable-friendly-key='true'` → Generates **DIGIT-based tokens** (123456 format) ❌

**Extract:** WLAN ID from response `id` attribute.

---

### 2. Update WLAN

**Endpoint:** `POST /admin/_conf.jsp`

**Request:**
```xml
<ajax-request action='updobj' updater='wlansvc-list.{timestamp}.{random}' comp='wlansvc-list'>
  <wlansvc
    name='{wlan_name}'
    ssid='{wlan_name}'
    description='{updated_description}'
    usage='guest'
    is-guest='true'
    authentication='open'
    encryption='none'
    ... (all other parameters from Create WLAN) ...
    id='{wlan_id}'
    guestservice-id='{guest_service_id}'>

    <!-- Sub-elements same as Create WLAN -->
  </wlansvc>
</ajax-request>
```

**Important:**
- Use action `'updobj'` instead of `'addobj'`
- **MUST** include `id='{wlan_id}'` attribute
- Include ALL parameters from create (full configuration)

---

### 3. Disable WLAN

**Endpoint:** `POST /admin/_conf.jsp`

**Request:**
```xml
<ajax-request action='updobj' updater='wlansvc-list.{timestamp}.{random}' comp='wlansvc-list'>
  <wlansvc id='{wlan_id}' enable-type='1' IS_PARTIAL='true'/>
</ajax-request>
```

**Parameters:**
- `enable-type='1'` → Disabled
- `IS_PARTIAL='true'` → Partial update (only specified fields)

---

### 4. Enable WLAN

**Step 1:** Select WLAN (get client status)

**Endpoint:** `POST /admin/_cmdstat.jsp`

**Request:**
```xml
<ajax-request action='getstat' updater='stamgr.{timestamp}.{random}' comp='stamgr'>
  <client wlan='{wlan_name}' LEVEL='1' USE_REGEX='false'/>
</ajax-request>
```

**Step 2:** Enable WLAN

**Endpoint:** `POST /admin/_conf.jsp`

**Request:**
```xml
<ajax-request action='updobj' updater='wlansvc-list.{timestamp}.{random}' comp='wlansvc-list'>
  <wlansvc id='{wlan_id}' enable-type='0' IS_PARTIAL='true'/>
</ajax-request>
```

**Parameters:**
- `enable-type='0'` → Enabled

---

### 5. Delete WLAN

**Step 1:** Select WLAN (get client status) - Same as Enable WLAN Step 1

**Step 2:** Delete WLAN

**Endpoint:** `POST /admin/_conf.jsp`

**Request:**
```xml
<ajax-request action='delobj' updater='wlansvc-list.{timestamp}.{random}' comp='wlansvc-list'>
  <wlansvc id='{wlan_id}'></wlansvc>
</ajax-request>
```

**Response:**
```xml
<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE ajax-response>
<ajax-response>
  <response type="object" id="wlansvc-list.{timestamp}.{random}" />
</ajax-response>
```

---

### 6. List All WLANs

**Endpoint:** `POST /admin/_conf.jsp`

**Request:**
```xml
<ajax-request action='getconf' DECRYPT_X='true' caller='unleashed_web' updater='wlansvc-list.{timestamp}.{random}' comp='wlansvc-list'/>
```

**Response:**
```xml
<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE ajax-response>
<ajax-response>
  <response type="object" id="wlansvc-list.{timestamp}.{random}">
    <wlansvc-list>
      <wlansvc name="WLAN1" id="1" enable-friendly-key="false" .../>
      <wlansvc name="WLAN2" id="2" enable-friendly-key="true" .../>
      ...
    </wlansvc-list>
  </response>
</ajax-response>
```

---

## Guest Pass Token Generation

### Step 1: Get Session Key

**Endpoint:** `POST /admin/mon_guestdata.jsp`

**Request:**
```
POST /admin/mon_guestdata.jsp HTTP/1.1
Content-Type: application/x-www-form-urlencoded; charset=UTF-8
Accept: text/javascript, text/html, application/xml, text/xml, */*
X-CSRF-Token: {csrf_token}
X-Requested-With: XMLHttpRequest

(empty body)
```

**Response:**
```json
{
  "wlanName": "WLAN1,WLAN2,WLAN3",
  "key": "ABCDE-FGHIJ"
}
```

**Note:** The session key format depends on WLAN configuration:
- If WLAN has `enable-friendly-key='false'` → Text-based key (e.g., `ABCDE-FGHIJ`)
- If WLAN has `enable-friendly-key='true'` → Digit-based key (e.g., `123456`)

---

### Step 2: Create Guest Pass Tokens

**Endpoint:** `POST /admin/mon_createguest.jsp`

**Request (Form Data):**
```
POST /admin/mon_createguest.jsp HTTP/1.1
Content-Type: application/x-www-form-urlencoded; charset=UTF-8
Accept: text/javascript, text/html, application/xml, text/xml, */*
X-CSRF-Token: {csrf_token}
X-Requested-With: XMLHttpRequest

gentype=multiple&
duration=2&
duration-unit=hour_Hours&
key={session_key}&
createToNum=2&
guest-wlan={wlan_name}&
shared=true&
reauth=false&
limitnumber=2&
device=2&
enableLimit=on&
createBy=guestpass&
self-service=off
```

**Response:**
```javascript
batchEmailData.push('Guest-31|HAUUZ-HELUI|');
batchSMSData.push('Guest-31|HAUUZ-HELUI|');
batchEmailData.push('Guest-27|HBKIC-VTBUJ|');
batchSMSData.push('Guest-27|HBKIC-VTBUJ|');

{"result":"OK",
 "errorMsg":"~~",
 "key":"ABCDE-FGHIJ",
 "fullname":"null",
 "expiretime":"1766745694",
 "wlan":"TXH-Guest",
 "emailaddr":"null",
 "phonenumber":"null",
 "newnum":"null",
 "totalnum":"null",
 "duration":"2",
 "duration_unit":"hours",
 "ids":"31:27"}
```

**Parse Tokens:**
```javascript
const tokenRegex = /batchEmailData\.push\('([^|]+)\|([^|]+)\|'\);/g;
const tokens = [];
let match;
while ((match = tokenRegex.exec(responseText)) !== null) {
  tokens.push({
    username: match[1],  // e.g., "Guest-31"
    password: match[2]   // e.g., "HAUUZ-HELUI"
  });
}
```

**Duration Units:**
- `hour_Hours` - Hours
- `day_Days` - Days
- `week_Weeks` - Weeks

**Token Format (with enable-friendly-key='false'):**
- Username: `Guest-{number}`
- Password: `XXXXX-XXXXX` (5 uppercase letters, dash, 5 uppercase letters)

---

## Query Guest Pass Tokens

### Query All Guest Tokens

Retrieve all guest pass tokens with full metadata including status, usage, and connected devices.

**Endpoint:** `POST /admin/_conf.jsp`

**Request:**
```xml
<ajax-request action='getconf' DECRYPT_X='true' updater='guest-list.{timestamp}.{random}' comp='guest-list'>
  <guest self-service='!true'/>
</ajax-request>
```

**Headers:**
```
Content-Type: application/x-www-form-urlencoded; charset=UTF-8
Accept: */*
X-CSRF-Token: {csrf_token}
X-Requested-With: XMLHttpRequest
Referer: https://192.168.0.108/admin/dashboard.jsp
```

**Response:**
```xml
<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE ajax-response>
<ajax-response>
  <response type="object" id="guest-list.{timestamp}.{random}">
    <resultset>
      <guest created-by="admin"
             countdown-by-issued="false"
             shared-guestpass="true"
             full-name="Guest-1"
             role-id="2147483647"
             wlan="Fashions Guest Access"
             email=""
             phone-number=""
             share-number="2"
             x-key="EPOLY-SRTLL"
             remarks="Batch generation"
             create-time="1766607428"
             start-time=""
             expire-time="1767212228"
             valid-time="86400"
             id="1"
             key="EPOLY-SRTLL" />

      <guest created-by="admin"
             full-name="Guest-8"
             wlan="Fashions Guest Access"
             x-key="SPLAO-SNECL"
             create-time="1766607428"
             start-time="1766607581"
             expire-time="1766693981"
             valid-time="86400"
             id="8"
             used="true"
             key="SPLAO-SNECL">
        <client mac="12:23:ed:a0:0f:41" />
      </guest>

      <!-- More guest tokens... -->
    </resultset>
  </response>
</ajax-response>
```

**Response Attributes:**

| Attribute | Description | Type | Notes |
|-----------|-------------|------|-------|
| `id` | Token ID | string | Unique identifier |
| `full-name` | Username | string | Format: `Guest-{number}` |
| `key` / `x-key` | Password | string | Token password (both attributes contain same value) |
| `wlan` | WLAN Name | string | Associated WLAN |
| `created-by` | Creator | string | Username who created token |
| `create-time` | Created | timestamp | Unix timestamp (seconds) |
| `expire-time` | Expires | timestamp | Unix timestamp (seconds) |
| `start-time` | First Used | timestamp | Unix timestamp (seconds), empty if unused |
| `valid-time` | Valid Duration | seconds | Duration in seconds (e.g., 3600 = 1 hour) |
| `share-number` | Max Devices | number | Maximum concurrent devices |
| `remarks` | Remarks | string | User-defined notes |
| `used` | Used Flag | boolean | Present only if token has been used |
| `<client mac>` | Connected Device | element | Present only if device currently connected |

**Parsing Token Data:**

```javascript
async function queryGuestTokens(client, csrfToken) {
  const xmlPayload = `<ajax-request action='getconf' DECRYPT_X='true' updater='${updaterId}' comp='guest-list'>
    <guest self-service='!true'/>
  </ajax-request>`;

  const response = await client.post('/admin/_conf.jsp', xmlPayload, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Accept': '*/*',
      'X-CSRF-Token': csrfToken,
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': `${config.ruckus.baseUrl}/admin/dashboard.jsp`
    }
  });

  // Parse XML response
  const guestRegex = /<guest([^>]+)(?:>(?:<client[^>]*\/>)?<\/guest>|\/?>)/g;
  const tokens = [];
  let match;

  while ((match = guestRegex.exec(response.data)) !== null) {
    const attributes = match[1];

    // Extract attributes
    const parseAttr = (attr) => {
      const attrMatch = attributes.match(new RegExp(`${attr}=\"([^\"]*)\"`, 'i'));
      return attrMatch ? attrMatch[1] : null;
    };

    const id = parseAttr('id');
    const fullName = parseAttr('full-name');
    const key = parseAttr('key') || parseAttr('x-key');
    const wlan = parseAttr('wlan');
    const createdBy = parseAttr('created-by');
    const createTime = parseAttr('create-time');
    const expireTime = parseAttr('expire-time');
    const startTime = parseAttr('start-time');
    const validTime = parseAttr('valid-time');
    const shareNumber = parseAttr('share-number');
    const remarks = parseAttr('remarks');
    const used = attributes.includes('used=');

    // Check for connected clients
    const clientMatch = match[0].match(/<client mac=\"([^\"]+)\"/);
    const connectedMac = clientMatch ? clientMatch[1] : null;

    // Calculate status
    const now = Math.floor(Date.now() / 1000);
    const expired = expireTime && parseInt(expireTime) < now;
    const active = startTime && !expired;

    tokens.push({
      id,
      username: fullName,
      password: key,
      wlan,
      createdBy,
      createTime: createTime ? new Date(parseInt(createTime) * 1000).toISOString() : null,
      expireTime: expireTime ? new Date(parseInt(expireTime) * 1000).toISOString() : null,
      startTime: startTime ? new Date(parseInt(startTime) * 1000).toISOString() : null,
      validTimeSeconds: validTime ? parseInt(validTime) : null,
      validTimeHours: validTime ? Math.round(parseInt(validTime) / 3600 * 10) / 10 : null,
      maxDevices: shareNumber,
      remarks,
      used,
      expired,
      active,
      connectedMac,
      status: expired ? 'Expired' : (active ? 'Active/Used' : (used ? 'Used' : 'Available'))
    });
  }

  return tokens;
}
```

**Token Status Values:**
- `Available` - Token not yet used, not expired
- `Used` - Token has been used but session ended, not expired
- `Active/Used` - Token currently in use with active connection
- `Expired` - Token past expiration time

**Use Cases:**
- List all available tokens for display/selection
- Track token usage and expiration
- Identify active connections
- Monitor token inventory
- Generate reports on token consumption

---

## Statistics & Monitoring

### Get WLAN Statistics & Connected Devices

Retrieve comprehensive statistics including WLAN traffic, AP status, connected clients, and network activity.

**Endpoint:** `POST /admin/_cmdstat.jsp`

**Request:**
```xml
<ajax-request action='getstat' caller='unleashed_web' updater='stamgr.{timestamp}.{random}' comp='stamgr'>
  <wlan LEVEL='1' PERIOD='3600'/>
  <ap LEVEL='1' PERIOD='3600'/>
  <client LEVEL='1' client-type='3'/>
  <wireclient LEVEL='1'/>
  <zt-mesh-list/>
  <apsummary/>
</ajax-request>
```

**Headers:**
```
Content-Type: application/x-www-form-urlencoded; charset=UTF-8
Accept: */*
X-CSRF-Token: {csrf_token}
X-Requested-With: XMLHttpRequest
Referer: https://192.168.0.108/admin/dashboard.jsp
```

**Response:**
```xml
<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE ajax-response>
<ajax-response>
  <response type="object" id="stamgr.{timestamp}.{random}">
    <apstamgr-stat>
      <!-- WLAN Statistics -->
      <wlan id="2" ssid="API-Test-WLAN" assoc-stas="1" state="enabled">
        <history rx-bytes="..." tx-bytes="..." rssi="..." />
      </wlan>

      <!-- Access Point Information -->
      <ap mac="24:79:2a:08:5e:91"
          id="1"
          devname="RuckusAP"
          model="r710"
          state="1"
          firmware-version="200.15.6.12.304"
          ip="10.106.0.1"
          uptime-update="1766693678"
          channel-11ng="11"
          tx-power-11ng="25"
          channelization-11ng="20"
          channel-11na="40"
          tx-power-11na="25"
          channelization-11na="80">
        <radio radio-type="11ng" radio-band="2.4g" channel="11" channelization="20" />
        <radio radio-type="11ac" radio-band="5g" channel="40" channelization="80" />
        <history rx-bytes-2.4g="..." tx-bytes-2.4g="..." rx-bytes-5g="..." tx-bytes-5g="..." rssi="..." />
      </ap>

      <!-- Connected Clients -->
      <client mac="2a:fe:6a:2c:89:de"
              ap="24:79:2a:08:5e:91"
              ap-name="RuckusAP"
              status="1"
              ssid="API-Test-WLAN"
              ip="10.106.4.45"
              dvcinfo="Android"
              dvctype="Smartphone"
              model="Android"
              hostname="Device-Name"
              rssi="55"
              rssi-level="excellent"
              auth-method="Web"
              first-assoc="1766693291"
              user="Guest-33"
              wlan-id="2"
              channel="11"
              radio-type="11ng"
              radio-band="2.4g"
              encryption="NONE"
              vlan="1" />

      <!-- Summary Statistics -->
      <apsummary connnected-num="1"
                 disconnnected-num="0"
                 max-aps="25"
                 max-clients="512">
        <history rx-bytes-2.4g="..." tx-bytes-2.4g="..." rx-bytes-5g="..." tx-bytes-5g="..." rssi="..." />
      </apsummary>
    </apstamgr-stat>
  </response>
</ajax-response>
```

**Response Attributes - WLAN:**

| Attribute | Description | Type |
|-----------|-------------|------|
| `id` | WLAN ID | string |
| `ssid` | WLAN Name | string |
| `assoc-stas` | Associated Stations Count | number |
| `state` | WLAN State | string ("enabled"/"disabled") |
| `history` | Traffic history with timestamps | attribute list |

**Response Attributes - AP:**

| Attribute | Description | Type |
|-----------|-------------|------|
| `mac` | AP MAC Address | string |
| `id` | AP ID | string |
| `devname` | Device Name | string |
| `model` | Model Number | string (e.g., "r710") |
| `state` | Connection State | string ("1"=connected) |
| `firmware-version` | Firmware Version | string |
| `ip` | IP Address | string |
| `uptime-update` | Last Update Timestamp | unix timestamp |
| `channel-11ng` | 2.4GHz Channel | number |
| `tx-power-11ng` | 2.4GHz TX Power | number (dBm) |
| `channel-11na` | 5GHz Channel | number |
| `tx-power-11na` | 5GHz TX Power | number (dBm) |

**Response Attributes - Client:**

| Attribute | Description | Type |
|-----------|-------------|------|
| `mac` | Client MAC Address | string |
| `ap` | Connected AP MAC | string |
| `ap-name` | AP Name | string |
| `status` | Connection Status | string ("1"=connected) |
| `ssid` | Connected SSID | string |
| `ip` | Client IP Address | string |
| `dvctype` | Device Type | string (e.g., "Smartphone") |
| `model` | Device Model | string |
| `hostname` | Device Hostname | string |
| `rssi` | Signal Strength | number (dBm) |
| `rssi-level` | Signal Quality | string ("excellent"/"good"/"fair"/"poor") |
| `auth-method` | Auth Method | string (e.g., "Web") |
| `user` | Username | string (e.g., "Guest-33") |
| `wlan-id` | WLAN ID | string |
| `channel` | Connected Channel | string |
| `radio-band` | Radio Band | string ("2.4g"/"5g") |
| `vlan` | VLAN ID | string |
| `first-assoc` | First Association Time | unix timestamp |

**Use Cases:**
- Monitor active connections and client count
- Track network traffic (RX/TX bytes)
- View connected devices with detailed info
- Monitor AP health and status
- Analyze channel utilization
- Generate network usage reports

---

## MAC Access Control (ACL)

### 1. Get MAC ACL Lists

Retrieve all configured MAC Access Control Lists.

**Endpoint:** `POST /admin/_conf.jsp`

**Request:**
```xml
<ajax-request action='getconf' DECRYPT_X='false' updater='acl-list.{timestamp}.{random}' comp='acl-list'/>
```

**Headers:**
```
Content-Type: application/x-www-form-urlencoded; charset=UTF-8
Accept: */*
X-CSRF-Token: {csrf_token}
X-Requested-With: XMLHttpRequest
Referer: https://192.168.0.108/admin/dashboard.jsp
```

**Response:**
```xml
<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE ajax-response>
<ajax-response>
  <response type="object" id="acl-list.{timestamp}.{random}">
    <acl-list>
      <acl id="1"
           name="System"
           description="System"
           default-mode="allow"
           EDITABLE="false" />

      <acl id="2"
           name="Bad Boys Club"
           description="Not Allowed in the system"
           default-mode="allow"
           deny="" />
    </acl-list>
  </response>
</ajax-response>
```

**Response Attributes:**

| Attribute | Description | Type | Notes |
|-----------|-------------|------|-------|
| `id` | ACL ID | string | Unique identifier |
| `name` | ACL Name | string | Display name |
| `description` | Description | string | Purpose/notes |
| `default-mode` | Default Policy | string | "allow" or "deny" |
| `deny` | Denied MACs | string | Comma-separated MAC addresses (if deny list) |
| `accept` | Allowed MACs | string | Comma-separated MAC addresses (if allow list) |
| `EDITABLE` | Can Edit | boolean | System ACLs not editable |

---

### 2. Create MAC ACL (Deny List)

Create a new MAC Access Control List with default "allow" mode (deny specific MACs).

**Endpoint:** `POST /admin/_conf.jsp`

**Request:**
```xml
<ajax-request action='addobj' updater='acl-list.{timestamp}.{random}' comp='acl-list'>
  <acl name='Bad Boys Club'
       description='Not Allowed in the system'
       default-mode='allow'
       deny=''/>
</ajax-request>
```

**Response:**
```xml
<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE ajax-response>
<ajax-response>
  <response type="object" id="acl-list.{timestamp}.{random}">
    <acl name="Bad Boys Club"
         description="Not Allowed in the system"
         default-mode="allow"
         deny=""
         id="2" />
  </response>
</ajax-response>
```

**Extract:** ACL ID from response `id` attribute.

---

### 3. Create MAC ACL with Deny Rules

Create ACL with specific MAC addresses to deny.

**Endpoint:** `POST /admin/_conf.jsp`

**Request:**
```xml
<ajax-request action='addobj' updater='acl-list.{timestamp}.{random}' comp='acl-list'>
  <acl name='Bad Boys Club Two'
       description='Not Allowed'
       default-mode='allow'>
    <deny mac='2A:FE:6A:2C:89:DE' mac-comment='Device Name'></deny>
  </acl>
</ajax-request>
```

**Response:**
```xml
<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE ajax-response>
<ajax-response>
  <response type="object" id="acl-list.{timestamp}.{random}">
    <acl name="Bad Boys Club Two"
         description="Not Allowed"
         default-mode="allow"
         id="3">
      <deny mac="2A:FE:6A:2C:89:DE" mac-comment="Device Name" />
    </acl>
  </response>
</ajax-response>
```

**Notes:**
- Multiple `<deny>` elements can be included for multiple MAC addresses
- `mac-comment` is optional but recommended for tracking devices
- MAC addresses can be in uppercase or lowercase
- Format: `XX:XX:XX:XX:XX:XX` or `XX-XX-XX-XX-XX-XX`

---

### 4. Create MAC ACL (Allow List)

Create ACL with default "deny" mode (allow only specific MACs).

**Endpoint:** `POST /admin/_conf.jsp`

**Request:**
```xml
<ajax-request action='addobj' updater='acl-list.{timestamp}.{random}' comp='acl-list'>
  <acl name='The Good Guys'
       description='Allow all the time'
       default-mode='deny'
       accept=''/>
</ajax-request>
```

**Response:**
```xml
<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE ajax-response>
<ajax-response>
  <response type="object" id="acl-list.{timestamp}.{random}">
    <acl name="The Good Guys"
         description="Allow all the time"
         default-mode="deny"
         accept=""
         id="4" />
  </response>
</ajax-response>
```

**Notes:**
- `default-mode='deny'` means only specified MACs are allowed
- Use `<accept mac='...' mac-comment='...'>` to add allowed MACs
- Useful for highly restricted networks

---

### 5. Create MAC ACL with Allow Rules

Create ACL with specific MAC addresses to allow (whitelist).

**Endpoint:** `POST /admin/_conf.jsp`

**Request:**
```xml
<ajax-request action='addobj' updater='acl-list.{timestamp}.{random}' comp='acl-list'>
  <acl name='VIP Devices'
       description='Always allowed'
       default-mode='deny'>
    <accept mac='AA:BB:CC:DD:EE:FF' mac-comment='CEO iPhone'></accept>
    <accept mac='11:22:33:44:55:66' mac-comment='Manager Laptop'></accept>
  </acl>
</ajax-request>
```

**Use Cases:**
- Block problematic devices from network
- Create whitelists for secure WLANs
- Implement device-based access control
- Manage guest vs employee device access
- Enforce BYOD policies
- Parental controls or content filtering

---

## Complete Workflows

### Workflow 1: Create New Guest WLAN with Text-Based Tokens

```javascript
// 1. Login
POST /admin/login.jsp
// Extract CSRF token and session cookie

// 2. Initialize Session
POST /admin/_cmdstat.jsp
<ajax-request action='getstat' updater='system.{timestamp}.{random}' comp='system'>
  <sysinfo/><identity/>
</ajax-request>

// 3. Create Guest Service
POST /admin/_conf.jsp
<ajax-request action='addobj' updater='guestservice-list.{timestamp}.{random}' comp='guestservice-list'>
  <guestservice name='My-Guest-Service' ... valid='1' ...>
    <!-- firewall rules -->
  </guestservice>
</ajax-request>
// Extract guest_service_id

// 4. Create WLAN
POST /admin/_conf.jsp
<ajax-request action='addobj' updater='wlansvc-list.{timestamp}.{random}' comp='wlansvc-list'>
  <wlansvc name='My-Guest-WLAN' enable-friendly-key='false' guestservice-id='{guest_service_id}' ...>
    <!-- sub-elements -->
  </wlansvc>
</ajax-request>
// Extract wlan_id

// 5. Get Session Key
POST /admin/mon_guestdata.jsp
(empty body)
// Extract session key

// 6. Generate Tokens
POST /admin/mon_createguest.jsp
gentype=multiple&duration=2&duration-unit=hour_Hours&key={session_key}&createToNum=10&guest-wlan=My-Guest-WLAN&...
// Parse tokens from response
```

---

### Workflow 2: Disable/Enable WLAN

**Disable:**
```javascript
POST /admin/_conf.jsp
<ajax-request action='updobj' updater='wlansvc-list.{timestamp}.{random}' comp='wlansvc-list'>
  <wlansvc id='{wlan_id}' enable-type='1' IS_PARTIAL='true'/>
</ajax-request>
```

**Enable:**
```javascript
// Step 1: Select WLAN
POST /admin/_cmdstat.jsp
<ajax-request action='getstat' updater='stamgr.{timestamp}.{random}' comp='stamgr'>
  <client wlan='{wlan_name}' LEVEL='1' USE_REGEX='false'/>
</ajax-request>

// Step 2: Enable
POST /admin/_conf.jsp
<ajax-request action='updobj' updater='wlansvc-list.{timestamp}.{random}' comp='wlansvc-list'>
  <wlansvc id='{wlan_id}' enable-type='0' IS_PARTIAL='true'/>
</ajax-request>
```

---

### Workflow 3: Delete WLAN

```javascript
// Step 1: Select WLAN
POST /admin/_cmdstat.jsp
<ajax-request action='getstat' updater='stamgr.{timestamp}.{random}' comp='stamgr'>
  <client wlan='{wlan_name}' LEVEL='1' USE_REGEX='false'/>
</ajax-request>

// Step 2: Delete
POST /admin/_conf.jsp
<ajax-request action='delobj' updater='wlansvc-list.{timestamp}.{random}' comp='wlansvc-list'>
  <wlansvc id='{wlan_id}'></wlansvc>
</ajax-request>
```

---

## Implementation Notes

### Updater ID Format

All API calls require an `updater` attribute in the format:
```
{component}.{timestamp}.{random}
```

Example:
```javascript
function generateUpdaterId(component) {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${component}.${timestamp}.${random}`;
}
```

### Required Headers

All API calls (except login) must include:
```
Content-Type: application/x-www-form-urlencoded; charset=UTF-8
X-CSRF-Token: {csrf_token}
Referer: https://192.168.0.108/admin/dashboard.jsp
Cookie: -ejs-session-={session_id}
```

### Error Handling

Successful responses typically include:
```xml
<ajax-response>
  <response type="object" id="..." />
</ajax-response>
```

Or with data:
```xml
<ajax-response>
  <response type="object" id="...">
    <!-- response data -->
  </response>
</ajax-response>
```

---

## Security Considerations

1. **HTTPS Only** - All API calls must use HTTPS
2. **Certificate Validation** - Production should validate SSL certificates
3. **CSRF Protection** - CSRF token must be included in all requests
4. **Session Management** - Sessions expire after inactivity timeout
5. **Credentials** - Store admin credentials securely

---

## Testing Scripts

Reference implementations available in:
- `scripts/ruckus-api-discovery/test-guest-wlan-creation.js`
- `scripts/ruckus-api-discovery/test-disable-enable-wlan.js`
- `scripts/ruckus-api-discovery/test-delete-wlan.js`
- `scripts/ruckus-api-discovery/test-correct-friendly-key-false.js`
- `scripts/ruckus-api-discovery/test-all-wlan-operations.js`
- `scripts/ruckus-api-discovery/test-query-tokens.js`

---

## Version History

- **v1.0** - Initial API specification (2025-12-25)
  - Complete WLAN management APIs (Create, Read, Update, Delete, Disable, Enable)
  - Guest Service (Captive Portal) management
  - Guest Pass token generation with text-based format
  - Query all guest tokens with status tracking
  - enable-friendly-key parameter discovery

---

**End of Specification**
