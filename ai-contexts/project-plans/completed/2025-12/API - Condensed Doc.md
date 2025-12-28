# ESP32 Portal Token API - Condensed Documentation

## Overview
The ESP32 Portal provides a captive portal with token-based WiFi access control. Third-party applications can generate guest access tokens via REST API.

## ⚠️ CRITICAL: ESP32 Batch Size Limitation

**MAXIMUM BATCH SIZE: 20 ITEMS**

The ESP32 has strict memory constraints. **ALL batch operations are limited to 20 items maximum:**

- ✅ **Token bulk creation:** Max 20 tokens per request
- ✅ **Token batch info:** Max 20 tokens per query
- ✅ **Token disable (bulk):** Max 20 tokens per request
- ✅ **Token list pagination:** Max 20 tokens per page
- ✅ **Any array/list operations:** Max 20 items

**⚠️ EXCEEDING 20 ITEMS WILL CRASH THE ESP32 DEVICE**

### Implementation Strategy

When working with large datasets (>20 items), **you MUST use batching:**

```javascript
// Example: Disable 100 tokens
async function disableTokensBatch(tokens) {
  const BATCH_SIZE = 20;
  const results = [];

  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batch = tokens.slice(i, i + BATCH_SIZE);
    const response = await fetch('/api/token/disable', {
      method: 'POST',
      body: new URLSearchParams({
        api_key: API_KEY,
        tokens: batch.join(',')
      })
    });
    results.push(await response.json());

    // Small delay between batches to prevent overwhelming ESP32
    if (i + BATCH_SIZE < tokens.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return results;
}
```

```python
# Example: Get info for 100 tokens
def get_tokens_batch(token_list, api_key):
    BATCH_SIZE = 20
    all_results = []

    for i in range(0, len(token_list), BATCH_SIZE):
        batch = token_list[i:i + BATCH_SIZE]
        response = requests.get(
            "http://192.168.0.100/api/token/batch_info",
            params={
                "api_key": api_key,
                "tokens": ",".join(batch)
            }
        )
        all_results.extend(response.json()["tokens"])

        # Small delay between batches
        if i + BATCH_SIZE < len(token_list):
            time.sleep(0.5)

    return all_results
```

**Always check response for `has_more` flag when paginating!**

## Base URL
`http://[uplink-ip]` (Find IP in admin dashboard at `http://192.168.4.1/admin`)

## Authentication
All API requests require an API key as form parameter `api_key`.

**Get API Key:**
1. Visit `http://192.168.4.1/admin`
2. Login with admin password
3. Copy API key from "API Management" section

## Endpoints

### Token Management

#### POST /api/token
Create new access token.

**Parameters:**
- `api_key` (string, required): Your API key
- `duration` (int, required): Minutes (30-43200)
- `bandwidth_down` (int, optional): MB download limit (0=unlimited)
- `bandwidth_up` (int, optional): MB upload limit (0=unlimited)
- `businessId` (string, optional): Business identifier (max 36 chars, defaults to "550e8400-e29b-41d4-a716-446655440000")

**Response:** `{"success": true, "available_slots": 85, "token": "ABC123...", "businessId": "550e8400-e29b-41d4-a716-446655440000", "ap_ssid": "Portal-AP"}`

#### POST /api/tokens/bulk_create
Create multiple tokens at once.

**⚠️ CRITICAL: Maximum 20 tokens per request. Exceeding this will crash the ESP32.**

**Parameters:**
- `api_key` (string, required): Your API key
- `count` (int, required): Number of tokens **(1-20 MAX)**
- `duration` (int, required): Minutes per token (1-43200)
- `bandwidth_down` (int, optional): MB download limit per token (0=unlimited)
- `bandwidth_up` (int, optional): MB upload limit per token (0=unlimited)
- `businessId` (string, optional): Business identifier (max 36 chars)

**For >20 tokens:** Use multiple requests with 500ms delay between batches.

**Response:** 
```json
{
    "success": true,
    "available_slots": 80,
    "tokens_created": 5,
    "requested": 5,
    "tokens": [
        {"token": "ABC123"},
        {"token": "DEF456"}
    ],
    "businessId": "business-001",
    "duration_minutes": 720,
    "bandwidth_down_mb": 1000,
    "bandwidth_up_mb": 500,
    "ap_ssid": "Portal-AP"
}
```

#### POST /api/token/disable
Revoke multiple tokens instantly (bulk operation).

**Parameters:**
- `api_key` (string, required)
- `tokens` (string, required): Comma-separated list of tokens to disable (max 20)

**Example Request:**
```
POST /api/token/disable
Content-Type: application/x-www-form-urlencoded

api_key=your_api_key_here&tokens=ABC123,DEF456,GHI789
```

**Success Response:**
```json
{
  "success": true,
  "disabled_count": 3,
  "disabled_tokens": ["ABC123", "DEF456", "GHI789"]
}
```

**Error Responses:**
- `400 Bad Request`: No tokens specified or too many tokens (max 20)
- `401 Unauthorized`: Invalid API key
- `503 Service Unavailable`: Server busy

#### GET /api/token/info
Get token status and usage.

**Parameters:**
- `api_key` (string, required)
- `token` (string, required)

**Response:** Token details with usage statistics and device information

**Example Response:**
```json
{
  "success": true,
  "available_slots": 85,
  "token": "ABC123",
  "businessId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "active",
  "created": 1703123400,
  "first_use": 1703123450,
  "duration_minutes": 120,
  "expires_at": 1703130850,
  "remaining_seconds": 7200,
  "bandwidth_down_mb": 500,
  "bandwidth_up_mb": 100,
  "bandwidth_used_down_mb": 45,
  "bandwidth_used_up_mb": 12,
  "usage_count": 3,
  "device_count": 2,
  "max_devices": 2,
  "hostname": "iPhone-ABC123",
  "device_type": "Apple iOS",
  "first_seen": 1703123456,
  "last_seen": 1703123500,
  "devices": [
    {
      "mac": "AA:BB:CC:DD:EE:FF",
      "online": true,
      "current_ip": "192.168.4.100"
    },
    {
      "mac": "11:22:33:44:55:66",
      "online": false
    }
  ]
}
```

#### GET /api/token/batch_info
Query multiple tokens at once.

**⚠️ CRITICAL: Maximum 20 tokens per request. Exceeding this will crash the ESP32.**

**Parameters:**
- `api_key` (string, required)
- `tokens` (string, required): Comma-separated token list **(max 20 tokens)**

**For >20 tokens:** Use multiple requests with 500ms delay between batches.

#### POST /api/token/extend
Renew existing token.

**Parameters:**
- `api_key` (string, required)
- `token` (string, required)

**Note:** Resets token timer and usage counters to zero, using original duration and bandwidth limits.

### System Monitoring

#### GET /api/uptime
Get system uptime (no auth required).

**Response:** `{"success": true, "available_slots": 85, "uptime_seconds": 12345, "uptime_microseconds": 12345678901}`

#### GET /api/health
Comprehensive health check.

**Response:** `{"success": true, "available_slots": 85, "status": "healthy", "uptime_seconds": 12345, "active_tokens": 5, "max_tokens": 100, "free_heap_bytes": 245760}`

#### GET /api/tokens/available_slots
Get count of available token slots that can be created.

**Parameters:**
- `api_key` (string, required)

**Response:**
```json
{
  "success": true,
  "available_slots": 85,
  "max_tokens": 100,
  "current_tokens": 15
}
```

#### GET /api/ap/info
Get Access Point information (no auth required).

**Response:** `{"success": true, "ap_ssid": "Portal-AP"}`

#### GET /api/tokens/list
List all active tokens with metadata. Supports pagination for large token lists.

**Parameters:**
- `api_key` (string, required)
- `status` (string, optional): Filter by status ("unused", "active", "expired", "all")
- `business_id` (string, optional): Filter by business identifier (exact match)
- `min_age_minutes` (integer, optional): Only tokens older than N minutes
- `max_age_minutes` (integer, optional): Only tokens younger than N minutes
- `used_only` (boolean, optional): Only used tokens
- `unused_only` (boolean, optional): Only unused tokens
- `offset` (integer, optional): Pagination offset (default: 0)
- `limit` (integer, optional): Max tokens per page (default: 20, max: 20)

**Response:** 
```json
{
  "success": true,
  "available_slots": 85,
  "total_count": 250,
  "returned_count": 20,
  "offset": 0,
  "limit": 20,
  "has_more": true,
  "tokens": [...]
}
```

**Note:** To fetch all unused tokens, make multiple requests with increasing `offset` until `has_more` is false.

#### POST /api/tokens/purge
Purge tokens based on age/usage criteria.

**Parameters:**
- `api_key` (string, required)
- `unused_only` (boolean, optional): Only purge unused tokens
- `max_age_minutes` (integer, optional): Only purge tokens older than N minutes
- `expired_only` (boolean, optional): Only purge expired tokens

**Response:** `{"success": true, "purged_count": N, "purged_tokens": [...]}`

### MAC Address Filtering

#### POST /api/mac/blacklist
Block device by MAC address.

**Parameters:**
- `api_key` (string, required)
- `mac` (string, required): MAC address (XX:XX:XX:XX:XX:XX)
- `reason` (string, optional): Reason/note (max 31 chars)

#### POST /api/mac/whitelist
Grant VIP access (no token needed).

**Parameters:**
- `api_key` (string, required)
- `mac` (string, required): MAC address

#### GET /api/mac/list
List all MAC filtering entries.

**Parameters:**
- `api_key` (string, required)

**Response:** Array of blacklist and whitelist entries with MAC, token, note, and timestamp

#### POST /api/mac/remove
Remove MAC from blacklist/whitelist.

**Parameters:**
- `api_key` (string, required)
- `mac` (string, required)

#### POST /api/mac/clear
Clear all MAC filtering entries.

**Parameters:**
- `api_key` (string, required)
- `filter_type` (string, optional): "blacklist" or "whitelist"

### Admin Functions

#### POST /admin/reset_tokens
Reset all tokens in system (admin only).

**Parameters:**
- `session_id` (string, required): Admin session

#### POST /admin/ota
Upload firmware for OTA update (admin only).

**Parameters:**
- `session_id` (string, required)
- `firmware` (file, required): Valid ESP32 firmware binary (.bin)

**Validation:** File size, ESP32 binary format, partition compatibility

## Error Codes

| Code | Description | Retry? |
|------|-------------|--------|
| 503 | Service Unavailable - Server busy (concurrent request) | **Yes** - Wait 5s |
| 507 | Insufficient Storage - Token limit reached | No |
| 500 | Internal Server Error | Maybe |
| 404 | Not Found - Token/endpoint not found | No |
| 403 | Forbidden - Admin access required | No |
| 401 | Unauthorized - Invalid/missing API key | No |
| 400 | Bad Request - Invalid parameters | No |

### 503 Server Busy - IMPORTANT
The ESP32 processes token operations sequentially. Concurrent requests return `503` with `Retry-After: 5` header.

**All clients MUST implement retry logic:**

```python
import time

def create_token_with_retry(api_key, duration, max_retries=3):
    for attempt in range(max_retries):
        response = requests.post("http://192.168.0.100/api/token", data={
            "api_key": api_key,
            "duration": duration
        })

        if response.status_code == 503:
            retry_after = int(response.headers.get('Retry-After', 5))
            print(f"Server busy, retrying in {retry_after}s...")
            time.sleep(retry_after)
            continue

        return response.json()

    raise Exception("Server busy after retries")
```

**When 503 occurs:**
- Bulk token creation in progress (1-3 seconds for 50 tokens)
- Another token operation (disable, extend, purge)
- Admin reset in progress

See full documentation for detailed examples in Python, JavaScript, and Bash.

## Quick Examples

### Create Token (cURL)
```bash
curl -X POST http://192.168.0.100/api/token \
  -d "api_key=YOUR_API_KEY" \
  -d "duration=120" \
  -d "bandwidth_down=500"
```

### Create Token (Python)
```python
import requests

response = requests.post("http://192.168.0.100/api/token", data={
    "api_key": "YOUR_API_KEY",
    "duration": 120,
    "bandwidth_down": 500
})
token = response.json()["token"]
```

### Check Token Info
```bash
curl "http://192.168.0.100/api/token/info?api_key=YOUR_API_KEY&token=ABC123"
```

## Version History

- **v3.6** (2025-12-16): Concurrency control, batch optimizations & capacity monitoring
  - **NEW:** Mutex-based concurrency control for token operations
  - **NEW:** 503 Server Busy responses for concurrent requests
  - **NEW:** `GET /api/tokens/available_slots` - Check available token slots before creation
  - **ENHANCED:** `POST /api/token/disable` - Now supports bulk operations (up to 20 tokens)
  - **OPTIMIZED:** Bulk token creation with single NVS write (prevents watchdog reset)
  - **CRITICAL:** Clients must implement 503 retry logic (see Error Codes section)
  - **CRITICAL:** Maximum batch size is 20 items for ALL operations (exceeding will crash ESP32)
  - Performance: 20 bulk tokens now complete in 1-2 seconds reliably
  - All token modification endpoints protected with mutex

- **v3.5** (2025-12-13): Token purge API, enhanced filtering
  - **NEW:** `POST /api/tokens/purge` - Automated token cleanup with age/usage filtering
  - **ENHANCED:** `GET /api/tokens/list` - Added filtering parameters (status, age, usage)
  - **NEW:** `GET /api/ap/info` - Public endpoint for AP SSID information
  - Support for purging unused tokens, expired tokens, and tokens by age
  - Third-party integration for automated retention policies

- **v3.4** (2025-12-13): Device Information Capture
  - **NEW:** Device hostname and type detection on token authentication
  - **NEW:** Real-time device online status checking
  - **NEW:** Enhanced `/api/token/info` with device details and connection status
  - **NEW:** Expanded token partition (128KB → 160KB) for device data storage
  - Automatic device type classification (iOS, Android, Windows, Linux, etc.)
  - On-demand device information via API calls
  - Improved abuse tracking with device identification

- **v3.3** (2025-12-13): OTA updates, 4MB flash support
- **v3.2** (2025-12-12): MAC filtering, bulk token creation
- **v3.1** (2025-12-10): Bulk token management
- **v3.0** (2025-12-10): Monitoring, capacity improvements
- **v2.0** (2025-12-09): Enhanced token management
- **v1.0** (2025-12-09): Initial release

## Key Features

- **Token Capacity**: 500 tokens
- **Device Limit**: 2 devices per token
- **Duration Range**: 30 minutes to 30 days
- **Bandwidth Control**: Per-token limits
- **MAC Filtering**: Blacklist/whitelist 200 entries each
- **OTA Updates**: Firmware updates via web interface
- **Device Tracking**: Hostname, device type, and online status
- **Abuse Prevention**: Device identification and monitoring
- **Admin Dashboard**: Complete web-based management