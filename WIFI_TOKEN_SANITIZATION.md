# WiFi Token Sanitization - Setup Guide

## Overview

WiFi Token Sanitization is a critical maintenance feature that ensures tokens sold to customers can actually be redeemed on ESP32 devices. It verifies that all UNUSED, unsold tokens in the database actually exist on their corresponding ESP32 devices, and disables any tokens that don't exist.

## Why This is Critical

- **Tokens are pre-created** via ESP32 bulk_create API
- **ESP32 is the source of truth** - customers redeem tokens directly on the device
- **Tokens can disappear** from ESP32 due to power loss, firmware reset, manual deletion
- **Database is a ledger** - tracks sales but doesn't guarantee device availability
- **Cannot sell tokens customers cannot redeem** - creates customer service issues

## Access Methods

### 1. Manual Trigger via Admin Panel (Immediate)

**Access**: http://localhost:8080/admin

**Steps**:
1. Log in as system admin
2. Navigate to Admin page
3. Find "WiFi Token Maintenance" card
4. Click "Sanitize WiFi Tokens" button
5. View results (processed, disabled, businesses processed)

**When to use**:
- Testing the sanitization system
- Immediate cleanup after ESP32 device issues
- Ad-hoc verification before bulk token sales
- Troubleshooting customer redemption issues

### 2. API Endpoint (Programmatic)

**Endpoint**: `POST /api/wifi-portal/admin/sanitize-tokens`

**Authentication**: Requires system admin session

**Request**:
```bash
POST http://localhost:8080/api/wifi-portal/admin/sanitize-tokens
Content-Type: application/json
```

**Response**:
```json
{
  "success": true,
  "message": "Token sanitization job completed",
  "result": {
    "processed": 157,
    "disabled": 12,
    "errors": [],
    "businessesProcessed": 4
  }
}
```

**When to use**:
- Automated scripts
- Monitoring systems
- Custom admin tools
- Integration testing

### 3. Windows Sync Service (Automated - Recommended)

**Configuration File**: `sync-service-config.json` or environment variable

#### Enable in Service Config

Add to your `sync-service-config.json`:

```json
{
  "nodeId": "node-001",
  "nodeName": "Main Server",
  "registrationKey": "your-key-here",
  "port": 3001,
  "httpPort": 8080,
  "syncInterval": 30000,
  "enableAutoStart": true,
  "logLevel": "info",
  "dataDirectory": "./data",
  "maxLogSize": 10485760,
  "maxLogFiles": 10,

  "wifiTokenSanitization": {
    "enabled": true,
    "url": "http://localhost:8080/api/wifi-portal/admin/sanitize-tokens",
    "interval": 21600000
  }
}
```

#### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | false | Enable/disable automatic sanitization |
| `url` | string | http://localhost:8080/api/wifi-portal/admin/sanitize-tokens | API endpoint URL |
| `interval` | number | 21600000 | Interval in milliseconds (default: 6 hours) |

#### Interval Examples

```json
"interval": 3600000   // 1 hour
"interval": 10800000  // 3 hours
"interval": 21600000  // 6 hours (recommended)
"interval": 43200000  // 12 hours
"interval": 86400000  // 24 hours
```

**Recommended**: 6 hours (21600000ms) balances thoroughness with ESP32 resource usage.

#### Service Behavior

When enabled, the sync service will:

1. **On Startup**: Wait 10 seconds, then run initial sanitization
2. **Periodic**: Run sanitization every `interval` milliseconds
3. **Logging**: Log start, progress, and results to service logs
4. **Events**: Emit `wifi_token_sanitization_complete` event with results
5. **Error Handling**: Log errors but continue running (won't crash service)
6. **Timeout**: Abort if sanitization takes longer than 5 minutes

#### Service Logs

```
[INFO] Starting WiFi token sanitization (http://localhost:8080/api/wifi-portal/admin/sanitize-tokens, interval: 21600000ms = 6 hours)
[INFO] 🔄 Running initial WiFi token sanitization on service startup...
[INFO] ✅ Initial sanitization: 12/157 tokens disabled
[INFO] 🔄 Starting WiFi token sanitization...
[INFO] ✅ WiFi token sanitization completed: 5/142 tokens disabled across 4 businesses
```

## How It Works

### Sequential Processing

Sanitization processes businesses one at a time to avoid overwhelming ESP32 devices:

1. Get all businesses with active portal integration
2. For each business (sequentially):
   - Get all UNUSED, unsold tokens from database
   - For each token:
     - Call ESP32 `/api/token/info?token=XXX`
     - If token not found, mark as DISABLED
     - Wait 100ms before next token
   - Wait 2 seconds before next business
3. Return aggregated results

### Performance

- **Processing Time**: ~100ms per token + 2s per business
- **Example**: 20 businesses with 50 tokens each = ~10 minutes
- **ESP32 Load**: Very low (one request per 100ms)
- **Database Load**: Minimal (simple updates)

## Monitoring

### Service Logs

Monitor `logs/sync-service-YYYY-MM-DD.log`:

```bash
tail -f logs/sync-service-2025-12-22.log | grep "WiFi token"
```

### Event Listeners

```typescript
syncService.on('wifi_token_sanitization_complete', (result) => {
  console.log(`Sanitized: ${result.disabled}/${result.processed} tokens`)

  // Alert if many tokens disabled
  if (result.disabled > 10) {
    sendAdminAlert(`High token failure rate: ${result.disabled} tokens disabled`)
  }
})
```

### Metrics to Track

- **Disabled Count**: Number of tokens marked as DISABLED
- **Disabled Percentage**: `disabled / processed * 100`
- **Businesses Processed**: Ensure all businesses are checked
- **Errors**: Any businesses that failed processing

### Alert Thresholds

- ⚠️ **Warning**: >5% tokens disabled (potential ESP32 sync issues)
- 🚨 **Critical**: >20% tokens disabled (ESP32 device problem)
- ❌ **Error**: Sanitization job fails repeatedly

## Troubleshooting

### Service Not Running Sanitization

1. **Check config enabled**:
   ```bash
   grep "wifiTokenSanitization" sync-service-config.json
   ```

2. **Check service logs**:
   ```bash
   tail -f logs/sync-service-*.log | grep "WiFi token"
   ```

3. **Verify service is running**:
   ```bash
   curl http://localhost:3001/status
   ```

### High Disabled Count

If many tokens are being disabled:

1. **Check ESP32 connectivity**:
   ```bash
   curl http://<ESP32_IP>:<ESP32_PORT>/api/health
   ```

2. **Verify ESP32 not rebooting**: Check device uptime

3. **Check token sync**: Ensure bulk_create is working

4. **Review portal integration**: Verify `portal_integrations` table has correct IP/port

### Sanitization Timing Out

If jobs exceed 5 minute timeout:

1. **Reduce batch size**: Process fewer tokens per run
2. **Increase interval**: Run less frequently
3. **Check ESP32 performance**: Device may be overloaded
4. **Review network latency**: Slow network to ESP32

## Best Practices

### Development

- **Manual triggers**: Use admin panel for testing
- **Short intervals**: Test with 5-10 minute intervals
- **Monitor logs**: Watch for errors during development

### Production

- **Enable in service**: Set `enabled: true` in sync service config
- **6 hour intervals**: Balance thoroughness with resource usage
- **Monitor metrics**: Track disabled count and percentage
- **Set up alerts**: Notify admins of high failure rates

### High-Volume Environments

- **Longer intervals**: 12-24 hours if processing thousands of tokens
- **Off-peak scheduling**: Consider time of day (early morning)
- **Dedicated endpoint**: Run sanitization on separate server if needed

## Security

- **Admin Only**: Only system admins can trigger sanitization
- **Authentication Required**: All API calls require valid session
- **Rate Limited**: Service enforces delays between businesses/tokens
- **Audit Logged**: All sanitization runs logged with results

## Integration Examples

### Custom Monitoring Script

```typescript
// scripts/monitor-token-health.ts
setInterval(async () => {
  const response = await fetch('http://localhost:8080/api/wifi-portal/admin/sanitize-tokens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  })

  const data = await response.json()
  const disabledPercent = (data.result.disabled / data.result.processed) * 100

  if (disabledPercent > 10) {
    console.error(`⚠️ High token failure: ${disabledPercent.toFixed(1)}%`)
    // Send email/SMS alert
  }
}, 3600000) // Every hour
```

### Dashboard Widget

```tsx
// components/admin/wifi-token-health.tsx
export function WiFiTokenHealth() {
  const [lastRun, setLastRun] = useState<any>(null)

  async function runSanitization() {
    const res = await fetch('/api/wifi-portal/admin/sanitize-tokens', { method: 'POST' })
    const data = await res.json()
    setLastRun(data.result)
  }

  return (
    <div className="card">
      <h3>WiFi Token Health</h3>
      {lastRun && (
        <div>
          <div>Processed: {lastRun.processed}</div>
          <div>Disabled: {lastRun.disabled}</div>
          <div>Health: {((1 - lastRun.disabled / lastRun.processed) * 100).toFixed(1)}%</div>
        </div>
      )}
      <button onClick={runSanitization}>Run Sanitization</button>
    </div>
  )
}
```

## FAQ

**Q: How often should I run sanitization?**
A: 6 hours is recommended. Adjust based on token volume and ESP32 reliability.

**Q: Will this slow down my system?**
A: No. Sequential processing with delays prevents ESP32 overload. Minimal impact on main app.

**Q: What happens if ESP32 is offline?**
A: Tokens for that business won't be verified. They'll be checked on next run. No tokens disabled if ESP32 unreachable.

**Q: Can I run this manually?**
A: Yes! Use admin panel or API endpoint anytime.

**Q: Does this affect sold tokens?**
A: No. Only verifies UNUSED, unsold tokens. Sold tokens are never disabled.

**Q: What if I disable the wrong tokens?**
A: Check service logs to see why they were disabled. Tokens can be re-enabled via database if needed.

---

**Status**: ✅ Production Ready
**Last Updated**: 2025-12-22
**Version**: 1.0.0
