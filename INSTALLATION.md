# Multi-Business Management Platform — Production Installation Guide

> **Platform:** Windows 10/11 (production target)
> **Architecture:** Next.js app running as a Windows service via node-windows, with optional Electron desktop wrapper

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Clone and Install](#2-clone-and-install)
3. [Environment Configuration](#3-environment-configuration)
4. [Database Setup](#4-database-setup)
5. [Build](#5-build)
6. [SSL Certificates (HTTPS)](#6-ssl-certificates-https)
7. [Windows Service Installation](#7-windows-service-installation)
8. [QZ Tray Receipt Printing](#8-qz-tray-receipt-printing)
9. [Electron Desktop App](#9-electron-desktop-app)
10. [Client Machine Setup](#10-client-machine-setup)
11. [Deploying Updates](#11-deploying-updates)
12. [Troubleshooting](#12-troubleshooting)
13. [Service Management Reference](#13-service-management-reference)

---

## 1. Prerequisites

Install the following on the server machine before proceeding.

### Node.js (via nvm for Windows)

Use [nvm-windows](https://github.com/coreybutler/nvm-windows) to manage Node.js versions.

```powershell
# After installing nvm-windows, install and use Node.js 20
nvm install 20
nvm use 20

# Verify
node --version   # v20.x.x
npm --version
```

### PostgreSQL 18

Download and install from [postgresql.org](https://www.postgresql.org/download/windows/).

- Default port: `5432`
- Note the password you set for the `postgres` user
- Ensure the service name is `postgresql-x64-18` (the app depends on this)

Verify:
```bash
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -c "SELECT version();"
```

### Git

Download from [git-scm.com](https://git-scm.com/download/win). Git also installs `openssl` which is required for certificate generation.

### Java (for QZ Tray printing)

Required only on machines that will print receipts via QZ Tray.

Download from [adoptium.net](https://adoptium.net/) (Java 11+ LTS recommended).

```bash
java -version  # verify
```

---

## 2. Clone and Install

```bash
git clone <your-repository-url> multi-business-multi-apps
cd multi-business-multi-apps

npm install
```

> **Note:** `npm install` triggers a `postinstall` script. This is expected and safe.

---

## 3. Environment Configuration

Create `.env.local` in the project root (this file is never committed to git):

```env
# ── Database ──────────────────────────────────────────────────────────────────
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/multi_business_db"

# ── Auth ──────────────────────────────────────────────────────────────────────
# Generate a secret: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
NEXTAUTH_SECRET="your-generated-secret-here"
NEXTAUTH_URL="http://localhost:8080"   # update to https:// after SSL is set up

# ── App ───────────────────────────────────────────────────────────────────────
PORT=8080
NODE_ENV=production
APP_NAME="Multi-Business Management Platform"
ADMIN_EMAIL="your-admin@email.com"
ENCRYPTION_KEY="generate-a-64-char-hex-string"

# ── Sync Service ──────────────────────────────────────────────────────────────
SYNC_NODE_ID="generate-a-16-char-hex-string"
SYNC_NODE_NAME="sync-node-MACHINENAME"
SYNC_SERVICE_PORT=8765
SYNC_HTTP_PORT=8080
SYNC_AUTO_START=true
SYNC_LOG_LEVEL=warn
SYNC_REGISTRATION_KEY="generate-a-64-char-hex-string"

# ── QZ Tray Printing (add after running npm run qz:generate-cert) ─────────────
# QZ_PRIVATE_KEY=<base64 value from generate-qz-cert output>
# QZ_CERTIFICATE=<base64 value from generate-qz-cert output>
```

**Generating secret values:**
```bash
# NEXTAUTH_SECRET (32 random bytes, base64)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# ENCRYPTION_KEY (32 random bytes, hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# SYNC_NODE_ID (8 random bytes, hex)
node -e "console.log(require('crypto').randomBytes(8).toString('hex'))"

# SYNC_REGISTRATION_KEY (32 random bytes, hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 4. Database Setup

### Create the database

```bash
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -c "CREATE DATABASE multi_business_db;"
```

### Run migrations

```bash
npm run db:deploy
```

> **Critical:** Never use `prisma db push` on production. Always use `db:deploy` which runs `prisma migrate deploy`.

### Verify

```bash
npx prisma migrate status --env-file .env.local
```

Expected: `Database schema is up to date!`

---

## 5. Build

```bash
npm run build
```

This runs:
1. `prisma generate` — generates the Prisma client
2. `next build` — compiles the Next.js app into `.next/`
3. `tsc --project tsconfig.server.json` — compiles `server.ts` into `dist/server.js`

> **Important:** `dist/server.js` must exist for the service to start. If it's missing after a `git pull`, run `npm run build:server` (faster than a full rebuild).

---

## 6. SSL Certificates (HTTPS)

The app auto-detects HTTPS by checking the `certs/` folder for `.pem` files. If certs are present, the server starts on HTTPS; otherwise it falls back to HTTP.

### Generating certificates (first time, on any machine with mkcert)

Certificates are generated once and copied to each server. They are **not** committed to git.

```bash
# Install mkcert (Windows, via Scoop or Chocolatey)
scoop install mkcert
# or
choco install mkcert

# Install the local CA
mkcert -install

# Generate cert covering your server IPs + localhost
mkcert 192.168.0.108 192.168.1.211 localhost 127.0.0.1
```

This creates two files (e.g. `192.168.0.108+3.pem` and `192.168.0.108+3-key.pem`) plus a `rootCA.pem` in the mkcert data directory.

### Placing certificates on the server

Copy the following into `certs/` in the app root (create the folder if it doesn't exist):

```
certs/
  192.168.0.108+3.pem        ← SSL certificate
  192.168.0.108+3-key.pem    ← Private key
  rootCA.pem                 ← Root CA (for client trust)
  setup-ssl.bat              ← One-click CA installer for client machines
```

> The `certs/` folder is in `.gitignore` — copy it manually (USB, shared folder, SCP).

### Trusting the certificate on the server

Run once on the server machine (so the server's own browser trusts it):

```bash
certs\setup-ssl.bat
```

### Update NEXTAUTH_URL

After SSL is working, update `.env.local`:

```env
NEXTAUTH_URL="https://192.168.0.108:8080"
```

Restart the service after this change.

---

## 7. Windows Service Installation

The app runs as a Windows service via `node-windows`. The service starts PostgreSQL → runs migrations → seeds reference data → starts the Next.js app.

### Install (run as Administrator)

```bash
npm run service:install
```

This registers the `MultiBusinessSyncService` in Windows Services and creates the daemon files in `windows-service/daemon/`.

> The service depends on `postgresql-x64-18`. PostgreSQL must be installed and its service name must match.

### Start

```bash
npm run service:start
```

### Verify it's running

```bash
npm run service:status
# or
sc query "MultiBusinessSyncService"
```

### View logs

```powershell
# Live tail of application output
Get-Content "windows-service\daemon\multibusinesssyncservice.out.log" -Wait -Tail 30

# Live tail of errors
Get-Content "windows-service\daemon\multibusinesssyncservice.err.log" -Wait -Tail 30
```

Healthy startup sequence ends with:
```
[Server] HTTPS enabled — cert: <filename>.pem, key: <filename>-key.pem
[Server] listening on https://localhost:8080
```

---

## 8. QZ Tray Receipt Printing

QZ Tray is a Java desktop app that lets the browser print to local/network printers without browser print dialogs.

### Install QZ Tray

Download version **2.2.6** from [qz.io](https://qz.io/download/) and install on each machine that will print receipts. Start QZ Tray — it runs in the system tray.

### Set up signed certificates (eliminates the Allow/Deny popup)

> **How this differs from SSL certs:** The SSL `rootCA.pem` must be a physical file on the server. The QZ certificate is different — the server reads it from `.env.local` env vars, not from a file. Only client machines (where QZ Tray is installed) need the physical `qz-certificate.pem` file.

**Step 1 — Generate the signing certificate** (run once on the server or any dev machine):

```bash
npm run qz:generate-cert
```

This outputs two environment variable values **and** creates `certs/qz-certificate.pem`.

**Step 2 — Add env vars to the server's `.env.local`:**

```env
QZ_PRIVATE_KEY=<value from script output>
QZ_CERTIFICATE=<value from script output>
```

The server serves the certificate to the browser via `/api/qz/certificate` using these env vars. **No file copy to the server is needed** — the env vars are sufficient.

**Step 3 — Distribute `qz-certificate.pem` to each client machine running QZ Tray:**

Copy `certs/qz-certificate.pem` to each machine where QZ Tray is installed (USB, shared folder, etc.), then:

1. Right-click QZ Tray icon in system tray
2. **Advanced** → **Site Manager**
3. Click **Add Certificate**
4. Select the `qz-certificate.pem` file
5. Restart QZ Tray

**Step 4 — Rebuild and restart the service:**

```bash
npm run build
npm run service:stop
npm run service:start
```

From this point, QZ Tray will silently trust all print requests from the app — no more popups.

| File | Server needs it? | QZ Tray machine needs it? |
|------|-----------------|--------------------------|
| `rootCA.pem` | ✅ Physical file in `certs/` | ✅ Run `setup-ssl.bat` |
| SSL cert + key `.pem` | ✅ Physical file in `certs/` | ❌ Not needed |
| `qz-certificate.pem` | ❌ Env var in `.env.local` only | ✅ Add to QZ Tray trusted list |

---

## 9. Electron Desktop App

Electron wraps the web app as a desktop application and launches automatically at Windows startup.

### Install the startup shortcut

```bash
npm run electron:install-startup
```

This creates a shortcut in `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup` that launches Electron when the user logs in.

> Run this command **after** setting up SSL certificates. The shortcut is regenerated with the correct `http://` or `https://` protocol based on what certs are present.

### Launch manually

```bash
npm run electron
```

### How Electron detects HTTPS

`electron/main.js` auto-detects certs in the `certs/` folder and loads `https://localhost:8080` if they exist, otherwise `http://localhost:8080`. It also has a certificate-error handler to trust the self-signed mkcert cert.

---

## 10. Client Machine Setup

Every Windows machine that opens the app in Chrome or Edge needs to trust the SSL certificate once.

### Option A — One-click (recommended)

1. Copy `certs/setup-ssl.bat` and `certs/rootCA.pem` to the client machine
2. Double-click `setup-ssl.bat`
3. Restart Chrome/Edge

### Option B — Manual

1. Copy `certs/rootCA.pem` to the client machine
2. Press `Win+R` → type `certmgr.msc` → Enter
3. Expand **Trusted Root Certification Authorities** → right-click **Certificates**
4. **All Tasks** → **Import** → select `rootCA.pem`
5. Restart Chrome/Edge

### QZ Tray on client machines

Each client machine that prints needs:
1. Java 11+ installed
2. QZ Tray 2.2.6 installed and running
3. `certs/qz-certificate.pem` added to QZ Tray (see Section 8 Step 2)

---

## 11. Deploying Updates

```bash
# 1. Pull latest code
git pull

# 2. Install any new dependencies
npm install

# 3. Run new migrations
npm run db:deploy

# 4. Rebuild
npm run build

# 5. Restart the service
npm run service:stop
npm run service:start
```

> If only `server.ts` changed (no UI changes), you can skip the full build and just run `npm run build:server` then restart the service. The service will detect the code change and skip the Next.js rebuild automatically.

### After a failed migration

If a migration fails and leaves the database in a `failed` state:

```bash
# 1. Mark the failed migration as rolled back
npx prisma migrate resolve --rolled-back "MIGRATION_NAME" --env-file .env.local

# 2. Re-apply (with the fixed migration SQL)
npm run db:deploy
```

---

## 12. Troubleshooting

### Service starts then stops immediately

Check the error log:
```powershell
Get-Content "windows-service\daemon\multibusinesssyncservice.err.log" -Tail 50
```

Common causes:
- **`dist/server.js` not found** — run `npm run build:server`
- **PostgreSQL not running** — start PostgreSQL service first
- **Port 8080 in use** — find and stop the conflicting process
- **Migration failed** — see "After a failed migration" above

### Migration lock stuck

Symptom: `Migration lock present, waiting 5s...` repeating in logs.

```bash
npm run service:stop
npm run db:clear-locks    # or manually delete .migration.lock file
npm run service:start
```

If no lock file but still stuck, reboot the server — a zombie process may be holding the lock.

### App running on HTTP instead of HTTPS

The server logs this on startup:
```
[Server] HTTP only — no certs found in ./certs/
```

Fix:
1. Ensure `certs/` folder exists in the app root (`C:\Users\...\multi-business-multi-apps\certs\`)
2. Ensure it contains both a `.pem` cert file and a `-key.pem` key file
3. Ensure `dist/server.js` was compiled from the latest `server.ts` (run `npm run build:server`)
4. Restart the service

### QZ Tray popup appears every print job

The `QZ_PRIVATE_KEY` and `QZ_CERTIFICATE` are not set in `.env.local`, or the cert hasn't been added to QZ Tray. Follow Section 8 fully.

### Electron shows ERR_TIMED_OUT

The server hasn't finished starting when Electron tried to connect. Wait 30–60 seconds for the full startup sequence to complete, then re-open Electron. For a permanent fix, the startup shortcut waits before launching — re-run `npm run electron:install-startup`.

### NEXTAUTH JWT session errors after rebuilding

Old session cookies become invalid when `NEXTAUTH_SECRET` changes or the server URL changes from `http://` to `https://`. Users just need to log out and log back in. No code fix required.

---

## 13. Service Management Reference

| Command | Description |
|---------|-------------|
| `npm run service:install` | Install as Windows service (run as Admin) |
| `npm run service:uninstall` | Remove Windows service (run as Admin) |
| `npm run service:start` | Start the service |
| `npm run service:stop` | Stop the service |
| `npm run service:restart` | Stop then start |
| `npm run service:status` | Show service status |
| `npm run db:deploy` | Run pending database migrations |
| `npm run db:clear-locks` | Clear stuck migration locks |
| `npm run build` | Full build (Next.js + server.ts) |
| `npm run build:server` | Compile server.ts only (fast) |
| `npm run electron:install-startup` | Install/update Electron startup shortcut |
| `npm run qz:generate-cert` | Generate QZ Tray signing certificate |

### Log file locations

| Log | Path |
|-----|------|
| Application stdout | `windows-service\daemon\multibusinesssyncservice.out.log` |
| Application stderr | `windows-service\daemon\multibusinesssyncservice.err.log` |
| Wrapper log | `windows-service\daemon\multibusinesssyncservice.wrapper.log` |

---

## Quick Reference — Fresh Server Setup

```bash
# 1. Install Node.js (via nvm), PostgreSQL 18, Git

# 2. Clone and install
git clone <repo> multi-business-multi-apps
cd multi-business-multi-apps
npm install

# 3. Create .env.local (fill in your values)
#    See Section 3 for all required variables

# 4. Create database
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -c "CREATE DATABASE multi_business_db;"

# 5. Run migrations
npm run db:deploy

# 6. Build
npm run build

# 7. Copy certs/ folder from another server or generate new ones
#    Place cert + key .pem files in certs/ in the app root

# 8. Install Windows service (Admin shell)
npm run service:install
npm run service:start

# 9. Set up QZ Tray signing (eliminates print popups)
npm run qz:generate-cert
# → add QZ_PRIVATE_KEY and QZ_CERTIFICATE to .env.local
# → add certs/qz-certificate.pem to QZ Tray trusted list
npm run service:stop && npm run service:start

# 10. Install Electron startup shortcut
npm run electron:install-startup

# 11. Trust SSL cert on each client machine
#     Copy certs/setup-ssl.bat + certs/rootCA.pem → run setup-ssl.bat on each machine
```

Default admin login: `admin@business.local` / `admin123` — **change immediately after first login.**
