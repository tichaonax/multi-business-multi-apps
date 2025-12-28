# ESP32 Portal Token API Documentation

## Overview
The Token API allows third-party applications to request access tokens for guest WiFi access. All API requests must be authenticated using an API key and can only be accessed from the uplink network (not from the AP network 192.168.4.x).

## Base URL
The API is accessible from the uplink IP address of the ESP32 device. You can find the uplink IP in the admin dashboard.

Example: `http://192.168.0.x` (where x is the device's DHCP-assigned IP)

## Authentication
All API requests require an API key passed as a form parameter.

### Obtaining an API Key
1. Access the admin dashboard at `http://192.168.4.1/admin`
2. Login with your admin password
3. Navigate to the "API Management" section
4. Copy the displayed API key
5. To regenerate the key, click "Regenerate API Key"

**Important:** Keep your API key secure. Anyone with the key can generate tokens.

## Endpoints

### POST /api/token
Create a new guest access token with specified duration and bandwidth limits.

#### Request

**Content-Type:** `application/x-www-form-urlencoded`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | string | Yes | Your 32-character API key |
| `duration` | integer | Yes | Token duration in minutes (min: 30, max: 43200) |
| `bandwidth_down` | integer | **No** | Download limit in MB (0 or omitted = unlimited, **no negative values**) |
| `bandwidth_up` | integer | **No** | Upload limit in MB (0 or omitted = unlimited, **no negative values**) |
| `businessId` | string | **No** | Business identifier (max 36 characters, defaults to "550e8400-e29b-41d4-a716-446655440000") |

**Duration Validation:**
- Minimum: 30 minutes
- Maximum: 43,200 minutes (30 days = 43,200 minutes exactly)
- **Must be positive** - negative values return 400 error
- Range is inclusive: 30 ≤ duration ≤ 43200

**Bandwidth Limits (Optional):**
- Set to 0 or **omit entirely** for unlimited bandwidth
- **Must be non-negative** - negative values return 400 error with specific message
- Token expires when either time OR bandwidth limit is reached (whichever comes first)
- Bandwidth tracking is per-token across all devices using it

**Device Limit:**
- Each token supports maximum 2 simultaneous devices
- Devices are tracked by MAC address
- Device slots released when device disconnects

#### Example Requests

**cURL:**
```bash
curl -X POST http://192.168.0.100/api/token \
  -d "api_key=abcd1234efgh5678ijkl9012mnop3456" \
  -d "duration=120" \
  -d "bandwidth_down=500" \
  -d "bandwidth_up=100"
```

**Python:**
```python
import requests

url = "http://192.168.0.100/api/token"
data = {
    "api_key": "abcd1234efgh5678ijkl9012mnop3456",
    "duration": 120,  # 2 hours
    "bandwidth_down": 500,  # 500 MB download
    "bandwidth_up": 100  # 100 MB upload
}

response = requests.post(url, data=data)
print(response.json())
```

**JavaScript (Node.js):**
```javascript
const axios = require('axios');

const params = new URLSearchParams({
    api_key: 'abcd1234efgh5678ijkl9012mnop3456',
    duration: '120',
    bandwidth_down: '500',
    bandwidth_up: '100'
});

axios.post('http://192.168.0.100/api/token', params)
    .then(response => console.log(response.data))
    .catch(error => console.error(error.response.data));
```

#### Success Response

**Code:** `200 OK`

**Content:**
```json
{
    "success": true,
    "available_slots": 85,
    "token": "A3K9M7P2",
    "businessId": "550e8400-e29b-41d4-a716-446655440000",
    "duration_minutes": 120,
    "bandwidth_down_mb": 500,
    "bandwidth_up_mb": 100,
    "ap_ssid": "Portal-AP"
}
```

#### Error Responses

**Invalid API Key**

**Code:** `401 Unauthorized`
```json
{
    "success": false,
    "error": "Invalid API key"
}
```

**Request from AP Network**

**Code:** `403 Forbidden`
```json
{
    "error": "API only accessible from uplink network"
}
```

**Invalid Parameters**

**Code:** `400 Bad Request`
```json
{
    "success": false,
    "error": "Invalid parameters or token limit reached"
}
```

Possible reasons:
- Duration outside allowed range (30-43200 minutes)
- Token storage limit reached (max 230 active tokens)
- Missing required parameters (api_key or duration)
- System time not synchronized yet (wait ~10 seconds after boot)

**Negative Values**

**Code:** `400 Bad Request`
```json
{
    "success": false,
    "error": "Duration cannot be negative"
}
```
OR
```json
{
    "success": false,
    "error": "Bandwidth cannot be negative"
}
```

These specific errors occur when:
- `duration` parameter contains a negative value (e.g., `-30`)
- `bandwidth_down` or `bandwidth_up` contains a negative value (e.g., `-100`)
- **Validation happens before any other processing** to prevent invalid data entry

**Missing Parameters**

**Code:** `400 Bad Request`
```json
{
    "success": false,
    "error": "Missing required parameters"
}
```

---

### POST /api/tokens/bulk_create
Create multiple guest access tokens in a single request with specified duration and bandwidth limits.

#### Request

**Content-Type:** `application/x-www-form-urlencoded`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | string | Yes | Your 32-character API key |
| `count` | integer | Yes | Number of tokens to create (min: 1, max: 50) |
| `duration` | integer | Yes | Token duration in minutes (min: 1, max: 43200) |
| `bandwidth_down` | integer | **No** | Download limit in MB per token (0 or omitted = unlimited) |
| `bandwidth_up` | integer | **No** | Upload limit in MB per token (0 or omitted = unlimited) |
| `businessId` | string | **No** | Business identifier (max 36 characters, defaults to system default) |

**Validation Rules:**
- `count`: Must be between 1 and 50 inclusive
- `duration`: Must be positive (≥ 1 minute, ≤ 43200 minutes/30 days)
- `bandwidth_down`/`bandwidth_up`: Must be non-negative (≥ 0)
- `businessId`: Maximum 36 characters if provided
- All parameters must be valid numbers (no negative values)

**Slot Management:**
- If fewer slots are available than requested, creates as many tokens as possible
- Returns actual number created vs. requested count
- Maximum 500 total active tokens system-wide

#### Example Requests

**cURL:**
```bash
curl -X POST http://192.168.0.100/api/tokens/bulk_create \
  -d "api_key=abcd1234efgh5678ijkl9012mnop3456" \
  -d "count=5" \
  -d "duration=720" \
  -d "bandwidth_down=1000" \
  -d "bandwidth_up=500" \
  -d "businessId=my-business-001"
```

**Python:**
```python
import requests

url = "http://192.168.0.100/api/tokens/bulk_create"
data = {
    "api_key": "abcd1234efgh5678ijkl9012mnop3456",
    "count": 5,  # Create 5 tokens
    "duration": 720,  # 12 hours each
    "bandwidth_down": 1000,  # 1GB download per token
    "bandwidth_up": 500,  # 500MB upload per token
    "businessId": "my-business-001"
}

response = requests.post(url, data=data)
print(response.json())
```

**JavaScript (Node.js):**
```javascript
const axios = require('axios');

const params = new URLSearchParams({
    api_key: 'abcd1234efgh5678ijkl9012mnop3456',
    count: '5',
    duration: '720',
    bandwidth_down: '1000',
    bandwidth_up: '500',
    businessId: 'my-business-001'
});

axios.post('http://192.168.0.100/api/tokens/bulk_create', params)
    .then(response => console.log(response.data))
    .catch(error => console.error(error.response.data));
```

#### Success Response

**Code:** `200 OK`

**Content:**
```json
{
    "success": true,
    "available_slots": 80,
    "tokens_created": 5,
    "requested": 5,
    "tokens": [
        {
            "token": "A3K9M7P2"
        },
        {
            "token": "B8N4Q6R9"
        },
        {
            "token": "C1P7S5T3"
        },
        {
            "token": "D9U2V8W4"
        },
        {
            "token": "E6X5Y7Z1"
        }
    ],
    "businessId": "my-business-001",
    "duration_minutes": 720,
    "bandwidth_down_mb": 1000,
    "bandwidth_up_mb": 500,
    "ap_ssid": "Portal-AP"
}
```

#### Partial Success Response

When fewer tokens are created than requested (due to slot limitations):

**Code:** `200 OK`

**Content:**
```json
{
    "success": true,
    "tokens_created": 3,
    "requested": 10,
    "tokens": [
        {
            "token": "A3K9M7P2"
        },
        {
            "token": "B8N4Q6R9"
        },
        {
            "token": "C1P7S5T3"
        }
    ],
    "businessId": "ddb03736-2f0f-4fad-8ef6-5ffa997a1454",
    "duration_minutes": 120,
    "bandwidth_down_mb": 0,
    "bandwidth_up_mb": 0,
    "ap_ssid": "Portal-AP"
}
```

#### Error Responses

**Invalid API Key**

**Code:** `401 Unauthorized`
```json
{
    "success": false,
    "error": "Invalid API key"
}
```

**Request from AP Network**

**Code:** `403 Forbidden`
```json
{
    "error": "API only accessible from uplink network"
}
```

**Invalid Parameters**

**Code:** `400 Bad Request`

Possible error messages:
- `"Count must be between 1 and 20"`
- `"Count cannot be negative"`
- `"Duration cannot be negative"`
- `"Bandwidth cannot be negative"`
- `"businessId cannot exceed 36 characters"`
- `"Missing required parameters (api_key, count, duration)"`

**No Token Slots Available**

**Code:** `507 Insufficient Storage`
```json
{
    "success": false,
    "error": "No token slots available",
    "error_code": "NO_SLOTS_AVAILABLE",
    "max_tokens": 500,
    "current_tokens": 500,
    "requested": 10
}
```

**Token Creation Failed**

**Code:** `500 Internal Server Error`
```json
{
    "success": false,
    "error": "Failed to create tokens",
    "error_code": "CREATION_FAILED"
}
```

---

### POST /api/token/disable
Permanently disable and delete multiple tokens from the system in a single bulk operation. This operation:
- Immediately revokes token access for all specified tokens (active sessions are terminated)
- Removes tokens from memory (active_tokens array)
- Erases tokens from NVS flash storage in a single save operation
- Decrements the active token count for each successfully disabled token
- **Persists across device reboots** - tokens cannot be recovered

**Use Cases:**
- Bulk cleanup of expired or unused tokens
- Security incident response (revoking multiple compromised tokens)
- Subscription cancellation for multiple users
- Administrative token management operations

**Important:** This is a permanent bulk deletion. Tokens cannot be restored and will not reappear after device reboot. Maximum 20 tokens per request.

#### Request

**Content-Type:** `application/x-www-form-urlencoded`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | string | Yes | Your 32-character API key |
| `tokens` | string | Yes | Comma-separated list of 8-character tokens to permanently delete (max 20) |

#### Example Requests

**cURL (single token):**
```bash
curl -X POST http://192.168.0.100/api/token/disable \
  -d "api_key=abcd1234efgh5678ijkl9012mnop3456" \
  -d "tokens=A3K9M7P2"
```

**cURL (multiple tokens):**
```bash
curl -X POST http://192.168.0.100/api/token/disable \
  -d "api_key=abcd1234efgh5678ijkl9012mnop3456" \
  -d "tokens=A3K9M7P2,B8N4Q9R3,C1D5E7F9"
```

**Python:**
```python
import requests

url = "http://192.168.0.100/api/token/disable"
data = {
    "api_key": "abcd1234efgh5678ijkl9012mnop3456",
    "tokens": "A3K9M7P2,B8N4Q9R3,C1D5E7F9"
}

response = requests.post(url, data=data)
print(response.json())
```

#### Success Response

**Code:** `200 OK`
```json
{
    "success": true,
    "disabled_count": 3,
    "disabled_tokens": ["A3K9M7P2", "B8N4Q9R3", "C1D5E7F9"]
}
```

**Verification:**
After successful bulk deletion, you can verify tokens are gone by:
1. Query `/api/token/info` for each token - will return 404
2. Check `/api/health` - `active_tokens` count decremented by the number of successfully disabled tokens
3. Reboot device - tokens remain deleted (persists in NVS)

**Internal Operations (logged to device console):**
```
I (143100) esp32-mesh-portal: API: Token A3K9M7P2 disabled via bulk API
I (143100) esp32-mesh-portal: API: Token B8N4Q9R3 disabled via bulk API
I (143100) esp32-mesh-portal: API: Token C1D5E7F9 disabled via bulk API
I (143100) esp32-mesh-portal: API: Bulk disabled 3 tokens via API (total now: 87)
```

#### Error Responses

**No Tokens Specified**

**Code:** `400 Bad Request`
```json
{
    "success": false,
    "error": "No tokens specified",
    "error_code": "NO_TOKENS_SPECIFIED"
}
```

**Too Many Tokens**

**Code:** `400 Bad Request`
```json
{
    "success": false,
    "error": "Too many tokens requested (max 20)",
    "error_code": "TOO_MANY_TOKENS",
    "max_tokens": 20,
    "requested": 51
}
```

**Missing Parameters**

**Code:** `400 Bad Request`
```json
{
    "success": false,
    "error": "Missing required parameters (api_key, tokens)"
}
```

**Server Busy**

**Code:** `503 Service Unavailable`
```json
{
    "success": false,
    "error": "Server busy",
    "error_code": "SERVER_BUSY"
}
```

**Invalid API Key**

**Code:** `401 Unauthorized`
```json
{
    "success": false,
    "error": "Invalid API key",
    "error_code": "INVALID_API_KEY"
}
```

**Notes:**
- Tokens that are not found or already disabled are silently ignored
- The response includes only the tokens that were successfully disabled
- NVS save operation occurs only once after processing all tokens for efficiency
- All tokens are processed atomically with mutex protection
- Maximum of 20 tokens can be disabled in a single request

---

### GET /api/token/info
Retrieve detailed information about a token including usage statistics, expiration status, and bandwidth consumption.

#### Request

**Method:** GET

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | string | Yes | Your 32-character API key |
| `token` | string | Yes | The 8-character token to query |

#### Example Requests

**cURL:**
```bash
curl -X GET "http://192.168.0.100/api/token/info?api_key=abcd1234efgh5678ijkl9012mnop3456&token=A3K9M7P2"
```

**Python:**
```python
import requests

url = "http://192.168.0.100/api/token/info"
params = {
    "api_key": "abcd1234efgh5678ijkl9012mnop3456",
    "token": "A3K9M7P2"
}

response = requests.get(url, params=params)
print(response.json())
```

**JavaScript:**
```javascript
const axios = require('axios');

axios.get('http://192.168.0.100/api/token/info', {
    params: {
        api_key: 'abcd1234efgh5678ijkl9012mnop3456',
        token: 'A3K9M7P2'
    }
})
.then(response => console.log(response.data))
.catch(error => console.error(error.response.data));
```

#### Success Response

**Code:** `200 OK`

**Example 1: Unused Token**
```json
{
    "success": true,
    "available_slots": 85,
    "token": "A3K9M7P2",
    "businessId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "unused",
    "created": 1702123456,
    "first_use": 0,
    "duration_minutes": 120,
    "expires_at": 0,
    "remaining_seconds": 0,
    "bandwidth_down_mb": 500,
    "bandwidth_up_mb": 100,
    "bandwidth_used_down_mb": 0,
    "bandwidth_used_up_mb": 0,
    "usage_count": 0,
    "device_count": 0,
    "max_devices": 2,
    "client_macs": []
}
```

**Example 2: Active Token (Single Device)**
```json
{
    "success": true,
    "token": "A3K9M7P2",
    "businessId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "active",
    "created": 1702123456,
    "first_use": 1702124000,
    "duration_minutes": 120,
    "expires_at": 1702131200,
    "remaining_seconds": 3600,
    "bandwidth_down_mb": 500,
    "bandwidth_up_mb": 100,
    "bandwidth_used_down_mb": 150,
    "bandwidth_used_up_mb": 25,
    "usage_count": 12,
    "device_count": 1,
    "max_devices": 2,
    "client_macs": ["AA:BB:CC:DD:EE:FF"]
}
```

**Example 3: Active Token (Multiple Devices)**
```json
{
    "success": true,
    "token": "B7X2K9L4",
    "businessId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "active",
    "created": 1702123456,
    "first_use": 1702124000,
    "duration_minutes": 120,
    "expires_at": 1702131200,
    "remaining_seconds": 3600,
    "bandwidth_down_mb": 500,
    "bandwidth_up_mb": 100,
    "bandwidth_used_down_mb": 280,
    "bandwidth_used_up_mb": 45,
    "usage_count": 24,
    "device_count": 2,
    "max_devices": 2,
    "client_macs": ["AA:BB:CC:DD:EE:FF", "11:22:33:44:55:66"]
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `token` | string | The 8-character token string |
| `businessId` | string | Business identifier for token segregation |
| `status` | string | Token status: "unused", "active", or "expired" |
| `created` | integer | Unix timestamp when token was created |
| `first_use` | integer | Unix timestamp when first used (0 if unused) |
| `duration_minutes` | integer | Total token duration in minutes |
| `expires_at` | integer | Unix timestamp when token expires (0 if unused) |
| `remaining_seconds` | integer | Seconds until expiration (0 if expired/unused) |
| `bandwidth_down_mb` | integer | Download limit in MB (0 = unlimited) |
| `bandwidth_up_mb` | integer | Upload limit in MB (0 = unlimited) |
| `bandwidth_used_down_mb` | integer | Downloaded data so far |
| `bandwidth_used_up_mb` | integer | Uploaded data so far |
| `usage_count` | integer | Number of times token has been used |
| `device_count` | integer | Number of devices currently using token |
| `max_devices` | integer | Maximum allowed devices (always 2) |
| `client_macs` | array | MAC addresses of devices using token (empty array if unused) |

#### Error Responses

**Token Not Found**

**Code:** `404 Not Found`
```json
{
    "success": false,
    "error": "Token not found",
    "error_code": "TOKEN_NOT_FOUND"
}
```

This error occurs when:
- The token doesn't exist in the system
- The token has been disabled
- The token was entered incorrectly

**Other Errors:** Same as `/api/token` endpoint (401, 403, 400)

---

### GET /api/token/batch_info
Retrieve detailed information for multiple tokens in a single request. This endpoint is optimized for third-party applications that need to update token usage data efficiently. Returns the same information as `/api/token/info` but for up to 50 tokens at once.

#### Request

**Method:** GET

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | string | Yes | Your 32-character API key |
| `tokens` | string | Yes | Comma-separated list of 8-character tokens (max 20 tokens) |

**Token Limits:**
- Maximum: 50 tokens per request
- Format: Comma-separated, no spaces (e.g., `token1,token2,token3`)
- Invalid tokens are silently skipped (not included in response)

#### Example Requests

**cURL:**
```bash
curl -X GET "http://192.168.0.100/api/token/batch_info?api_key=abcd1234efgh5678ijkl9012mnop3456&tokens=A3K9M7P2,B7X2K9L4,C1D5E8F3"
```

**Python:**
```python
import requests

url = "http://192.168.0.100/api/token/batch_info"
params = {
    "api_key": "abcd1234efgh5678ijkl9012mnop3456",
    "tokens": "A3K9M7P2,B7X2K9L4,C1D5E8F3"
}

response = requests.get(url, params=params)
print(response.json())
```

**JavaScript:**
```javascript
const axios = require('axios');

axios.get('http://192.168.0.100/api/token/batch_info', {
    params: {
        api_key: 'abcd1234efgh5678ijkl9012mnop3456',
        tokens: 'A3K9M7P2,B7X2K9L4,C1D5E8F3'
    }
})
.then(response => console.log(response.data))
.catch(error => console.error(error.response.data));
```

#### Success Response

**Code:** `200 OK`

**Example Response:**
```json
{
    "success": true,
    "tokens": [
        {
            "token": "A3K9M7P2",
            "status": "active",
            "created": 1702123456,
            "first_use": 1702124000,
            "duration_minutes": 120,
            "expires_at": 1702131200,
            "remaining_seconds": 3600,
            "bandwidth_down_mb": 500,
            "bandwidth_up_mb": 100,
            "bandwidth_used_down_mb": 150,
            "bandwidth_used_up_mb": 25,
            "usage_count": 12,
            "device_count": 1,
            "max_devices": 2,
            "client_macs": ["AA:BB:CC:DD:EE:FF"]
        },
        {
            "token": "B7X2K9L4",
            "status": "unused",
            "created": 1702123456,
            "first_use": 0,
            "duration_minutes": 60,
            "expires_at": 1702127056,
            "remaining_seconds": 0,
            "bandwidth_down_mb": 0,
            "bandwidth_up_mb": 0,
            "bandwidth_used_down_mb": 0,
            "bandwidth_used_up_mb": 0,
            "usage_count": 0,
            "device_count": 0,
            "max_devices": 2,
            "client_macs": []
        }
    ],
    "total_requested": 3,
    "total_found": 2
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `tokens` | array | Array of token objects (same format as `/api/token/info`) |
| `total_requested` | integer | Number of tokens requested in the query |
| `total_found` | integer | Number of tokens that were found and included in response |

**Individual Token Fields:** Same as `/api/token/info` response (see above).

#### Error Responses

**Too Many Tokens Requested**

**Code:** `400 Bad Request`
```json
{
    "success": false,
    "error": "Too many tokens requested (max 20)",
    "error_code": "TOO_MANY_TOKENS",
    "max_tokens": 20,
    "requested": 75
}
```

**No Tokens Specified**

**Code:** `400 Bad Request`
```json
{
    "success": false,
    "error": "No tokens specified",
    "error_code": "NO_TOKENS_SPECIFIED"
}
```

**Other Errors:** Same as `/api/token` endpoint (401, 403, 400)

---

### POST /api/token/extend
Extend/renew an existing token by resetting its timer and usage counters back to zero. This gives the token a complete "fresh start" as if it was just created, using the same duration and bandwidth limits as the original token.

**What It Does:**
- ✅ Resets `first_use` to current time → Duration countdown restarts from 0
- ✅ Resets `bandwidth_used_down` and `bandwidth_used_up` to 0 → Bandwidth allowance fully restored
- ✅ Resets `usage_count` to 0 → Usage counter cleared
- ✅ Persists changes to NVS → Survives device reboots
- ⚠️ **Does NOT change** `duration_minutes`, `bandwidth_down_mb`, or `bandwidth_up_mb` → Original limits preserved
- ⚠️ **Does NOT remove** device bindings → Same devices can continue using the token

**Use Cases:**
- **Subscription Renewal:** Customer pays for another period, extend their existing token
- **Top-Up Service:** Add more time/bandwidth without issuing a new token
- **Grace Period:** Reset token for customers who exceeded limits but want to continue
- **Customer Retention:** Offer free extension as promotional benefit

**Important:** The token keeps its original duration and bandwidth parameters from creation. You cannot change these values via extend - if different limits are needed, create a new token instead.

#### Request

**Content-Type:** `application/x-www-form-urlencoded`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | string | Yes | Your 32-character API key |
| `token` | string | Yes | The 8-character token to extend |

**No Additional Parameters:**
- Cannot modify `duration_minutes` - uses original value
- Cannot modify `bandwidth_down_mb` - uses original value  
- Cannot modify `bandwidth_up_mb` - uses original value
- To change these values, create a new token with `/api/token/create`

#### Example Requests

**cURL:**
```bash
curl -X POST http://192.168.0.100/api/token/extend \
  -d "api_key=abcd1234efgh5678ijkl9012mnop3456" \
  -d "token=A3K9M7P2"
```

**Python:**
```python
import requests

url = "http://192.168.0.100/api/token/extend"
data = {
    "api_key": "abcd1234efgh5678ijkl9012mnop3456",
    "token": "A3K9M7P2"
}

response = requests.post(url, data=data)
print(response.json())
```

**JavaScript:**
```javascript
const axios = require('axios');

const params = new URLSearchParams({
    api_key: 'abcd1234efgh5678ijkl9012mnop3456',
    token: 'A3K9M7P2'
});

axios.post('http://192.168.0.100/api/token/extend', params)
    .then(response => console.log(response.data))
    .catch(error => console.error(error.response.data));
```

#### Success Response

**Code:** `200 OK`
```json
{
    "success": true,
    "message": "Token extended successfully",
    "token": "A3K9M7P2",
    "duration_minutes": 120,
    "new_duration_minutes": 120,
    "new_expires_at": 1702138400,
    "bandwidth_down_mb": 500,
    "bandwidth_up_mb": 100
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `message` | string | Confirmation message: "Token extended successfully" |
| `token` | string | The extended token (same as input) |
| `duration_minutes` | integer | **Original** duration from token creation (unchanged) |
| `new_duration_minutes` | integer | Duration for this extension period (always same as `duration_minutes`) |
| `new_expires_at` | integer | **New** expiration Unix timestamp (current time + duration_minutes) |
| `bandwidth_down_mb` | integer | Download limit in MB (unchanged from original, 0 = unlimited) |
| `bandwidth_up_mb` | integer | Upload limit in MB (unchanged from original, 0 = unlimited) |

**What Actually Changed:**
- `first_use` → Set to current timestamp (timer restarted)
- `bandwidth_used_down` → Reset to 0 (usage cleared)
- `bandwidth_used_up` → Reset to 0 (usage cleared)
- `usage_count` → Reset to 0 (login counter cleared)
- `new_expires_at` → Calculated as: current time + (duration_minutes × 60)

**What Stayed The Same:**
- `duration_minutes` → Kept from original token creation
- `bandwidth_down_mb` → Kept from original token creation
- `bandwidth_up_mb` → Kept from original token creation
- Device bindings → Previous devices can still use the token

#### Error Responses

**Token Not Found**

**Code:** `404 Not Found`
```json
{
    "success": false,
    "error": "Token not found or has been disabled",
    "error_code": "TOKEN_NOT_FOUND"
}
```

This error occurs when:
- The token doesn't exist in the system
- The token has been disabled via `/api/token/disable`
- The token was entered incorrectly

**Use Case:** Your application should handle this gracefully by:
- Checking if the token was disabled
- Offering to create a new token instead
- Informing the user the token is no longer valid

**Example - Extend with Fallback to Create:**
```python
def renew_or_create_token(api_key, token, duration=120):
    """Try to extend existing token, create new one if not found"""
    # Try extending first
    response = requests.post(
        'http://192.168.0.100/api/token/extend',
        data={'api_key': api_key, 'token': token}
    )
    
    if response.status_code == 404:
        # Token doesn't exist - create a new one
        return requests.post(
            'http://192.168.0.100/api/token/create',
            data={
                'api_key': api_key,
                'duration': duration,
                'bandwidth_down': 500,  # Set new limits
                'bandwidth_up': 100
            }
        ).json()
    
    return response.json()
```

**Other Errors:** Same as `/api/token/create` endpoint (401, 403, 400)

#### Internal State Changes

When a token is extended, the following internal state changes occur:

**Before Extend (Example Token):**
```
Token: A3K9M7P2
first_use: 1702050000 (Dec 8, 2024 12:00:00)
duration_minutes: 120
bandwidth_used_down: 450 MB (out of 500 MB limit)
bandwidth_used_up: 80 MB (out of 100 MB limit)
usage_count: 15
expires_at: 1702057200 (Dec 8, 2024 14:00:00) ← EXPIRED
```

**After Extend:**
```
Token: A3K9M7P2 (same token)
first_use: 1702138400 (Dec 9, 2024 12:00:00) ← RESET to now
duration_minutes: 120 (unchanged)
bandwidth_used_down: 0 ← RESET
bandwidth_used_up: 0 ← RESET
usage_count: 0 ← RESET
expires_at: 1702145600 (Dec 9, 2024 14:00:00) ← NEW expiration
```

**Persisted to NVS:** All changes are immediately saved to non-volatile storage and survive device reboots.

**Device Bindings:** If the token was previously used by devices with MACs `AA:BB:CC:DD:EE:FF` and `11:22:33:44:55:66`, these same devices can continue using the token without re-authenticating.

---

### GET /api/uptime
Get the system uptime since last reboot. This endpoint does not require authentication and is useful for monitoring device availability.

#### Request

**Method:** GET

**Authentication:** None required

**Query Parameters:** None

#### Example Requests

**cURL:**
```bash
curl -X GET "http://192.168.0.100/api/uptime"
```

**Python:**
```python
import requests

response = requests.get('http://192.168.0.100/api/uptime')
print(response.json())
```

#### Success Response

**Code:** `200 OK`

```json
{
    "success": true,
    "available_slots": 85,
    "uptime_seconds": 12345,
    "uptime_microseconds": 12345678901
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Always true for successful requests |
| `uptime_seconds` | integer | System uptime in seconds |
| `uptime_microseconds` | integer | System uptime in microseconds (higher precision) |

#### Error Responses

**Request from AP Network**

**Code:** `403 Forbidden`
```json
{
    "error": "API only accessible from uplink network"
}
```

---

### GET /api/health
Get comprehensive device health status including uptime, time sync, token count, and memory usage. This endpoint does not require authentication and follows standard health check patterns for monitoring systems.

#### Request

**Method:** GET

**Authentication:** None required

**Query Parameters:** None

#### Example Requests

**cURL:**
```bash
curl -X GET "http://192.168.0.100/api/health"
```

**Python:**
```python
import requests

response = requests.get('http://192.168.0.100/api/health')
print(response.json())
```

#### Success Response

**Code:** `200 OK`

```json
{
    "success": true,
    "available_slots": 85,
    "status": "healthy",
    "uptime_seconds": 12345,
    "time_synced": true,
    "last_time_sync": 1702345678,
    "current_time": 1702358023,
    "active_tokens": 5,
    "max_tokens": 230,
    "free_heap_bytes": 245760
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Always true for successful requests |
| `status` | string | Overall health status ("healthy") |
| `uptime_seconds` | integer | System uptime in seconds since boot |
| `time_synced` | boolean | Whether SNTP time sync is complete |
| `last_time_sync` | integer | Unix timestamp of last SNTP sync (0 if never) |
| `current_time` | integer | Current Unix timestamp |
| `active_tokens` | integer | Number of currently active tokens |
| `max_tokens` | integer | Maximum token capacity (230) |
| `free_heap_bytes` | integer | Available RAM in bytes |

#### Error Responses

**Request from AP Network**

**Code:** `403 Forbidden`
```json
{
    "error": "API only accessible from uplink network"
}
```

---

### GET /api/tokens/available_slots
Get the count of available token slots that can be created. This endpoint helps applications determine how many tokens they can create before hitting the system limit.

#### Request

**Method:** GET

**Authentication:** API key required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | string | Yes | Your 32-character API key |

#### Example Requests

**cURL:**
```bash
curl -X GET "http://192.168.0.100/api/tokens/available_slots?api_key=abcd1234efgh5678ijkl9012mnop3456"
```

**Python:**
```python
import requests

url = "http://192.168.0.100/api/tokens/available_slots"
params = {
    "api_key": "abcd1234efgh5678ijkl9012mnop3456"
}

response = requests.get(url, params=params)
print(response.json())
```

#### Success Response

**Code:** `200 OK`

```json
{
    "success": true,
    "available_slots": 85,
    "max_tokens": 100,
    "current_tokens": 15
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Always true for successful requests |
| `available_slots` | integer | Number of token slots available for creation |
| `max_tokens` | integer | Maximum token capacity (100) |
| `current_tokens` | integer | Number of currently active tokens |

#### Error Responses

**Invalid API Key**

**Code:** `401 Unauthorized`
```json
{
    "success": false,
    "error": "Invalid API key",
    "error_code": "INVALID_API_KEY"
}
```

**Request from AP Network**

**Code:** `403 Forbidden`
```json
{
    "error": "API only accessible from uplink network"
}
```

---

### GET /api/ap/info
Get Access Point (AP) information including the current SSID. This endpoint does not require authentication as the AP name is public information needed for guest receipts and connection instructions.

#### Request

**Method:** GET

**Authentication:** None required

**Query Parameters:** None

#### Example Requests

**cURL:**
```bash
curl -X GET "http://192.168.0.100/api/ap/info"
```

**Python:**
```python
import requests

response = requests.get('http://192.168.0.100/api/ap/info')
print(response.json())
```

#### Success Response

**Code:** `200 OK`

```json
{
    "success": true,
    "ap_ssid": "Portal-Guest"
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Always true for successful requests |
| `ap_ssid` | string | Current Access Point SSID name |

#### Use Cases
- **Receipt Generation:** Include AP name in guest WiFi receipts
- **Connection Instructions:** Display network name for guests
- **Third-party Integration:** Allow external systems to show correct network name
- **Dynamic Branding:** AP name can be customized per venue/location

---

### GET /api/tokens/list
Get a complete list of all active tokens in the system with their full metadata. This endpoint is essential for bulk token management, monitoring dashboards, and system auditing.

#### Request

**Method:** GET

**Authentication:** Required (API key)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | string | Yes | Your 32-character API key |
| `status` | string | No | Filter by token status: "unused", "active", "expired", or "all" (default: "all") |
| `business_id` | string | No | Filter by business identifier (exact match) |
| `min_age_minutes` | integer | No | Only include tokens created at least this many minutes ago |
| `max_age_minutes` | integer | No | Only include tokens created at most this many minutes ago |
| `used_only` | boolean | No | If "true", only include tokens that have been used at least once |
| `unused_only` | boolean | No | If "true", only include tokens that have never been used |
| `offset` | integer | No | Pagination offset: starting index (default: 0) |
| `limit` | integer | No | Maximum tokens per page (default: 20, max: 20) |
| `offset` | integer | No | Pagination: starting index for results (default: 0) |
| `limit` | integer | No | Pagination: maximum tokens to return (default: 20, max: 20) |

**Pagination:**
- Use `offset` and `limit` to retrieve large token lists in chunks
- `offset=0, limit=20` returns first 20 tokens
- `offset=20, limit=20` returns next 20 tokens
- Response includes `total_count`, `returned_count`, `has_more` for pagination control
- Maximum `limit` is 20 tokens per request to prevent buffer overflow

**Filtering Logic:**
- `status=all` (default): Return all active tokens
- `status=unused/active/expired`: Return only tokens with specified status
- `business_id=UUID`: Return only tokens with matching business identifier
- `used_only=true`: Only tokens where `first_use > 0`
- `unused_only=true`: Only tokens where `first_use = 0`
- `min_age_minutes=N`: Only tokens created more than N minutes ago
- `max_age_minutes=N`: Only tokens created less than N minutes ago
- Filters can be combined for precise token selection

#### Example Requests

**cURL:**
```bash
curl -X GET "http://192.168.0.100/api/tokens/list?api_key=abcd1234efgh5678ijkl9012mnop3456"
```

**Python:**
```python
import requests

params = {
    "api_key": "abcd1234efgh5678ijkl9012mnop3456"
}

response = requests.get('http://192.168.0.100/api/tokens/list', params=params)
data = response.json()

print(f"Total tokens: {data['total_count']}")
print(f"Returned tokens: {data['returned_count']}")
print(f"Has more: {data['has_more']}")
for token in data['tokens']:
    print(f"Token: {token['token']}, Status: {token['status']}, "
          f"Duration: {token['duration_minutes']} min")
```

**JavaScript:**
```javascript
const axios = require('axios');

const params = {
    api_key: 'abcd1234efgh5678ijkl9012mnop3456'
};

axios.get('http://192.168.0.100/api/tokens/list', { params })
    .then(response => {
        const data = response.data;
        console.log(`Total tokens: ${data.total_count}`);
        console.log(`Returned tokens: ${data.returned_count}`);
        console.log(`Has more: ${data.has_more}`);
        data.tokens.forEach(token => {
            console.log(`${token.token}: ${token.status}, ${token.duration_minutes}min`);
        });
    })
    .catch(error => console.error(error));
```

**Filtering Examples:**

**Get only unused tokens:**
```bash
curl -X GET "http://192.168.0.100/api/tokens/list?api_key=abcd1234efgh5678ijkl9012mnop3456&status=unused"
```

**Get tokens older than 24 hours that have never been used:**
```bash
curl -X GET "http://192.168.0.100/api/tokens/list?api_key=abcd1234efgh5678ijkl9012mnop3456&unused_only=true&min_age_minutes=1440"
```

**Get tokens for a specific business:**
```bash
curl -X GET "http://192.168.0.100/api/tokens/list?api_key=abcd1234efgh5678ijkl9012mnop3456&business_id=550e8400-e29b-41d4-a716-446655440000"
```

**Get active tokens created in the last hour:**
```bash
curl -X GET "http://192.168.0.100/api/tokens/list?api_key=abcd1234efgh5678ijkl9012mnop3456&status=active&max_age_minutes=60"
```

**Get all expired tokens:**
```bash
curl -X GET "http://192.168.0.100/api/tokens/list?api_key=abcd1234efgh5678ijkl9012mnop3456&status=expired"
```

**Pagination Examples:**

**Get first 20 unused tokens:**
```bash
curl -X GET "http://192.168.0.100/api/tokens/list?api_key=abcd1234efgh5678ijkl9012mnop3456&status=unused&limit=20"
```

**Get next 20 unused tokens (after first page):**
```bash
curl -X GET "http://192.168.0.100/api/tokens/list?api_key=abcd1234efgh5678ijkl9012mnop3456&status=unused&offset=20&limit=20"
```

**Python script to fetch all unused tokens:**
```python
import requests

def get_all_unused_tokens(base_url, api_key):
    all_tokens = []
    offset = 0
    limit = 20  # CRITICAL: Max 20 tokens per request (ESP32 limitation)

    while True:
        params = {
            "api_key": api_key,
            "status": "unused",
            "offset": offset,
            "limit": limit
        }

        response = requests.get(f"{base_url}/api/tokens/list", params=params)
        data = response.json()

        if not data["success"]:
            raise Exception(f"API error: {data}")

        all_tokens.extend(data["tokens"])

        if not data["has_more"]:
            break

        offset += limit

        # Small delay between batches to prevent overwhelming ESP32
        import time
        time.sleep(0.5)

    return all_tokens

# Usage
base_url = "http://192.168.0.100"
api_key = "abcd1234efgh5678ijkl9012mnop3456"
unused_tokens = get_all_unused_tokens(base_url, api_key)
print(f"Found {len(unused_tokens)} unused tokens")
```

#### Success Response

**Code:** `200 OK`

```json
{
    "success": true,
    "available_slots": 85,
    "total_count": 250,
    "returned_count": 20,
    "offset": 0,
    "limit": 20,
    "has_more": true,
    "tokens": [
        {
            "token": "A3K9M7P2",
            "businessId": "550e8400-e29b-41d4-a716-446655440000",
            "status": "active",
            "duration_minutes": 120,
            "first_use": 1702345678,
            "expires_at": 1702352878,
            "remaining_seconds": 3600,
            "bandwidth_down_mb": 500,
            "bandwidth_up_mb": 100,
            "bandwidth_used_down": 245,
            "bandwidth_used_up": 38,
            "usage_count": 2,
            "device_count": 2,
            "client_macs": ["AA:BB:CC:DD:EE:FF", "11:22:33:44:55:66"]
        }
    ]
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Always true for successful requests |
| `total_count` | integer | Total number of tokens matching filters (across all pages) |
| `returned_count` | integer | Number of tokens returned in this response |
| `offset` | integer | Pagination offset used for this request |
| `limit` | integer | Pagination limit used for this request |
| `has_more` | boolean | True if more tokens are available beyond current page |
| `tokens` | array | Array of token objects with detailed metadata |

**Token Object Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `token` | string | 8-character token code |
| `businessId` | string | Business identifier for token segregation |
| `status` | string | Token status: "unused" (never used), "active" (in use), "expired" (time/bandwidth exceeded) |
| `duration_minutes` | integer | Token duration from creation (30-43200 minutes) |
| `first_use` | integer | Unix timestamp of first use (0 = never used) |
| `expires_at` | integer | Unix timestamp when token expires |
| `remaining_seconds` | integer | Seconds until expiration (0 if expired) |
| `bandwidth_down_mb` | integer | Download limit in MB (0 = unlimited) |
| `bandwidth_up_mb` | integer | Upload limit in MB (0 = unlimited) |
| `bandwidth_used_down` | integer | Downloaded data in MB |
| `bandwidth_used_up` | integer | Uploaded data in MB |
| `usage_count` | integer | Number of times token was authenticated |
| `device_count` | integer | Number of devices currently using this token (0-2) |
| `client_macs` | array | MAC addresses of devices using token (empty array if unused, max 2 devices) |

**Status Values:**
- `"unused"` - Token created but never used (first_use = 0)
- `"active"` - Token currently in use and not expired (remaining_seconds > 0)
- `"expired"` - Token expired due to time or bandwidth limit (remaining_seconds = 0)

#### Use Cases

**1. Bulk Token Cleanup**
```bash
#!/bin/bash
API_KEY="your_api_key_here"
ESP32_IP="192.168.0.100"

# Get all expired tokens and disable them
tokens=$(curl -s "http://$ESP32_IP/api/tokens/list?api_key=$API_KEY" | \
  python3 -c "import sys, json; data=json.load(sys.stdin); \
  print(' '.join([t['token'] for t in data['tokens'] if t['status']=='expired']))")

for token in $tokens; do
  curl -s -X POST "http://$ESP32_IP/api/token/disable" \
    -d "api_key=$API_KEY&token=$token"
  echo "Cleaned up expired token: $token"
done
```

**2. Monitoring Dashboard**
```python
def get_token_statistics(api_key, esp32_ip):
    """Get aggregated token statistics for monitoring"""
    response = requests.get(
        f'http://{esp32_ip}/api/tokens/list',
        params={'api_key': api_key}
    )
    data = response.json()
    
    stats = {
        'total': data['count'],
        'unused': sum(1 for t in data['tokens'] if t['status'] == 'unused'),
        'active': sum(1 for t in data['tokens'] if t['status'] == 'active'),
        'expired': sum(1 for t in data['tokens'] if t['status'] == 'expired'),
        'total_bandwidth_used': sum(
            t['bandwidth_used_down'] + t['bandwidth_used_up'] 
            for t in data['tokens']
        )
    }
    
    return stats
```

**3. Token Usage Analytics**
```python
def analyze_token_usage(api_key, esp32_ip):
    """Analyze token usage patterns"""
    response = requests.get(
        f'http://{esp32_ip}/api/tokens/list',
        params={'api_key': api_key}
    )
    data = response.json()
    
    # Find most used tokens
    active_tokens = [t for t in data['tokens'] if t['usage_count'] > 0]
    active_tokens.sort(key=lambda t: t['usage_count'], reverse=True)
    
    print(f"Top 5 most used tokens:")
    for token in active_tokens[:5]:
        print(f"  {token['token']}: {token['usage_count']} logins, "
              f"{token['bandwidth_used_down']}MB down")
```

**4. Find Tokens by MAC Address**
```python
def find_tokens_by_mac(api_key, esp32_ip, target_mac):
    """Find all tokens associated with a specific device MAC address"""
    response = requests.get(
        f'http://{esp32_ip}/api/tokens/list',
        params={'api_key': api_key}
    )
    data = response.json()
    
    # Find tokens containing the target MAC
    matching_tokens = [
        token for token in data['tokens']
        if target_mac.upper() in [mac.upper() for mac in token['client_macs']]
    ]
    
    if matching_tokens:
        print(f"Found {len(matching_tokens)} token(s) for MAC {target_mac}:")
        for token in matching_tokens:
            print(f"  Token: {token['token']}")
            print(f"    Status: {token['status']}")
            print(f"    Devices: {token['device_count']}")
            print(f"    MACs: {', '.join(token['client_macs'])}")
            print(f"    Bandwidth used: {token['bandwidth_used_down']}MB down, "
                  f"{token['bandwidth_used_up']}MB up")
    else:
        print(f"No tokens found for MAC {target_mac}")
    
    return matching_tokens

# Example usage
find_tokens_by_mac('your_api_key', '192.168.0.100', 'AA:BB:CC:DD:EE:FF')
```

**5. Device Tracking Report**
```python
def generate_device_report(api_key, esp32_ip):
    """Generate report of all devices using tokens"""
    response = requests.get(
        f'http://{esp32_ip}/api/tokens/list',
        params={'api_key': api_key}
    )
    data = response.json()
    
    # Collect all unique MACs
    devices = {}
    for token in data['tokens']:
        for mac in token['client_macs']:
            if mac not in devices:
                devices[mac] = []
            devices[mac].append({
                'token': token['token'],
                'status': token['status'],
                'bandwidth_down': token['bandwidth_used_down'],
                'bandwidth_up': token['bandwidth_used_up']
            })
    
    print(f"Device Report - {len(devices)} unique devices:")
    for mac, tokens in devices.items():
        total_bandwidth = sum(t['bandwidth_down'] + t['bandwidth_up'] for t in tokens)
        print(f"\n{mac}:")
        print(f"  Tokens used: {len(tokens)}")
        print(f"  Total bandwidth: {total_bandwidth}MB")
        for t in tokens:
            print(f"    - {t['token']} ({t['status']}): "
                  f"{t['bandwidth_down']}MB down, {t['bandwidth_up']}MB up")
```

**6. Clear All Tokens**
```bash
# Disable all tokens in the system
tokens=$(curl -s "http://192.168.0.100/api/tokens/list?api_key=$API_KEY" | \
  python3 -c "import sys, json; data=json.load(sys.stdin); \
  print(' '.join([t['token'] for t in data['tokens']]))")

for token in $tokens; do
  curl -s -X POST "http://192.168.0.100/api/token/disable" \
    -d "api_key=$API_KEY&token=$token"
  sleep 0.15  # Rate limiting
done
```

#### Error Responses

**Missing API Key**

**Code:** `400 Bad Request`
```json
{
    "success": false,
    "error": "Missing required parameter: api_key"
}
```

**Invalid API Key**

**Code:** `401 Unauthorized`
```json
{
    "success": false,
    "error": "Invalid API key"
}
```

**Request from AP Network**

**Code:** `403 Forbidden`
```json
{
    "error": "API only accessible from uplink network"
}
```

**Memory Allocation Failed**

**Code:** `500 Internal Server Error`
```json
{
    "success": false,
    "error": "Memory allocation failed"
}
```

This error is rare and indicates the device is under extreme memory pressure. If this occurs:
1. Reduce the number of active tokens
2. Reboot the device to clear memory
3. Consider implementing periodic token cleanup

#### Performance Notes

- **Response Size:** Approximately 200-250 bytes per token
- **Maximum Response:** ~58KB for 230 tokens (8KB buffer, may truncate if list is very large)
- **Response Time:** Typically 50-200ms depending on token count
- **Rate Limiting:** Recommend 100ms minimum between requests to avoid overwhelming device

---

### POST /api/tokens/purge
Purge (permanently delete) tokens based on age and usage criteria. This endpoint is designed for automated token cleanup operations, allowing third-party applications to implement retention policies.

#### Request

**Method:** POST

**Content-Type:** `application/x-www-form-urlencoded`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | string | Yes | Your 32-character API key |
| `unused_only` | boolean | No | If true, only purge unused tokens (never redeemed) |
| `max_age_minutes` | integer | No | Only purge tokens older than this many minutes |
| `expired_only` | boolean | No | If true, only purge expired tokens |

**Purge Logic:**
- `unused_only=true`: Only tokens that have never been used (`first_use = 0`)
- `max_age_minutes=N`: Only tokens created more than N minutes ago
- `expired_only=true`: Only tokens that have exceeded their time/bandwidth limits
- Combine parameters for precise filtering (e.g., unused tokens older than 24 hours)

#### Example Requests

**Purge unused tokens older than 24 hours:**
```bash
curl -X POST http://192.168.0.100/api/tokens/purge \
  -d "api_key=abcd1234efgh5678ijkl9012mnop3456" \
  -d "unused_only=true" \
  -d "max_age_minutes=1440"
```

**Purge all expired tokens:**
```bash
curl -X POST http://192.168.0.100/api/tokens/purge \
  -d "api_key=abcd1234efgh5678ijkl9012mnop3456" \
  -d "expired_only=true"
```

**Purge all tokens older than 1 week (used or unused):**
```bash
curl -X POST http://192.168.0.100/api/tokens/purge \
  -d "api_key=abcd1234efgh5678ijkl9012mnop3456" \
  -d "max_age_minutes=10080"
```

#### Success Response

**Code:** `200 OK`

```json
{
    "success": true,
    "purged_count": 3,
    "purged_tokens": ["A3K9M7P2", "B7X2K9L4", "C1D5E8F3"]
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `purged_count` | integer | Number of tokens that were purged |
| `purged_tokens` | array | Array of token strings that were deleted |

#### Use Cases

**1. Daily Cleanup of Unused Short-Term Tokens**
```bash
# Purge unused 1-day tokens that are older than 24 hours
curl -X POST http://192.168.0.100/api/tokens/purge \
  -d "api_key=$API_KEY" \
  -d "unused_only=true" \
  -d "max_age_minutes=1440"
```

**2. Weekly Cleanup of All Old Tokens**
```bash
# Purge any token older than 7 days (used or unused)
curl -X POST http://192.168.0.100/api/tokens/purge \
  -d "api_key=$API_KEY" \
  -d "max_age_minutes=10080"
```

**3. Emergency Cleanup of Expired Tokens**
```bash
# Remove all expired tokens to free up capacity
curl -X POST http://192.168.0.100/api/tokens/purge \
  -d "api_key=$API_KEY" \
  -d "expired_only=true"
```

#### Error Responses

**Invalid Parameters**

**Code:** `400 Bad Request`
```json
{
    "success": false,
    "error": "Invalid parameter combination"
}
```

This occurs when:
- `unused_only=true` and `expired_only=true` (mutually exclusive)
- `max_age_minutes` is negative or unreasonably large (>1 year)

**Other Errors:** Same as `/api/token` endpoint (401, 403, 400)

#### Security & Performance Notes

- **Permanent Deletion:** Purged tokens cannot be recovered
- **NVS Persistence:** Changes are immediately saved to flash storage
- **Rate Limiting:** Recommend 1-second intervals between purge operations
- **Memory Impact:** Purging many tokens at once may cause temporary memory pressure
- **Logging:** All purge operations are logged to device console with token details

---

## MAC Address Filtering

The ESP32 Portal includes MAC address filtering capabilities to manage device access:
- **Blacklist:** Block specific devices from accessing the network
- **Whitelist:** Grant VIP bypass access (no token needed after first redemption)

All MAC filtering operations enforce **mutual exclusivity** - adding a MAC to one list automatically removes it from the other.

### POST /api/mac/blacklist
Add all MAC addresses associated with a token to the blacklist. Blacklisted devices will see an "Access Denied" page and cannot access the network.

#### Request

**Content-Type:** `application/x-www-form-urlencoded`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | string | Yes | Your 32-character API key |
| `token` | string | Yes | 8-character token to extract MACs from |
| `reason` | string | No | Reason for blocking (max 31 chars, default: "Blocked by admin") |

#### Example Requests

**cURL:**
```bash
curl -X POST http://192.168.0.100/api/mac/blacklist \
  -d "api_key=abcd1234efgh5678ijkl9012mnop3456" \
  -d "token=A3K9M7P2" \
  -d "reason=Policy violation"
```

**Python:**
```python
import requests

data = {
    "api_key": "abcd1234efgh5678ijkl9012mnop3456",
    "token": "A3K9M7P2",
    "reason": "Policy violation"
}

response = requests.post('http://192.168.0.100/api/mac/blacklist', data=data)
result = response.json()

if result['success']:
    print(f"Blacklisted {result['count']} MAC address(es)")
```

#### Success Response

**Code:** `200 OK`

```json
{
    "success": true,
    "message": "Added 2 MAC(s) to blacklist",
    "count": 2
}
```

#### Error Responses

**Token Not Found**

**Code:** `404 Not Found`
```json
{
    "success": false,
    "error": "Token not found",
    "error_code": "TOKEN_NOT_FOUND"
}
```

**No MACs to Blacklist**

**Code:** `400 Bad Request`
```json
{
    "success": false,
    "error": "Token has no client MACs to blacklist"
}
```

**Other Errors:** Same as other API endpoints (401, 403, 400 for missing parameters)

---

### POST /api/mac/whitelist
Add all MAC addresses associated with a token to the whitelist. Whitelisted devices receive VIP bypass access - they can use the internet without needing to redeem a token after their first use.

#### Request

**Content-Type:** `application/x-www-form-urlencoded`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | string | Yes | Your 32-character API key |
| `token` | string | Yes | 8-character token to extract MACs from |
| `note` | string | No | Note about the whitelist entry (max 31 chars, default: "VIP access") |

#### Example Requests

**cURL:**
```bash
curl -X POST http://192.168.0.100/api/mac/whitelist \
  -d "api_key=abcd1234efgh5678ijkl9012mnop3456" \
  -d "token=A3K9M7P2" \
  -d "note=Premium customer"
```

**Python:**
```python
import requests

data = {
    "api_key": "abcd1234efgh5678ijkl9012mnop3456",
    "token": "A3K9M7P2",
    "note": "Premium customer"
}

response = requests.post('http://192.168.0.100/api/mac/whitelist', data=data)
result = response.json()

if result['success']:
    print(f"Whitelisted {result['count']} MAC address(es) for VIP bypass")
```

#### Success Response

**Code:** `200 OK`

```json
{
    "success": true,
    "message": "Added 2 MAC(s) to whitelist (VIP bypass)",
    "count": 2
}
```

#### Error Responses

Same as `/api/mac/blacklist` endpoint.

---

### GET /api/mac/list
Retrieve blacklist and/or whitelist entries with their associated metadata. You can request both lists, or filter to show only blacklist or whitelist entries.

#### Request

**Method:** GET

**Authentication:** Required (API key)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | string | Yes | Your 32-character API key |
| `list` | string | No | Filter results: `blacklist`, `whitelist`, or `both` (default: `both`) |

#### Example Requests

**Get both lists (default behavior):**
```bash
curl -X GET "http://192.168.0.100/api/mac/list?api_key=abcd1234efgh5678ijkl9012mnop3456"
```

**Get only blacklist:**
```bash
curl -X GET "http://192.168.0.100/api/mac/list?api_key=abcd1234efgh5678ijkl9012mnop3456&list=blacklist"
```

**Get only whitelist:**
```bash
curl -X GET "http://192.168.0.100/api/mac/list?api_key=abcd1234efgh5678ijkl9012mnop3456&list=whitelist"
```

**Python:**
```python
import requests

# Get both lists
params = {"api_key": "abcd1234efgh5678ijkl9012mnop3456"}
response = requests.get('http://192.168.0.100/api/mac/list', params=params)
data = response.json()

if 'blacklist' in data:
    print(f"Blacklist: {data['blacklist_count']} entries")
    for entry in data['blacklist']:
        print(f"  {entry['mac']}: {entry['note']}")

if 'whitelist' in data:
    print(f"\nWhitelist: {data['whitelist_count']} entries")
    for entry in data['whitelist']:
        print(f"  {entry['mac']}: {entry['note']}")

# Get only blacklist
params = {"api_key": "abcd1234efgh5678ijkl9012mnop3456", "list": "blacklist"}
response = requests.get('http://192.168.0.100/api/mac/list', params=params)
blacklist_data = response.json()
```

#### Success Response

**Both lists (default):**
```json
{
    "success": true,
    "blacklist": [
        {
            "mac": "AA:BB:CC:DD:EE:FF",
            "token": "A3K9M7P2",
            "note": "Policy violation - John Doe",
            "added": 1702234567
        }
    ],
    "whitelist": [
        {
            "mac": "11:22:33:44:55:66",
            "token": "B7X2K9F1",
            "note": "Premium customer",
            "added": 1702234890
        }
    ],
    "blacklist_count": 1,
    "whitelist_count": 1,
    "requested_list": "both"
}
```

**Blacklist only:**
```json
{
    "success": true,
    "blacklist": [
        {
            "mac": "AA:BB:CC:DD:EE:FF",
            "token": "A3K9M7P2",
            "note": "Policy violation - John Doe",
            "added": 1702234567
        }
    ],
    "blacklist_count": 1,
    "whitelist_count": 1,
    "requested_list": "blacklist"
}
```

**Whitelist only:**
```json
{
    "success": true,
    "whitelist": [
        {
            "mac": "11:22:33:44:55:66",
            "token": "B7X2K9F1",
            "note": "Premium customer",
            "added": 1702234890
        }
    ],
    "blacklist_count": 1,
    "whitelist_count": 1,
    "requested_list": "whitelist"
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `blacklist` | array | Array of blacklist entries (only present if requested) |
| `whitelist` | array | Array of whitelist entries (only present if requested) |
| `blacklist_count` | integer | Total number of blacklisted MACs |
| `whitelist_count` | integer | Total number of whitelisted MACs |
| `requested_list` | string | Which list was requested (`both`, `blacklist`, or `whitelist`) |

**Blacklist Entry Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `mac` | string | MAC address (format: XX:XX:XX:XX:XX:XX) |
| `token` | string | Token that was used to add this MAC |
| `reason` | string | Reason for blocking (max 31 chars) |
| `added` | integer | Unix timestamp when entry was added |

**Whitelist Entry Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `mac` | string | MAC address (format: XX:XX:XX:XX:XX:XX) |
| `token` | string | Token that was used to add this MAC |
| `note` | string | Note about the whitelist entry (max 31 chars) |
| `added` | integer | Unix timestamp when entry was added |

#### Error Responses

**Invalid list parameter:**

**Code:** `400 Bad Request`
```json
{
    "success": false,
    "error": "Invalid list parameter. Use 'blacklist', 'whitelist', or 'both'"
}
```

---

### POST /api/mac/remove
Remove a MAC address from the blacklist, whitelist, or both.

#### Request

**Content-Type:** `application/x-www-form-urlencoded`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | string | Yes | Your 32-character API key |
| `mac` | string | Yes | MAC address to remove (format: XX:XX:XX:XX:XX:XX) |
| `list` | string | No | Which list to remove from: "blacklist", "whitelist", or "both" (default: "both") |

#### Example Requests

**cURL - Remove from both lists:**
```bash
curl -X POST http://192.168.0.100/api/mac/remove \
  -d "api_key=abcd1234efgh5678ijkl9012mnop3456" \
  -d "mac=AA:BB:CC:DD:EE:FF"
```

**cURL - Remove from blacklist only:**
```bash
curl -X POST http://192.168.0.100/api/mac/remove \
  -d "api_key=abcd1234efgh5678ijkl9012mnop3456" \
  -d "mac=AA:BB:CC:DD:EE:FF" \
  -d "list=blacklist"
```

**Python:**
```python
import requests

# Remove from both lists
data = {
    "api_key": "abcd1234efgh5678ijkl9012mnop3456",
    "mac": "AA:BB:CC:DD:EE:FF",
    "list": "both"
}

response = requests.post('http://192.168.0.100/api/mac/remove', data=data)
result = response.json()

if result['success']:
    print(f"MAC removed from {data['list']}")
```

#### Success Response

**Code:** `200 OK`

```json
{
    "success": true,
    "message": "MAC removed from both"
}
```

#### Error Responses

**MAC Not Found**

**Code:** `404 Not Found`
```json
{
    "success": false,
    "error": "MAC not found in specified list(s)"
}
```

**Invalid MAC Format**

**Code:** `400 Bad Request`
```json
{
    "success": false,
    "error": "Invalid MAC address format (use XX:XX:XX:XX:XX:XX)"
}
```

---

### POST /api/mac/clear
Clear all entries from the blacklist, whitelist, or both. Use with caution - this operation cannot be undone.

#### Request

**Content-Type:** `application/x-www-form-urlencoded`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | string | Yes | Your 32-character API key |
| `list` | string | No | Which list to clear: "blacklist", "whitelist", or "both" (default: "both") |

#### Example Requests

**cURL - Clear both lists:**
```bash
curl -X POST http://192.168.0.100/api/mac/clear \
  -d "api_key=abcd1234efgh5678ijkl9012mnop3456"
```

**cURL - Clear blacklist only:**
```bash
curl -X POST http://192.168.0.100/api/mac/clear \
  -d "api_key=abcd1234efgh5678ijkl9012mnop3456" \
  -d "list=blacklist"
```

**Python:**
```python
import requests

data = {
    "api_key": "abcd1234efgh5678ijkl9012mnop3456",
    "list": "blacklist"
}

response = requests.post('http://192.168.0.100/api/mac/clear', data=data)
result = response.json()

if result['success']:
    print(f"Cleared {result['entries_removed']} entries from {data['list']}")
```

#### Success Response

**Code:** `200 OK`

```json
{
    "success": true,
    "message": "Cleared blacklist",
    "entries_removed": 5
}
```

---

### MAC Filtering Use Cases

**1. Block Abusive Users**
```python
# Block all devices used by a specific token
def block_token_devices(api_key, esp32_ip, token, reason):
    response = requests.post(
        f'http://{esp32_ip}/api/mac/blacklist',
        data={
            'api_key': api_key,
            'token': token,
            'reason': reason
        }
    )
    return response.json()

# Example: Block excessive bandwidth user
block_token_devices(
    'your_api_key',
    '192.168.0.100',
    'A3K9M7P2',
    'Excessive bandwidth usage'
)
```

**2. VIP Customer Management**
```python
# Grant VIP access to premium customers
def grant_vip_access(api_key, esp32_ip, token, note):
    response = requests.post(
        f'http://{esp32_ip}/api/mac/whitelist',
        data={
            'api_key': api_key,
            'token': token,
            'note': note
        }
    )
    return response.json()

# Example: Add premium customer
grant_vip_access(
    'your_api_key',
    '192.168.0.100',
    'B7X2K9F1',
    'Premium subscription'
)
```

**3. Audit MAC Filters**
```python
# Generate report of all filtered MACs
def audit_mac_filters(api_key, esp32_ip):
    response = requests.get(
        f'http://{esp32_ip}/api/mac/list',
        params={'api_key': api_key}
    )
    data = response.json()
    
    print(f"Blacklisted Devices: {data['blacklist_count']}")
    for entry in data['blacklist']:
        print(f"  {entry['mac']}: {entry['reason']} (added: {entry['added']})")
    
    print(f"\nVIP Devices: {data['whitelist_count']}")
    for entry in data['whitelist']:
        print(f"  {entry['mac']}: {entry['note']} (added: {entry['added']})")

audit_mac_filters('your_api_key', '192.168.0.100')
```

**4. Temporary Block with Auto-Unblock**
```python
import time

# Block device temporarily
def temporary_block(api_key, esp32_ip, mac, duration_minutes, reason):
    # Add to blacklist
    requests.post(
        f'http://{esp32_ip}/api/mac/blacklist',
        data={'api_key': api_key, 'token': 'TEMP0001', 'reason': reason}
    )
    
    print(f"Blocked {mac} for {duration_minutes} minutes")
    
    # Wait
    time.sleep(duration_minutes * 60)
    
    # Remove from blacklist
    requests.post(
        f'http://{esp32_ip}/api/mac/remove',
        data={'api_key': api_key, 'mac': mac, 'list': 'blacklist'}
    )
    
    print(f"Unblocked {mac}")

# Example: 30-minute timeout
temporary_block(
    'your_api_key',
    '192.168.0.100',
    'AA:BB:CC:DD:EE:FF',
    30,
    'Rate limit exceeded'
)
```

---

## Error Code Reference

All API endpoints may return the following standard error codes:

| Error Code | HTTP Status | Description | Resolution | Retry? |
|------------|-------------|-------------|------------|--------|
| `SERVER_BUSY` | 503 | Server processing another request | Wait and retry after delay in `Retry-After` header | **Yes** (5s) |
| `TOKEN_NOT_FOUND` | 404 | Token doesn't exist or has been disabled | Check token spelling, verify it wasn't disabled, or create a new token | No |
| `ENDPOINT_NOT_FOUND` | 404 | Invalid API endpoint | Verify URL path matches documented endpoints exactly | No |
| `NO_SLOTS_AVAILABLE` | 507 | Maximum token limit reached | Clean up expired tokens or increase capacity | No |
| `CREATION_FAILED` | 500 | Failed to create token in memory | Check system resources, retry operation | Maybe |
| `STORAGE_FAILED` | 500 | Failed to persist tokens to NVS | Check storage health, retry operation | Yes |
| N/A (Invalid API key) | 401 | API key is incorrect | Verify API key from admin dashboard, regenerate if needed | No |
| N/A (Forbidden) | 403 | Request from guest network | Make API calls from uplink network only | No |
| N/A (Bad Request) | 400 | Missing or invalid parameters | Check required parameters and value formats | No |
| N/A (Duration negative) | 400 | Duration parameter is negative | Use positive values: 30 ≤ duration ≤ 43200 | No |
| N/A (Bandwidth negative) | 400 | Bandwidth parameter is negative | Use positive values or omit parameter for unlimited | No |

### Handling ENDPOINT_NOT_FOUND

All invalid API endpoints return a `404 Not Found` response with an `ENDPOINT_NOT_FOUND` error:

**Request Example:**
```bash
curl -X POST http://192.168.0.100/api/invalid/path \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "api_key=your_api_key_here"
```

**Response:**
```json
{
    "success": false,
    "error": "ENDPOINT_NOT_FOUND"
}
```

**Common Mistakes:**
- Typos in endpoint path (e.g., `/api/token/crete` instead of `/api/token/create`)
- Using GET instead of POST for API endpoints
- Accessing endpoints that don't exist (e.g., `/api/token/list`)

**Valid API Endpoints:**
- `POST /api/token` - Create new token
- `POST /api/tokens/bulk_create` - Create multiple tokens
- `POST /api/token/extend` - Reset/extend token
- `GET /api/token/info` - Query single token information
- `GET /api/token/batch_info` - Query multiple tokens information
- `POST /api/token/disable` - Disable multiple tokens (bulk)
- `GET /api/tokens/list` - List all tokens
- `POST /api/mac/blacklist` - Block devices
- `POST /api/mac/whitelist` - Grant VIP access
- `GET /api/mac/list` - List MAC filters
- `POST /api/mac/remove` - Remove MAC from filter
- `POST /api/mac/clear` - Clear MAC filters
- `GET /api/uptime` - Device uptime
- `GET /api/health` - System health metrics
- `GET /api/tokens/available_slots` - Check available token slots
- `GET /api/ap/info` - Access Point information (public)
- `POST /admin/reset_tokens` - Reset all tokens (admin only)
- `POST /admin/ota` - Upload firmware for OTA update (admin only)

### Handling TOKEN_NOT_FOUND

When you receive a `TOKEN_NOT_FOUND` error, your application should:

1. **For `/api/token/info`**: Notify that the token is invalid or has been removed
2. **For `/api/token/disable`**: Treat as success (token is already disabled)
3. **For `/api/token/extend`**: Offer to create a new token instead of extending

**Example Error Handling (Python):**
```python
def extend_token_with_fallback(api_key, token):
    """Try to extend token, create new one if it doesn't exist"""
    try:
        response = requests.post(
            'http://192.168.0.100/api/token/extend',
            data={'api_key': api_key, 'token': token}
        )
        
        if response.status_code == 404:
            # Token not found - create a new one instead
            print(f"Token {token} not found, creating new token...")
            return create_new_token(api_key, duration=120)
        
        response.raise_for_status()
        return response.json()
        
    except requests.exceptions.RequestException as e:
        print(f"Error: {e}")
        return None
```

### Handling SERVER_BUSY (503)

The ESP32 processes token operations sequentially to ensure data integrity. When a request arrives while another operation is in progress, the server returns a `503 Service Unavailable` response.

**When This Occurs:**
- During bulk token creation (creating 50 tokens may take 1-3 seconds)
- During token disable/extend/purge operations
- When administrative token reset is in progress

**Response Headers:**
- `Retry-After: 5` - Number of seconds to wait before retrying

**Response Body:**
```json
{
  "success": false,
  "error": "Server busy processing tokens",
  "error_code": "SERVER_BUSY",
  "retry_after": 5
}
```

**Client Implementation - REQUIRED:**

All clients **must** implement retry logic for 503 responses. Here are examples in different languages:

**Python with Retry Logic:**
```python
import requests
import time

def create_token_with_retry(api_key, duration, bandwidth_down, bandwidth_up, max_retries=3):
    """Create token with automatic retry on 503"""
    url = "http://192.168.0.100/api/token"
    data = {
        "api_key": api_key,
        "duration": duration,
        "bandwidth_down": bandwidth_down,
        "bandwidth_up": bandwidth_up
    }

    for attempt in range(max_retries):
        response = requests.post(url, data=data)

        if response.status_code == 503:
            # Server busy - extract retry delay
            retry_after = int(response.headers.get('Retry-After', 5))
            data = response.json()
            print(f"Server busy (attempt {attempt + 1}/{max_retries}), "
                  f"retrying in {retry_after} seconds...")
            time.sleep(retry_after)
            continue

        # Success or other error - return result
        return response.json()

    # All retries exhausted
    raise Exception(f"Server busy after {max_retries} attempts")

# Usage
try:
    result = create_token_with_retry(
        api_key="your_api_key",
        duration=120,
        bandwidth_down=500,
        bandwidth_up=100
    )
    print(f"Token created: {result['token']}")
except Exception as e:
    print(f"Failed: {e}")
```

**JavaScript/Node.js with Retry Logic:**
```javascript
async function createTokenWithRetry(apiKey, duration, bandwidthDown, bandwidthUp, maxRetries = 3) {
    const url = "http://192.168.0.100/api/token";
    const params = new URLSearchParams({
        api_key: apiKey,
        duration: duration,
        bandwidth_down: bandwidthDown,
        bandwidth_up: bandwidthUp
    });

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params
        });

        if (response.status === 503) {
            const retryAfter = parseInt(response.headers.get('Retry-After') || '5');
            const data = await response.json();
            console.log(`Server busy (attempt ${attempt + 1}/${maxRetries}), ` +
                       `retrying in ${retryAfter} seconds...`);
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            continue;
        }

        // Success or other error
        return await response.json();
    }

    throw new Error(`Server busy after ${maxRetries} attempts`);
}

// Usage
try {
    const result = await createTokenWithRetry("your_api_key", 120, 500, 100);
    console.log(`Token created: ${result.token}`);
} catch (error) {
    console.error(`Failed: ${error.message}`);
}
```

**cURL with Retry (Bash Script):**
```bash
#!/bin/bash

API_KEY="your_api_key"
URL="http://192.168.0.100/api/token"
MAX_RETRIES=3

for ((attempt=1; attempt<=MAX_RETRIES; attempt++)); do
    response=$(curl -s -w "\n%{http_code}" -X POST "$URL" \
        -d "api_key=$API_KEY" \
        -d "duration=120" \
        -d "bandwidth_down=500" \
        -d "bandwidth_up=100")

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" = "503" ]; then
        echo "Server busy (attempt $attempt/$MAX_RETRIES), retrying in 5 seconds..."
        sleep 5
        continue
    fi

    echo "$body"
    exit 0
done

echo "Error: Server busy after $MAX_RETRIES attempts"
exit 1
```

**Best Practices for 503 Handling:**

1. **Always Retry:** 503 is a temporary condition - implement automatic retry
2. **Respect Retry-After:** Use the header value (typically 5 seconds)
3. **Limit Retries:** Maximum 3 attempts recommended to avoid infinite loops
4. **Log Occurrences:** Track 503 frequency to identify peak usage times
5. **User Feedback:** Show "Processing, please wait..." during retries
6. **Exponential Backoff (Optional):** For high-traffic scenarios, increase delay on each retry

**When to Investigate:**

- **Frequent 503s:** If you receive 503 responses on >10% of requests, consider:
  - Implementing client-side request queuing
  - Spacing out bulk operations
  - Checking for multiple concurrent clients

- **Always 503:** If all requests return 503, check:
  - Another process might have deadlocked the system
  - Device may need restart
  - Check device logs via serial monitor

---

**Missing Parameters**

**Code:** `400 Bad Request`
```json
{
    "success": false,
    "error": "Missing required parameters"
}
```

## Token Usage

### Guest Login Process
1. Guest connects to ESP32-Guest-Portal WiFi
2. Guest navigates to any HTTP website (gets redirected)
3. Guest enters the 8-character token on the portal page
4. Token is validated and guest gets internet access

### Token Properties
- **Format:** 8 uppercase alphanumeric characters (excludes confusing chars like O, 0, I, l)
- **First Use:** Timer starts when token is first used, not when created
- **Device Binding:** Token remembers which devices used it (max 2)
- **Expiration:** Token expires when:
  - Time limit is reached (from first use)
  - Download bandwidth limit is reached
  - Upload bandwidth limit is reached

### Token States
- **Created:** Token generated but never used
- **Active:** Token in use, not expired
- **Expired:** Time or bandwidth limit reached

## Admin Dashboard Features

### Quick Token Generation
The admin dashboard provides a simplified token generation form:
- **Location:** http://192.168.4.1/admin (AP network only)
- **Duration Options:** 30min, 1h, 2h, 4h, 8h, 12h
- **Bandwidth:** Unlimited (for quick generation)
- **No API Key Required:** Admin authentication only

### API Key Management
- **View API Key:** Displayed in admin dashboard
- **Regenerate Key:** Creates new key, invalidates old one
- **Security:** Only accessible when logged into admin

### Session Management
- **Auto-Logout:** 5 minutes of inactivity
- **Manual Logout:** Button in dashboard header
- **Session Tracking:** All admin actions update activity timestamp

### Password Management
- **Change Password:** In admin dashboard
- **Requirements:** Minimum 6 characters
- **Verification:** Must enter old password
- **Storage:** Securely stored in NVS flash

### Access Point (AP) SSID Customization
The admin dashboard allows you to customize the WiFi network name (SSID) that guests connect to.

#### Features
- **Custom SSID:** Change the captive portal WiFi network name from default "ESP32-Guest-Portal" to your preferred name
- **Persistent Storage:** SSID is saved to NVS flash and persists across device reboots
- **Secure Change:** Requires admin password verification before changing
- **Device Reboot:** ESP32 reboots automatically to apply new SSID (takes 30-60 seconds)
- **Validation:** Enforces WiFi standard (1-32 printable ASCII characters)
- **Location:** http://192.168.4.1/admin → "Access Point Settings" card

#### Usage
1. Log in to admin dashboard at http://192.168.4.1/admin
2. Scroll to the "Access Point Settings" card
3. **Enter your admin password** (required for security)
4. Enter your desired SSID (1-32 characters)
5. Click "Update AP SSID" (red button indicates critical action)
6. Confirm the reboot warning
7. **Wait 30-60 seconds** for ESP32 to reboot
8. Reconnect to the new SSID and access admin dashboard again

#### SSID Requirements
- **Length:** 1-32 characters
- **Characters:** Printable ASCII only (letters, numbers, spaces, symbols)
- **Examples:** 
  - ✅ `"Hotel WiFi"`
  - ✅ `"Cafe-Guest-2024"`
  - ✅ `"Welcome @ Our Store!"`
  - ❌ `""` (empty)
  - ❌ `"ThisSSIDIsWayTooLongAndExceedsTheMaximum"` (>32 chars)

#### Behavior
- **Password Required:** Must enter admin password to authorize the change
- **Device Reboot:** ESP32 performs full restart to apply new SSID (30-60 seconds)
- **All Users Disconnected:** Admin and all guests will be dropped during reboot
- **Router Reconnection:** STA uplink automatically reconnects to router after reboot
- **Admin Dashboard:** Accessible again at http://192.168.4.1/admin after reconnecting to new SSID
- **Captive Portal:** Fully functional with new SSID after reboot completes

#### Use Cases
**Hotel/Venue Branding:**
```
SSID: "Grand Hotel WiFi"
- Provides professional branding
- Easy for guests to identify
```

**Multi-Location Deployments:**
```
Location 1: "Cafe Downtown"
Location 2: "Cafe Uptown"
Location 3: "Cafe Airport"
- Helps identify which location's WiFi
```

**Event-Specific Networks:**
```
SSID: "Conference 2024"
- Temporary event branding
- Easy to change after event
```

**Language Localization:**
```
SSID: "WiFi Gratuit" (French for "Free WiFi")
SSID: "WiFi Gratis" (Spanish)
- Localize for your region
```

#### Technical Details
- **Default SSID:** `"ESP32-Guest-Portal"`
- **NVS Key:** `ap_ssid`
- **Storage:** 33 bytes (32 chars + null terminator)
- **Endpoint:** `POST /admin/set_ap_ssid` (requires session + password)
- **Parameters:** `admin_password` (required), `ssid` (required, 1-32 chars)
- **Validation Function:** `is_valid_ssid()`
- **Action:** Saves to NVS → Sends response → Delays 500ms → Reboots ESP32
- **Reboot Time:** ~30-60 seconds to fully restart and reconnect to router

#### Troubleshooting

**Problem: "Incorrect admin password" error**
- **Solution:** Verify you're entering the correct admin password
- **Check:** Admin password is case-sensitive

**Problem: Can't connect after changing SSID**
- **Solution:** Wait full 60 seconds for reboot to complete
- **Check:** Look for the new network name in your WiFi list
- **Verify:** ESP32 may take 30-45 seconds to reconnect to router after reboot

**Problem: Admin dashboard not accessible after reboot**
- **Solution:** Connect to the new SSID first, then navigate to http://192.168.4.1/admin
- **Wait:** Give ESP32 time to fully boot and establish network

**Problem: SSID change rejected**
- **Solution:** Check SSID length (1-32 chars) and use only printable ASCII
- **Avoid:** Control characters, extended Unicode, emoji

**Problem: Guests can't find the network**
- **Solution:** Ensure SSID is memorable and clearly communicated
- **Tip:** Display the SSID prominently (signs, receipts, staff training)

## Network Requirements

### API Access Rules
- **Allowed:** Requests from uplink network (e.g., 192.168.0.x)
- **Blocked:** Requests from AP network (192.168.4.x)
- **Reason:** Security - prevents guests from creating their own tokens

---

## Admin API Endpoints

Admin API endpoints require an active admin session (login to dashboard) and are used for system management operations. These endpoints are not accessible via the public API key system.

### POST /admin/reset_tokens

**Reset all tokens in the system.** This endpoint completely clears all active tokens, resetting the token database to an empty state. Use with extreme caution as this action cannot be undone.

#### Request

**Method:** POST

**Authentication:** Requires active admin session (login to dashboard)

**Content-Type:** `application/x-www-form-urlencoded`

**Parameters:** None required (confirmation via session authentication)

#### Example Request

**cURL:**
```bash
curl -X POST http://192.168.4.1/admin/reset_tokens \
  -H "Cookie: session_id=your_session_cookie"
```

**Note:** This endpoint is only accessible through the admin dashboard interface, not directly via HTTP requests. The admin dashboard provides a confirmation dialog before executing this destructive operation.

#### Success Response

**Code:** `200 OK`

**Content-Type:** `application/json`

```json
{
    "success": true,
    "message": "All tokens reset",
    "tokens_removed": 42
}
```

#### Error Responses

**Session Expired**

**Code:** `401 Unauthorized`
```json
{
    "success": false,
    "error": "Session expired"
}
```

#### Security Considerations

- **Destructive Operation:** Completely removes all tokens
- **No Undo:** Cannot be reversed
- **Admin Only:** Requires active dashboard session
- **Confirmation Required:** Admin dashboard shows confirmation dialog
- **Audit Logging:** Action is logged with timestamp

#### Use Cases

- **System Reset:** Clear all tokens during system maintenance
- **Security Incident:** Emergency token revocation
- **Testing:** Reset system to clean state for testing
- **Migration:** Clear tokens before major system changes

**Warning:** This operation immediately disconnects all users and invalidates all active tokens. Users will need new tokens to regain access.

---

### POST /admin/ota

**Upload and install firmware via Over-The-Air (OTA) update.** This endpoint allows administrators to update the ESP32 firmware remotely through the web interface. The update process includes validation, flashing, and automatic reboot.

#### Request

**Method:** POST

**Authentication:** Requires active admin session (login to dashboard)

**Content-Type:** `multipart/form-data`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `firmware` | file | Yes | Firmware binary file (.bin format, max 1MB) |

#### File Requirements

- **Format:** Must be a valid ESP32 firmware binary (.bin file) with correct magic bytes (0xE9)
- **Size Limit:** Maximum 1MB, must fit in OTA partition with at least 64KB free space
- **Compatibility:** Must be built for the same ESP32 model and partition layout
- **Validation:** Automatic validation of binary format, size, and partition compatibility
- **Integrity:** Basic binary structure validation (segment count, headers)

#### Firmware Validation Process

Before accepting the firmware, the system performs several validation checks:

1. **Size Validation:** Ensures firmware fits in available OTA partition space
2. **Format Validation:** Verifies ESP32 binary magic bytes and structure
3. **Partition Compatibility:** Confirms sufficient space in target partition
4. **Basic Integrity:** Checks for reasonable binary structure and segment counts

#### Example Request

**Admin Dashboard:** Use the "Firmware Update" card in the admin dashboard to upload and install firmware. The interface provides:
- File selection with .bin validation
- Progress bar during upload
- Firmware validation feedback
- Confirmation dialog before proceeding
- Automatic reboot notification

#### Success Response

**Code:** `200 OK`

**Content-Type:** `application/json`

```json
{
    "success": true,
    "message": "Firmware updated successfully. Rebooting in 5 seconds...",
    "partition": "ota_1",
    "size": 917504
}
```

#### Error Responses

**Firmware Validation Failed**

**Code:** `400 Bad Request`
```json
{
    "success": false,
    "error": "Firmware validation failed. Invalid or incompatible binary."
}
```

**Invalid Firmware Size**

**Code:** `400 Bad Request`
```json
{
    "success": false,
    "error": "Invalid firmware size"
}
```

**Session Expired**

**Code:** `401 Unauthorized`
```json
{
    "success": false,
    "error": "Session expired"
}
```

**OTA Already in Progress**

**Code:** `409 Conflict`
```json
{
    "success": false,
    "error": "OTA update already in progress"
}
```

**Invalid File Format**

**Code:** `400 Bad Request`
```json
{
    "success": false,
    "error": "No firmware file found"
}
```

**No OTA Partition Available**

**Code:** `500 Internal Server Error`
```json
{
    "success": false,
    "error": "No OTA partition available"
}
```

**OTA Begin Failed**

**Code:** `500 Internal Server Error`
```json
{
    "success": false,
    "error": "Failed to begin OTA: ESP_ERR_INVALID_SIZE"
}
```

**OTA Write Failed**

**Code:** `500 Internal Server Error`
```json
{
    "success": false,
    "error": "Failed to write firmware: ESP_ERR_OTA_VALIDATE_FAILED"
}
```

**OTA End Failed**

**Code:** `500 Internal Server Error`
```json
{
    "success": false,
    "error": "Failed to end OTA: ESP_ERR_OTA_SELECT_PARTITION"
}
```

**Boot Partition Set Failed**

**Code:** `500 Internal Server Error`
```json
{
    "success": false,
    "error": "Failed to set boot partition: ESP_ERR_OTA_SET_BOOT_PARTITION"
}
```

#### Process Flow

1. **File Upload:** Firmware file is uploaded via multipart form data
2. **Pre-Validation:** File size, format, and partition compatibility are validated
3. **OTA Begin:** ESP32 OTA subsystem is initialized
4. **Write Firmware:** Firmware data is written to the inactive OTA partition
5. **OTA End:** Firmware integrity is validated
6. **Set Boot Partition:** Next boot partition is set to the updated firmware
7. **Reboot:** Device automatically reboots after 5 seconds

#### Security Considerations

- **Admin Only:** Requires active dashboard session
- **File Validation:** Strict validation of file format, size, and binary structure
- **Progress Tracking:** Real-time progress updates in admin interface
- **Automatic Reboot:** Device reboots immediately after successful update
- **Rollback:** Failed updates do not affect running firmware
- **Network Dependency:** Requires stable connection during upload

#### Use Cases

- **Remote Updates:** Update firmware without physical access
- **Bug Fixes:** Deploy security patches and bug fixes
- **Feature Updates:** Add new functionality remotely
- **Maintenance:** Regular firmware maintenance and improvements

#### Important Notes

- **Backup First:** Always backup current configuration before updating
- **Stable Connection:** Ensure reliable network connection during upload
- **Validation:** Firmware is validated before flashing to prevent bricking
- **Automatic Recovery:** Failed updates preserve current working firmware
- **Test Environment:** Test firmware updates in development first
- **Version Compatibility:** Ensure firmware is compatible with current hardware
- **Downtime:** Device will be unavailable for ~30-60 seconds during reboot
- **Dual OTA:** System uses dual OTA partitions for safe updates

---

### POST /admin/ota

**Upload and install firmware via Over-The-Air (OTA) update.** This endpoint accepts a firmware binary file and performs an OTA update, automatically rebooting the device upon successful installation.

#### Request

**Method:** POST

**Authentication:** Requires active admin session (login to dashboard)

**Content-Type:** `multipart/form-data`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `firmware` | file | Yes | ESP32 firmware binary (.bin file, max 1MB) |

#### Example Request

**HTML Form (Admin Dashboard):**
```html
<form enctype="multipart/form-data" method="post" action="/admin/ota">
  <input type="file" name="firmware" accept=".bin" required>
  <button type="submit">Upload & Update Firmware</button>
</form>
```

**Note:** This endpoint is only accessible through the admin dashboard interface. The dashboard provides file validation, progress indication, and confirmation dialogs.

#### Success Response

**Code:** `200 OK`

**Content-Type:** `application/json`

```json
{
    "success": true,
    "message": "Firmware updated successfully. Rebooting in 5 seconds...",
    "partition": "ota_0",
    "size": 917504
}
```

#### Error Responses

**Session Expired**

**Code:** `401 Unauthorized`
```json
{
    "success": false,
    "error": "Session expired"
}
```

**OTA Already In Progress**

**Code:** `409 Conflict`
```json
{
    "success": false,
    "error": "OTA update already in progress"
}
```

**Invalid Firmware File**

**Code:** `400 Bad Request`
```json
{
    "success": false,
    "error": "Invalid firmware size"
}
```

**OTA Write Failed**

**Code:** `500 Internal Server Error`
```json
{
    "success": false,
    "error": "Failed to write firmware: ESP_ERR_OTA_INVALID_BOOT_PARTITION"
}
```

#### Security Considerations

- **Admin Only:** Requires active dashboard session
- **File Validation:** Validates file size (max 1MB) and format
- **Confirmation Required:** Admin dashboard shows warning dialog
- **Automatic Reboot:** Device reboots immediately after successful update
- **Audit Logging:** Action is logged with firmware size and partition info

#### Use Cases

- **Firmware Updates:** Deploy new features and bug fixes
- **Security Patches:** Apply critical security updates
- **Feature Deployment:** Roll out new capabilities
- **Bug Fixes:** Address issues without physical access

#### Important Notes

- **Device Reboot:** ESP32 automatically reboots 5 seconds after successful update
- **Network Disruption:** All connections are dropped during reboot
- **Recovery:** If update fails, device rolls back to previous firmware
- **File Format:** Must be valid ESP32 firmware binary (.bin)
- **Size Limit:** Maximum 1MB firmware size
- **Dual OTA:** Uses dual OTA partitions for safe updates

---

````

### Admin Access Rules
- **Admin Dashboard:** Only accessible from AP network (192.168.4.x)
- **WiFi Config:** Requires admin password
- **API Endpoints:** Require admin session login

## Rate Limiting and Concurrency

### Concurrency Control
The ESP32 processes token operations **sequentially** using mutex-based concurrency control:

- **Single Operation at a Time:** Only one token modification request (create, bulk create, disable, extend, purge, reset) is processed at any given time
- **Automatic Rejection:** Concurrent requests return `503 Service Unavailable` with `Retry-After: 5` header
- **Client Retry Required:** Clients must implement retry logic (see [Handling SERVER_BUSY](#handling-server_busy-503))

### Performance Characteristics

| Operation | Typical Duration | Concurrent Request Handling |
|-----------|------------------|----------------------------|
| Single token creation | <100ms | Returns 503 to concurrent requests |
| Bulk create (10 tokens) | ~500ms | Returns 503 to concurrent requests |
| Bulk create (50 tokens) | 1-3 seconds | Returns 503 to concurrent requests |
| Token disable/extend | <100ms | Returns 503 to concurrent requests |
| Token purge | 100ms-1s | Returns 503 to concurrent requests |
| Admin reset | <200ms | Returns 503 to concurrent requests |

### Application-Level Rate Limiting
While the device doesn't enforce rate limiting, consider implementing these strategies in your application:

1. **Client-Side Queueing:** Serialize requests before sending to the ESP32
2. **Request Batching:** Use bulk_create instead of multiple single token requests
3. **Backoff Strategy:** Implement exponential backoff on repeated 503 responses

## Best Practices

### Security
1. **Protect API Key:** Store securely, never commit to version control
2. **HTTPS:** Consider using a reverse proxy with HTTPS for production
3. **Regenerate Keys:** Periodically regenerate API keys
4. **Monitor Usage:** Track token creation patterns for abuse

### Token Management
1. **Set Appropriate Limits:** Match duration/bandwidth to expected usage
2. **Automatic Cleanup:** Expired tokens are automatically removed every 30 seconds (SNTP sync)
3. **Storage Capacity:** Max 230 active tokens supported (automatically cleaned up when expired)
4. **Use Extend for Renewals:** Instead of creating new tokens, extend existing ones to maintain token string consistency
5. **Monitor Status:** Use `/api/token/info` to track usage before limits are reached
6. **Graceful Revocation:** Use `/api/token/disable` for immediate access removal
7. **Device Health:** Use `/api/health` to monitor token capacity usage and system resources

### Error Handling
1. **Handle 503 Server Busy (CRITICAL):** Always implement retry logic for 503 responses
   - Retry after delay specified in `Retry-After` header (typically 5 seconds)
   - Maximum 3 retry attempts recommended
   - See detailed examples in [Handling SERVER_BUSY](#handling-server_busy-503) section
2. **Retry Logic:** Implement exponential backoff for 500-level errors and network failures
3. **Validate Responses:** Always check `success` field before using response data
4. **Log Errors:** Keep track of API failures for debugging and monitoring
5. **Handle TOKEN_NOT_FOUND:** Design graceful fallbacks when tokens are unavailable:
   - For info queries: Notify user token is invalid
   - For disable: Treat as success (already disabled)
   - For extend: Offer to create new token instead
6. **Network Errors:** Handle connection timeouts and network issues gracefully
7. **Monitor 503 Frequency:** If >10% of requests return 503, implement client-side queuing

### API Integration
1. **Implement 503 Retry Logic:** This is **mandatory** - all clients must handle 503 responses (see examples above)
2. **Check Before Extend:** Use `/api/token/info` to verify token exists before extending
3. **Use Bulk Create:** For multiple tokens, use `/api/tokens/bulk_create` instead of repeated single requests
4. **Client-Side Queuing:** Implement request queuing to serialize operations and avoid 503 responses
5. **Cache API Key:** Load API key once at startup, not on every request
6. **Status Monitoring:** Poll `/api/token/info` periodically for active subscriptions
7. **Database Sync:** Store token-to-customer mappings in your database for subscription management
8. **Space Out Operations:** For high-volume scenarios, add small delays between bulk operations

## Example Integration

### Vending/Payment System
```python
def sell_wifi_access(customer, hours, mb_limit):
    """Generate WiFi token after payment"""
    try:
        response = requests.post(
            'http://192.168.0.100/api/token',
            data={
                'api_key': os.getenv('ESP32_API_KEY'),
                'duration': hours * 60,
                'bandwidth_down': mb_limit,
                'bandwidth_up': mb_limit // 2
            },
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            if data['success']:
                token = data['token']
                # Print receipt or send via SMS/email
                print(f"Your WiFi Code: {token}")
                print(f"Valid for: {hours} hours")
                print(f"Data: {mb_limit}MB")
                return token
        
        raise Exception("Token generation failed")
        
    except Exception as e:
        print(f"Error: {e}")
        return None
```

### Subscription Management System
```python
def manage_subscription(customer_id, action):
    """Handle subscription renewals and cancellations"""
    api_key = os.getenv('ESP32_API_KEY')
    token = get_customer_token(customer_id)  # From your database
    
    if action == 'renew':
        # Extend existing token
        response = requests.post(
            'http://192.168.0.100/api/token/extend',
            data={'api_key': api_key, 'token': token}
        )
        
        if response.status_code == 404:
            # Token doesn't exist, create new one
            print(f"Token expired, creating new one for {customer_id}")
            response = requests.post(
                'http://192.168.0.100/api/token',
                data={
                    'api_key': api_key,
                    'duration': 10080,  # 7 days
                    'bandwidth_down': 10000  # 10GB
                }
            )
            if response.ok and response.json()['success']:
                new_token = response.json()['token']
                update_customer_token(customer_id, new_token)
                return new_token
        
        elif response.ok:
            print(f"Token {token} extended for {customer_id}")
            return token
            
    elif action == 'cancel':
        # Disable token immediately
        response = requests.post(
            'http://192.168.0.100/api/token/disable',
            data={'api_key': api_key, 'token': token}
        )
        
        if response.status_code in [200, 404]:  # Success or already disabled
            print(f"Subscription cancelled for {customer_id}")
            return True
    
    return False

def check_token_status(token):
    """Monitor token usage for billing/alerts"""
    response = requests.get(
        'http://192.168.0.100/api/token/info',
        params={
            'api_key': os.getenv('ESP32_API_KEY'),
            'token': token
        }
    )
    
    if response.status_code == 404:
        return {'status': 'not_found', 'message': 'Token has been removed or disabled'}
    
    if response.ok:
        data = response.json()
        
        # Check if approaching limits
        if data['status'] == 'active':
            usage_percent = (data['bandwidth_used_down_mb'] / data['bandwidth_down_mb'] * 100) if data['bandwidth_down_mb'] > 0 else 0
            time_percent = ((data['duration_minutes'] * 60 - data['remaining_seconds']) / (data['duration_minutes'] * 60) * 100)
            
            if usage_percent > 80 or time_percent > 80:
                return {
                    'status': 'warning',
                    'message': 'Approaching limits',
                    'data_used': usage_percent,
                    'time_used': time_percent
                }
        
        return {'status': data['status'], 'data': data}
    
    return {'status': 'error', 'message': 'API request failed'}
```

## Support & Issues
For technical issues or feature requests, contact your system administrator or refer to the project documentation.

## Version History
- **v3.6** (2025-12-20): Enhanced Bulk Token Disable Operations & Capacity Monitoring
  - **ENHANCED:** `POST /api/token/disable` - Now supports bulk operations (up to 50 tokens per request)
  - **NEW:** `GET /api/tokens/available_slots` - Check available token slots before creation
  - Single NVS save operation for efficiency in bulk disable operations
  - Improved error handling with detailed bulk operation responses
  - Binary size: 915KB (40% free flash space remaining)

- **v3.5** (2025-12-13): Token Purge API & Enhanced Filtering
  - **NEW:** `POST /api/tokens/purge` - Automated token cleanup with age/usage filtering
  - **ENHANCED:** `GET /api/tokens/list` - Added filtering parameters (status, age, usage)
  - **NEW:** `GET /api/ap/info` - Public endpoint for AP SSID (no auth required)
  - Support for purging unused tokens, expired tokens, and tokens by age
  - Third-party integration for automated retention policies and receipt generation
  - Enhanced token lifecycle management

- **v3.4** (2025-12-13): Device Information Capture & Enhanced Abuse Tracking
  - **NEW:** Device hostname and device type detection on token authentication
  - **NEW:** Real-time device online status checking via DHCP lease monitoring
  - **NEW:** Enhanced `/api/token/info` endpoint with comprehensive device details
  - **NEW:** Expanded token partition (128KB → 160KB) to accommodate device data storage
  - Automatic device type classification (Apple iOS, Android, Windows PC, Linux, etc.)
  - On-demand device information retrieval with current IP and connection status
  - Improved abuse prevention through device identification and tracking
  - Hybrid approach: stored device info + real-time status updates
  - Binary size: 924KB (38% free flash space remaining)

- **v3.3** (2025-12-13): Over-The-Air Updates & 4MB Flash Support
  - **NEW:** `POST /admin/ota` - Firmware upload and OTA update via admin dashboard
  - **NEW:** Dual OTA partitions for safe firmware updates
  - **NEW:** Firmware update UI in admin dashboard with progress indication
  - **NEW:** 4MB flash configuration upgrade (from 2MB) for future development
  - Automatic device reboot after successful OTA update
  - Firmware validation (size limits, format checking)
  - OTA progress feedback and error handling
  - Enhanced partition table with ota_0/ota_1 partitions
  - NVS_OTA partition for OTA metadata storage
  - Binary size: 918KB (39% free flash space remaining)

- **v3.2** (2025-12-12): System Management & Bulk Operations
  - **NEW:** AP SSID Customization - Change captive portal WiFi network name via admin dashboard
  - **NEW:** MAC Address Filtering - Blacklist/whitelist device access control
  - **NEW:** `POST /api/tokens/bulk_create` - Create multiple tokens in single request (1-50 tokens)
  - **NEW:** `POST /api/mac/blacklist` - Block specific devices from network access
  - **NEW:** `POST /api/mac/whitelist` - Grant VIP bypass access (no token needed)
  - **NEW:** `GET /api/mac/list` - List all MAC filtering entries (enhanced with list filtering)
  - **NEW:** `POST /api/mac/remove` - Remove MAC from blacklist/whitelist
  - **NEW:** `POST /api/mac/clear` - Clear all MAC filtering entries
  - **NEW:** `GET /api/token/batch_info` - Query multiple tokens information (up to 50 tokens)
  - **NEW:** `POST /admin/reset_tokens` - Admin endpoint to reset all tokens in system
  - **NEW:** Custom "Access Denied" page for blacklisted devices
  - SSID validation (1-32 printable ASCII characters)
  - NVS persistence for custom SSID (survives reboots)
  - Dynamic WiFi reconfiguration without device restart
  - MAC filtering with mutual exclusivity (200 entries each list)
  - VIP bypass for whitelisted MACs (no token redemption required)
  - Token capacity expanded to 500 tokens (from 230)
  - RAM optimization: Eliminated redundant active_tokens array (36KB savings)
  - Binary size: 912KB (41% free flash space remaining)

- **v3.1** (2025-12-10): Bulk Token Management & Analytics
  - **NEW:** `GET /api/tokens/list` - List all active tokens with full metadata
  - Bulk token operations support (disable all, cleanup expired)
  - Token usage analytics and monitoring dashboard integration
  - System auditing and reporting capabilities
  - Comprehensive integration test suite (102 tests, 81% pass rate)

- **v3.0** (2025-12-10): Monitoring & Capacity Improvements
  - **NEW:** `GET /api/uptime` - System uptime monitoring (no auth required)
  - **NEW:** `GET /api/health` - Comprehensive health check endpoint
  - Increased token capacity from 50 to 230 tokens
  - Automatic token cleanup every 30 seconds (on SNTP sync)
  - HTTP response refactoring for code reuse and flash savings
  - Kubernetes/Prometheus integration examples
  - Enhanced monitoring and alerting documentation

- **v2.0** (2025-12-09): Enhanced Token Management
- **NEW:** `POST /api/token/disable` - Revoke multiple tokens instantly (bulk operation)
  - **NEW:** `GET /api/token/info` - Query token status and usage statistics
  - **NEW:** `POST /api/token/extend` - Renew/top-up existing tokens
  - **NEW:** Static IP configuration for uplink network
  - Standardized error codes (TOKEN_NOT_FOUND)
  - Improved error handling and documentation
  - Added subscription management examples

- **v1.0** (2025-12-09): Initial release
  - Token generation API
  - Bandwidth limits support
  - Device limit enforcement
  - Session management
  - Admin password management