# Session Resume - 2026-01-14

## Overview
Fixed multiple critical issues with fresh install, backups, migrations, and printing system.

---

## ✅ COMPLETED FIXES

### 1. Fresh Install Script Fixed
**Problem:** `npm run setup` failing with "Cannot find module 'dotenv'"

**Root Cause:** Script tried to load dotenv before npm install ran

**Solution:**
- Modified `scripts/setup-fresh-install.js` - removed early dotenv/database checks
- Created `scripts/check-and-setup-database.js` - handles database checks AFTER npm install
- Removed demo contract seeding (CT-EMP1009) from fresh install
- Fixed `scripts/seed-all-employee-data.js` - removed contract seeding

**Files Modified:**
- `scripts/setup-fresh-install.js`
- `scripts/check-and-setup-database.js` (NEW)
- `scripts/seed-all-employee-data.js`
- `scripts/seed-contract-CT-EMP1009.js`

**Status:** ✅ Tested successfully, all steps complete

---

### 2. Migration Issues Fixed
**Problem:** Missing tables/columns causing backup to fail

**Migrations Created:**
1. `20260113000005` - Fixed duplicate `enableFriendlyKey` column in r710_wlans
2. `20260113000006` - Added `receiptWidth` to network_printers
3. `20260113000007` - Created reprint_logs table
4. `20260113000008` - Created permissions and user_permissions tables
5. `20260113000009` - Added `expenseId` to payroll_account_deposits
6. `20260113000010` - Conservative schema sync (added barcode/product columns)

**Status:** ✅ All migrations applied successfully

---

### 3. Backup & Restore System
**Problem:** Backup failing with missing tables/columns

**Solution:** Created migrations for all missing database elements

**Status:** ✅ Backup and restore both working successfully

---

### 4. Print Queue Worker Bug Fixed
**Problem:** Receipt printing failing with "Cannot read properties of undefined (reading 'labelFormat')"

**Root Cause:** Code was reading from `job.printSettings` (doesn't exist in PrintJobs table) instead of `job.jobData` and `job.jobType`

**Solution:** Fixed `src/lib/printing/print-queue-worker.ts` line 397-420
- Changed from: `printSettings = job.printSettings`
- Changed to: `jobData = job.jobData` and `jobType = job.jobType`

**Important Note:**
- **BarcodePrintJobs** (barcode_print_jobs table) → uses `printSettings` ✅ (kept as-is)
- **PrintJobs** (print_jobs table) → uses `jobData` + `jobType` ✅ (fixed)
- Someone mistakenly changed PrintJobs code to use printSettings

**Files Modified:**
- `src/lib/printing/print-queue-worker.ts` (lines 397-420)

**Status:** ✅ Fixed, ready for testing

---

### 5. Customer Display Cart Styling Fixed
**Problem:** First cart item has emojis/text cut off at the top

**Solution:** Fixed `src/components/customer-display/cart-display.tsx`
- Removed `overflow-hidden` from item details container (line 211)
- Changed `items-center` to `items-start` (line 193)
- Added `leading-snug pt-1` to item name for better emoji display (line 213)

**Files Modified:**
- `src/components/customer-display/cart-display.tsx`

**Status:** ✅ Fixed

---

## 🔄 IN PROGRESS

### 6. EPSON TM-T20III Printer Driver Installation
**Problem:** Driver installed but printer not visible in Windows

**Driver Needed:** EPSON Advanced Printer Driver (APD) 6.x
**Download:** https://epson.com/Support/Point-of-Sale/Thermal-Printers/Epson-TM-T20III/s/SPT_C31CH51011

**Current Status:**
- User installed driver
- Printer not showing in Windows devices
- User rebooting machine to check if printer appears

**Next Steps After Reboot:**
1. Check if printer appears in Devices and Printers
2. If not visible:
   - Check USB connection
   - Try different USB port
   - Check Device Manager for unknown devices
   - Try manual printer installation via Control Panel
3. Test with: `node scripts/test-epson-printer.js`

---

## ⏳ PENDING

### 7. Fresh Install Test
**Status:** Not started yet
**Action:** Need to test fresh install after all fixes:
```bash
node scripts/drop-and-recreate-db.js
npm run setup
```

---

## 🔍 IMPORTANT DISCOVERIES

### Schema vs Migration Mismatch
- Found **262 lines of schema differences** between schema.prisma and actual migrations
- Root cause: Someone modified schema.prisma without creating migrations
- Applied conservative sync migration (20260113000010) to add essential columns
- Full diff saved in: `schema-diff.sql`

**Tables with missing columns added:**
- business_products: createdFromTemplateId, templateLinkedAt
- product_barcodes: createdBy, source
- barcode_templates: brand_name, category_name, department_name, createdBy
- barcode_print_jobs: createdBy
- businesses: showSlogan (made nullable)

---

## 📋 TEST SCRIPTS AVAILABLE

1. `scripts/test-epson-printer.js` - Test EPSON TM-T20III direct print
2. `scripts/test-worker-print.js` - Test print queue worker
3. `scripts/check-print-job-structure.js` - Inspect print job database structure
4. `scripts/drop-and-recreate-db.js` - Reset database for testing

---

## 🚨 CRITICAL NOTES

### DO NOT Run These Without User Approval:
- `npx prisma db push` - Can cause schema/migration desync
- `npx prisma migrate reset` - Destroys all data
- Any database modifications without migrations

### Schema Changes Require Migrations:
- ALWAYS create a migration for schema changes
- Never modify schema.prisma without corresponding migration
- Test on fresh database to catch missing migrations early

---

## 📂 FILES TO COMMIT

### New Files:
- `scripts/check-and-setup-database.js`
- `scripts/drop-and-recreate-db.js`
- `scripts/check-print-job-structure.js`
- `prisma/migrations/20260113000006_add_receipt_width_to_network_printers/`
- `prisma/migrations/20260113000007_create_reprint_logs/`
- `prisma/migrations/20260113000008_create_permissions_tables/`
- `prisma/migrations/20260113000009_add_expense_id_to_payroll_deposits/`
- `prisma/migrations/20260113000010_comprehensive_schema_sync/`

### Modified Files:
- `scripts/setup-fresh-install.js`
- `scripts/seed-all-employee-data.js`
- `scripts/seed-contract-CT-EMP1009.js`
- `prisma/migrations/20260113000005.../migration.sql` (fixed duplicate column)
- `src/lib/printing/print-queue-worker.ts` (fixed printSettings bug)
- `src/components/customer-display/cart-display.tsx` (fixed clipping)
- `projectplan.md` (updated with session notes)

---

## 🎯 NEXT SESSION PRIORITIES

1. **Verify EPSON printer after reboot**
   - Check Devices and Printers
   - Test print: `node scripts/test-epson-printer.js`
   - Test receipt from app

2. **Test fresh install**
   - Drop database
   - Run `npm run setup`
   - Verify everything works

3. **Commit all fixes**
   - Create comprehensive commit message
   - Push to repository

---

## 📞 CONTEXT FOR NEXT AI SESSION

Read this file to understand what was accomplished:
- Fresh install script completely rewritten and tested
- 6 new migrations created for missing tables/columns
- Print queue worker bug fixed (printSettings vs jobData)
- Customer display styling fixed
- Backup/restore confirmed working
- EPSON printer driver installed, waiting for visibility check after reboot

**Current blocker:** EPSON TM-T20III driver installed but printer not appearing in Windows. User rebooted to check if it appears.

---

**Session Date:** 2026-01-14
**Time Spent:** ~4 hours
**Status:** Productive - Multiple critical issues resolved
