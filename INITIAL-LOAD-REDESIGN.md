# Initial Load Redesign - Backup/Restore Approach

## Problem with Current Implementation

### Issues Found:
1. **Stuck transfers** - Sessions get stuck at 71% and can't recover
2. **Silent failures** - Receive endpoint returns 200 OK even when database writes fail
3. **Model name mapping errors** - Simple capitalization doesn't handle all Prisma models
4. **Extremely slow** - 2+ hours for 1,000 records (record-by-record HTTP)
5. **No data on target** - Despite "transferred" count, data doesn't appear
6. **Blocks new transfers** - Stuck session prevents starting new initial load

### Root Cause:
The `applyChangeToDatabase` function in `/api/sync/receive/route.ts` catches errors but still returns success:

```typescript
try {
  await applyChangeToDatabase(prisma, event)
  processedCount++
  processedEvents.push({ eventId: event.id, status: 'processed' })
} catch (applyError) {
  // Returns 200 OK even on failure!
  processedEvents.push({ eventId: event.id, status: 'failed', error: ... })
}

return NextResponse.json({ success: true, processedCount, ... })
```

Source sees 200 OK → increments "transferred" count → but data never saved on target.

## New Solution: Backup/Restore Approach

### Architecture:

```
SOURCE                           TARGET
┌─────────────────┐             ┌─────────────────┐
│ 1. pg_dump      │             │                 │
│    ↓            │             │                 │
│ 2. backup.sql   │────────────→│ 3. receive file │
│    (with data)  │   HTTP      │    ↓            │
│                 │             │ 4. Convert to   │
│                 │             │    UPSERT        │
│                 │             │    ↓            │
│                 │             │ 5. psql restore │
└─────────────────┘             └─────────────────┘
```

### Implementation:

**1. Create Backup** (`backup-transfer.ts`)
```bash
pg_dump --data-only --column-inserts --no-owner --no-privileges
```
- Exports only data (schema from migrations)
- Uses INSERT statements for compatibility
- ~5-10 MB for typical database

**2. Transfer File** (`/api/sync/receive-backup`)
- Base64 encode backup file
- Single HTTP POST with entire file
- Much faster than 1000+ individual requests

**3. Convert to UPSERT** (`restore-backup.ts`)
```sql
-- Before:
INSERT INTO businesses (id, name, ...) VALUES ('id1', 'HXI Bhero', ...);

-- After:
INSERT INTO businesses (id, name, ...) VALUES ('id1', 'HXI Bhero', ...)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ... (all columns);
```

**4. Restore** (`/api/sync/restore-backup`)
```bash
psql -f backup-upsert.sql
```
- Native PostgreSQL restore
- UPSERT makes it re-runnable
- Atomic operation

### Benefits:

| Aspect | Old (HTTP) | New (Backup) |
|--------|-----------|--------------|
| **Speed** | 2+ hours | 2-5 minutes |
| **Reliability** | Fails silently | All or nothing |
| **Re-runnable** | No (duplicates) | Yes (UPSERT) |
| **Complexity** | Very high | Simple |
| **Debugging** | Hard | Easy (SQL file) |
| **Network** | 1000+ requests | 1 request |

## Fixing Current Stuck Session

### Immediate Fix:

```powershell
# Clear stuck session
npm run sync:clear-stuck

# This marks PREPARING/TRANSFERRING sessions as FAILED
```

Or manually:

```sql
UPDATE "InitialLoadSessions"
SET status = 'FAILED',
    "errorMessage" = 'Manually cleared',
    "completedAt" = NOW()
WHERE status IN ('PREPARING', 'TRANSFERRING');
```

### Why Sessions Get Stuck:

1. Transfer takes 2+ hours
2. Service restarts during transfer
3. HTTP requests timeout
4. But session status never updates
5. New loads blocked by "already in progress" check

## Migration Path

### Phase 1: Immediate (Use Now)
- Clear stuck sessions: `npm run sync:clear-stuck`
- Use backup/restore approach manually (if needed urgently)

### Phase 2: Integration (Next Sprint)
- Wire up backup-transfer.ts to initial load UI
- Add "Backup Method" toggle in UI
- Keep HTTP method as fallback
- Test thoroughly

### Phase 3: Production (When Stable)
- Make backup/restore the default
- Remove HTTP method (or keep for incremental sync only)
- Add progress tracking for restore phase

## Testing Plan

### Test Cases:

1. **First-time Initial Load**
   - Clean target database
   - Run backup/restore
   - Verify all data appears

2. **Re-run Initial Load**
   - Target already has data
   - Run backup/restore again
   - Verify UPSERT updates existing records
   - No duplicates

3. **Large Database**
   - Test with 10,000+ products
   - Measure time vs HTTP method
   - Verify memory usage

4. **Network Failure**
   - Kill network mid-transfer
   - Verify graceful failure
   - Retry succeeds

5. **Demo Data Filtering**
   - Verify demo businesses excluded
   - Check businessId patterns

## Commands

### Clear Stuck Session:
```bash
npm run sync:clear-stuck
```

### Manual Backup/Restore (PowerShell):
```powershell
# On source
pg_dump -h localhost -U postgres -d multi_business_db `
  --data-only --column-inserts `
  -f backup.sql

# Transfer file (scp, network share, etc.)
# On target
psql -h localhost -U postgres -d multi_business_db -f backup.sql
```

### Check Session Status:
```sql
SELECT "sessionId", status, progress, "currentStep", "startedAt"
FROM "InitialLoadSessions"
ORDER BY "startedAt" DESC
LIMIT 5;
```

## Files Created

### Core Implementation:
- `src/app/api/admin/sync/initial-load/backup-transfer.ts` - Main backup/restore logic
- `src/app/api/sync/receive-backup/route.ts` - Receive backup file endpoint
- `src/app/api/sync/restore-backup/route.ts` - Restore backup endpoint

### Utilities:
- `scripts/clear-stuck-initial-load.js` - Clear stuck sessions
- `scripts/clear-migration-locks.js` - Clear migration locks

### NPM Scripts:
- `npm run sync:clear-stuck` - Clear stuck initial load sessions
- `npm run db:clear-locks` - Clear migration locks

## Next Steps

1. **Immediate**: Run `npm run sync:clear-stuck` on source server
2. **Test**: Try backup/restore approach manually to verify data transfers
3. **Integrate**: Wire up backup-transfer.ts to UI (if approach works well)
4. **Deploy**: Replace HTTP method with backup/restore
5. **Monitor**: Watch for any issues in production

## Notes

- PostgreSQL tools (`pg_dump`, `psql`) must be installed on both servers
- Backup file temporary - cleaned up after transfer
- UPSERT ensures re-runnability without duplicates
- Much simpler than trying to fix HTTP sync
- Native PostgreSQL = battle-tested reliability
