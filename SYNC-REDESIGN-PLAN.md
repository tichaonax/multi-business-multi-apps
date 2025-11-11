# Sync System Redesign - Complete Plan

## Vision

### Current Problems:
- ❌ "Initial Load" terminology is confusing
- ❌ UI unclear about direction (source vs target)
- ❌ Dropdown selections randomly change
- ❌ Can't initiate from target server
- ❌ Progress stuck/unclear
- ❌ HTTP sync is slow and unreliable

### New Design:
- ✅ Simple "Full Sync" terminology
- ✅ Bidirectional - initiate from either server
- ✅ Clear source/target indication
- ✅ Backup/restore method (fast, reliable)
- ✅ Better progress tracking
- ✅ Periodic sync continues to work

## UI Redesign

### Current Flow:
```
Admin -> Sync -> Initial Load Tab
  -> Select Target Peer dropdown
  -> Click "Start Initial Load"
  -> Watch progress (buggy)
```

### New Flow:
```
Admin -> Sync -> Full Sync Tab

  ┌─────────────────────────────────────────┐
  │ Full Sync                                │
  │                                          │
  │ Synchronize all data with another server │
  │                                          │
  │ ┌─────────────────────────────────────┐ │
  │ │ Select Server                       │ │
  │ │ ○ Server A (192.168.0.112) [Local] │ │
  │ │ ○ Server B (192.168.0.114)          │ │
  │ └─────────────────────────────────────┘ │
  │                                          │
  │ Direction:                               │
  │ ○ Pull from selected server → This      │
  │ ○ Push to selected server ← This        │
  │                                          │
  │ Options:                                 │
  │ □ Compress backup (faster transfer)     │
  │ □ Verify after sync                     │
  │                                          │
  │ [Start Full Sync]                       │
  │                                          │
  │ Recent Syncs:                            │
  │ ┌─────────────────────────────────────┐ │
  │ │ ✅ Server B → This    2 min ago     │ │
  │ │ ✅ This → Server B    1 hour ago    │ │
  │ │ ❌ Server B → This    2 hours ago   │ │
  │ └─────────────────────────────────────┘ │
  └─────────────────────────────────────────┘
```

### Progress Indicator:
```
┌─────────────────────────────────────────┐
│ Full Sync in Progress                   │
│                                         │
│ Server B → This Server                 │
│                                         │
│ ████████████░░░░░░░░░░ 60%            │
│                                         │
│ Step 3 of 5: Transferring backup...    │
│ 12.5 MB / 20.8 MB                      │
│                                         │
│ Estimated: 45 seconds remaining         │
│                                         │
│ [Cancel Sync]                           │
└─────────────────────────────────────────┘
```

## Technical Architecture

### Full Sync Process:

**PULL (Remote → Local):**
```
1. User clicks "Pull from Server B"
2. Local sends request to Remote: /api/sync/initiate-backup
3. Remote creates pg_dump backup
4. Remote sends backup to Local: /api/sync/receive-backup
5. Local converts to UPSERT
6. Local restores to database
7. Done ✅
```

**PUSH (Local → Remote):**
```
1. User clicks "Push to Server B"
2. Local creates pg_dump backup
3. Local sends backup to Remote: /api/sync/receive-backup
4. Remote converts to UPSERT
5. Remote restores to database
6. Done ✅
```

### Periodic Sync (Unchanged):
```
Background service polls every 30 seconds:
1. Check for new sync events
2. Send/receive incremental changes
3. Apply to database
4. Continue running
```

## Task Breakdown

### Phase 1: Backend - Backup/Restore Integration
- [ ] Update initial-load route.ts to use backup-transfer
- [ ] Add bidirectional support (PULL vs PUSH)
- [ ] Create /api/sync/initiate-backup endpoint
- [ ] Test backup creation works
- [ ] Test backup transfer works
- [ ] Test UPSERT conversion works
- [ ] Test restore works
- [ ] Add progress tracking for each phase
- [ ] Add error handling and rollback

### Phase 2: UI Components
- [ ] Design new Full Sync UI component
- [ ] Replace "Initial Load" with "Full Sync" terminology
- [ ] Add server selection with radio buttons (not dropdown)
- [ ] Add direction selector (PULL/PUSH)
- [ ] Add options (compress, verify)
- [ ] Improve progress indicator with steps
- [ ] Add bandwidth/speed indicator
- [ ] Fix dropdown random selection bug
- [ ] Add recent syncs list with status
- [ ] Add cancel sync button

### Phase 3: Progress & Monitoring
- [ ] Track progress through all 5 phases
- [ ] Show current step and sub-step
- [ ] Calculate transfer speed (MB/s)
- [ ] Estimate time remaining
- [ ] Show detailed logs (expandable)
- [ ] Add sync history page
- [ ] Email/notification on completion
- [ ] Error notifications with details

### Phase 4: Periodic Sync Verification
- [ ] Verify periodic sync still works
- [ ] Test incremental updates flow
- [ ] Check sync events table
- [ ] Verify background service runs
- [ ] Test conflict resolution
- [ ] Monitor sync lag

### Phase 5: Testing & Polish
- [ ] Test PULL sync (Remote → Local)
- [ ] Test PUSH sync (Local → Remote)
- [ ] Test with large database (10K+ records)
- [ ] Test network failure handling
- [ ] Test concurrent syncs (should block)
- [ ] Test re-running sync (UPSERT)
- [ ] Test demo data filtering
- [ ] Load test with stress conditions
- [ ] Cross-browser testing
- [ ] Mobile responsive check

### Phase 6: Documentation & Deployment
- [ ] Update user documentation
- [ ] Create admin guide
- [ ] Update API documentation
- [ ] Create troubleshooting guide
- [ ] Deploy to staging
- [ ] Run smoke tests
- [ ] Deploy to production (112 & 114)
- [ ] Monitor first production sync
- [ ] Gather user feedback

## API Endpoints

### New Endpoints:

**POST /api/sync/initiate-backup**
```typescript
// Triggers backup creation on remote server
// Used when PULL from remote
Request: { sessionId, sourceNodeId }
Response: { backupCreated: true, size: 12500000 }
```

**POST /api/sync/receive-backup**
```typescript
// Receives backup file from source
Request: { sessionId, backupContent: base64, filename }
Response: { received: true, size: 12500000 }
```

**POST /api/sync/restore-backup**
```typescript
// Restores backup to database
Request: { sessionId, sourceNodeId }
Response: { restored: true, recordsAffected: 2500 }
```

**GET /api/sync/backup-progress**
```typescript
// Get current backup/restore progress
Request: { sessionId }
Response: {
  phase: 'transferring',
  progress: 60,
  bytesTransferred: 12500000,
  totalBytes: 20800000,
  currentStep: 'Transferring backup...',
  estimatedTimeRemaining: 45
}
```

### Updated Endpoints:

**POST /api/admin/sync/initial-load** → **POST /api/admin/sync/full-sync**
```typescript
Request: {
  action: 'pull' | 'push',
  targetPeer: { nodeId, ipAddress, name },
  options: {
    compressionEnabled: boolean,
    verifyAfterSync: boolean
  }
}
Response: {
  success: true,
  sessionId: string,
  message: 'Full sync started'
}
```

## Database Schema Updates

### Rename Table:
```sql
ALTER TABLE "InitialLoadSessions" RENAME TO "FullSyncSessions";
```

### Add Columns:
```sql
ALTER TABLE "FullSyncSessions"
ADD COLUMN "direction" TEXT NOT NULL DEFAULT 'push', -- 'push' or 'pull'
ADD COLUMN "method" TEXT NOT NULL DEFAULT 'backup', -- 'backup' or 'http'
ADD COLUMN "phase" TEXT, -- 'backup', 'transfer', 'convert', 'restore', 'verify'
ADD COLUMN "transferSpeed" FLOAT, -- bytes per second
ADD COLUMN "estimatedCompletion" TIMESTAMP;
```

## File Structure

### New Files:
```
src/app/api/sync/
  ├── initiate-backup/route.ts      [NEW]
  ├── receive-backup/route.ts        [CREATED]
  ├── restore-backup/route.ts        [CREATED]
  └── backup-progress/route.ts       [NEW]

src/app/api/admin/sync/
  ├── full-sync/route.ts             [NEW - renamed from initial-load]
  └── full-sync/
      ├── backup-transfer.ts         [CREATED]
      └── http-transfer.ts           [EXISTING - keep as fallback]

src/app/admin/sync/
  ├── page.tsx                       [UPDATE]
  └── components/
      ├── FullSyncPanel.tsx          [NEW]
      ├── ServerSelector.tsx         [NEW]
      ├── DirectionSelector.tsx      [NEW]
      ├── ProgressIndicator.tsx      [UPDATE]
      ├── SyncHistory.tsx            [NEW]
      └── PeriodicSyncStatus.tsx     [UPDATE]

scripts/
  ├── clear-stuck-sync.js            [RENAME from clear-stuck-initial-load]
  └── test-full-sync.js              [NEW]
```

### Updated Files:
```
prisma/schema.prisma                 [UPDATE - rename model]
package.json                         [UPDATE - rename scripts]
SYNC-REDESIGN-PLAN.md               [THIS FILE]
```

## Migration Script

```typescript
// prisma/migrations/YYYYMMDDHHMMSS_rename_to_full_sync/migration.sql

-- Rename table
ALTER TABLE "InitialLoadSessions" RENAME TO "FullSyncSessions";

-- Add new columns
ALTER TABLE "FullSyncSessions"
ADD COLUMN "direction" TEXT NOT NULL DEFAULT 'push',
ADD COLUMN "method" TEXT NOT NULL DEFAULT 'backup',
ADD COLUMN "phase" TEXT,
ADD COLUMN "transferSpeed" FLOAT,
ADD COLUMN "estimatedCompletion" TIMESTAMP;

-- Update existing records
UPDATE "FullSyncSessions"
SET "method" = 'http'
WHERE "startedAt" < NOW();
```

## Testing Checklist

### Functional Tests:
- [ ] PULL sync completes successfully
- [ ] PUSH sync completes successfully
- [ ] Progress updates in real-time
- [ ] Cancel sync works mid-transfer
- [ ] Stuck sessions can be cleared
- [ ] UPSERT prevents duplicates on re-run
- [ ] Demo data is filtered out
- [ ] Large databases (10K+ records) work
- [ ] Network failures are handled gracefully
- [ ] Concurrent syncs are blocked

### Periodic Sync Tests:
- [ ] Background service continues to run
- [ ] Incremental changes sync automatically
- [ ] No interference with full sync
- [ ] Conflict resolution works
- [ ] Sync events logged correctly

### UI/UX Tests:
- [ ] Server selection is clear
- [ ] Direction is obvious (arrows help)
- [ ] Progress bar is accurate
- [ ] Recent syncs show correct status
- [ ] Error messages are helpful
- [ ] Mobile responsive
- [ ] Loading states are clear
- [ ] Cancel confirmation works

### Performance Tests:
- [ ] 1K records: < 1 minute
- [ ] 10K records: < 5 minutes
- [ ] 100K records: < 30 minutes
- [ ] Transfer speed: > 10 MB/s on LAN
- [ ] Memory usage: < 500 MB
- [ ] No memory leaks

## Rollback Plan

If issues occur in production:

1. **Immediate Rollback:**
   ```sql
   ALTER TABLE "FullSyncSessions" RENAME TO "InitialLoadSessions";
   ```

2. **Revert Code:**
   ```bash
   git revert <commit-hash>
   npm run build
   npm run service:restart
   ```

3. **Fallback to HTTP:**
   - Keep HTTP method as backup
   - UI toggle to switch methods
   - Monitor and debug backup method

## Success Metrics

### Performance:
- Full sync time: < 5 minutes (vs 2+ hours)
- Success rate: > 99%
- User satisfaction: > 4.5/5 stars

### Reliability:
- Zero stuck sessions
- Zero silent failures
- Zero data loss incidents

### User Experience:
- Setup time: < 2 minutes
- Support tickets: < 1 per month
- User confusion: < 5%

## Timeline

### Week 1: Backend
- Days 1-2: Backup/restore integration
- Days 3-4: Bidirectional support
- Day 5: Testing & bug fixes

### Week 2: Frontend
- Days 1-2: UI components
- Days 3-4: Progress tracking
- Day 5: Polish & refinement

### Week 3: Testing
- Days 1-2: Integration testing
- Days 3-4: Load testing
- Day 5: Bug fixes

### Week 4: Deployment
- Days 1-2: Staging deployment
- Day 3: Production deployment
- Days 4-5: Monitoring & support

## Risk Mitigation

### Risk 1: PostgreSQL tools not installed
**Mitigation:** Check for pg_dump/psql on startup, show error with install instructions

### Risk 2: Large backups timeout
**Mitigation:** Stream backup in chunks, add progress tracking

### Risk 3: UPSERT conversion fails
**Mitigation:** Fallback to plain INSERT, detect conflicts and skip

### Risk 4: Network failures mid-transfer
**Mitigation:** Add resumable transfers, save checkpoint progress

### Risk 5: Periodic sync breaks
**Mitigation:** Keep HTTP method for incremental, extensive testing

## Next Actions

1. Review and approve this plan
2. Start Phase 1: Backend implementation
3. Daily standup to track progress
4. Weekly demo of completed features
