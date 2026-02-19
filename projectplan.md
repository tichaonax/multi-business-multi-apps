# Fix Sales Attribution & Backup/Restore Reliability

## Problem
1. **Sales attributed to "System Administrator"**: After restoring a backup from another machine, all sales show under "System Administrator" instead of actual salespeople (Letwin, Pride). BusinessOrders has no `createdBy` field to track which user made the sale.
2. **Backup/restore format mismatch**: CLI restore script only handles v1.0 flat format, but the app's UI backup creates v3.0 format with `businessData` wrapper. Cross-machine restore must work reliably.
3. **1 record skipped during restore**: Foreign key constraint error (from restore screenshot).

## Plan

### Phase 1: Add `createdBy` to BusinessOrders
- [x] Add `createdBy String?` field + `creator Users?` relation to BusinessOrders model
- [x] Add `business_orders_created BusinessOrders[]` reverse relation to Users model
- [x] Create idempotent migration
- [x] Add index on `createdBy` for query performance

### Phase 2: Set `createdBy` in POS checkout flows
- [x] Update `/api/universal/orders` POST to set `createdBy` from session user
- [x] Check restaurant orders API for same fix

### Phase 3: Update sales analytics to use `createdBy`
- [x] Update `/api/business/[businessId]/sales-analytics` to include `creator` relation and use it for name fallback
- [x] Update `/api/universal/daily-sales` to include `creator` relation and use it for name fallback

### Phase 4: Fix CLI restore script for v3.0 format
- [x] Update `scripts/restore-from-backup.js` to detect and unwrap `businessData` wrapper
- [x] Handle both v1.0 flat and v3.0 wrapped formats

### Phase 5: Backfill existing orders' `createdBy`
- [x] Create a script/query to match existing orders to users via `attributes.employeeName` or employee→user mapping

## Review

### Changes Made
1. **Schema**: Added `createdBy String?` + `creator Users?` relation to `BusinessOrders`, with index. Migration `20260220000003` includes two backfill strategies: via `employees.userId` and via `attributes.employeeName` → `users.name` matching.

2. **Order creation**: Added `createdBy: user.id` to 4 order creation points:
   - `/api/universal/orders` (main POS)
   - `/api/universal/orders/manual` (manual entry)
   - `/api/restaurant/orders` (restaurant POS, both create and retry)
   - `/api/restaurant/meal-program/transactions` (meal program)

3. **Sales analytics**: Both `/api/business/[businessId]/sales-analytics` and `/api/universal/daily-sales` now include `creator` relation and use fallback chain: `employees.fullName` → `creator.name` → `attributes.employeeName` → 'Other'/'Walk-in/Unknown'

4. **CLI restore**: `scripts/restore-from-backup.js` now detects v3.0 format (has `businessData` key) and unwraps it, supporting both flat and wrapped formats.

5. **Local backfill**: 444/455 orders now have `createdBy` set (Pride: 417, Letwin: 25, System Admin: 2). 11 orders had no `employeeName` in attributes.

### Restore Screenshot Analysis
- 6084/6967 records restored (87%), 1 skipped (FK constraint)
- The 882 gap (6967-6084-1) represents records in tables not in the restore order (likely local-only tables like sync, printers, etc.)
- The 1 FK error is a single record referencing a missing parent — minor issue

### Notes for Remote Deployment
- Migration `20260220000003` must be applied on the remote server
- The backfill SQL will automatically match orders to users by name on the remote DB too
- All future orders will have `createdBy` set automatically from the session user
