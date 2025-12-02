# pg_dump check & fix guide

This document helps you diagnose and resolve the "Failed to run pg_dump: spawn pg_dump ENOENT" issue that appears during full-sync (backup-based full sync).

It includes quick checks and installation steps for Windows/macOS/Linux and a test plan you can run after reboot.

---

## Summary

Problem: Full sync backup creation fails with error "Failed to run pg_dump: spawn pg_dump ENOENT. Is PostgreSQL installed?"

Cause: `pg_dump` (PostgreSQL client binary) is missing, not in PATH, or inaccessible to the Node process running the application (or container). The Node code uses `spawn('pg_dump', args, { env })` so an ENOENT error occurs when `pg_dump` is not available.

This repo includes a new helper to detect `pg_dump` availability and produce a clearer error message if missing.

---

## Code locations (relevant files)

- `src/lib/pg-utils.ts` — helper functions to detect `pg_dump` and `psql` availability and provide an install hint.
- `src/app/api/sync/initiate-backup/route.ts` — POST endpoint requesting backup on remote; runs pg_dump via `createDatabaseBackup()`.
- `src/app/api/admin/sync/full-sync/backup-transfer.ts` — main full sync flow (push/pull) that creates a backup with `pg_dump`.
- `src/app/api/admin/sync/initial-load/backup-transfer.ts` — initial load flow using `pg_dump`.
- `src/app/api/sync/receive-backup/route.ts` — receive backup files.
- `src/app/api/sync/restore-backup/route.ts` — restore backup logic: supports psql fallback to Prisma.

---

## What changed (developer changes you can refer to)

- Added a helper at `src/lib/pg-utils.ts` with functions:
  - `isPgDumpAvailable()` — runs `spawnSync('pg_dump', ['--version'])` to test availability.
  - `isPsqlAvailable()` — runs `spawnSync('psql', ['--version'])` to test availability.
  - `installPgDumpHint()` — returns a short message with install instructions.
- Backup creators now check `isPgDumpAvailable()` before attempting `pg_dump`, and return a clearer error if the binary is missing.
- You can simulate pg_dump missing for tests by setting the environment variable `FORCE_PG_DUMP_MISSING=1`.

---

## Steps to confirm `pg_dump` presence and install if missing

### Quick checks

Run the following commands in your environment (choose the OS that applies):

- Linux / macOS:
  - Check:
    ```bash
    which pg_dump
    pg_dump --version
    which psql
    psql --version
    ```
  - Install (Debian/Ubuntu):
    ```bash
    sudo apt-get update && sudo apt-get install -y postgresql-client
    ```
  - Install (macOS + Homebrew):
    ```bash
    brew install libpq
    # Add to PATH if not automatically linked
    echo 'export PATH="$(brew --prefix libpq)/bin:$PATH"' >> ~/.bashrc && source ~/.bashrc
    ```

- Windows:
  - Check (PowerShell/CMD):
    ```powershell
    where pg_dump
    pg_dump --version
    ```
  - Install: Use the official PostgreSQL installer or Chocolatey:
    ```powershell
    choco install postgresql
    ```
  - Ensure `pg_dump.exe` is on PATH (e.g., `C:\Program Files\PostgreSQL\<version>\bin`).

- Docker:
  - If app runs inside container, ensure container image has `postgresql-client` installed:
    ```dockerfile
    # Debian/Ubuntu base
    RUN apt-get update && apt-get install -y postgresql-client
    ```
  - Alternatively, run `pg_dump` from the DB container directly and share file or mount volumes.

### Verification commands

- Confirm availability:
  ```bash
  pg_dump --version
  psql --version
  ```
- If either command returns a version string, the binaries are present.

---

## Running the dev server & manual test (post-reboot)

1. Start the dev server:

```bash
# If you normally run it with npm
npm run dev
```

2. Compute the registration hash used by the sync endpoints:

```bash
node -e "console.log(require('crypto').createHash('sha256').update(process.env.SYNC_REGISTRATION_KEY||'').digest('hex'))"
```

3. Use a curl command to call the initiate-backup endpoint for testing. Use the computed registration hash or the expected value if unset:

```bash
curl -s -X POST 'http://localhost:8080/api/sync/initiate-backup' \
  -H 'Content-Type: application/json' \
  -H 'X-Node-ID: testnode' \
  -H 'X-Registration-Hash: <computed_hash>' \
  -d '{"sessionId":"<sessionId>"}' -v
```

4. Expected outcomes:
- If `pg_dump` is present: The endpoint returns `success` and the backup is created in `backups/`.
- If `pg_dump` is missing: The endpoint returns an error (500) and the session will be set to `FAILED` with a clear message containing an installation hint.

**Tip:** To simulate `pg_dump` missing for testing even when it is installed, start the dev server with the environment variable override: `FORCE_PG_DUMP_MISSING=1 npm run dev` (or use cross-env on Windows):

```bash
# Linux / macOS
FORCE_PG_DUMP_MISSING=1 npm run dev

# Windows (PowerShell)
$env:FORCE_PG_DUMP_MISSING = '1'; npm run dev
```

---

## Test steps after reboot

1. Verify `pg_dump` and `psql` are available and in PATH.
2. Start the dev server normally (no environment override) and call the initiate-backup endpoint. Validate backup file is created in `backups/`.
3. Start the dev server with `FORCE_PG_DUMP_MISSING=1` and call the endpoint. Validate the route fails with a clear message that shows the `installPgDumpHint()` message.
4. Confirm full-sync behavior: run the admin full-sync (or UI) to ensure the `createDatabaseBackup()` path correctly reports either success or the new clear error message.
5. If tests exist and run in your environment, execute:

```bash
# compile TypeScript
npx tsc --noEmit

# run unit tests
npm test
```

---

## Recommended production approach

1. Prefer to have `pg_dump` installed on production servers where full sync is expected to run. The recommended package is `postgresql-client` or the Postgres installation from the official packages.
2. If your app may run in environments without `pg_dump`, add a fallback path to JSON backup (use `GET /api/backup?type=full` route and transfer JSON). This is not a drop-in replacement for SQL dumps but provides a working fallback for data transfer.
3. In containerized deployments, add `postgresql-client` in the app Dockerfile or run `pg_dump` from the database container and transfer the file.
4. Update production runbooks / docs to include `pg_dump` installation and confirm it’s in PATH.

---

## Next steps (optional developer tasks)

- Option A (Low-risk): Add documentation (this file) and keep a strict `pg_dump` check. Keep clear error message with install hints, which is what we added.
- Option B (Medium effort): Implement a JSON fallback flow for the full sync — when `pg_dump` is not available create a JSON-based backup and transfer it in place of the SQL dump. Requires adding JSON support to `restore-backup` and thoroughly testing UPSERT logic.
- Option C (More advanced): If JSON fallback is chosen, optionally create an orchestration that chooses SQL-based or JSON-based streams based on environment capability.

---

## Quick reference: Useful commands

- Check availability
```bash
pg_dump --version
psql --version
```

- Force simulation missing (development):
```bash
FORCE_PG_DUMP_MISSING=1 npm run dev
# or Windows PowerShell
$env:FORCE_PG_DUMP_MISSING = '1'; npm run dev
```

- Re-run TypeScript checks and tests:
```bash
npx tsc --noEmit
npm test
```

- Start dev server:
```bash
npm run dev
```

- Call initiate-backup (example):
```bash
curl -s -X POST 'http://localhost:8080/api/sync/initiate-backup' \
  -H 'Content-Type: application/json' \
  -H 'X-Node-ID: testnode' \
  -H 'X-Registration-Hash: <hash>' \
  -d '{"sessionId":"test123"}' -v
```

---

If you'd like, I can:
- Add a small unit test to verify the `isPgDumpAvailable()` and the new error logic.
- Implement a JSON fallback path for the full-sync mechanism if you want robust behavior in environments without `pg_dump`.

Let me know which option (A/B/C above) you'd prefer, or if you'd like me to commit this doc and the PG utilities & small route changes to the branch.
