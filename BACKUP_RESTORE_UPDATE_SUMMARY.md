# Backup / Restore Update Summary

## Overview

This document summarizes the work performed to update the full database backup and restore system so the full backups include all application data (excluding audit logs) and the restore logic can reconstitute the data back into the DB. The backup route originally backed up a small subset of models and had numerous Prisma client validation errors from incorrect relation names and `where` filters.

## Goals
- Make full backup (GET /api/backup) include all application tables (excluding audit logs by default, demo data optionally included).
- Ensure backup scope respects business membership filters when applicable.
- Fix all Prisma invocations in the backup route so queries use relations + fields as defined in `prisma/schema.prisma`.
- Add BigInt-safe JSON export.
- Prepare for implementing a complete restore (POST /api/backup) path and tests.

---

## Changes made
- Most work was done in `src/app/api/backup/route.ts` to iterate through all models and ensure the `findMany` calls use either:
  - Correct `where` filters using whether the model is business-scoped (i.e., has `businessId` or can be scoped via relation chains), or
  - Fetch *all* rows for models that are global or node-scoped (e.g., `syncSessions`, `syncEvents`, `networkPrinters`, `offlineQueue`, etc.)
- Examples of fixes:
  - Vehicle/driver relations:
    - Fixed `vehicleDrivers` query to filter via `driver_authorizations.some.vehicles.businessId` because `vehicleDrivers` doesn't include `vehicles` directly.
    - Fixed `driverAuthorizations` query to use `vehicles.businessId` (not `businessId` on the authorization itself).
  - Menu/Orders:
    - `menuItems` had no `businessId`; earlier attempted filters were incorrect — now we include `menuItems` as global. Business-scoped order data is covered by `businessOrders` / `businessOrderItems`.
    - `orders` / `orderItems` were changed to include all orders (schema doesn't have `businessId` on `Orders`) or use business-scoped `BusinessOrders` when necessary.
  - Payroll & HR:
    - Replaced invalid relation filters (e.g., `employee_contracts`) with the correct relation names according to the Prisma schema (e.g., `employees` where appropriate).
  - Inter-business loans:
    - Corrected `fromBusinessId`/`toBusinessId` to `borrowerBusinessId`/`lenderBusinessId` to match the schema.
  - Construction / Projects:
    - Moved `construction_expenses` out of `projects` includes and included `constructionProjects` where appropriate.
  - Sync tables & offline nodes:
    - `syncSessions`, `syncEvents`, `syncMetrics`, `fullSyncSessions`, `syncConfigurations`, `offlineQueue`, `networkPrinters` — these do not contain `businessId` scalar fields. They were updated to fetch all entries or be filtered correctly using their relation to nodes when available.
  - Conflict / Snapshot tables:
    - `conflictResolutions` and `dataSnapshots`: these were recognized as global and included entirely, removing incorrect `businessId` filters.
  - Serialization fix:
    - Backup JSON serialization was failing on BigInt values. A replacer function was added to `JSON.stringify` that converts BigInt to string so the export can be returned as JSON.

- Note: In many places, when `businessId` is not present on a model, the query is either adjusted to use a relation chain (e.g., `project_stages -> projects -> businessId`) or changed to `findMany({})` to include all rows for that table, since these are globally-shared or node-scoped tables.

---

## Results & Verification
- After iterating through the above fixes, the GET `/api/backup?type=full&includeAuditLogs=false&includeBusinessData=true&includeDemoData=false` endpoint returns HTTP 200 and serves a JSON backup file.
- Example backup filename pattern:
  - `MultiBusinessSyncService-backup_full_2025-12-01T00-05-16.json`
- The JSON now includes tables and nested relations where applicable, and global tables that cannot be business-scoped were included wholly.

---

## How to run (test)

1. Start the dev server (Example):

```bash
# in repo root
npm run dev
```

2. Programmatic sign-in (with seeded admin) to obtain session token cookie (used by the test harness):

```bash
# Get CSRF token
curl -s -c cookies.txt -b cookies.txt 'http://localhost:8080/api/auth/csrf' -H 'Content-Type: application/json' | jq -r '.csrfToken' > csrf.txt
CSRF_TOKEN=$(cat csrf.txt)

# Sign in via credentials provider
curl -s -c cookies.txt -b cookies.txt -X POST 'http://localhost:8080/api/auth/callback/credentials' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d "csrfToken=${CSRF_TOKEN}&email=admin@business.local&password=admin123"

# Verify session
curl -s -b cookies.txt 'http://localhost:8080/api/auth/session' | jq
```

3. Request full backup (authenticated):

```bash
curl -s -b cookies.txt -o backup.json \
  'http://localhost:8080/api/backup?type=full&includeAuditLogs=false&includeBusinessData=true&includeDemoData=false'
```

This should write a JSON backup to `backup.json`.

---

## Files Edited
- `src/app/api/backup/route.ts` (multiple edits to fix relations/filters & serialization)

---

## Limitations & Notes
- Because many tables are not scoped by `businessId` (global/system or node-scoped), the backup includes these tables entirely rather than attempting to filter them by `businessId`. Filtering is only applied where the model supports it (via a scalar field or a relation chain).
- I applied a pragmatic approach: fetch all rows for global tables and apply business-scoped filtering for models where `businessId` (direct or via relation chain) exists.
- The current behavior is conservative: it includes more data for some global tables; if you prefer to limit these to specific businesses only, we need to design specific relation filters (e.g., `syncMetrics` scoped by `node` which is related to a business) or explicitly add `businessId` mapping to certain models.

---

## Outstanding / Next Steps (post-backup)
1. Implement and test `POST /api/backup` restore logic to safely restore all newly included tables and preserve relationships.
2. Create a `restore` migration helper that:
   - Inserts / upserts data in the correct order (respecting foreign keys).
   - Uses transactions where possible, or chunked re-insertion with integrity checks.
   - Handles type conversions (e.g., BigInt -> string; Prisma Decimal string -> Decimal) if necessary.
3. Add unit and integration tests:
   - Backup-only test verifying the returned JSON has expected tables.
   - Roundtrip (backup/clear/restore) test ensuring data is restored correctly.
4. Add a serialization utility to consistently convert BigInt and Decimal (if needed) to JSON safe types.
5. Consider streaming or compressed backups for large datasets.

---

## Developer Notes
- For all future changes to the backup route, prefer checking each model's definition in `prisma/schema.prisma` for relation names and the presence of `businessId` before applying filters.
- When constructing `where` filters across relations, confirm the direction/relationship and the `@relation` mapping in Prisma schema.

---

## How to review changes
- Run the server and execute the full backup as shown in 'run (test)'.
- Inspect the `backup.json` to confirm that models are included and relations exist as expected for a given business.

---

If you'd like, I can now implement the restore endpoint and round-trip tests or open a PR that aggregates these backup changes with tests and a restore plan.

<!-- End of document -->