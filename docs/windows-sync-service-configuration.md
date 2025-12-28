# Windows Sync Service Configuration

This document explains how to configure the Windows sync service to automatically sync connected clients from R710 and ESP32 devices.

## Overview

The Multi-Business Sync Service is a Windows service that runs in the background and performs various periodic tasks:
- **Database synchronization** between multiple instances
- **Print worker health monitoring**
- **WiFi token sanitization**
- **R710 connected clients sync** (NEW)
- **ESP32 connected clients sync** (NEW)

## Configuration Files

The service can be configured in two ways:

### Option 1: Environment Variables (Recommended)

Add these to your `.env` or `.env.local` file:

```env
# R710 Connected Clients Sync
R710_SYNC_ENABLED=true
R710_SYNC_URL=http://localhost:8080/api/r710/connected-clients/sync
R710_SYNC_INTERVAL=300000  # 5 minutes in milliseconds

# ESP32 Connected Clients Sync
ESP32_SYNC_ENABLED=true
ESP32_SYNC_URL=http://localhost:8080/api/esp32/connected-clients/sync
ESP32_SYNC_INTERVAL=300000  # 5 minutes in milliseconds
```

### Option 2: Service Configuration File

Create or edit `data/sync/config.json`:

```json
{
  "r710ConnectedClientsSync": {
    "enabled": true,
    "url": "http://localhost:8080/api/r710/connected-clients/sync",
    "interval": 300000
  },
  "esp32ConnectedClientsSync": {
    "enabled": true,
    "url": "http://localhost:8080/api/esp32/connected-clients/sync",
    "interval": 300000
  },
  "printWorkerHealthCheck": {
    "enabled": true,
    "url": "http://localhost:8080/api/health/print-worker",
    "interval": 60000,
    "autoRestart": true
  },
  "wifiTokenSanitization": {
    "enabled": true,
    "url": "http://localhost:8080/api/wifi-portal/admin/sanitize-tokens",
    "interval": 21600000
  }
}
```

## Configuration Options

### R710 Connected Clients Sync

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `false` | Enable/disable R710 client sync |
| `url` | string | `http://localhost:8080/api/r710/connected-clients/sync` | API endpoint to call |
| `interval` | number | `300000` (5 min) | Sync interval in milliseconds |

**What it does:**
- Queries all connected R710 devices
- Fetches currently connected WiFi clients from each device
- Updates the `R710ConnectedClients` database table
- Runs immediately on service start, then on the specified interval

### ESP32 Connected Clients Sync

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `false` | Enable/disable ESP32 client sync |
| `url` | string | `http://localhost:8080/api/esp32/connected-clients/sync` | API endpoint to call |
| `interval` | number | `300000` (5 min) | Sync interval in milliseconds |

**What it does:**
- Syncs connected clients for all businesses with ESP32 integrations
- Updates client connection status in the database
- Runs immediately on service start, then on the specified interval

## Recommended Intervals

| Task | Recommended Interval | Reason |
|------|---------------------|--------|
| R710 Clients Sync | 5 minutes (300000ms) | Balance between freshness and device load |
| ESP32 Clients Sync | 5 minutes (300000ms) | Same as R710 for consistency |
| Print Worker Health | 1 minute (60000ms) | Quick detection of print issues |
| WiFi Token Sanitization | 6 hours (21600000ms) | Low-frequency cleanup task |

## Service Management

### Check Service Status
```powershell
sc query MultiBusinessSyncService
```

### Restart Service (to apply config changes)
```powershell
sc stop MultiBusinessSyncService
sc start MultiBusinessSyncService
```

Or use the restart script:
```bash
node scripts/sync-service-restart.js
```

### View Service Logs

Logs are written to:
- **Location:** `data/sync/logs/`
- **Format:** Daily rotating logs
- **Files:** `sync-service-YYYY-MM-DD.log`

**Example log entries:**
```
[2025-12-28T10:00:00.000Z] INFO: Starting R710 connected clients sync (http://localhost:8080/api/r710/connected-clients/sync, interval: 300000ms = 5 minutes)
[2025-12-28T10:00:01.234Z] INFO: 📶 Starting R710 connected clients sync...
[2025-12-28T10:00:03.567Z] INFO: ✅ R710 sync completed: 5 clients synced from 2 devices
[2025-12-28T10:05:00.123Z] INFO: 📶 Starting R710 connected clients sync...
[2025-12-28T10:05:02.456Z] INFO: ✅ R710 sync completed: 5 clients synced from 2 devices
```

## Troubleshooting

### Sync not running
1. **Check service is running:**
   ```powershell
   sc query MultiBusinessSyncService
   ```

2. **Check configuration:**
   - Verify `enabled: true` in config file
   - Check environment variables are loaded
   - Review service logs for errors

3. **Check API endpoint:**
   ```bash
   curl http://localhost:8080/api/r710/connected-clients/sync
   ```

### Sync errors in logs

**Common errors:**

1. **"Device not accessible"**
   - R710 device is offline or unreachable
   - Check device network connection
   - Verify device credentials

2. **"Unauthorized"**
   - Service doesn't have proper authentication
   - Check API permissions
   - Verify session/token validity

3. **"Timeout after 2 minutes"**
   - Device is slow to respond
   - Too many devices to sync in timeframe
   - Consider increasing interval or reducing devices

## Manual Sync (On-Demand)

Users can also trigger sync manually from the UI:

1. Navigate to **Admin** → **Connected Clients**
2. Click **"📶 Sync R710"** button
3. Wait for sync to complete
4. Client list refreshes automatically

## Performance Considerations

### R710 Sync Performance

- **Per device:** ~1-3 seconds depending on client count
- **Multiple devices:** Processed sequentially (1 second delay between)
- **Timeout:** 2 minutes per sync operation

**Example timing for 3 devices:**
- Device 1: 2 seconds (50 clients)
- Delay: 1 second
- Device 2: 1.5 seconds (20 clients)
- Delay: 1 second
- Device 3: 1 second (10 clients)
- **Total:** ~6.5 seconds

### ESP32 Sync Performance

- **Per business:** ~2-5 seconds depending on integration type
- **Batch processing:** Processes businesses sequentially
- **Delay:** 1 second between businesses

## Monitoring

### Health Metrics to Monitor

1. **Sync Success Rate**
   - Check logs for `✅ R710 sync completed` messages
   - Count failures vs successes
   - Alert if failure rate > 10%

2. **Sync Duration**
   - Normal: 5-10 seconds for small deployments
   - Warning: > 30 seconds
   - Critical: > 60 seconds (approaching timeout)

3. **Client Count Changes**
   - Sudden drops may indicate device issues
   - Gradual growth is normal
   - Spikes may indicate events or attacks

### Log Monitoring Commands

**Count successful syncs in last hour:**
```bash
grep "✅ R710 sync completed" data/sync/logs/sync-service-$(date +%Y-%m-%d).log | tail -12
```

**Find sync errors:**
```bash
grep "❌ R710 sync" data/sync/logs/sync-service-$(date +%Y-%m-%d).log
```

**Check sync timing:**
```bash
grep "📶 Starting R710 connected clients sync" data/sync/logs/sync-service-$(date +%Y-%m-%d).log
```

## Best Practices

1. **Start with default intervals** (5 minutes) and adjust based on needs
2. **Monitor logs** for the first 24 hours after enabling
3. **Enable syncs one at a time** to isolate any issues
4. **Use manual sync** to test before enabling automatic sync
5. **Keep service updated** with latest code changes
6. **Restart service** after configuration changes

## Security Considerations

1. **Service runs with system privileges** - Be careful with API endpoints
2. **Endpoints called by service** should have proper authentication
3. **Configuration files** may contain sensitive URLs - Use `.env.local` (not committed to git)
4. **Logs may contain** client MAC addresses and device IPs - Protect log files

## Next Steps

After configuration:
1. ✅ Restart the sync service
2. ✅ Monitor logs for first sync execution
3. ✅ Verify clients appear in Connected Clients page
4. ✅ Test manual sync button
5. ✅ Set up log monitoring/alerting

---

**Last Updated:** 2025-12-28
**Service Version:** Multi-Business Sync Service v2.0
**Configuration Version:** v1.0
