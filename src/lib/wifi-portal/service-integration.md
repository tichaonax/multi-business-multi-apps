# WiFi Token Expiration - Service Integration Guide

This document explains how to integrate the token expiration job into your existing Multi-Business Sync Service.

## Overview

The token expiration system is designed to:
- Process businesses **one at a time** to avoid overwhelming ESP32 devices
- Add **2-second delays** between businesses
- Add **1-second delays** between ESP32 API batches
- Handle 503 errors with automatic retry logic
- Run periodically (recommended: every 15 minutes)

## Architecture

```
┌─────────────────────────────────────────┐
│  Multi-Business Sync Service (Main)    │
│                                         │
│  - Business sync operations             │
│  - Database replication                 │
│  - Network discovery                    │
│  - NEW: Token expiration job            │ ← Add this
└─────────────────────────────────────────┘
                  │
                  ├─ Business 1 (Restaurant)
                  │  └─ Expire tokens → ESP32 Device 1
                  │     (wait 2 seconds)
                  │
                  ├─ Business 2 (Grocery)
                  │  └─ Expire tokens → ESP32 Device 2
                  │     (wait 2 seconds)
                  │
                  └─ Business 3 (Restaurant)
                     └─ Expire tokens → ESP32 Device 1
```

## Option 1: Integrate into Existing Service Worker

If you have a service worker file (e.g., `service-worker.ts`), add this:

```typescript
import { checkAndExpireTokens } from '@/lib/wifi-portal/token-expiration-job'

// Add to your existing service worker
class MultiBusinessSyncService {
  private expirationInterval: NodeJS.Timer | null = null

  async start() {
    // Your existing service start logic...

    // Start token expiration job (runs every 15 minutes)
    this.startTokenExpirationJob()
  }

  private startTokenExpirationJob() {
    console.log('[Service] Starting token expiration job...')

    // Run immediately on start
    this.runTokenExpiration()

    // Then run every 15 minutes
    this.expirationInterval = setInterval(() => {
      this.runTokenExpiration()
    }, 15 * 60 * 1000) // 15 minutes
  }

  private async runTokenExpiration() {
    try {
      console.log('[Service] Running token expiration...')
      const result = await checkAndExpireTokens()

      console.log('[Service] Token expiration complete:', {
        businesses: result.businessesProcessed,
        expired: result.expired,
        disabled: result.disabled,
        errors: result.errors.length,
      })

      if (result.errors.length > 0) {
        console.error('[Service] Token expiration errors:', result.errors)
      }
    } catch (error) {
      console.error('[Service] Token expiration failed:', error)
    }
  }

  async stop() {
    // Clean up
    if (this.expirationInterval) {
      clearInterval(this.expirationInterval)
      this.expirationInterval = null
    }

    // Your existing service stop logic...
  }
}
```

## Option 2: Standalone Scheduled Task

If you prefer to run as a separate scheduled task:

### Windows (Task Scheduler)

Create a PowerShell script `run-token-expiration.ps1`:

```powershell
$url = "http://localhost:8080/api/wifi-portal/admin/expire-tokens"
$headers = @{
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-RestMethod -Uri $url -Method POST -Headers $headers
    Write-Host "Token expiration completed: $($response.result.disabled) tokens disabled"
}
catch {
    Write-Error "Token expiration failed: $_"
}
```

Then schedule in Task Scheduler:
- Trigger: Every 15 minutes
- Action: Run PowerShell script
- Start time: On system boot

### Linux/Mac (Cron)

Add to crontab:

```bash
# Run token expiration every 15 minutes
*/15 * * * * curl -X POST http://localhost:8080/api/wifi-portal/admin/expire-tokens
```

## Configuration

The job uses these environment variables:

```env
# Default ESP32 configuration (if not set per-business)
ESP32_PORTAL_URL=http://192.168.0.100
ESP32_API_KEY=your_api_key_here
```

Per-business configuration is stored in the database:
- `businesses.esp32Url` - Business-specific ESP32 URL
- `businesses.esp32ApiKey` - Business-specific API key
- `businesses.wifiIntegrationEnabled` - Enable/disable for business

## Performance Characteristics

**For 3 businesses with 20 expired tokens each:**

```
Business 1: 20 tokens
  - Batch 1 (20 tokens): ~1 second
  - Wait: 2 seconds

Business 2: 20 tokens
  - Batch 1 (20 tokens): ~1 second
  - Wait: 2 seconds

Business 3: 20 tokens
  - Batch 1 (20 tokens): ~1 second

Total time: ~9 seconds
```

**For 10 businesses with 100 expired tokens each:**

```
Each business:
  - Batch 1 (50 tokens): ~1 second
  - Wait: 1 second
  - Batch 2 (50 tokens): ~1 second
  - Wait: 2 seconds before next business

Total time: ~40 seconds
```

## Monitoring

The job provides detailed logging:

```
[TokenExpiration] Starting token expiration check...
[TokenExpiration] Found 3 businesses with WiFi integration
[TokenExpiration] Processing business: Happy Restaurant (abc-123)
[TokenExpiration] Happy Restaurant: 15 tokens expired
[TokenExpiration] ESP32 response: { disabled: 15, available_slots: 85 }
[TokenExpiration] Happy Restaurant: Disabled 15 tokens
[TokenExpiration] Waiting 2000ms before next business...
[TokenExpiration] Processing business: Fresh Grocery (def-456)
...
[TokenExpiration] Complete: 45/45 tokens disabled across 3 businesses
```

## Error Handling

The job handles these error scenarios:

1. **ESP32 Busy (503)**: Automatically retries after delay
2. **ESP32 Unreachable**: Logs error, continues with next business
3. **Missing Configuration**: Skips business, logs warning
4. **Database Error**: Returns error but doesn't crash service

All errors are collected and returned in the result:

```typescript
{
  processed: 60,
  expired: 45,
  disabled: 42, // 3 failed
  errors: [
    "[Happy Restaurant] ESP32 disable failed: Network timeout",
    "[Downtown Cafe] No ESP32 configuration found"
  ],
  businessesProcessed: 5
}
```

## Testing

### Manual Trigger

```bash
POST http://localhost:8080/api/wifi-portal/admin/expire-tokens
```

### Create Test Token

1. Create a 1-hour token via POS
2. Wait 1.5 hours (or manually update `createdAt` in database)
3. Trigger expiration job
4. Verify token status changed to 'expired'
5. Check ESP32 device - token should be disabled

### Test Multiple Businesses

1. Set up 2-3 businesses with WiFi integration
2. Create tokens in each business
3. Manually expire them (update `createdAt`)
4. Trigger job
5. Verify sequential processing with delays in logs

## Troubleshooting

### Job runs but no tokens expired

- Check: `wifiIntegrationEnabled = true` for businesses
- Check: Tokens have `durationMinutes <= 1440`
- Check: Tokens are `active` or `used` status
- Check: Token age exceeds duration + 30 minutes

### ESP32 503 errors

- Increase `BUSINESS_PROCESSING_DELAY` to 5000ms (5 seconds)
- Increase `ESP32_API_DELAY` to 2000ms (2 seconds)
- Ensure only one service instance running

### Tokens not disabled on ESP32

- Verify ESP32 URL is accessible
- Check API key is correct
- Test ESP32 API manually with curl
- Check ESP32 device logs

## Future Enhancements

1. **Dashboard**: Add UI to view job status and history
2. **Alerting**: Notify admins when job fails
3. **Metrics**: Track expiration rates per business
4. **Dry Run Mode**: Preview what would be expired without actually doing it
5. **Custom Schedules**: Different expiration times per business

## Support

For issues or questions about the token expiration service, check:
- Service logs: `[TokenExpiration]` prefix
- API endpoint: `/api/wifi-portal/admin/expire-tokens`
- Database: `wifi_token_sales` table, `status` field
