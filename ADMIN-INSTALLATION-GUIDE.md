# Multi-Business Management Platform — Server Installation Guide

> **Platform:** Windows 10/11 Pro
> **Architecture:** a release (built on the build machine) in `C:\MBM\app`, run as a Windows service; tills run the POS app (Electron)
> **Step by step:** `docs/runbooks/new-mbm-server.md` (servers), `docs/runbooks/manual-deployment.md` (a release to a server, by hand)

---

## Servers: installed from releases, not from git (MBM-341)

**A server no longer has a git checkout.** It never runs `git pull`,
`npm install` or `npm run build`. Releases are built on the build machine
(`npm run release` → `releases/mbm-<date>-<commit>.zip` + `.sha256`) and a
server installs them with scripts in `C:\MBM\setup`, which you or the AI
(over SSH, on the tailnet) run the same way:

| What | Script |
|---|---|
| What's done, what's next (read-only) | `00-status.ps1` |
| A new server, once | `01` Tailscale + the AI's SSH → `02` Windows → `03` Node 24, Chrome, PostgreSQL 18, the database → `04` settings → (`restore.ps1`) → `05` first install, service, firewall → `06` trusted certificate for the tailnet name |
| Every update | `install-release.ps1` (backup first, previous release kept) |
| Undo the last update | `rollback-release.ps1` |
| A database backup | `backup-now.ps1` |
| An old server converted to releases: remove its git checkout (after testing) | `remove-old-checkout.ps1 -Checkout <folder>` |
| Rename a server (Windows and tailnet name) / accounts and no automatic sign-in | runbook §10 / §0 |
| A till: POS app / printing | `deploy/workstation/install-pos.ps1`, `setup-printing.ps1` |

**The step-by-step is `docs/runbooks/new-mbm-server.md`**, including moving
to a new server (§8) and converting an old git-checkout server in place (§9).

A **development machine** runs MBM from its git checkout (`npm run dev`);
see `README.md`. It is also the build machine (`npm run release`) and the
certificate authority (§2).

---

## Table of Contents

1. [Settings (`.env.local`)](#1-settings-envlocal)
2. [SSL Certificates (HTTPS)](#2-ssl-certificates-https)
3. [QZ Tray Receipt Printing](#3-qz-tray-receipt-printing)
4. [The POS App on Tills](#4-the-pos-app-on-tills)
5. [Client Machines](#5-client-machines)
6. [Deploying Updates](#6-deploying-updates)
7. [Troubleshooting](#7-troubleshooting)
8. [Service and Scripts Reference](#8-service-and-scripts-reference)

---

## 1. Settings (`.env.local`)

`04-configure.ps1` writes `C:\MBM\app\.env.local` (administrators and SYSTEM
only): new secrets for a new server, or the old server's settings with
`-From`. It is never in a release; `install-release.ps1` carries it from one
release to the next. What it holds:

```env
```env
# ── Database ──────────────────────────────────────────────────────────────────
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/multi_business_db"

# ── Auth ──────────────────────────────────────────────────────────────────────
# Generate a secret: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
NEXTAUTH_SECRET="your-generated-secret-here"
NEXTAUTH_URL="https://<server>:8080"

# ── App ───────────────────────────────────────────────────────────────────────
PORT=8080
NODE_ENV=production
APP_NAME="Multi-Business Management Platform"
ADMIN_EMAIL="your-admin@email.com"
ENCRYPTION_KEY="generate-a-64-char-hex-string"

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
```

### What's actually required vs. decorative

`.env.example` has ~30 variables, most inherited from an older template. Only
these are read by the app anywhere in the codebase — everything above this
list is the complete required set:

| Variable | Required for |
|---|---|
| `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `PORT`, `NODE_ENV`, `ENCRYPTION_KEY` | Core app — won't start correctly without these |
| `QZ_PRIVATE_KEY`, `QZ_CERTIFICATE` | Only if using QZ Tray receipt printing (§8) |
| `LOG_LEVEL` | Log verbosity (`src/lib/logger.ts`) |
| `VERBOSE_BACKUP_LOGGING`, `VERBOSE_RESTORE_LOGGING` | Extra detail during backup/restore, off by default |
| `SEED_API_KEY`, `SEED_API_BASE_URL` | Dev-only — headless seed scripts calling protected API endpoints |
| `NODE_OPTIONS` | Not app-read — a real Node.js runtime flag (heap size), takes effect regardless |

**Everything else in `.env.example` — `CORS_ORIGINS`, `RATE_LIMIT_REQUESTS`,
`RATE_LIMIT_WINDOW`, `ALLOWED_FILE_TYPES`, `MAX_FILE_SIZE`, `ADMIN_EMAIL`,
`APP_NAME`, `AUDIT_IP_TRACKING`, `AUDIT_USER_AGENT_TRACKING`,
`DB_SCHEMA_VERSION`, `DEBUG`, `DEFAULT_THEME`, `EMAIL_FROM`, `FORCE_HTTPS`,
`LOG_CONSOLE`, `LOG_DIRECTORY`, `LOG_MAX_FILE_SIZE`, `LOG_MAX_FILES`,
`PRISMA_STUDIO_PORT`, `SESSION_MAX_AGE`, `THEME_STORAGE_ENABLED` — is not
read anywhere in the app.** Setting them to anything (or leaving them out
entirely) has no effect. In particular:
- `CORS_ORIGINS` looks like it restricts cross-origin requests, but
  `next.config.js` hardcodes `Access-Control-Allow-Origin: *` for every
  response regardless of this variable — every origin is currently allowed.
  Don't rely on this variable for any actual access control.
- `RATE_LIMIT_REQUESTS`/`RATE_LIMIT_WINDOW` imply rate limiting exists; there
  is no rate-limiting code anywhere in the app.
- `ALLOWED_FILE_TYPES`/`MAX_FILE_SIZE` imply upload validation is
  configurable; file-type/size checks (where they exist, e.g. document
  uploads) are hardcoded per API route instead.

They're harmless to leave in `.env.local` at their template defaults — this
isn't a "clean these up" instruction — just don't spend time tuning them
expecting a behavior change, and don't treat `CORS_ORIGINS` as a real
security boundary until it's actually wired into `next.config.js`.

---

## 2. SSL Certificates (HTTPS)

**Sign-in needs HTTPS:** MBM's sign-in cookies are Secure, so a browser drops
them over plain `http://`.

The app auto-detects HTTPS by checking the `certs/` folder for `.pem` files. If certs are present, the server starts on HTTPS; otherwise it falls back to HTTP.

**One shared certificate covers every server on the LAN** — generated once on a
single "certificate authority" machine and copied out to each server. Only
that one machine needs `mkcert` installed; every other server just receives
the already-generated files.

> **Simplest:** open MBM by the server's tailnet name. `06-tailscale-certificate.ps1`
> gives it a trusted certificate that renews itself: nothing to install on any
> machine. The shared LAN certificate below is for opening MBM by IP.

### 7a. One-time setup — the certificate authority machine only

Pick one machine to be the permanent cert authority (this only needs to be
done once, ever — subsequent servers never repeat this step). `mkcert` isn't
installed by any MBM setup script, so download it
directly rather than assuming Scoop/Chocolatey are available:

1. Download the Windows binary from the
   [mkcert releases page](https://github.com/FiloSottile/mkcert/releases) —
   grab `mkcert-vX.Y.Z-windows-amd64.exe`.
2. Rename it to `mkcert.exe` and place it somewhere on `PATH` (e.g.
   `C:\mkcert\mkcert.exe`, then add `C:\mkcert` to your `PATH` environment
   variable) — no installer, no admin rights needed for the binary itself.
3. Install the local CA once:
   ```bash
   mkcert -install
   ```
4. In this repo, maintain the list of every server's IP in
   `scripts/lan-server-ips.json`, then generate the shared certificate:
   ```bash
   npm run cert:generate
   ```
   This writes `certs/<ip>+N.pem` and `certs/<ip>+N-key.pem`, covering every
   IP in that list plus `localhost`/`127.0.0.1`.

> The cert-authority machine is a development machine (it has the git checkout
> and Git for Windows, whose `openssl` checks a certificate's coverage). No
> server ever needs `mkcert`.

### 7b. Adding or setting up a new server (do this on every other server)

1. On the cert-authority machine, add the new server's IP and regenerate in
   one step:
   ```bash
   npm run cert:generate -- --add <new-server-ip>
   ```
   (Existing servers are unaffected — they keep using their already-installed
   cert with no changes.)
2. Copy the two regenerated files (`certs/<ip>+N.pem` and
   `certs/<ip>+N-key.pem`) to the new server — USB stick, shared folder, SCP;
   the `certs/` folder is in `.gitignore`, so this is always a manual/out-of-band
   transfer, never a `git pull`.
3. On the new server, in `C:\MBM\app`, after `05-install.ps1`:
   ```powershell
   cd C:\MBM\app; npm run cert:install -- "<folder with the copied files>"
   ```
   (A server moved or converted with `04-configure.ps1 -From` already has
   the old server's `certs\`.)
   This places the files in `certs/`, warns if the server's own IP wasn't
   actually included in the certificate (the most common mistake — forgetting
   step 1), and restarts the service for you.
4. Confirm the service log shows `[Server] HTTPS enabled — certs loaded from ./certs/`.

Every machine that opens the app in a browser also needs to trust the root
CA once — that's covered separately in [§5](#5-client-machines), since
it's a one-time step per *client*, not per server.

### 7c. Certificate renewal

Check the current expiry:
```bash
openssl x509 -noout -enddate -in certs/<name>+N.pem
```

Renewing is the same as adding a server, minus changing the IP list:

1. On the cert-authority machine: `npm run cert:generate`
2. Redistribute the regenerated `.pem` files to **every** server this time
   (a renewal changes the file every existing server uses, unlike adding one
   new server)
3. Restart every server
4. No client reinstallation needed — the root CA outlives any individual leaf certificate

### Update NEXTAUTH_URL

`.env.local` (`C:\MBM\app\.env.local`) names the address people use:

```env
NEXTAUTH_URL="https://<this-server-ip>:8080"
```

Restart the service after a change: `Restart-Service multibusinesssyncservice.exe`.
`AUTH_TRUST_HOST=true` (set by `04-configure.ps1`) lets sign-in work at the
tailnet name and the IP alike.

---

## 3. QZ Tray Receipt Printing

QZ Tray is a Java desktop app that lets the browser print to local/network printers without browser print dialogs.

> **The quick way (MBM-341):** after installing QZ Tray on a till, run, as administrator,
> `powershell -ExecutionPolicy Bypass -File deploy\workstation\setup-printing.ps1 -Server https://<server>:8080`.
> It fetches MBM's QZ signing certificate from the server and installs it as QZ's
> `override.crt` (no Allow/Deny popup, no USB stick, no Site Manager), trusts the
> server's root certificate when the till uses its IP (no `setup-ssl.bat`), and
> restarts QZ. Safe to run again. The manual steps below still work.
> QZ Tray 2.2 brings its own Java: no separate Java install.

### Install QZ Tray

Download version **2.2.6** from [qz.io](https://qz.io/download/) and install on each machine that will print receipts. Start QZ Tray — it runs in the system tray.

### First connection (before signing is set up)

Without the signed-certificate setup below, QZ Tray shows an **Allow/Deny** popup the first time the app tries to print on each machine:
1. Click **Allow**
2. Check **"Remember this decision"**
3. Done — future connections on that machine are automatic

This is fine for a small number of machines; the signed-certificate setup below eliminates the popup entirely, which matters more as client machines scale up.

### Set up signed certificates (eliminates the Allow/Deny popup)

> **How this differs from SSL certs:** The SSL `rootCA.pem` must be a physical file on the server. The QZ certificate is different — the server reads it from `.env.local` env vars, not from a file. Only client machines (where QZ Tray is installed) need the physical `qz-certificate.pem` file.

**Step 1 — Generate the signing certificate** (once, on a development machine):

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

**Step 4 — Restart the service** (nothing to build: the settings are read at start):

```powershell
Restart-Service multibusinesssyncservice.exe
```

From this point, QZ Tray will silently trust all print requests from the app — no more popups.

| File | Server needs it? | QZ Tray machine needs it? |
|------|-----------------|--------------------------|
| `rootCA.pem` | ✅ Physical file in `certs/` (by IP only) | ✅ `setup-printing.ps1` or `setup-ssl.bat` |
| SSL cert + key `.pem` | ✅ Physical file in `certs/` | ❌ Not needed |
| `qz-certificate.pem` | ❌ Env var in `.env.local` only | ✅ Add to QZ Tray trusted list |

---

## 4. The POS App on Tills

The POS app (Electron: the till's screen and the customer display) is
installed on each till, never run from a server:

```powershell
# on the till, as administrator
powershell -ExecutionPolicy Bypass -File deploy\workstation\install-pos.ps1 -Server https://<server>:8080
```

Its installer is built on a development machine: `cd electron; npm run build:win`
(output in `multi-business-electron-dist\`). Every change under `electron\`
bumps `electron/package.json`'s version, shown in the window title.
`electron/README.md` covers the dual-monitor setup.

---

## 5. Client Machines

Every Windows machine that opens the app in Chrome or Edge needs to trust the SSL certificate once.

> **Simplest:** open MBM by the server's tailnet name (`https://<server>.<tailnet>.ts.net:8080`,
> runbook step 6): its certificate is trusted
> everywhere, so nothing to install. By IP, `deploy\workstation\setup-printing.ps1`
> installs the root certificate for you (Option A/B below are the manual way).

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
1. QZ Tray 2.2.6 installed and running (it brings its own Java)
2. MBM's QZ certificate trusted by QZ: `deploy\workstation\setup-printing.ps1` (or §3 Step 3 by hand)

---

## 6. Deploying Updates

Build on the build machine, copy, install. **`docs/runbooks/manual-deployment.md`
has every step** (local, the dev server, production):

```bash
npm run release                       # build machine: the commit checked out
```
```powershell
# the zip + .sha256 in C:\MBM\incoming on the server, then on the server:
powershell -ExecutionPolicy Bypass -File C:\MBM\setup\install-release.ps1
# something wrong after it:
powershell -ExecutionPolicy Bypass -File C:\MBM\setup\rollback-release.ps1
```

`install-release.ps1` checks the SHA-256, backs up the database, stops the
service, keeps the running release in `C:\MBM\previous`, switches, applies
migrations (`migrate deploy`, never `db push`), starts the service and checks
that the server answers with the new version. Nothing is built on the server.

### After a failed migration

`install-release.ps1` stops and says so; the database backup it made first
is in `C:\MBM\backups`. `rollback-release.ps1` puts the previous release
back. Fix the migration in the code and build a new release; never edit the
database by hand.

---

## 7. Troubleshooting

### Service starts then stops immediately

```powershell
Get-Content C:\MBM\app\windows-service\daemon\multibusinesssyncservice.err.log -Tail 50
```

Common causes: PostgreSQL not running (`Get-Service postgresql-x64-18`), port
8080 in use, a failed migration (§6), a missing `.env.local`
(`00-status.ps1` says what is missing).

### Migration lock stuck

Symptom: `Migration lock present, waiting 5s...` repeating in the logs.

```powershell
Stop-Service multibusinesssyncservice.exe
cd C:\MBM\app; npm run db:clear-locks
Start-Service multibusinesssyncservice.exe
```

### App running on HTTP instead of HTTPS

The log says `[Server] HTTP only — no certs found in ./certs/`: put a
certificate in `C:\MBM\app\certs` (§2) or run `06-tailscale-certificate.ps1`,
then restart the service.

### `https://localhost:8080` works but `https://<server-ip>:8080` doesn't (from another machine)

This is almost always the Windows Firewall rule missing on the server
(`05-install.ps1` adds "MBM app (TCP 8080)"). Loopback traffic bypasses the firewall entirely,
which is why localhost works regardless.

Diagnose in order:
1. On the server: `Get-NetFirewallRule -DisplayName "MBM app (TCP 8080)" | Select-Object Enabled, Action, Profile` — confirm the rule exists, is `Enabled: True`, `Action: Allow`.
2. From the *other* machine (not the server): `Test-NetConnection -ComputerName <server-ip> -Port 8080`. If `TcpTestSucceeded` is `False`, the block is somewhere in the network path, not the app.
3. If a VPN/mesh network (e.g. Tailscale) is installed on either machine, check `Test-NetConnection`'s `InterfaceAlias` in its output — a successful connection routed through a VPN interface only proves that VPN path works, not that the real LAN path does. Retest with the VPN disabled if you need to confirm plain LAN connectivity.
4. If the firewall rule and TCP path both check out but it's still unreachable from some devices and not others, suspect the router/access point — Wi-Fi client isolation (common on guest networks) blocks device-to-device traffic before it ever reaches Windows Firewall.

### QZ Tray popup appears every print job

The `QZ_PRIVATE_KEY` and `QZ_CERTIFICATE` are not set in `.env.local`, or the cert hasn't been added to QZ Tray. Follow §3, or run `setup-printing.ps1` on the till.

### QZ Tray popup not appearing at all

Make sure the app is actually being accessed over HTTPS (QZ Tray's popup is triggered by the page, and won't fire from a plain `http://` origin), then refresh the printers page.

### QZ Tray shows "connected" but can't list printers

Click **Allow** on the QZ Tray popup and check **"Remember this decision"** — a dismissed or denied popup leaves QZ Tray connected at the socket level but unauthorized to enumerate printers.

### Chrome/Edge shows "Not secure" despite certs being installed

The root CA hasn't been trusted on *that specific client machine* yet — this is a per-client step, unrelated to whether the server's cert is correct. Run `setup-printing.ps1` or `certs\setup-ssl.bat` on that machine (§5), or use the tailnet name and restart the browser.

### Electron shows ERR_TIMED_OUT

The server hasn't finished starting when Electron tried to connect. Wait 30–60 seconds for the full startup sequence to complete, then re-open Electron. The POS app retries by itself; if not, reinstall it with `install-pos.ps1`.

### NEXTAUTH JWT session errors after a settings change

Old session cookies become invalid when `NEXTAUTH_SECRET` changes or the server URL changes from `http://` to `https://`. Users just need to log out and log back in. No code fix required.

---

## 8. Service and Scripts Reference

| What | How (on the server, as administrator) |
|---|---|
| Status of everything | `C:\MBM\setup\00-status.ps1` |
| Start / stop / restart | `Start-Service` / `Stop-Service` / `Restart-Service multibusinesssyncservice.exe` |
| Install a release | `C:\MBM\setup\install-release.ps1` |
| Undo the last release | `C:\MBM\setup\rollback-release.ps1` |
| Database backup now | `C:\MBM\setup\backup-now.ps1` |
| Restore a backup | `C:\MBM\setup\restore.ps1` |
| Tailnet certificate | `C:\MBM\setup\06-tailscale-certificate.ps1` |
| Install a copied LAN certificate | `cd C:\MBM\app; npm run cert:install -- <folder>` |
| Clear stuck migration locks | `cd C:\MBM\app; npm run db:clear-locks` |

On a development machine: `npm run release`, `npm run qz:generate-cert`,
`npm run cert:generate [-- --add <ip>]`.

### Log file locations

| Log | Path |
|-----|------|
| Application stdout | `C:\MBM\app\windows-service\daemon\multibusinesssyncservice.out.log` |
| Application stderr | `C:\MBM\app\windows-service\daemon\multibusinesssyncservice.err.log` |
| Wrapper log | `C:\MBM\app\windows-service\daemon\multibusinesssyncservice.wrapper.log` |
