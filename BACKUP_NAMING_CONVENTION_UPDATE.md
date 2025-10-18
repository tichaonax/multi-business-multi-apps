# Backup File Naming Convention Update

## Date
October 17, 2025

## Change Summary
Updated all backup file naming conventions across the entire codebase to use a consistent format with service name prefix and full timestamp.

## New Naming Convention

### Format
```
MultiBusinessSyncService-backup_[type]_[YYYY-MM-DDTHH-MM-SS].[extension]
```

### Examples
- `MultiBusinessSyncService-backup_full_2025-10-17T09-15-30.json`
- `MultiBusinessSyncService-backup_users_2025-10-17T14-22-18.json`
- `MultiBusinessSyncService-backup_purchase-data_2025-10-17T16-45-03.json`
- `MultiBusinessSyncService-backup_database_2025-10-17T18-30-45.sql`
- `MultiBusinessSyncService-backup_pre-upgrade_2025-10-17T20-00-12.sql`

### Benefits
✅ **Service Identification**: All backups clearly identified by service name
✅ **Full Timestamp**: Includes date AND time (down to seconds) for precise tracking
✅ **Type Classification**: Backup type clearly indicated (full, users, database, etc.)
✅ **Sortable**: Files sort chronologically by name
✅ **Searchable**: Easy to filter by service name or backup type
✅ **Consistent**: Same format across all backup systems

---

## Files Modified

### 1. Frontend Components

#### `src/components/data-backup.tsx`
**Before:**
```typescript
let filename = `backup_${backupOptions.type}_${new Date().toISOString().split('T')[0]}.json`;
```

**After:**
```typescript
let filename = `MultiBusinessSyncService-backup_${backupOptions.type}_${new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)}.json`;
```

**Change:** Added service name prefix, changed from date-only to full timestamp

---

### 2. API Routes

#### `src/app/api/backup/route.ts`
**Before:**
```typescript
const timestamp = new Date().toISOString().split('T')[0];
const filename = `multi-business-multi-apps-backup_${backupType}_${timestamp}.json`;
```

**After:**
```typescript
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
const filename = `MultiBusinessSyncService-backup_${backupType}_${timestamp}.json`;
```

**Change:** Renamed service prefix, added time to timestamp

---

### 3. Library Functions

#### `src/lib/backup.ts`
**Before:**
```typescript
const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
const backupFile = path.join(backupDir, `backup-${timestamp}.json`)
```

**After:**
```typescript
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)
const backupFile = path.join(backupDir, `MultiBusinessSyncService-backup_full_${timestamp}.json`)
```

**Change:** Added service name prefix, added backup type `full`, trimmed timestamp to 19 chars

---

### 4. Scripts

#### `scripts/backup-data.js`
**Before:**
```javascript
const filename = `multi-business-multi-apps-backup_pre_migration_${new Date().toISOString().replace(/[:.]/g, '-')}.json`
```

**After:**
```javascript
const filename = `MultiBusinessSyncService-backup_pre-migration_${new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)}.json`
```

**Change:** Renamed service prefix, trimmed timestamp

---

#### `scripts/cleanup-dev-data.js`
**Before:**
```javascript
const backupFile = path.join(process.cwd(), 'scripts', `cleanup-backup-${Date.now()}.json`)
```

**After:**
```javascript
const backupFile = path.join(process.cwd(), 'scripts', `MultiBusinessSyncService-backup_cleanup_${new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)}.json`)
```

**Change:** Added service name prefix, changed from Unix timestamp to ISO timestamp format

---

#### `scripts/production-upgrade.js`
**Before:**
```javascript
const backupFile = path.join(backupDir, `pre-upgrade-backup-${timestamp}.sql`)
```

**After:**
```javascript
const backupFile = path.join(backupDir, `MultiBusinessSyncService-backup_pre-upgrade_${timestamp}.sql`)
```

**Change:** Added service name prefix, standardized format

---

#### `scripts/install/install.js`
**Before:**
```javascript
const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
const backupFile = path.join(backupDir, `backup-${timestamp}.sql`)
// ...
.filter(f => f.startsWith('backup-') && f.endsWith('.sql'))
```

**After:**
```javascript
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)
const backupFile = path.join(backupDir, `MultiBusinessSyncService-backup_database_${timestamp}.sql`)
// ...
.filter(f => f.startsWith('MultiBusinessSyncService-backup_database_') && f.endsWith('.sql'))
```

**Change:** Added service name prefix, added type `database`, trimmed timestamp, updated filter

---

### 5. Service Update

#### `windows-service/service-update.js`
**Before:**
```javascript
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupName = `multi-business-multi-apps-backup-${timestamp}`;
```

**After:**
```javascript
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
const backupName = `MultiBusinessSyncService-backup_full_${timestamp}`;
```

**Change:** Renamed service prefix, added type `full`, trimmed timestamp

---

## Timestamp Format Details

### Format Breakdown
```
2025-10-17T09-15-30
│    │  │  │  │  │
│    │  │  │  │  └── Seconds (00-59)
│    │  │  │  └───── Minutes (00-59)
│    │  │  └──────── Hours (00-23)
│    │  └─────────── Day (01-31)
│    └────────────── Month (01-12)
└─────────────────── Year (4 digits)
```

### Implementation
```javascript
new Date().toISOString()           // "2025-10-17T09:15:30.123Z"
  .replace(/[:.]/g, '-')           // "2025-10-17T09-15-30-123Z"
  .substring(0, 19)                // "2025-10-17T09-15-30"
```

### Why This Format?
- **Windows-Compatible**: No colons (`:`) which are invalid in Windows filenames
- **Readable**: Human-readable timestamp at a glance
- **Sortable**: Alphabetical sort = chronological sort
- **Precise**: Second-level precision for multiple backups per day
- **No Milliseconds**: Trimmed to 19 chars removes milliseconds and timezone

---

## Backup Types Reference

| Type | Description | Extension | Example |
|------|-------------|-----------|---------|
| `full` | Complete system backup | `.json` | `MultiBusinessSyncService-backup_full_2025-10-17T09-15-30.json` |
| `users` | User data only | `.json` | `MultiBusinessSyncService-backup_users_2025-10-17T14-22-18.json` |
| `purchase-data` | Purchase records | `.json` | `MultiBusinessSyncService-backup_purchase-data_2025-10-17T16-45-03.json` |
| `reference-data` | Reference tables | `.json` | `MultiBusinessSyncService-backup_reference-data_2025-10-17T11-30-00.json` |
| `database` | PostgreSQL dump | `.sql` | `MultiBusinessSyncService-backup_database_2025-10-17T18-30-45.sql` |
| `pre-migration` | Before migration | `.json` | `MultiBusinessSyncService-backup_pre-migration_2025-10-17T08-00-00.json` |
| `pre-upgrade` | Before upgrade | `.sql` | `MultiBusinessSyncService-backup_pre-upgrade_2025-10-17T20-00-12.sql` |
| `cleanup` | Before cleanup | `.json` | `MultiBusinessSyncService-backup_cleanup_2025-10-17T22-15-33.json` |

---

## Migration Notes

### Existing Backups
Old backup files with previous naming conventions will still work but won't follow the new format:
- `backup-2025-10-17T09-15-30-123Z.json` (old format)
- `multi-business-multi-apps-backup_users_2025-10-17.json` (old format)
- `cleanup-backup-1729180530123.json` (old format with Unix timestamp)

### No Breaking Changes
- ✅ Backup restoration code unchanged (reads JSON/SQL regardless of filename)
- ✅ File listing/cleanup filters updated to match new prefix
- ✅ Old backups remain accessible
- ✅ New backups use new format immediately

---

## Testing Checklist

### Frontend Backup Download
- [ ] Navigate to admin backup page
- [ ] Select "Full Backup" and download
- [ ] Verify filename: `MultiBusinessSyncService-backup_full_YYYY-MM-DDTHH-MM-SS.json`
- [ ] Verify content is valid JSON

### API Backup Creation
- [ ] Call `/api/backup?type=users`
- [ ] Check Content-Disposition header
- [ ] Verify filename format matches convention

### Service Update Backup
- [ ] Run `npm run service:update`
- [ ] Check `backups/` directory
- [ ] Verify backup folder name: `MultiBusinessSyncService-backup_full_YYYY-MM-DDTHH-MM-SS/`

### Database Backup
- [ ] Run install script database backup
- [ ] Check generated SQL file name
- [ ] Verify format: `MultiBusinessSyncService-backup_database_YYYY-MM-DDTHH-MM-SS.sql`

### Cleanup Script
- [ ] Run cleanup script
- [ ] Check backup file created before cleanup
- [ ] Verify format includes `cleanup` type

---

## Service Name Source

The service name `MultiBusinessSyncService` comes from `windows-service/config.js`:

```javascript
module.exports = {
  name: 'MultiBusinessSyncService',
  displayName: 'Multi-Business Sync Service',
  // ...
};
```

This ensures consistency between:
- Service registration name
- Backup file prefixes
- Log file names
- Process identification

---

## Future Enhancements

### Potential Additions
1. **Compression Support**: Add `.gz` extension for compressed backups
2. **Rotation Policy**: Auto-delete backups older than X days
3. **Restore UI**: Browse and restore from backup files by service name
4. **Backup Validation**: Verify backup integrity before deletion
5. **Cloud Upload**: Automatically upload backups to cloud storage

### Example Future Format
```
MultiBusinessSyncService-backup_full_2025-10-17T09-15-30.json.gz
MultiBusinessSyncService-backup_incremental_2025-10-17T10-00-00.json
MultiBusinessSyncService-backup_differential_2025-10-17T11-00-00.json
```

---

## Status
✅ **COMPLETE** - All backup file naming updated to new convention

## Files Modified
- `src/components/data-backup.tsx`
- `src/app/api/backup/route.ts`
- `src/lib/backup.ts`
- `scripts/backup-data.js`
- `scripts/cleanup-dev-data.js`
- `scripts/production-upgrade.js`
- `scripts/install/install.js`
- `windows-service/service-update.js`

**Total:** 8 files updated
