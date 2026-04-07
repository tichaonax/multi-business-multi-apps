# Technical Operations — Deployment & Troubleshooting

Reference for developers and system administrators. Commands are Windows/PowerShell unless noted.

---

## Table of Contents

1. [Windows Print Spooler](#1-windows-print-spooler)
2. [Next.js Build Cache](#2-nextjs-build-cache)
3. [Database — Prisma](#3-database--prisma)
4. [Node / Package Management](#4-node--package-management)
5. [Environment & Config](#5-environment--config)
6. [QZ Tray](#6-qz-tray)

---

## 1. Windows Print Spooler

### Clear all stuck print jobs (full spooler flush)

Run in PowerShell **as Administrator**:

```powershell
Stop-Service -Name Spooler -Force
Remove-Item "$env:SystemRoot\System32\spool\PRINTERS\*" -Force -ErrorAction SilentlyContinue
Start-Service -Name Spooler
```

Use this when:
- A printer is stuck processing a job and will not clear via the print queue UI.
- The receipt or label printer is printing the same job on a loop.
- The app's **Clear Print Queue** button (Settings → Test Print) fails.

### Clear jobs for a specific printer only (no spooler restart)

```powershell
Get-PrintJob -PrinterName 'EPSON TM-T88VI' | Remove-PrintJob
```

Replace `EPSON TM-T88VI` with the exact printer name as shown in Windows Devices & Printers.

### Check spooler service status

```powershell
Get-Service -Name Spooler
```

### Restart spooler without clearing spool files

```powershell
Restart-Service -Name Spooler -Force
```

---

## 2. Next.js Build Cache

### Delete the build cache (`.next` folder)

```powershell
Remove-Item -Recurse -Force .next
```

Or on bash/WSL:

```bash
rm -rf .next
```

Use this when:
- The dev server throws stale module errors after pulling changes.
- A production build fails with corrupted cache references.
- After changing `next.config.js` or environment variables that affect the build.

### Full clean rebuild

```powershell
Remove-Item -Recurse -Force .next
npm run build
```

### Kill the Next.js dev server port if it hangs (port 3000)

```powershell
netstat -ano | findstr :3000
# Note the PID from the output, then:
taskkill /PID <PID> /F
```

---

## 3. Database — Prisma

> **CRITICAL**: Never use `prisma db push` on this project — it modifies the production database schema without creating a migration file. Always use `prisma migrate dev`.

### Apply pending migrations (development)

```bash
npx prisma migrate dev --name <description>
```

### Apply migrations in production (no prompt, no schema changes)

```bash
npx prisma migrate deploy
```

### Generate Prisma client after schema changes

```bash
npx prisma generate
```

### Open Prisma Studio (database browser)

```bash
npx prisma studio
```

### If Prisma DLL is locked (EPERM rename error on Windows)

The Prisma query engine DLL is locked while the dev server is running. Options:
1. Stop the dev server (`Ctrl+C`) → run `prisma generate` → restart server.
2. If the server cannot be stopped, use raw SQL via `prisma.$queryRaw` / `prisma.$executeRaw` for schema-level reads until the next restart.

### Connect to the database directly (psql)

```bash
"/c/Program Files/PostgreSQL/18/bin/psql.exe" -U <user> -d <database>
```

Connection credentials are in `.env.local` (not `.env`).

### If `prisma migrate dev` fails due to schema drift

```bash
# 1. Create the migration file manually
npx prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/<timestamp>_<name>/migration.sql

# 2. Apply it directly
npx prisma migrate deploy
```

---

## 4. Node / Package Management

### Install dependencies after pulling

```bash
npm install
```

### Clear npm cache and reinstall (if install fails with integrity errors)

```bash
npm cache clean --force
Remove-Item -Recurse -Force node_modules   # PowerShell
npm install
```

### Check which port the app is running on

```powershell
netstat -ano | findstr :3000
netstat -ano | findstr :3001
```

---

## 5. Environment & Config

### Environment file location

- **Development**: `.env.local` — loaded automatically by Next.js.
- **Prisma**: Prisma reads `.env` by default. If credentials are only in `.env.local`, pass `--env-file .env.local` or ensure `.env` also has `DATABASE_URL`.

### Check which env file Prisma is reading

```bash
npx dotenv -e .env.local -- npx prisma migrate status
```

### Verify DATABASE_URL is set correctly

```bash
echo $DATABASE_URL          # bash
$env:DATABASE_URL           # PowerShell
```

---

## 6. QZ Tray

QZ Tray is a Java desktop application that bridges the browser to local/USB printers via a WebSocket on `ws://localhost:8182`.

### Install

Download from **https://qz.io/download/**. Requires Java 8 or later.

### Start / check if running

Look for the QZ icon in the Windows system tray. If it is not there, launch it from Start Menu → QZ Tray.

### Force-quit QZ Tray (kills all pending jobs)

```powershell
taskkill /IM "qz-tray.exe" /F
```

Then relaunch from Start Menu.

### Common QZ issues

| Symptom | Cause | Fix |
|---|---|---|
| "QZ Tray not detected" in app | QZ not running or Java missing | Start QZ Tray; install Java if needed |
| Test print passes but nothing prints | Binary data corrupted in transit | Ensure `format: 'base64'` is used for ESC/POS (not `format: 'command'`) |
| Printer printing garbage / repeated numbers | Old jobs in QZ queue from a buggy session | Click **⏹ Stop QZ** in the app, or force-quit QZ Tray via Task Manager |
| Only top half of card prints | ESC/POS raster stream corrupted (UTF-8 encoding) | Same as above — use `format: 'base64'` for binary ESC/POS data |
| QZ connects but no printers listed | Printer driver not installed on this PC | Install printer driver in Windows Devices & Printers |

### ESC/POS binary data — correct QZ Tray format

```typescript
// CORRECT — base64 preserves all 256 byte values
const data = [{ type: 'raw', format: 'base64', data: btoa(escPosString) }]

// WRONG — format:'command' UTF-8 encodes bytes > 127, corrupting raster bitmaps
const data = [{ type: 'raw', format: 'command', data: escPosString }]
```

ZPL (Zebra label) data is ASCII-only so `format: 'command'` is safe for ZPL. For ESC/POS with raster images, always use `format: 'base64'`.

---

*Add new sections below as operational knowledge grows.*
