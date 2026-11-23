# The new MBM server: from the box to replacing the old one (MBM-341)

MBM is set up the same way as Farm Control's new server: numbered scripts you
run as administrator, one line each, and releases built off the server and
installed with one script that you or the AI run the same way.

Every script in `deploy/server/`:
- checks first and leaves alone what's done, so it can be run again;
- asks y/n before each change (except `install-release`, `rollback-release`
  and `backup-now`, which ask nothing so the AI can run them over SSH);
- ends with **OK** / **TODO** / **STOP** lines and the next step;
- never prints a secret.

`C:\MBM\setup\00-status.ps1` (read-only) says at any time what's done and what's next.

## Who does what

- **You**: run the scripts on the server, choose passwords (never given to the AI).
- **The AI**, after step 1, over SSH with its own key: runs `00-status.ps1`,
  copies scripts, releases and backups, and, at your word ("INSTALL IT"),
  runs `install-release.ps1`, `backup-now.ps1` or `rollback-release.ps1`.

## On the server: `C:\MBM`

| Folder | What |
|---|---|
| `app\` | The running release, plus this server's own files (below) |
| `incoming\` | Releases (`mbm-<date>-<commit>.zip` + `.sha256`) and backups copied here |
| `previous\` | The last 3 releases replaced, for `rollback-release.ps1` |
| `backups\` | Database backups (`pg_dump`, `.dump` + `.sha256`), newest 10 |
| `setup\` | These scripts |

**This server's own files** move from release to release and are never in a
release: `.env.local`, `certs\`, `data\` (Farm Control's signing key),
`config\service-config.json`, `backups\`, `logs\`, `public\uploads\`,
`public\exports\`, `windows-service\daemon\` (the service's program and settings).

## Progress

| # | Step | Where | Done |
|---|------|-------|------|
| 0 | Firmware, Windows, your accounts | By hand (§0) | |
| 1 | Tailscale and the AI's SSH | `01-tailscale-and-ssh.ps1` (USB stick) | |
| – | The AI checks and copies the scripts | The AI | |
| 2 | Windows | `02-windows.ps1` | |
| 3 | Node, PostgreSQL 18, the database | `03-prerequisites.ps1` | |
| 4 | Settings (new, or the old server's) | `04-configure.ps1 [-From …]` | |
| R | Restore the old server's backup (replacing a server) | `restore.ps1 -Dump …` | |
| 5 | First install: release, service, firewall | `05-install.ps1` | |
| 6 | Trusted certificate for the tailnet name, renewed by itself | `06-tailscale-certificate.ps1` | |
| 7 | Test: an update and a rollback | `install-release.ps1`, `rollback-release.ps1` | |
| 8 | Cut-over (§8) | By hand, the AI checks | |

## 0. By hand

Firmware: power on after power loss. Windows 11 Pro, Windows Update until
nothing is left, your administrator account. UPS with its USB cable and
shutdown software. Network cable.

## 1. Tailscale and the AI's SSH

The AI makes a key for this server only (`~/.ssh/mbm_srv1_ed25519`, at your
word) and gives you `mbm-ai.pub` (the public half). Put it with
`01-tailscale-and-ssh.ps1` in one folder on the server and run, as administrator:

```powershell
powershell -ExecutionPolicy Bypass -File .\01-tailscale-and-ssh.ps1
```

It asks you for a password for `mbm-ai` (keep it; it's never used over SSH).
Send the AI the lines it prints. In the Tailscale console: this machine →
**Disable key expiry**. The AI connects, checks the host key, copies the
other scripts to `C:\MBM\setup\` and runs `00-status.ps1`.

## 2 to 5

```powershell
powershell -ExecutionPolicy Bypass -File C:\MBM\setup\02-windows.ps1
powershell -ExecutionPolicy Bypass -File C:\MBM\setup\03-prerequisites.ps1
powershell -ExecutionPolicy Bypass -File C:\MBM\setup\04-configure.ps1            # a NEW server
powershell -ExecutionPolicy Bypass -File C:\MBM\setup\04-configure.ps1 -From C:\MBM\from-old   # REPLACING one
powershell -ExecutionPolicy Bypass -File C:\MBM\setup\restore.ps1 -Dump C:\MBM\incoming\<backup>.dump   # REPLACING one
powershell -ExecutionPolicy Bypass -File C:\MBM\setup\05-install.ps1
```

- **3** asks for the postgres superuser password once, makes the database and
  its own user with a random password, and keeps the address for step 4.
- **4, replacing a server**: `C:\MBM\from-old` holds the old server's
  `.env.local`, `certs\` and `data\`. Its **ENCRYPTION_KEY must come along**:
  with a new one, the restored encrypted fields can't be read. Keep a copy of
  `.env.local` in your password manager.
- **R** goes into the empty database only, in one transaction, and shows
  counts to compare with the old server.
- **5** installs the newest release from `C:\MBM\incoming`, makes the first
  administrator only on an empty database, installs the service and the
  firewall rule, and checks the release that answers.

## 6. The tailnet name, with a trusted certificate

Tailscale admin console → DNS: **MagicDNS** and **HTTPS Certificates** on. Then:

```powershell
powershell -ExecutionPolicy Bypass -File C:\MBM\setup-tailscale-certificate.ps1
```

Run once (as Farm Control's `certificate -auto`). It gets a Let's Encrypt
certificate for `<server>.<tailnet>.ts.net` from Tailscale into
`C:\MBMpp\certs	ailscale\` and sets up the task **MBM certificate**: as
SYSTEM, every 15 minutes, it renews when under 30 days are left (90-day
certificates) and otherwise only notes the check. Nobody renews by hand;
`00-status.ps1` shows the days left and the last renewal.

Then MBM answers on both:
- `https://<server>.<tailnet>.ts.net:8080`: trusted, no warning, on any
  device on the tailnet (tills, phones, FarmNet);
- `https://<IP>:8080`: as before, with the server's own certificate.

MBM picks the certificate by the name asked for and reloads it after a
renewal with no restart. Sign-in works at both (`AUTH_TRUST_HOST=true`, set
by step 4).

## Every release after that

On the build machine (this repo, Windows, the same Node as the server):

```bash
npm run release              # the commit checked out (uncommitted changes are NOT included)
npm run release -- --ref main
```

It builds from a clean checkout of the commit and writes
`releases/mbm-<date>-<commit>.zip` + `.sha256` (+ `.json`, what it is).
Copy both to `C:\MBM\incoming\` on the server (the AI: COPY IT), then:

```powershell
powershell -ExecutionPolicy Bypass -File C:\MBM\setup\install-release.ps1
```

Backup first → switch (previous kept) → migrations → start → "the server
answers <version>". Something wrong: `rollback-release.ps1`.

## Tills: the POS app (Electron)

Every release carries the POS app installer built from the same commit; the
server hands it out at `/api/public/electron/download`. On each till (and on
the server, if it has its own screen; the service no longer launches the app),
as administrator:

```powershell
powershell -ExecutionPolicy Bypass -File .\install-pos.ps1 -Server https://MBM-SRV1:8080
```

(`deploy/workstation/install-pos.ps1`.) It does nothing when the till already
has that version; otherwise downloads, checks the SHA-256, installs silently
(the app closes and comes back) and says old → new. `-Insecure` when the till
doesn't trust the server's certificate yet. On the sign-in screen, an
"update available" badge has a **Download** link to the same installer.

## Backups

`backup-now.ps1`: the whole database (`pg_dump`), read back before it counts.
`install-release.ps1` makes one before every install. The in-app backup
(Admin → Data Management) stays for business-level backups and restores.

## 8. Cut-over (replacing the old Zimbabwe server)

1. Tell people: MBM is unavailable for about 30 minutes.
2. Old server: stop the MBM service; `backup-now.ps1 -App <its folder>`.
3. Copy that `.dump` + `.sha256` to the new server's `C:\MBM\incoming\`.
4. New server: drop and re-make the empty database (the AI walks you through),
   `restore.ps1`, then `install-release.ps1`. Compare the counts.
5. Give the new server the old one's address on the router (or point the
   tills' bookmarks and printers at the new one). Farm Control: the same
   signing key came along in `data\`, so nothing changes for FarmNet unless the
   server's address changed (then FarmNet registers the new address).
6. Keep the old server switched off but intact for two weeks.

## Releases installed

| Date | Release | Server | Notes |
|---|---|---|---|
