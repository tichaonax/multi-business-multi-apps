# Health Check Implementation

## Overview
The Multi-Business application implements multiple health check systems at different layers to monitor application and service health.

---

## 1. Next.js Application Health Check

### Endpoint
```
GET /api/health
```

### Implementation
**File:** `src/app/api/health/route.ts`

**Purpose:** Check the health of the Next.js web application and database connectivity

### Response Format

**Healthy Response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-17T09:15:30.123Z",
  "database": "connected",
  "userCount": 42,
  "environment": "production"
}
```

**Unhealthy Response (500):**
```json
{
  "status": "unhealthy",
  "timestamp": "2025-10-17T09:15:30.123Z",
  "database": "disconnected",
  "error": "Connection timeout",
  "environment": "production"
}
```

### Health Checks Performed
1. ✅ **Database Connection Test**: Executes `SELECT 1` query
2. ✅ **User Count**: Queries total user count as additional validation
3. ✅ **Response Time**: Implicit via API response time
4. ✅ **Environment Info**: Returns current NODE_ENV

### Usage
```bash
# Check application health
curl http://localhost:8080/api/health

# With monitoring tools
curl -f http://localhost:8080/api/health || echo "App is down"
```

---

## 2. Sync Service Health Check

### Endpoint
```
GET http://localhost:[SYNC_PORT + 1]/health
```

**Default:** `http://localhost:8766/health` (if SYNC_PORT=8765)

### Implementation
**File:** `service/sync-service-runner.js`

**Method:** `createHealthCheck()`

### Response Format

**Healthy Response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-17T09:15:30.123Z",
  "uptime": 3600.5,
  "memoryUsage": {
    "rss": 52428800,
    "heapTotal": 18874368,
    "heapUsed": 8388608,
    "external": 1048576,
    "arrayBuffers": 524288
  },
  "syncService": {
    "isRunning": true,
    "nodeId": "abc123",
    "nodeName": "sync-node-server1",
    "peersConnected": 2,
    "totalEventsSynced": 1542,
    "lastSyncTime": "2025-10-17T09:14:30.123Z"
  }
}
```

**Unhealthy Response (503):**
```json
{
  "status": "unhealthy",
  "timestamp": "2025-10-17T09:15:30.123Z",
  "uptime": 3600.5,
  "memoryUsage": { "..." },
  "syncService": {
    "isRunning": false
  }
}
```

### Health Checks Performed
1. ✅ **Service Running State**: Checks if sync service is active
2. ✅ **Process Uptime**: System uptime in seconds
3. ✅ **Memory Usage**: Current memory consumption
4. ✅ **Peer Connections**: Number of connected sync peers
5. ✅ **Sync Statistics**: Total events synced
6. ✅ **Last Sync Time**: Timestamp of last successful sync

### Code Implementation

```javascript
createHealthCheck() {
  const http = require('http')
  const healthPort = config.sync.port + 1  // SYNC_PORT + 1

  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      const status = this.syncService 
        ? this.syncService.getStatus() 
        : { isRunning: false }

      // 200 if running, 503 if not
      res.writeHead(status.isRunning ? 200 : 503, { 
        'Content-Type': 'application/json' 
      })
      
      res.end(JSON.stringify({
        status: status.isRunning ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        syncService: status
      }))
    } else {
      res.writeHead(404)
      res.end('Not Found')
    }
  })

  server.listen(healthPort, () => {
    logger.info(`Health check server listening on port ${healthPort}`)
  })

  return server
}
```

### Usage
```bash
# Check sync service health
curl http://localhost:8766/health

# With jq for pretty output
curl -s http://localhost:8766/health | jq .

# Monitor in loop
watch -n 5 'curl -s http://localhost:8766/health | jq .'
```

---

## 3. Internal Health Monitoring (Sync Service)

### Implementation
**File:** `src/lib/sync/sync-service.ts`

**Method:** `startHealthMonitoring()`

### Purpose
Internal periodic health checks that emit events for monitoring

### Health Check Interval
**60 seconds** (60000ms)

### Code Implementation

```typescript
private startHealthMonitoring(): void {
  this.healthCheckTimer = setInterval(async () => {
    try {
      // Update status
      this.status = this.getStatus()

      // Emit health status event
      this.emit('health_check', this.status)

      // Log periodic status (debug mode only)
      if (this.config.logLevel === 'debug') {
        this.log('debug', 
          `Health check: ${this.status.peersConnected} peers, ` +
          `${this.status.totalEventsSynced} events synced`
        )
      }
    } catch (error) {
      this.log('error', 'Health check failed:', error)
    }
  }, 60000) // Every minute
}
```

### Health Check Events

**Event:** `health_check`

**Payload:**
```typescript
{
  isRunning: boolean
  nodeId: string
  nodeName: string
  peersConnected: number
  totalEventsSynced: number
  lastSyncTime: Date | null
  uptime: number
}
```

### Usage in Service Runner

**File:** `src/service/sync-service-runner.ts`

```typescript
this.service.on('health_check', (status: any) => {
  // Can be used for:
  // - Logging health metrics
  // - Sending to monitoring systems (Datadog, New Relic, etc.)
  // - Triggering alerts on unhealthy status
  // - Updating dashboard stats
})
```

---

## 4. Partition Detector Health Checks

### Implementation
**File:** `src/lib/sync/partition-detector.ts`

**Method:** `performHealthCheck()`

### Purpose
Advanced health monitoring for distributed sync scenarios to detect network partitions

### Health Checks Performed

1. **Peer Timeout Detection**
   ```typescript
   private async checkPeerTimeouts(): Promise<void>
   ```
   - Monitors when peers were last seen
   - Triggers alerts for unreachable peers
   - Threshold: `PEER_UNREACHABLE_THRESHOLD`

2. **Data Consistency Checks**
   ```typescript
   private async checkDataConsistency(): Promise<void>
   ```
   - Validates sync event integrity
   - Detects missing or corrupted events
   - Compares checksums across peers

3. **Sync Lag Detection**
   ```typescript
   private async checkSyncLag(): Promise<void>
   ```
   - Measures delay between event creation and sync
   - Alerts on excessive lag
   - Helps identify performance bottlenecks

4. **Partition Analysis**
   ```typescript
   private async analyzeExistingPartitions(): Promise<void>
   ```
   - Identifies split-brain scenarios
   - Detects isolated node groups
   - Recommends reconciliation actions

### Health Check Frequency
Runs periodically as part of partition detection cycle

---

## 5. Database Precheck (Service Startup)

### Implementation
**File:** `service/sync-service-runner.js`

**Method:** `performDbPrecheck()`

### Purpose
Validate database connectivity before starting sync service

### Configuration

**Environment Variables:**
```bash
SKIP_DB_PRECHECK=false           # Set true to skip (CI/testing)
DB_PRECHECK_ATTEMPTS=3           # Number of retry attempts
DB_PRECHECK_BASE_DELAY_MS=500    # Base delay between retries (exponential backoff)
```

### Retry Logic
- **Exponential Backoff**: Delay increases with each retry
- **Max Attempts**: Configurable (default: 3)
- **Validation**: Checks DATABASE_URL availability before attempting connection

### Code Flow
```javascript
async performDbPrecheck() {
  const skip = process.env.SKIP_DB_PRECHECK === 'true'
  if (skip) {
    logger.info('Skipping database precheck')
    return
  }

  const maxAttempts = parseInt(process.env.DB_PRECHECK_ATTEMPTS || '3', 10)
  const baseDelay = parseInt(process.env.DB_PRECHECK_BASE_DELAY_MS || '500', 10)

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Attempt database connection test
      await testDatabaseConnection()
      logger.info('Database precheck passed')
      return
    } catch (error) {
      if (attempt < maxAttempts) {
        const delay = baseDelay * Math.pow(2, attempt - 1)
        logger.warn(`DB precheck attempt ${attempt} failed, retrying in ${delay}ms`)
        await sleep(delay)
      } else {
        logger.error('Database precheck failed after all attempts')
        throw error
      }
    }
  }
}
```

---

## Health Check Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    External Monitoring                       │
│  (Load Balancers, Kubernetes, Monitoring Tools)             │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
        ▼                           ▼
┌───────────────┐          ┌──────────────────┐
│  Next.js App  │          │  Sync Service    │
│  Port: 8080   │          │  Health Server   │
│               │          │  Port: 8766      │
│ GET /api/health│         │ GET /health      │
└───────┬───────┘          └────────┬─────────┘
        │                           │
        │ Tests                     │ Tests
        ▼                           ▼
┌───────────────┐          ┌──────────────────┐
│   Database    │          │  Sync Service    │
│   (Prisma)    │          │  Internal Status │
└───────────────┘          └────────┬─────────┘
                                    │
                                    │ Emits Events
                                    ▼
                           ┌──────────────────┐
                           │ Internal Health  │
                           │   Monitoring     │
                           │  (Every 60s)     │
                           └────────┬─────────┘
                                    │
                                    │ Triggers
                                    ▼
                           ┌──────────────────┐
                           │  Partition       │
                           │  Detector        │
                           │  (Advanced)      │
                           └──────────────────┘
```

---

## Monitoring Integration Examples

### 1. Docker Health Check

**docker-compose.yml:**
```yaml
services:
  app:
    image: multi-business-app
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
  
  sync-service:
    image: multi-business-sync
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8766/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### 2. Kubernetes Liveness & Readiness Probes

**deployment.yaml:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: multi-business-app
spec:
  template:
    spec:
      containers:
      - name: app
        image: multi-business-app
        livenessProbe:
          httpGet:
            path: /api/health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
```

### 3. Uptime Monitoring (UptimeRobot, Pingdom)

**Configuration:**
- **App Health URL:** `https://yourdomain.com/api/health`
- **Sync Service URL:** `https://sync.yourdomain.com/health`
- **Check Interval:** 5 minutes
- **Expected Status:** 200
- **Expected Content:** `"status":"healthy"`

### 4. Application Performance Monitoring (APM)

**New Relic / Datadog Integration:**
```javascript
// In service runner or app startup
setInterval(async () => {
  try {
    const appHealth = await fetch('http://localhost:8080/api/health')
    const syncHealth = await fetch('http://localhost:8766/health')
    
    // Send to APM
    apm.trackMetric('app.health.status', appHealth.ok ? 1 : 0)
    apm.trackMetric('sync.health.status', syncHealth.ok ? 1 : 0)
    
    const appData = await appHealth.json()
    apm.trackMetric('app.database.users', appData.userCount)
    
    const syncData = await syncHealth.json()
    apm.trackMetric('sync.peers.connected', syncData.syncService.peersConnected)
    apm.trackMetric('sync.events.total', syncData.syncService.totalEventsSynced)
  } catch (error) {
    apm.trackError(error)
  }
}, 60000) // Every minute
```

### 5. Prometheus / Grafana

**Prometheus scrape config:**
```yaml
scrape_configs:
  - job_name: 'multi-business-app'
    metrics_path: '/api/health'
    static_configs:
      - targets: ['localhost:8080']
    metric_relabel_configs:
      - source_labels: [status]
        target_label: health_status
  
  - job_name: 'multi-business-sync'
    metrics_path: '/health'
    static_configs:
      - targets: ['localhost:8766']
```

---

## Health Check Testing

### Manual Testing

```bash
# Test Next.js app health
curl -i http://localhost:8080/api/health

# Test sync service health
curl -i http://localhost:8766/health

# Test with timeout
curl --max-time 5 http://localhost:8080/api/health

# Test and parse JSON
curl -s http://localhost:8080/api/health | jq '.status'
```

### Automated Testing

**File:** `src/lib/sync/__tests__/sync-service.test.ts`

```typescript
test('should emit health check events', async () => {
  const healthCheckSpy = jest.fn()
  syncService.on('health_check', healthCheckSpy)
  
  await syncService.start()
  
  // Wait for at least one health check (60s interval)
  await new Promise(resolve => setTimeout(resolve, 65000))
  
  expect(healthCheckSpy).toHaveBeenCalled()
  expect(healthCheckSpy.mock.calls[0][0]).toHaveProperty('isRunning', true)
})
```

### Load Testing

```bash
# Apache Bench - Test health endpoint performance
ab -n 1000 -c 10 http://localhost:8080/api/health

# wrk - More advanced load testing
wrk -t12 -c400 -d30s http://localhost:8080/api/health
```

---

## Health Check Best Practices

### ✅ Do's

1. **Keep Health Checks Fast**: < 1 second response time
2. **Check Critical Dependencies**: Database, external APIs
3. **Return Structured JSON**: Consistent format across all endpoints
4. **Use Appropriate HTTP Status Codes**: 200 (healthy), 503 (unhealthy)
5. **Include Timestamps**: For debugging and monitoring
6. **Log Health Check Failures**: But not every success (too noisy)
7. **Implement Graceful Degradation**: Partial health states if needed

### ❌ Don'ts

1. **Don't Perform Heavy Operations**: No complex queries or calculations
2. **Don't Check Non-Critical Services**: Only check essential dependencies
3. **Don't Return Sensitive Information**: No database credentials, keys, etc.
4. **Don't Make External API Calls**: Unless they're critical dependencies
5. **Don't Block on Slow Operations**: Use timeouts
6. **Don't Cache Health Results**: Always return current state

---

## Troubleshooting

### Health Check Returns 500

**Possible Causes:**
- Database connection lost
- Prisma client not initialized
- Environment variables missing

**Debug Steps:**
```bash
# Check database connectivity
psql $DATABASE_URL -c "SELECT 1"

# Check application logs
tail -f logs/application.log

# Test Prisma connection
npx prisma db execute --stdin <<< "SELECT 1"
```

### Sync Service Health Returns 503

**Possible Causes:**
- Sync service not started
- Service crashed
- Port conflict

**Debug Steps:**
```bash
# Check if service is running
npm run service:status

# Check logs
cat windows-service/daemon/sync-service.log

# Try manual start
npm run service:start
```

### Health Check Timeout

**Possible Causes:**
- Slow database queries
- Network issues
- High server load

**Debug Steps:**
```bash
# Check server load
top

# Check database performance
# Run EXPLAIN ANALYZE on health check queries

# Increase timeout in monitoring tool
```

---

## Summary

The Multi-Business application implements a **comprehensive multi-layer health check system**:

1. **Next.js App** (`/api/health`) - Application & database health
2. **Sync Service** (`:8766/health`) - Service & sync status
3. **Internal Monitoring** - Periodic status events (60s)
4. **Partition Detection** - Advanced distributed health checks
5. **Database Precheck** - Startup validation with retry logic

All health checks are designed for:
- ✅ **Fast Response Times** (< 1s)
- ✅ **Structured JSON Output**
- ✅ **Proper HTTP Status Codes**
- ✅ **Integration-Ready** (Docker, K8s, monitoring tools)
- ✅ **Production-Tested** with retry logic and error handling

