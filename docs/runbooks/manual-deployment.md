# Manual deployment: a release from the workstation to any environment

How to take a commit from the workstation (the build machine, with the git
checkout) to the local machine, the dev server or production, by hand.
Servers must already run releases from `C:\MBM` (set up with
`new-mbm-server.md` §1–6, or converted in place with §9). A server still on a
git checkout is converted first; never `git pull` on a server.

The same four steps everywhere: **build → copy → install → check**. The order
is always local → dev server → production, with the same zip: what reaches
production is exactly what was tested.

## The environments

| Environment | Where MBM runs | Reached at | AI's SSH (from the workstation) |
|---|---|---|---|
| **Local** (the workstation) | the git checkout (`npm run dev` / `npm start`) | `https://localhost:8080` | — |
| **Dev server** MBM-DEV1 | `C:\MBM\app` | `https://mbm-dev1.tail2cac9d.ts.net:8080` | `mbm-ai@100.112.102.94`, key `~/.ssh/mbm_test_ed25519` |
| **MBM-SRV1** | `C:\MBM\app` | `https://mbm-srv1.tail2cac9d.ts.net:8080` | `mbm-ai@100.105.213.12`, key `~/.ssh/mbm_srv1_ed25519` |
| **Production** (Zimbabwe) | `C:\MBM\app` once converted (runbook §9) | its tailnet name, `:8080` | `mbm-ai@100.93.179.29`, key `~/.ssh/mbm_prod_ed25519` |

Every server is installed the same way; only the address differs.

## 1. Before building

1. The change is **committed**. A release is built from a clean copy of a
   commit: uncommitted changes are never in it.
2. It works locally (`npm run dev`), and `npm run type-check` passes.
3. A schema change has its **migration file** in `prisma/migrations/`
   (`prisma migrate dev --name <name>`, never `db push`). Releases apply
   migrations with `migrate deploy` only.
4. Anything under `electron/` changed → `electron/package.json`'s version
   was bumped (the tills then see an update).
5. The workstation runs **Node 24**, the servers' major version
   (`node -v`); `install-release.ps1` refuses a release built with another.

## 2. Build the release

In the checkout (PowerShell or Git Bash):

```bash
npm run release                  # the commit checked out now
npm run release -- --ref main    # or any commit, branch or tag
```

It takes several minutes (a full `npm ci` and build). It writes to `releases\`:

| File | What |
|---|---|
| `mbm-<date>-<time>-<commit>.zip` | the release (~650 MB: the build and `node_modules`) |
| `mbm-<...>.sha256` | its checksum, checked on the server before anything changes |
| `mbm-<...>.json` | what it is: version, commit, Node, migration count, POS app version |

Read the `.json`: `migrations.count` and `electron.version` tell you whether
this release changes the database and whether tills need the new POS app.

## 3. Local (the workstation)

The workstation is a development machine: it runs the code from its checkout,
not from a release.

```bash
npm run db:deploy      # new migrations into the local database
npm run dev            # or, as the servers run it: npm run build, then npm start
```

To try **the zip itself** before the servers, install it on the dev server:
that is what it is for.

## 4. Copy the release to the server

Both files, the `.zip` and its `.sha256`, go into `C:\MBM\incoming\` on the
server. `install-release.ps1` takes the newest `mbm-*.zip` there.

**Over SSH** (from the workstation, PowerShell; the dev server shown, the
others take their own address and key from the table):

```powershell
$r   = 'mbm-20261123-1413-bdfa2c68'          # the release's name
$srv = 'mbm-ai@100.112.102.94'
$ssh = @('-i', "$HOME\.ssh\mbm_test_ed25519", '-o', 'IdentitiesOnly=yes',
         '-o', "UserKnownHostsFile=$HOME\.ssh\known_hosts_mbm", '-o', 'StrictHostKeyChecking=yes')
scp @ssh "releases\$r.zip" "releases\$r.sha256" "${srv}:C:/MBM/incoming/"
```

A LAN or a good line takes a few minutes. **Production's line is slow**
(about 150 KB/s: some 75 minutes for 650 MB); start the copy well before the
install, and leave it alone.

**By hand** works just as well: remote desktop (HelpWire) file transfer, a
shared folder or a USB stick, into `C:\MBM\incoming\`.

A copy that stopped half-way (or was cut by a restart) can leave the partial
zip locked: restart the server, delete it, copy again. A damaged copy is never
installed: the SHA-256 check stops it.

## 5. Install

On the server, in Terminal (Admin):

```powershell
powershell -ExecutionPolicy Bypass -File C:\MBM\setup\install-release.ps1
```

Or from the workstation, over SSH (it asks nothing, so it runs the same way):

```powershell
ssh @ssh $srv "powershell -NoProfile -ExecutionPolicy Bypass -File C:\MBM\setup\install-release.ps1"
```

What it does, in order, stopping at the first problem:
1. checks the SHA-256 and that the server's Node matches the release;
2. checks `.env.local` with the new release's checker;
3. **backs up the database** (`C:\MBM\backups`), and stops if that fails;
4. stops the service, keeps the running release in `C:\MBM\previous\`, puts
   the new one in `C:\MBM\app`, and moves the server's own files into it
   (`.env.local`, `certs`, `data`, uploads, exports, logs, backups);
5. applies the new migrations (`migrate deploy`);
6. starts the service and checks that **the running server answers with the
   new version** (it seeds reference data as it starts: up to a few minutes).

MBM is down from step 4 to step 6: a few minutes. **Production**: install at
a quiet time in Zimbabwe (UTC+2), and tell the shops first.

## 6. Check

1. The script's last line: `the server answers 1.0.0+<date>.<commit>`.
   Any time later: `https://<server>:8080/api/health` shows `release.version`,
   or `C:\MBM\setup\00-status.ps1` says "Nothing to do".
2. Sign in at the tailnet name, and by IP if the shops use it.
3. What the change was about, then the everyday things: a sale, a receipt
   print.
4. Errors: `C:\MBM\app\windows-service\daemon\multibusinesssyncservice.err.log`.
5. **Tills**, when the POS app version changed (`electron.version` in the
   `.json`): the sign-in screen shows "update available"; or on each till,
   as administrator:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\install-pos.ps1 -Server https://<server>:8080
   ```
6. Add a row to "Releases installed" in `new-mbm-server.md`.

Then the next environment: dev server → production, with the same zip.

## 7. Something wrong: roll back

```powershell
powershell -ExecutionPolicy Bypass -File C:\MBM\setup\rollback-release.ps1
```

It puts the previous release back (the newest in `C:\MBM\previous`; the last
3 are kept). The database keeps the newer migrations: they only add, so the
previous release normally runs on them. If it does not, the backup made just
before the install (`C:\MBM\backups`) goes back into an empty database with
`restore.ps1`. Then fix it in the code and build a new release; never edit a
server's code or database by hand.

## 8. Tidy up

`C:\MBM\incoming` keeps every zip copied there (~650 MB each). Once the new
release has run for a while, delete the older zips there. The workstation's
`releases\` can be thinned the same way; keep the one each server runs.
