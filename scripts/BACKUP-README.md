# Backup and Restore Scripts

This directory contains scripts for backing up and restoring the complete application data, including database records and product images.

## Backup Scripts

### `backup-data-with-images.js` (Recommended)
**Full backup including database and product images**

```bash
node scripts/backup-data-with-images.js
```

**What it backs up:**
- All database tables (users, businesses, products, orders, etc.)
- Product images from `public/uploads/images/`
- Creates a manifest file with backup metadata

**Output structure:**
```
backups/
└── backup_2026-01-12T10-30-00/
    ├── database.json          # Database records
    ├── manifest.json          # Backup metadata
    └── uploads/
        └── images/            # Product images
            ├── 1768208374649_etcqvsnu6lk.png
            ├── 1768208408276_nol28rcezr.png
            └── ...
```

### `backup-data.js` (Legacy)
**Database-only backup (no images)**

```bash
node scripts/backup-data.js
```

Creates a single JSON file with database records only.

## Restore Scripts

### `restore-data-with-images.js`
**Restore complete backup including images**

```bash
node scripts/restore-data-with-images.js ../backups/backup_2026-01-12T10-30-00
```

**What it does:**
1. Verifies backup directory exists
2. Shows backup manifest (timestamp, record count, includes images)
3. Waits 5 seconds for confirmation (press Ctrl+C to cancel)
4. Clears existing database tables
5. Restores all database records
6. Clears existing product images
7. Restores product images from backup

**⚠️ WARNING:** This will overwrite your current database and images!

## Recommended Backup Schedule

### Before Major Changes
```bash
node scripts/backup-data-with-images.js
```

### Daily Automated Backup (Example using cron)
```cron
# Daily backup at 2 AM
0 2 * * * cd /path/to/app && node scripts/backup-data-with-images.js
```

### Before Database Migrations
```bash
node scripts/backup-data-with-images.js
# Then run your migration
npx prisma migrate deploy
```

## Backup Location

By default, backups are stored in: `backups/backup_YYYY-MM-DDTHH-MM-SS/`

Each backup is timestamped and contains:
- `database.json` - All database records
- `manifest.json` - Backup metadata
- `uploads/images/` - Product images (if present)

## Storage Considerations

- Product images can accumulate over time
- Each image is typically 50KB - 2MB
- Monitor backup directory size regularly
- Consider archiving old backups to external storage
- Use compression for long-term storage:
  ```bash
  tar -czf backup_2026-01-12.tar.gz backups/backup_2026-01-12T10-30-00/
  ```

## Troubleshooting

### "Backup directory not found"
- Check the path you provided to restore script
- Use relative path from scripts directory: `../backups/backup_YYYY-MM-DDTHH-MM-SS`

### "Failed to restore images"
- Ensure write permissions on `public/uploads/images/`
- Check disk space availability

### Database restore fails
- Check Prisma schema matches backup version
- Verify foreign key constraints
- Look for specific error messages in console output

## Security Notes

- Backup files contain sensitive data (user info, business data)
- Store backups securely with proper access controls
- Consider encrypting backups for production environments
- Never commit backups to version control (already in .gitignore)
