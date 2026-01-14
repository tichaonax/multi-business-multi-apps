# Fresh Install Test Guide

**Purpose:** Verify all migrations (including the 4 new backup fixes) work correctly from scratch

---

## ✅ All New Migrations Are Included

Your migrations folder now contains **79 total migrations** including these 4 new ones:

1. ✅ `20260113000002_create_wifi_token_devices`
2. ✅ `20260113000003_add_sale_channel_to_wifi_token_sales`
3. ✅ `20260113000004_create_wifi_usage_analytics`
4. ✅ `20260113000005_add_missing_r710_wlans_columns`

These will be automatically applied during fresh install!

---

## Fresh Install Process

### Step 1: Backup Current Data (If Needed)

If you have important data, create a backup first via the UI before proceeding.

### Step 2: Drop and Recreate Database

```bash
# Stop the server first (close the Electron app or Ctrl+C the server)

# Drop the existing database
dropdb multi_business_db

# Create fresh database
createdb multi_business_db
```

### Step 3: Apply All Migrations

```bash
# This will apply all 79 migrations in order
npx prisma migrate deploy
```

**Expected Output:**
```
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "multi_business_db"

79 migrations found in prisma/migrations

Applying migration `20241101000000_init`
Applying migration `20241102000000_...`
...
Applying migration `20260113000002_create_wifi_token_devices`
Applying migration `20260113000003_add_sale_channel_to_wifi_token_sales`
Applying migration `20260113000004_create_wifi_usage_analytics`
Applying migration `20260113000005_add_missing_r710_wlans_columns`

The following migrations have been applied:

migrations/
  └─ [All 79 migrations listed]

All migrations have been successfully applied.
```

### Step 4: Seed Initial Data (Optional)

```bash
# If you have seed scripts
npm run seed
```

Or create admin user manually via the app.

### Step 5: Start Server

```bash
npm run dev
```

### Step 6: Test Backup

1. Open http://localhost:8080
2. Login (or create admin user if fresh)
3. Navigate to backup/restore page
4. Create full backup with business data
5. **Expected:** Backup completes successfully without errors!

---

## Verification Checklist

After fresh install, verify these tables exist:

```bash
# Check wifi_token_devices table exists
npx prisma db execute --schema=prisma/schema.prisma --stdin <<< \
  "SELECT table_name FROM information_schema.tables WHERE table_name = 'wifi_token_devices';"

# Check wifi_token_sales.saleChannel column exists
npx prisma db execute --schema=prisma/schema.prisma --stdin <<< \
  "SELECT column_name FROM information_schema.columns WHERE table_name = 'wifi_token_sales' AND column_name = 'saleChannel';"

# Check wifi_usage_analytics table exists
npx prisma db execute --schema=prisma/schema.prisma --stdin <<< \
  "SELECT table_name FROM information_schema.tables WHERE table_name = 'wifi_usage_analytics';"

# Check r710_wlans.enableZeroIt column exists
npx prisma db execute --schema=prisma/schema.prisma --stdin <<< \
  "SELECT column_name FROM information_schema.columns WHERE table_name = 'r710_wlans' AND column_name = 'enableZeroIt';"
```

**Expected:** All queries should return the table/column name.

---

## Troubleshooting

### If Migration Fails

**Error: "column already exists"**
- This means the migration was partially applied
- Solution:
  ```bash
  npx prisma migrate resolve --applied [migration_name]
  ```

**Error: "table does not exist" during migration**
- Check migration order
- Ensure no migrations were skipped
- Check migration dependencies

**Error: "P2021" (table/column doesn't exist during backup)**
- This is what we just fixed!
- Should not occur after fresh install
- If it does, report the exact error

### If Backup Still Fails After Fresh Install

1. Check server logs for exact error message
2. Look for "does not exist" in error
3. Report the table/column name
4. May need additional migration

---

## Alternative: Quick Verification Without Full Drop

If you don't want to drop the database, you can verify specific tables:

```bash
# Check if all 4 new elements exist
npx prisma db execute --schema=prisma/schema.prisma --stdin <<< "
SELECT
  (SELECT count(*) FROM information_schema.tables WHERE table_name = 'wifi_token_devices') as wt_devices,
  (SELECT count(*) FROM information_schema.columns WHERE table_name = 'wifi_token_sales' AND column_name = 'saleChannel') as wt_sale_channel,
  (SELECT count(*) FROM information_schema.tables WHERE table_name = 'wifi_usage_analytics') as wt_analytics,
  (SELECT count(*) FROM information_schema.columns WHERE table_name = 'r710_wlans' AND column_name = 'enableZeroIt') as r710_zero;
"
```

**Expected Output:** All counts should be 1.

---

## What Gets Applied During Fresh Install

### All 79 Migrations Including:

**Core System (Migrations 1-20)**
- Initial schema
- Users, businesses, accounts
- Authentication tables

**Business Features (Migrations 21-50)**
- Products, inventory, orders
- Employees, payroll
- Vehicles, expenses
- Projects, construction

**WiFi Portal (Migrations 51-60)**
- ESP32 system
- R710 system
- Token management

**Recent Features (Migrations 61-75)**
- Barcodes and printing
- Customer displays
- Business settings
- Analytics

**Backup Fixes (Migrations 76-79)** ← NEW!
- 76: Default page
- 77: Business slogan
- 78: (Your migration)
- 79+: Our 4 new migrations

---

## After Fresh Install

1. ✅ Database has all 79 migrations applied
2. ✅ All tables exist (including wifi_token_devices, wifi_usage_analytics)
3. ✅ All columns exist (including saleChannel, enableZeroIt)
4. ✅ Backup should work without "does not exist" errors
5. ✅ Fresh installs on other machines will include all fixes

---

## Important Notes

- **All 4 new migrations are now permanent** - They're in your codebase
- **Future fresh installs will include these fixes automatically**
- **No manual SQL commands needed** - Everything via migrations
- **Safe to commit to Git** - All changes are tracked in migration files
- **Backwards compatible** - Only adds tables/columns, doesn't modify existing data

---

## Expected Timeline

- Drop DB: 5 seconds
- Create DB: 5 seconds
- Apply migrations: 30-60 seconds (depends on migration complexity)
- Start server: 20-30 seconds
- Test backup: 5-10 seconds

**Total: ~2-3 minutes for complete fresh install test**

---

## Success Criteria

✅ All 79 migrations apply without errors
✅ Server starts without errors
✅ Can login/create admin user
✅ Backup completes successfully
✅ No "table does not exist" errors
✅ No "column does not exist" errors

---

## Quick Command Summary

```bash
# Full fresh install
dropdb multi_business_db
createdb multi_business_db
npx prisma migrate deploy
npm run dev
# Then test backup via UI
```

That's it! Your fresh install will include all backup fixes automatically.
