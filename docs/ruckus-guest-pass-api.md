# Ruckus R710 Guest Pass (WiFi Token) Creation API

**Date:** 2025-12-24
**Firmware:** 200.15.6.12 build 304
**Status:** ✅ VERIFIED WORKING

## Overview

Successfully reverse-engineered the Ruckus R710 Guest Pass (WiFi Token) creation API. This API allows programmatic creation of WiFi access tokens for guest networks with configurable expiration times.

## Complete Guest Pass Creation Flow

### Prerequisites
1. ✅ Authenticated session (login completed)
2. ✅ CSRF token obtained
3. ✅ Session initialized (system status call)
4. ✅ Guest WLAN configured on the router

### API Call Sequence

## Step 1: Get Guest WLAN List

Same as documented in `ruckus-wlan-api-working.md`.

**Endpoint:** `POST /admin/_conf.jsp`

**Payload:**
```xml
<ajax-request action='getconf' DECRYPT_X='true' caller='unleashed_web'
              updater='wlansvc-list.{timestamp}.{random}' comp='wlansvc-list'/>
```

**Response:** List of WLANs including guest networks.

## Step 2: Get Session Key for Token Generation

**Endpoint:** `POST /admin/mon_guestdata.jsp`

**Request Headers:**
```
Content-Type: application/x-www-form-urlencoded; charset=UTF-8
Accept: text/javascript, text/html, application/xml, text/xml, */*
X-CSRF-Token: <token from login>
X-Requested-With: XMLHttpRequest
Referer: https://192.168.0.108/admin/dashboard.jsp
Cookie: -ejs-session-=<session cookie>
```

**Request Body:** Empty (Content-Length: 0)

**Response (JSON):**
```json
{
  "wlanName": "Fashions+Guest+Access",
  "key": "BEBJI-KCQJY"
}
```

**Key Details:**
- `wlanName`: URL-encoded WLAN name (spaces become `+`)
- `key`: Unique session key required for token creation
- **Important:** This key is session-specific and changes each time

## Step 3: Create Guest Passes (WiFi Tokens)

**Endpoint:** `POST /admin/mon_createguest.jsp`

**Request Headers:**
```
Content-Type: application/x-www-form-urlencoded; charset=UTF-8
Accept: text/javascript, text/html, application/xml, text/xml, */*
X-CSRF-Token: <token from login>
X-Requested-With: XMLHttpRequest
Referer: https://192.168.0.108/admin/dashboard.jsp
```

**Request Body (Form Data):**

| Parameter | Value | Description |
|-----------|-------|-------------|
| `gentype` | `multiple` | Generation type: "single" or "multiple" |
| `fullname` | `""` | Guest full name (optional) |
| `remarks` | `""` | Remarks/notes (optional) |
| `duration` | `2` | Duration value (integer) |
| `duration-unit` | `hour_Hours` | Unit: "day_Days", "hour_Hours", "week_Weeks" |
| `key` | `BEBJI-KCQJY` | Session key from Step 2 |
| `createToNum` | `5` | Number of passes to create (for multiple) |
| `batchpass` | `""` | Batch password (optional) |
| `guest-wlan` | `Fashions Guest Access` | Guest WLAN name (URL-decoded) |
| `shared` | `true` | Shared access flag |
| `reauth` | `false` | Require re-authentication |
| `reauth-time` | `""` | Re-auth time (if enabled) |
| `reauth-unit` | `min` | Re-auth unit: "min", "hour", "day" |
| `email` | `""` | Guest email (optional) |
| `countrycode` | `""` | Phone country code (optional) |
| `phonenumber` | `""` | Guest phone number (optional) |
| `limitnumber` | `2` | Concurrent device limit |
| `_` | `""` | Empty parameter (required) |

### Example Request (URL-encoded form data):
```
gentype=multiple&fullname=&remarks=&duration=2&duration-unit=hour_Hours&key=BEBJI-KCQJY&createToNum=5&batchpass=&guest-wlan=Fashions%20Guest%20Access&shared=true&reauth=false&reauth-time=&reauth-unit=min&email=&countrycode=&phonenumber=&limitnumber=2&_=
```

**Response (Mixed Format):**

The response contains **both** JavaScript array pushes **and** JSON data:

```javascript
batchEmailData.push('Guest-27|JRESL-LJFPT|');
batchSMSData.push('Guest-27|JRESL-LJFPT|');
batchEmailData.push('Guest-26|HBREI-VCION|');
batchSMSData.push('Guest-26|HBREI-VCION|');
batchEmailData.push('Guest-25|RVJPE-OFLPT|');
batchSMSData.push('Guest-25|RVJPE-OFLPT|');
batchEmailData.push('Guest-24|WWCQB-WHDBE|');
batchSMSData.push('Guest-24|WWCQB-WHDBE|');
batchEmailData.push('Guest-23|HJXGJ-HRBXA|');
batchSMSData.push('Guest-23|HJXGJ-HRBXA|');
{
  "result":"OK",
  "errorMsg":"~~",
  "key":"BEBJI-KCQJY",
  "fullname":"null",
  "expiretime":"1767246812",
  "wlan":"HXI Eats Guest",
  "emailaddr":"null",
  "phonenumber":"null",
  "newnum":"null",
  "totalnum":"null",
  "duration":"2",
  "duration_unit":"hours",
  "ids":"27:26:25:24:23"
}
```

### Response Fields (JSON portion):

| Field | Type | Description |
|-------|------|-------------|
| `result` | string | "OK" if successful, error code otherwise |
| `errorMsg` | string | Error message (if any), "~~" means no error |
| `key` | string | Session key used for creation |
| `fullname` | string | Guest full name ("null" if not provided) |
| `expiretime` | string | Unix timestamp when tokens expire |
| `wlan` | string | Guest WLAN name |
| `emailaddr` | string | Guest email ("null" if not provided) |
| `phonenumber` | string | Guest phone ("null" if not provided) |
| `newnum` | string | New number count |
| `totalnum` | string | Total passes count |
| `duration` | string | Duration value |
| `duration_unit` | string | Duration unit ("hours", "days", "weeks") |
| `ids` | string | Colon-separated list of generated guest IDs |

### Extracting Tokens from Response:

Parse JavaScript array pushes using regex:
```javascript
const tokenRegex = /batchEmailData\.push\('([^|]+)\|([^|]+)\|'\);/g;
const tokens = [];
let match;

while ((match = tokenRegex.exec(responseText)) !== null) {
  tokens.push({
    username: match[1],  // e.g., "Guest-27"
    password: match[2]   // e.g., "JRESL-LJFPT"
  });
}
```

### Generated Token Format:

Each token consists of:
- **Username:** `Guest-{ID}` (e.g., `Guest-27`)
- **Password:** 11-character alphanumeric code with hyphen (e.g., `JRESL-LJFPT`)
  - Format: `XXXXX-XXXXX` (5 chars, hyphen, 5 chars)
  - Characters: Uppercase letters A-Z

### Test Results (Verified Working):

**Request:**
- Guest WLAN: "HXI Eats Guest"
- Count: 5 tokens
- Duration: 2 hours
- Duration Unit: "hour_Hours"

**Response:**
- ✅ Result: OK
- ✅ Expiration: 2026-01-01 06:05:56 UTC
- ✅ Tokens Generated:
  1. `Guest-27` / `JRESL-LJFPT`
  2. `Guest-26` / `HBREI-VCION`
  3. `Guest-25` / `RVJPE-OFLPT`
  4. `Guest-24` / `WWCQB-WHDBE`
  5. `Guest-23` / `HJXGJ-HRBXA`

## Duration Units

The `duration-unit` parameter accepts these values:

| Value | Display | Description |
|-------|---------|-------------|
| `day_Days` | Days | Duration in days |
| `hour_Hours` | Hours | Duration in hours |
| `week_Weeks` | Weeks | Duration in weeks |

**Format Pattern:** `{unit}_{Display}` where Display is plural form

## Complete Node.js Example

```javascript
const axios = require('axios');
const { CookieJar } = require('tough-cookie');

// 1. Login and get CSRF token
const loginResponse = await client.post('/admin/login.jsp',
  'username=admin&password=***&ok=Log in');
const csrfToken = loginResponse.headers['http_x_csrf_token'];

// 2. Initialize session
const systemPayload = `<ajax-request action='getstat' updater='system.${Date.now()}.${Math.random()*10000}' comp='system'>...</ajax-request>`;
await client.post('/admin/_cmdstat.jsp', systemPayload, {
  headers: { 'X-CSRF-Token': csrfToken }
});

// 3. Get session key
const keyResponse = await client.post('/admin/mon_guestdata.jsp', '', {
  headers: {
    'X-CSRF-Token': csrfToken,
    'X-Requested-With': 'XMLHttpRequest'
  }
});
const sessionKey = keyResponse.data.key;

// 4. Create guest passes
const formData = new URLSearchParams({
  gentype: 'multiple',
  fullname: '',
  remarks: '',
  duration: '2',
  'duration-unit': 'hour_Hours',
  key: sessionKey,
  createToNum: '5',
  batchpass: '',
  'guest-wlan': 'Fashions Guest Access',
  shared: 'true',
  reauth: 'false',
  'reauth-time': '',
  'reauth-unit': 'min',
  email: '',
  countrycode: '',
  phonenumber: '',
  limitnumber: '2',
  _: ''
});

const createResponse = await client.post('/admin/mon_createguest.jsp', formData, {
  headers: {
    'X-CSRF-Token': csrfToken,
    'X-Requested-With': 'XMLHttpRequest'
  }
});

// 5. Parse tokens
const tokenRegex = /batchEmailData\.push\('([^|]+)\|([^|]+)\|'\);/g;
const tokens = [];
let match;
while ((match = tokenRegex.exec(createResponse.data)) !== null) {
  tokens.push({
    username: match[1],
    password: match[2]
  });
}

console.log(`Created ${tokens.length} tokens:`, tokens);
```

## Error Handling

### Common Errors:

**Missing Session Key:**
```json
{
  "result": "ERROR",
  "errorMsg": "Invalid session key"
}
```

**Invalid WLAN Name:**
```json
{
  "result": "ERROR",
  "errorMsg": "Guest WLAN not found"
}
```

**Session Expired:**
- HTTP 302 redirect to `/admin/login.jsp`
- Solution: Re-authenticate and obtain new CSRF token

**Invalid Duration:**
```json
{
  "result": "ERROR",
  "errorMsg": "Invalid duration value"
}
```

## Token Lifecycle

1. **Created:** Tokens are created with specified expiration time
2. **Active:** Tokens can be used immediately after creation
3. **Expired:** After expiration time, tokens no longer grant access
4. **Guest IDs:** Sequential IDs assigned (e.g., Guest-27, Guest-26, etc.)

## Integration Notes

### For Multi-Business WiFi Portal Integration:

1. **Store Tokens in Database:**
   - Username (e.g., `Guest-27`)
   - Password (e.g., `JRESL-LJFPT`)
   - Expiration timestamp
   - Associated WLAN/Business
   - Sale/redemption status

2. **Token Sales Flow:**
   - Customer purchases WiFi access
   - System calls Ruckus API to generate token
   - Token stored in database with sale record
   - Token provided to customer (receipt, email, etc.)

3. **Expiration Management:**
   - Parse `expiretime` Unix timestamp
   - Convert to local timezone for display
   - Mark expired tokens in database
   - Optionally auto-cleanup expired tokens

4. **WLAN Selection:**
   - Each business can have its own Guest WLAN
   - API requires exact WLAN name (case-sensitive)
   - Recommend storing WLAN config per business

## Next Steps

- [ ] Discover Guest Pass list/query API
- [ ] Discover Guest Pass deletion/revocation API
- [ ] Discover Guest Pass export/download API
- [ ] Document complete API specification
- [ ] Create TypeScript client library

## References

- Test Script: `scripts/ruckus-api-discovery/test-guest-pass-creation.js`
- Browser Captures: `ai-contexts/wip/Request URL-*.txt`
- WLAN API Docs: `docs/ruckus-wlan-api-working.md`
- Login Flow: `docs/ruckus-login-flow.md`
