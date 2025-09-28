# Multi-Business Sync Service Setup Guide

This guide explains how to install and configure the peer-to-peer database synchronization service for the Multi-Business Management Platform.

## Overview

The sync service enables automatic database synchronization between multiple machines running the Multi-Business application. Key features:

- **Automatic Peer Discovery**: Finds other sync nodes on the local network using mDNS
- **Registration Key Security**: Only machines with the same registration key can participate
- **Background Operation**: Runs independently of the main Next.js application
- **Conflict Resolution**: Advanced strategies for handling data conflicts
- **Offline Support**: Continues syncing when machines reconnect to the network

## Quick Start

### 1. Build the Sync Service
```bash
npm run build:service
```

### 2. Install as Windows Service
```bash
npm run sync-service:install
```

### 3. Check Status
```bash
npm run sync-service:status
```

Install checklist (what the runner verifies at service start):

- DATABASE_URL is present in the environment or service config
- A lightweight DB connectivity check (SELECT 1) using Prisma is performed
- If the DB check fails the service will abort startup and log the error (visible to the service manager)
- The runner also exposes a /health endpoint on port SYNC_PORT+1 for external monitoring


## Detailed Setup

### Prerequisites

- Windows 10/11 or Windows Server
- Node.js 18+ installed
- Administrator privileges for service installation
- Multi-Business application already installed and configured

### Step 1: Configuration

Set environment variables for production use:

```cmd
# REQUIRED: Change from default for security
set SYNC_REGISTRATION_KEY=your-secure-unique-key-here

# Optional: Customize port (default: 8765)
set SYNC_PORT=8765

# Optional: Sync interval in milliseconds (default: 30000 = 30 seconds)
set SYNC_INTERVAL=30000

# Optional: Log level (default: info)
set LOG_LEVEL=info
```

**⚠️ SECURITY WARNING**: Always change `SYNC_REGISTRATION_KEY` from the default value in production!

### Step 2: Build the Service

Compile the TypeScript sync service:

```bash
npm run build:service
```

This creates the compiled service files in the `dist/service/` directory.

### Step 3: Install as Windows Service

Install the sync service to run automatically:

```bash
npm run sync-service:install
```

The service will be installed as "Multi-Business Sync Service" and automatically started.

### Step 4: Verify Installation

Check the service status:

```bash
npm run sync-service:status
```

This command shows:
- Service installation status
- Service running status
- Configuration details
- Network connectivity
- Management commands

## Service Management

### Check Status
```bash
npm run sync-service:status
```

### Start Service
```bash
npm run sync-service:start
```

### Stop Service
```bash
npm run sync-service:stop
```

### Restart Service
```bash
npm run sync-service:restart
```

### Uninstall Service
```bash
npm run sync-service:uninstall
```

## Troubleshooting

If the service fails to start or the installer reports problems, use the checklist and commands below to diagnose common failure modes.

1) Missing or incorrect DATABASE_URL

- Symptom: Service aborts on startup with logs mentioning "Missing DATABASE_URL" or inability to connect.
- Check: Ensure the `DATABASE_URL` env var is set for the service process. For Windows services created with `node-windows` you can place the env var into the `service/env` file or the `service-config.json` used by the runner.
- Quick test: Run the smoke-check script locally:

```bash
node scripts/smoke-check-service.js
```

Or skip the DB probe if you intentionally want to test other things:

```bash
SKIP_DB_PRECHECK=true node scripts/smoke-check-service.js
```

2) Database authentication or connectivity failures

- Symptom: Precheck attempts show errors like "password authentication failed" or connection timeouts.
- Check: Verify host, port, user, and password in `DATABASE_URL` are correct. Ensure PostgreSQL is reachable from the machine (try `psql "${DATABASE_URL}" -c "SELECT 1;"`).

3) Schema mismatch (Prisma client / migrations)

- Symptom: The Prisma client throws errors about missing relations or migrations failing (e.g., P3005 or relation "xyz" does not exist).
- Check: Ensure you have generated the Prisma client for the schema that matches your running code. Run:

```bash
npx prisma generate
npx prisma migrate deploy
```

- If deploying into an existing production DB with manual changes, consider recording a baseline migration (`prisma migrate resolve --applied <name>`) rather than using `migrate reset`.

4) Service logs and health endpoint

- The runner creates logs under the directory set in the service config (see the installation summary printed at the end of installation).
- The runner exposes a health endpoint on `http://localhost:<SYNC_PORT + 1>/health` which returns JSON with `status` and `uptime`.

5) Using SKIP_DB_PRECHECK

- For CI or constrained environments where the DB check is not required, you can set `SKIP_DB_PRECHECK=true` or pass `--skip-db` to the smoke-check script to bypass the preflight DB check.

6) If you see migration errors during an update

- Don't use `prisma migrate reset` in production — it will destroy data. Use `npx prisma migrate deploy` and follow the official guide for resolving migration conflicts: https://pris.ly/d/migrate-resolve

If you want, run the smoke-check script and paste its output here and I'll help interpret the failure.

## Network Configuration

### Firewall Requirements

The sync service requires these network permissions:

- **Outbound UDP 5353**: mDNS peer discovery
- **Inbound/Outbound TCP 8765**: HTTP sync communication (or custom port)
- **Multicast address 224.0.0.251**: mDNS multicast group

### Windows Firewall Setup

1. Open Windows Defender Firewall
2. Click "Allow an app or feature through Windows Defender Firewall"
3. Add Node.js if not already present
4. Enable both Private and Public network access

Or use PowerShell (as Administrator):

```powershell
# Allow Node.js through firewall
New-NetFirewallRule -DisplayName "Multi-Business Sync Service" -Direction Inbound -Protocol TCP -LocalPort 8765 -Action Allow
New-NetFirewallRule -DisplayName "Multi-Business Sync Discovery" -Direction Inbound -Protocol UDP -LocalPort 5353 -Action Allow
```

## Multi-Machine Setup

### Setting Up Multiple Machines

1. **Install on each machine**:
   - Complete the full Multi-Business application setup
   - Follow this sync service setup guide

2. **Use the same registration key**:
   ```cmd
   # Same on all machines
   set SYNC_REGISTRATION_KEY=your-shared-secret-key
   ```

3. **Ensure network connectivity**:
   - All machines on the same local network
   - No firewalls blocking sync ports
   - mDNS/multicast enabled on network switches

4. **Install and start sync service on each machine**:
   ```bash
   npm run build:service
   npm run sync-service:install
   ```

### Verification

After setup, check that machines can discover each other:

```bash
npm run sync-service:status
```

Look for "Peers Connected" in the status output.

## Advanced Configuration

### Custom Port Configuration

If port 8765 is already in use:

```cmd
set SYNC_PORT=3002
npm run sync-service:restart
```

### Sync Interval Tuning

Adjust how often synchronization occurs:

```cmd
# Sync every 60 seconds instead of 30
set SYNC_INTERVAL=60000
npm run sync-service:restart
```

### Debug Logging

Enable detailed logging for troubleshooting:

```cmd
set LOG_LEVEL=debug
npm run sync-service:restart
```

View logs in: `data/sync/sync-service.log`

## Troubleshooting

### Service Won't Start

1. **Check administrator privileges**:
   ```bash
   # Run as Administrator
   npm run sync-service:status
   ```

2. **Verify service is built**:
   ```bash
   npm run build:service
   ```

3. **Check Windows Event Viewer**:
   - Open Event Viewer
   - Navigate to Windows Logs → Application
   - Look for "Multi-Business Sync Service" errors

### Peer Discovery Issues

1. **Check network connectivity**:
   ```cmd
   ping [other-machine-ip]
   ```

2. **Verify registration keys match**:
   - Same `SYNC_REGISTRATION_KEY` on all machines

3. **Test multicast**:
   ```cmd
   # From command prompt
   telnet 224.0.0.251 5353
   ```

4. **Check firewall settings**:
   - Ensure UDP 5353 and TCP 8765 are allowed

### Sync Conflicts

The service automatically resolves most conflicts using:
- **Last Writer Wins**: Most recent change takes priority
- **Node Priority**: Designated master nodes have priority
- **Field-Level Merging**: Smart merging of non-conflicting fields
- **Business Rules**: Custom logic for critical data

View conflict resolution in the admin dashboard or logs.

## Production Deployment

### Security Checklist

- [ ] Changed `SYNC_REGISTRATION_KEY` from default
- [ ] Configured appropriate firewall rules
- [ ] Limited network access to trusted machines only
- [ ] Enabled logging and monitoring
- [ ] Set up regular database backups

### Monitoring

- Monitor service status with `npm run sync-service:status`
- Check sync logs in `data/sync/sync-service.log`
- Use the admin dashboard for real-time monitoring
- Set up alerts for service failures

### Backup Strategy

- The sync service maintains the database synchronization
- Continue regular database backups on each machine
- Test restore procedures with multiple machines

## Integration with Main Application

The sync service runs independently but can be monitored through the main application:

1. **Admin Dashboard**: View sync status and statistics
2. **API Integration**: Control service via `/api/sync/service` endpoints
3. **Real-time Updates**: Sync status displayed in the application UI

## Support

For issues with the sync service:

1. Check this documentation
2. Run `npm run sync-service:status` for diagnostics
3. Review service logs in `data/sync/sync-service.log`
4. Check Windows Event Viewer for system-level errors

## Version History

- **v1.0**: Initial peer-to-peer sync implementation
- **v1.1**: Enhanced conflict resolution and security
- **v1.2**: Windows service integration and monitoring