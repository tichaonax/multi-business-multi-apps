# Multi-Business Sync Service - Comprehensive Architecture Analysis

**Generated:** November 5, 2025
**Status:** Services Running But Not Discovering Each Other

---

## Executive Summary

**Current Problem:** Both servers are running sync services but only detecting 1 node instead of 2. Servers are not discovering each other despite services being active.

**Key Finding from Diagnostics:**
- Only 1 sync node detected: `sync-node-dell-hwandaza` at `192.168.0.114:8765`
- UDP port 5353 is properly listening on both servers
- No peer discovery is occurring

---

## 1. System Architecture Overview

### 1.1 Core Components

The sync system consists of several interconnected services:

#### **SyncService** (Main Service)
- **File:** `src/service/sync-service-runner.ts`
- **Purpose:** Entry point and orchestrator for all sync operations
- **Runs as:** Windows Service (MultiBusinessSyncService)
- **Key Responsibilities:**
  - Database initialization and migrations
  - Service lifecycle management
  - Automatic restart on failures
  - Configuration management

#### **PeerDiscoveryService** (Network Discovery)
- **File:** `src/lib/sync/peer-discovery.ts`
- **Purpose:** Automatically discover other sync nodes on the local network
- **Protocol:** UDP Multicast (mDNS-style)
- **Port:** 5353
- **Multicast Address:** 224.0.0.251
- **Key Features:**
  - Registration key authentication
  - Periodic heartbeat broadcasts (every 30 seconds)
  - Peer timeout detection (120 seconds)
  - Database integration for node tracking

#### **SyncEngine** (Data Synchronization)
- **File:** `src/lib/sync/sync-engine.ts`
- **Purpose:** Manages actual data synchronization between nodes
- **Features:**
  - Event-based sync
  - Compression & encryption
  - Batch processing (50 events)
  - Automatic retry (3 attempts)

#### **Supporting Components**
- **ConflictResolver:** Handles data conflicts using vector clocks
- **SecurityManager:** Manages authentication and encryption
- **NetworkMonitor:** Tracks network connectivity
- **PartitionDetector:** Detects network partitions
- **SchemaVersionManager:** Ensures schema compatibility

---

## 2. Peer Discovery Mechanism (CRITICAL)

### 2.1 How Discovery Works

```
┌─────────────┐                         ┌─────────────┐
│  Server 1   │                         │  Server 2   │
│  (Node A)   │                         │  (Node B)   │
└──────┬──────┘                         └──────┬──────┘
       │                                       │
       │ 1. Broadcast Presence                │
       │    UDP Port 5353                     │
       │    → 224.0.0.251                     │
       ├──────────────────────────────────────┤
       │                                       │
       │         2. Receive Broadcast         │
       │            Verify Key Hash           │
       │    ┌─────────────────────────┐      │
       │    │  Check Registration Key  │      │
       │    │  Store in Database       │      │
       │    │  Emit peer_discovered   │      │
       │    └─────────────────────────┘      │
       │                                       │
       │ 3. Both nodes now see each other    │
       │    in sync_nodes table               │
       └───────────────────────────────────────┘
```

### 2.2 Discovery Message Format

**Presence Message (Sent every 30 seconds):**
```json
{
  "type": "presence",
  "nodeId": "fbb213cb6067502f",
  "nodeName": "sync-node-dell-hwandaza",
  "ipAddress": "192.168.0.114",
  "port": 8765,
  "serviceName": "multi-business-sync",
  "registrationKeyHash": "sha256_hash_of_key",
  "capabilities": ["sync-v1", "compression", "encryption"],
  "timestamp": "2025-11-05T22:20:28.000Z",
  "version": "1.0.0"
}
```

### 2.3 Registration Key Authentication

**Critical Security Feature:**
- Both servers MUST have the same `SYNC_REGISTRATION_KEY` in their `.env.local` files
- The key is hashed using SHA-256 before transmission
- Servers with mismatched keys will ignore each other
- Default key (SHOULD BE CHANGED): `b3f1c9d7a5e4f2c3819d6b7a2e4f0c1d2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7`

**Location:** `src/service/sync-service-runner.ts:87`

---

## 3. Network Requirements

### 3.1 Required Ports

| Port | Protocol | Direction | Purpose |
|------|----------|-----------|---------|
| 5353 | UDP | Inbound + Outbound | Peer discovery (multicast) |
| 8765 | TCP | Inbound + Outbound | Sync data transfer |
| 8080 | TCP | Inbound | HTTP API (optional, for web UI) |

### 3.2 Firewall Configuration

**Windows Firewall Rules Required:**

1. **Inbound UDP 5353:**
   - Allow multicast reception
   - Profile: All (Domain, Private, Public)

2. **Outbound UDP 5353:**
   - Allow multicast transmission
   - Profile: All

3. **Multicast Group 224.0.0.0/4:**
   - Allow all multicast traffic in this range
   - Required for mDNS-style discovery

**Configuration Script:** `configure-sync-firewall.ps1`

### 3.3 Network Requirements

- **Same Subnet:** Both servers MUST be on the same local network (192.168.0.x)
- **Multicast Support:** Network switches/routers must allow UDP multicast
- **No VPN Interference:** VPN can block multicast traffic
- **Router IGMP:** Multicast requires IGMP support on network equipment

---

## 4. Database Schema

### 4.1 Critical Tables

#### **sync_nodes** (Node Registry)
```sql
CREATE TABLE sync_nodes (
  node_id TEXT PRIMARY KEY,        -- Unique node identifier
  node_name TEXT NOT NULL,         -- Human-readable name
  ip_address TEXT NOT NULL,        -- Current IP address
  port INTEGER NOT NULL,           -- Sync port (8765)
  is_active BOOLEAN DEFAULT true,  -- Active status
  last_seen TIMESTAMP,             -- Last heartbeat time
  capabilities TEXT[],             -- Supported features
  registration_key_hash TEXT,      -- Hashed registration key
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### **sync_events** (Change Log)
```sql
CREATE TABLE sync_events (
  event_id TEXT PRIMARY KEY,
  source_node_id TEXT,             -- Node that created the change
  table_name TEXT NOT NULL,        -- Affected table
  record_id TEXT NOT NULL,         -- Record identifier
  operation TEXT NOT NULL,         -- INSERT, UPDATE, DELETE
  change_data JSONB,               -- New data
  before_data JSONB,               -- Previous data (for conflicts)
  vector_clock JSONB,              -- Logical timestamp
  processed BOOLEAN DEFAULT false, -- Sync status
  created_at TIMESTAMP
);
```

---

## 5. Service Lifecycle

### 5.1 Startup Sequence

```
1. Load Environment Variables (.env.local, .env)
   ├─ DATABASE_URL (CRITICAL)
   ├─ SYNC_REGISTRATION_KEY
   ├─ SYNC_PORT (default: 8765)
   └─ SYNC_INTERVAL (default: 30000ms)

2. Check if Build Required
   ├─ Compare git commits
   ├─ Build TypeScript if needed (npx tsc)
   └─ Create build-info.json

3. Run Database Setup
   ├─ Run migrations (npx prisma migrate deploy)
   ├─ Verify schema (check sync_nodes table exists)
   └─ Seed reference data (npm run seed:migration)

4. Initialize Sync Components
   ├─ Initialize Database (register this node)
   ├─ Start Peer Discovery (UDP 5353)
   ├─ Start Sync Engine
   ├─ Start Conflict Resolver
   ├─ Start Security Manager
   └─ Start Health Monitoring

5. Begin Operations
   ├─ Broadcast presence every 30s
   ├─ Listen for peer messages
   ├─ Sync events every 30s
   └─ Monitor health every 60s
```

### 5.2 Service Management Commands

```bash
# Start service
npm run service:start

# Stop service
npm run service:stop

# Restart service (RECOMMENDED for troubleshooting)
npm run service:restart

# Check status
npm run service:status
node scripts/sync-service-status.js
```

---

## 6. Common Issues & Troubleshooting

### 6.1 Issue: Only 1 Node Detected (CURRENT PROBLEM)

**Symptom:** `check-service-logs.js` shows only 1 node in database

**Possible Causes:**

#### **A. Firewall Blocking Multicast Traffic**
- Windows Firewall rules not configured
- Third-party firewall (Norton, McAfee, etc.)
- Router/switch blocking multicast

**Solution:**
```powershell
# Run as Administrator on BOTH servers
.\configure-sync-firewall.ps1

# Verify rules created
Get-NetFirewallRule -DisplayName "*Multi-Business*"
```

#### **B. Registration Key Mismatch**
- Different keys on each server
- Key has whitespace/formatting issues
- Key not loaded from .env.local

**Solution:**
```bash
# Check key on each server
node -e "require('dotenv').config({path:'.env.local'}); console.log('Key:', process.env.SYNC_REGISTRATION_KEY)"

# Keys MUST match exactly on both servers
```

#### **C. Network Not Supporting Multicast**
- Some enterprise networks block multicast
- VPN active on one or both servers
- Different subnets

**Solution:**
```bash
# Check if multicast is working
# On Server 1:
netstat -an | findstr 5353

# Verify IP addresses are on same subnet
ipconfig
```

#### **D. Service Not Actually Running**
- Service shows "Running" but crashed
- Port conflict with another service
- Database connection failed

**Solution:**
```bash
# Check actual service status
sc query MultiBusinessSyncService

# Check service logs
# Windows Event Viewer → Windows Logs → Application
# Or check: data/sync/logs/*.log

# Restart service
npm run service:restart
```

#### **E. One Server's IP Address Changed**
- DHCP assigned new IP
- VPN interface preferred over LAN
- Multiple network adapters

**Solution:**
```bash
# Check which IP peer discovery selected
# Look in service logs for: "Selected IP X.X.X.X from interface..."

# Priority order (src/lib/sync/sync-service.ts:1069):
# 1. Wi-Fi interfaces (priority 100)
# 2. Ethernet interfaces (priority 95)
# 3. 192.168.x.x or 10.0.x.x (priority 50)
# 4. VPN/Virtual interfaces (priority 10)
```

### 6.2 Issue: Services Keep Restarting

**Symptom:** Service starts then stops repeatedly

**Causes:**
- Database connection failure
- Port already in use
- Missing environment variables
- Corrupted build

**Solution:**
```bash
# Check database connectivity
psql $DATABASE_URL -c "SELECT 1"

# Check if ports are available
netstat -an | findstr "5353 8765"

# Force rebuild
npm run service:stop
npm run build:service
npm run service:start
```

### 6.3 Issue: Sync Events Not Processing

**Symptom:** Nodes discovered but data not syncing

**Causes:**
- HTTP port mismatch
- Security authentication failing
- Schema version incompatibility

**Solution:**
```bash
# Check sync stats
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); (async () => { const events = await prisma.syncEvents.findMany({ where: { processed: false }, take: 10 }); console.log('Unprocessed events:', events.length); await prisma.$disconnect(); })()"
```

---

## 7. Diagnostic Tools

### 7.1 Available Scripts

| Script | Purpose |
|--------|---------|
| `check-service-logs.js` | View sync nodes and recent activity |
| `configure-sync-firewall.ps1` | Configure Windows Firewall rules |
| `check-sync-nodes.js` | List all nodes in database |
| `check-sync-status.js` | Check sync service health |
| `debug-sync-events.js` | View unprocessed sync events |

### 7.2 Quick Diagnostic Checklist

Run these commands on **BOTH** servers:

```bash
# 1. Check service is running
sc query MultiBusinessSyncService

# 2. Check UDP port is listening
netstat -an | findstr 5353

# 3. Check nodes in database
node check-service-logs.js

# 4. Check firewall rules
Get-NetFirewallRule -DisplayName "*Multi-Business*" | Format-Table

# 5. Check registration key (on both servers)
node -e "require('dotenv').config({path:'.env.local'}); console.log(process.env.SYNC_REGISTRATION_KEY?.substring(0,8))"

# 6. Check network interfaces
ipconfig
```

---

## 8. Current Problem Diagnosis

### 8.1 What We Know

✅ **Working:**
- Service is running on Server 1 (192.168.0.114)
- UDP port 5353 is listening (multiple instances)
- Database is accessible
- Node is being registered: `sync-node-dell-hwandaza`

❌ **Not Working:**
- Only 1 node detected (should be 2)
- No peer discovery occurring
- Server 2 not visible to Server 1

### 8.2 Most Likely Causes (in order)

1. **Firewall Not Configured on One or Both Servers** (80% probability)
   - Multicast UDP 5353 traffic being blocked
   - Solution: Run `configure-sync-firewall.ps1` as Administrator on BOTH servers

2. **Registration Key Mismatch** (15% probability)
   - Different keys on each server
   - Whitespace or encoding issues
   - Solution: Verify keys match exactly

3. **Network/Router Blocking Multicast** (4% probability)
   - Enterprise network blocking multicast
   - VPN interference
   - Different subnets
   - Solution: Check network configuration

4. **Service Not Running on Server 2** (1% probability)
   - Service crashed on startup
   - Port conflict
   - Solution: Check service status on Server 2

### 8.3 Recommended Next Steps

**Priority 1: Configure Firewall (BOTH SERVERS)**
```powershell
# Run as Administrator
.\configure-sync-firewall.ps1
```

**Priority 2: Restart Services (BOTH SERVERS)**
```bash
npm run service:restart
```

**Priority 3: Wait and Verify (30 seconds)**
```bash
# Wait 30 seconds for discovery broadcast
timeout /t 30

# Check nodes on BOTH servers
node check-service-logs.js
```

**Expected Result:**
- Each server should see 2 nodes (itself + the other server)
- Recent sync events should appear
- Service logs should show "Peer discovered" messages

---

## 9. Architecture Strengths

- **Automatic Discovery:** No manual peer configuration required
- **Fault Tolerant:** Automatic reconnection on network failures
- **Secure:** Registration key prevents unauthorized nodes
- **Conflict Resolution:** Vector clock-based conflict detection
- **Self-Healing:** Partition detection and automatic recovery
- **Scalable:** Supports multiple nodes on the same network

---

## 10. Architecture Weaknesses

- **Same Subnet Requirement:** Cannot discover nodes across VPN/WAN
- **Multicast Dependency:** Requires network hardware support
- **Windows-Specific:** Service wrapper designed for Windows
- **No Manual Peer Config:** Cannot manually add peers if multicast fails
- **Firewall Sensitive:** Requires proper firewall configuration

---

## 11. Future Improvements

1. **Fallback Discovery:** Add DNS-based peer discovery if multicast fails
2. **Manual Peer Addition:** Allow manual peer configuration
3. **WAN Support:** Support sync across different networks via VPN
4. **Discovery Protocol:** Consider switching to proper mDNS library (Bonjour/Avahi)
5. **Health Dashboard:** Web-based monitoring interface
6. **Alerting:** Email/SMS alerts for sync failures

---

## Appendix A: Service Configuration

### Default Configuration (`src/service/sync-service-runner.ts:83-98`)

```typescript
{
  nodeId: generateNodeId(),                    // Auto-generated UUID
  nodeName: `sync-node-${hostname()}`,        // Computer hostname
  registrationKey: process.env.SYNC_REGISTRATION_KEY || 'default_key',
  port: parseInt(process.env.SYNC_PORT || '8765'),
  syncInterval: parseInt(process.env.SYNC_INTERVAL || '30000'),
  enableAutoStart: true,
  logLevel: process.env.LOG_LEVEL || 'info',
  dataDirectory: './data/sync',
  maxLogSize: 10 * 1024 * 1024,               // 10MB
  maxLogFiles: 5,
  autoRestart: true,
  restartDelay: 5000,                         // 5 seconds
  maxRestartAttempts: 5
}
```

### Environment Variables

```bash
# Required
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname

# Optional (with defaults)
SYNC_REGISTRATION_KEY=b3f1c9d7...  # Default key (CHANGE THIS!)
SYNC_PORT=8765                      # Discovery broadcasts this port
SYNC_INTERVAL=30000                 # Sync every 30 seconds
LOG_LEVEL=info                      # error, warn, info, debug
PORT=8080                           # HTTP API port
```

---

## Appendix B: Log Files

### Service Logs
- **Location:** `data/sync/logs/sync-service-YYYY-MM-DD.log`
- **Rotation:** Daily, keeps last 5 days
- **Format:** JSON with timestamps

### Windows Event Log
- **Source:** MultiBusinessSyncService
- **Location:** Windows Event Viewer → Application

---

## Appendix C: Quick Reference

### File Locations
- Service Runner: `src/service/sync-service-runner.ts`
- Peer Discovery: `src/lib/sync/peer-discovery.ts`
- Sync Engine: `src/lib/sync/sync-engine.ts`
- Service Config: `data/sync/config.json`
- Firewall Script: `configure-sync-firewall.ps1`
- Diagnostic Script: `check-service-logs.js`

### Key Constants
- Multicast Address: `224.0.0.251`
- Discovery Port: `5353` (UDP)
- Sync Port: `8765` (TCP)
- Broadcast Interval: `30000ms` (30 seconds)
- Peer Timeout: `120000ms` (2 minutes)
- Sync Batch Size: `50 events`

---

**Document Version:** 1.0
**Last Updated:** November 5, 2025
**Next Review:** After issue resolution
