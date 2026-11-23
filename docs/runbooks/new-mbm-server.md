# The new MBM server: from the box to replacing the old one (MBM-341)

MBM is set up the same way as Farm Control's new server: numbered scripts you
run as administrator, one line each, and releases built off the server and
installed with one script that you or the AI run the same way.

**No git, no `npm install`, no build on a server.** A server only holds
releases (zips built on the build machine) in `C:\MBM`. The old way, a git
checkout that pulls and builds in place (`ADMIN-INSTALLATION-GUIDE.md` §2–6),
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

## Releases installed

| Date | Release | Server | Notes |
|---|---|---|---|
| 2026-11-23 | `cfac0518` | MBM-SRV1 | First install, trial settings |
| 2026-11-23 | `bdfa2c68` | MBM-SRV1 | First update by `install-release.ps1`; rollback and forward tested |
| 2026-11-23 | `bdfa2c68` | MBM-SRV1 | Production's data (backup of 20:53), settings and files; counts and image bytes equal |
| 2026-11-23 | `bdfa2c68` | MBM-DEV1 (was desktop-4us91kl) | Converted in place from its git checkout (§9), by the AI as `mbm-ai`; same database (13 users). 2026-11-24: tailnet name too, now `mbm-dev1.tail2cac9d.ts.net` (Farm Control on it updated by the user) |
