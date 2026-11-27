# The new MBM server: from the box to replacing the old one (MBM-341)

MBM is set up the same way as Farm Control's new server: numbered scripts you
run as administrator, one line each, and releases built off the server and
installed with one script that you or the AI run the same way.

**No git, no `npm install`, no build on a server.** A server only holds
releases (zips built on the build machine) in `C:\MBM`. The old way, a git
checkout that pulls and builds in place,
is for development machines; an old server is converted with §9 below.

Once step 1 is done, the AI does the rest over SSH (the scripts take `-Yes`
where they ask y/n), except what needs you: passwords, and approving changes
to a live server.

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
| 1 | Tailscale and the AI's SSH | `01-tailscale-and-ssh.ps1` (+ `mbm-ai.pub`, by any means: USB, Remote Desktop) | |
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

**Names**: `MBM-SRV<n>` for a server people work on, `MBM-DEV<n>` for a
development/test server. The Windows name and the tailnet name are the same
(`mbm-srv1.tail2cac9d.ts.net`); renaming later: §10.

**Accounts**: your own administrator account (in Terminal (Admin)):

```powershell
$name = '<you>'
New-LocalUser $name -FullName '<Your Name>' -Password (Read-Host -AsSecureString "Password for $name") -PasswordNeverExpires
Add-LocalGroupMember -Group Administrators -Member $name
```

Sign in with it once, then remove or disable the vendor's account (or give
it a password). **Nobody signs in by itself**: a server runs everything as
services, so it must come back after a restart with the sign-in screen up.
Two things sign an account in by themselves:
- an account **with no password** (Windows signs it straight in; found on
  MBM-DEV1's `pcuser`): `net user <account> *` gives it one;
- Windows' "use my sign-in info to finish setting up after an update or
  restart", off for everyone with:

```powershell
New-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System' -Name DisableAutomaticRestartSignOn -Value 1 -PropertyType DWord -Force | Out-Null
Set-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon' -Name AutoAdminLogon -Value '0'
```

Test it: restart with nobody signed in; the AI checks that Tailscale, SSH
and the services came back.

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

Each server has its own key (`~/.ssh/mbm_<server>_ed25519`). `01` checks
that Tailscale is **unattended**: otherwise only the Windows account that
signed it in can use it, and after a restart nobody can reach the server
until someone signs in at its keyboard. If it stops there, as that account:
`tailscale set --unattended`. If the AI can't reach the server even though
it shows on the tailnet (Tailscale's own ping gets no answer), the server's
network is blocking Tailscale: try another network.

When the server already has another administrator the AI can use (as
MBM-DEV1 had Farm Control's `farmnet-ai`), the AI runs `01` itself with
`-RandomPassword`: `mbm-ai` then gets a random password nobody sees. To
know it, set your own: `net user mbm-ai *`.

**Tailscale belongs to the Windows account that signed it in** (the
"owner"). Unattended, its tunnel serves the whole machine, whoever is
signed in, but only the owner and SYSTEM may give it commands. Everyone
else gets "already in use by <owner>" or "running in server mode
(<owner>)", and their tray icon shows a sign-in or error message: that is
expected and harmless, the connection is fine. So:
- the owner account keeps a password and never has to be signed in;
- **don't sign Tailscale in again from another account**: Windows keeps
  Tailscale sign-ins per account, so that would most likely add a second
  machine to the tailnet, with a new address (the AI's SSH and Farm
  Control's agents use the old one);
- the AI gives Tailscale commands (the certificate, a name) through a
  one-off task that runs as SYSTEM, as `06` does.

## 2 to 5

```powershell
powershell -ExecutionPolicy Bypass -File C:\MBM\setup\02-windows.ps1
powershell -ExecutionPolicy Bypass -File C:\MBM\setup\03-prerequisites.ps1
powershell -ExecutionPolicy Bypass -File C:\MBM\setup\04-configure.ps1            # a NEW server
powershell -ExecutionPolicy Bypass -File C:\MBM\setup\04-configure.ps1 -From C:\MBM\from-old   # REPLACING one
powershell -ExecutionPolicy Bypass -File C:\MBM\setup\restore.ps1 -Dump C:\MBM\incoming\<backup>.dump   # REPLACING one
powershell -ExecutionPolicy Bypass -File C:\MBM\setup\05-install.ps1
```

- **3** installs Node 24 (from nodejs.org, SHA-256 checked; with nvm when the
  server has nvm), Chrome and PostgreSQL 18. winget installs PostgreSQL
  silently with the superuser password `postgres`: 3 then has you choose
  your own (typed twice; paste with right-click). It makes the database and
  its own user with a random password, and keeps the address for step 4.
- **4, replacing a server**: `C:\MBM\from-old` holds the old server's
  `.env.local`, `certs\`, `data\`, `public\uploads\` and `public\exports\`
  (the AI copies them straight from the old server over the tailnet). Its
  **ENCRYPTION_KEY must come along**: with a new one, the restored encrypted
  fields can't be read. Keep a copy of `.env.local` in your password manager.
  Product, category and employee photos are in the database (the `images`
  table), so they come with the backup; only the files in `public\uploads\`
  (employee and vehicle documents, a few older images) live on disk.
- **Sign-in needs HTTPS**: MBM's sign-in cookies are Secure, and browsers
  drop them on `http://`. Until step 6 (or the old server's `certs\`) a
  server answers but nobody can sign in.
- **R** goes into the empty database only, in one transaction, and shows
  counts to compare with the old server.
- **5** installs the newest release from `C:\MBM\incoming`, makes the first
  administrator only on an empty database, installs the service and the
  firewall rule, and checks the release that answers.

## 6. The tailnet name, with a trusted certificate

Tailscale admin console → DNS: **MagicDNS** and **HTTPS Certificates** on. Then:

```powershell
powershell -ExecutionPolicy Bypass -File C:\MBM\setup\06-tailscale-certificate.ps1
```

Run once (as Farm Control's `certificate -auto`). It gets a Let's Encrypt
certificate for `<server>.<tailnet>.ts.net` from Tailscale into
`C:\MBM\app\certs\tailscale\` and sets up the task **MBM certificate**: as
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

`deploy.ps1` does all this for you. Since MBM-348 it runs `install-release.ps1`
(and any rollback) as a one-off scheduled task on the server (`MBM deploy`,
SYSTEM), logging to `C:\MBM\logs\deploy-<time>.log`, and prints that log as
it grows. A dropped SSH connection only pauses the watching; the install
carries on. The task is removed when it ends; the log stays.

A copy stopped half-way (or cut by a restart) can leave the partial zip
locked on the server, and the next copy then fails: delete it after a
restart, then copy again. `install-release.ps1` checks the SHA-256, so a
damaged copy is never installed.

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

### Printing (QZ Tray) on a till

Install QZ Tray 2.2.6 (https://qz.io/download; it brings its own Java), then, as administrator:

```powershell
powershell -ExecutionPolicy Bypass -File .\setup-printing.ps1 -Server https://<server>.<tailnet>.ts.net:8080
```

(`deploy/workstation/setup-printing.ps1`.) It makes QZ trust MBM's signing
certificate (`override.crt`: no Allow/Deny popup), restarts QZ, and, when
given the server's IP instead of its name, trusts the server's root
certificate. QZ trusts the certificate, not the address: printing works
from the name and the IP alike. Moving servers keeps the same QZ
certificate (`QZ_*` in `.env.local`, carried by `04-configure.ps1 -From`),
so the tills need nothing.

## Backups

`backup-now.ps1`: the whole database (`pg_dump`), read back before it counts.
`install-release.ps1` makes one before every install. The in-app backup
(Admin → Data Management) stays for business-level backups and restores.

## 8. Cut-over (replacing the old Zimbabwe server)

1. Tell people: MBM is unavailable for about 30 minutes.
2. Old server: stop the MBM service; `backup-now.ps1 -App <its folder>`.
3. Copy that `.dump` + `.sha256` to the new server's `C:\MBM\incoming\`.
4. New server: stop its service, empty its database (the AI, at your word:
   everything in it is replaced), `restore.ps1`, then `install-release.ps1`.
   Compare the counts. Copy `public\uploads\` and `public\exports\` again.
5. Give the new server the old one's address on the router (or point the
   tills' bookmarks and printers at the new one). Farm Control: the same
   signing key came along in `data\`, so nothing changes for FarmNet unless the
   server's address changed (then FarmNet registers the new address).
6. Keep the old server switched off but intact for two weeks.

### 8a. MBM-SRV1 replaces the current prod (USERABO-JM67FK6): checklist

Written 2026-11-27 while MBM-SRV1 ships to Zimbabwe (plan MBM-348). SRV1
already runs releases (`C:\MBM`) and holds a **trial** copy of prod's data
and settings from 23 Nov. It is deploy target `srv1`. Today's prod runs
releases too (converted 27 Nov), so both sides use the same scripts.

**A. When it arrives: prod keeps running, no downtime**

1. Plug it in, **wired** if possible. Tailscale up.
   `.\deploy\deploy.ps1 -Status` must show srv1 answering.
2. Its network must be **Private** (`Get-NetConnectionProfile`). Prod's Wi-Fi was
   *Public*, and the 8080 firewall rule (Domain, Private) blocked the tills
   until it was changed.
3. Latest code, the same release prod runs:
   `.\deploy\deploy.ps1 -Target srv1 -Release <prod's release>`
4. Latest settings: copy prod's `C:\MBM\app\.env.local`, `certs\` and `data\`
   to SRV1 (e.g. `C:\MBM\from-old`), then `04-configure.ps1 -From C:\MBM\from-old`.
   The same ENCRYPTION_KEY, NEXTAUTH_SECRET and QZ keys, so encrypted fields,
   sign-ins and printing carry over.
5. **Rehearsal (recommended):**
   - `backup-now.ps1` on prod (no downtime);
   - restore it on SRV1 (steps B4–B5);
   - compare the counts; sign in and try a sale on SRV1's own address.
   - This times the real cut-over and finds problems while prod is still live.
6. POS app on SRV1: `install-pos.ps1` **without** `-StartAtLogin` (no one uses
   its screen). Prod's screen has it at sign-in.

**B. Cut-over day: quiet hours, about 30–60 min down**

1. Tell people: MBM is unavailable for about an hour.
2. **Old prod:** stop the MBM service, then `C:\MBM\setup\backup-now.ps1`. This
   is the final data; nothing may change on it after this.
3. **Copy** that `.dump` + `.sha256` to SRV1's `C:\MBM\incoming\`.
   - Server to server over the shop network is fast.
   - Through the workstation it's ~106 MB at prod's ~140 KB/s, about 13 min.
   - The SHA-256 must match.
4. **SRV1:**
   - stop its service;
   - **empty its database** (only at the owner's word: the trial data is replaced);
   - `restore.ps1 -Dump C:\MBM\incoming\<dump>`, then start it (only the newer migrations run).
5. **Compare the counts** that `restore.ps1` shows with old prod. Copy
   `public\uploads\` and `public\exports\` from old prod again.
6. **Address:** the tills, printers and bookmarks must reach SRV1. Choose one:
   - **(a) the same address (no till changes):**
     - switch old prod off the network;
     - give SRV1 **192.168.1.211** (router reservation);
     - give SRV1 old prod's tailnet name (§10), so `userabo-jm67fk6.tail2cac9d.ts.net` keeps working.
   - **(b) SRV1's own address:** repoint every till:
     - `install-pos.ps1 -Server …` and `setup-printing.ps1 -Server …`;
     - bookmarks;
     - Farm Control's MBM address (§10 step 4).
7. **Deploy targets** (`%USERPROFILE%\.mbm\deploy-targets.json`): srv1 gets
   `production: true`; old prod is removed.
8. **Check from a till:** sign-in, a sale, a receipt print, a payroll PDF.

**C. Retiring the old server**

1. Keep it **switched off but intact for two weeks**: it is the way back.
2. Then a last `backup-now.ps1` for the archive, and wipe it.

**Slow-line lessons from prod (27 Nov)**
- **The copy:** the ~650 MB release zip took ~87 min.
- **A dropped copy:** SSH dropped once during it. Stop the stale `mbm-ai` `sftp-server`/`sshd`, delete the locked `.part`, and copy again.
- **A dropped install:** SSH also dropped mid-install and killed it after the switch. `deploy.ps1` now runs the install as a task on the server (MBM-348), so this can't happen again.

## 9. Converting an old server in place (a git checkout → `C:\MBM`)

An old server runs MBM from a git checkout (e.g.
`C:\Users\user\apps\multi-business-multi-apps`), with Node from nvm and a
service that pulls and builds. It keeps its database; only the way MBM is
installed changes. Test on a spare server first.

1. Step 1 (`01-tailscale-and-ssh.ps1`), then the AI: `00-status.ps1` and
   `backup-now.ps1 -App <checkout>` (read-only for MBM; it keeps running).
2. The AI copies the release to `C:\MBM\incoming\` (allow for a slow line:
   ~650 MB).
3. `03-prerequisites.ps1 -ProgramsOnly` (the server keeps its database, so
   no new one): Node 24 with nvm when nvm is installed for the whole machine
   (`nvm use 24`: the running MBM keeps its Node until it restarts;
   `nvm use 20` goes back); otherwise (no nvm, or nvm only in one user's
   profile, as on MBM-DEV1) Node 24 for the whole machine from nodejs.org,
   next to the old one, which the old service goes on using.
4. `04-configure.ps1 -From <checkout>`: the same settings and keys, the
   **same database** (its address from the checkout's `.env.local`), and
   `certs\`, `data\`, `public\uploads\`, `public\exports\` copied.
5. **Downtime starts** — `05-install.ps1`: backup, the release into
   `C:\MBM\app`, migrations, then it **replaces the service** that ran the
   checkout with one that runs `C:\MBM\app`, starts it and checks the
   release that answers. A few minutes.
6. `06-tailscale-certificate.ps1`; check sign-in at the IP and the name, a
   sale, a receipt print.

The checkout is left as it is at first: it is the way back. To go back:
`nvm use 20`, then in the checkout `node windows-service\force-install-hybrid.js`
(the old service again). The newer migrations stay; the old code runs on
them.

7. When the converted server has run well (a few days of real use, an
   update by `install-release.ps1`): remove the checkout. Servers no longer
   use git, and the checkout (node_modules, the build, git history) is
   several GB:

   ```powershell
   powershell -ExecutionPolicy Bypass -File C:\MBM\setup\remove-old-checkout.ps1 -Checkout <checkout>
   ```

   It refuses unless the service runs `C:\MBM\app` and answers, nothing runs
   from the checkout, and every file the server keeps is in `C:\MBM\app`.
   It moves the checkout's in-app backups to `C:\MBM\backups\from-checkout`
   (not deleted), then asks before removing. After this the way back is
   `rollback-release.ps1` only. Git itself stays installed unless
   `-RemoveGit` (other programs on the machine may use it).

## 10. Renaming a server

Done on MBM-DEV1 (was `desktop-4us91kl`), 2026-11-23/24.

1. **Windows** (the AI, as `mbm-ai`): `Rename-Computer -NewName MBM-DEV1`;
   it takes effect at the next restart. Account names follow
   (`MBM-DEV1\<account>`); nothing else on the machine changes.
2. **The tailnet name** (the AI, through a one-off SYSTEM task):
   `tailscale set --hostname=mbm-dev1`. Same tailnet address; the new name
   resolves within seconds. In the Tailscale console, rename the machine
   too if its name was ever set there by hand. (To rename Windows only and
   keep the old tailnet name, set `--hostname=<old name>` instead, before
   the restart.)
3. **MBM's certificate**: `06-tailscale-certificate.ps1` (or wait: its
   task notices the name changed and gets a new one within 15 minutes).
4. **Everything that uses the old name**, outside MBM's server:
   - MBM on other machines that link to this one, e.g. Farm Control's
     address in Admin → Farm Control;
   - Farm Control, when it runs on this machine: its own certificate, the
     Pi agents' controller address, the site configs that name the server,
     and its list of MBM addresses allowed to show it (`frame-ancestors`:
     every address MBM is opened at, e.g. `https://<pc>.tail2cac9d.ts.net:8080`,
     needs to be in it);
   - bookmarks, `install-pos.ps1` / `setup-printing.ps1 -Server` on tills.

The AI's SSH uses the tailnet address, which doesn't change.

## Releases installed

| Date | Release | Server | Notes |
|---|---|---|---|
| 2026-11-23 | `cfac0518` | MBM-SRV1 | First install, trial settings |
| 2026-11-23 | `bdfa2c68` | MBM-SRV1 | First update by `install-release.ps1`; rollback and forward tested |
| 2026-11-23 | `bdfa2c68` | MBM-SRV1 | Production's data (backup of 20:53), settings and files; counts and image bytes equal |
| 2026-11-23 | `bdfa2c68` | MBM-DEV1 (was desktop-4us91kl) | Converted in place from its git checkout (§9), by the AI as `mbm-ai`; same database (13 users). 2026-11-24: tailnet name too, now `mbm-dev1.tail2cac9d.ts.net` (Farm Control on it updated by the user) |
| 2026-11-27 | `07df2647` | Prod (USERABO-JM67FK6, 192.168.1.211) | Converted in place from its git checkout (§9), by the AI as `mbm-ai`; same database (13 users); 5 migrations (MBM-339 to 347); about 7 min down. The ~650 MB copy took ~87 min on prod's line, and SSH dropped twice (the copy, then `05-install` mid-switch), so the rest ran as a scheduled task on the server. The Wi-Fi was a *Public* network, so the 8080 rule (Domain, Private) blocked the LAN until it was set to Private; before, an old allow rule for Node 20's `node.exe` had let it in. POS app 1.0.30 -> 1.0.36 with `install-pos.ps1 -StartAtLogin`. Old checkout kept as the way back |
