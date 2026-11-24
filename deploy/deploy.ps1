<#
  MBM-342: deploy a release from this workstation to a server, in one command.

    npm run deploy                                    # guided: pick a server, a branch
    .\deploy\deploy.ps1 -Target dev                   # the current branch to "dev"
    .\deploy\deploy.ps1 -Target prod -Branch main     # main to "prod"
    .\deploy\deploy.ps1 -Target prod -Release mbm-20261124-0930-abc12345   # a zip already built (tested on dev)
    .\deploy\deploy.ps1 -Status                       # every remembered server: what it runs
    .\deploy\deploy.ps1 -Target dev -Rollback         # put the previous release back

  Build (npm run release, or reuse the zip already built for that commit) ->
  check the server -> copy (as .part, renamed when complete, SHA-256 checked)
  -> install-release.ps1 over SSH (backup first, previous kept, migrations,
  start, version check) -> check from here -> on failure, rollback-release.ps1
  at once -> summary (with the POS app: do the tills need it?).

  Servers are remembered in %USERPROFILE%\.mbm\deploy-targets.json (names,
  addresses, key FILE names; no secrets) and suggested next time.
  A log of each run: releases\deploy-logs\.
  The server must run releases already (C:\MBM; docs/runbooks/new-mbm-server.md).
#>
param(
  [string]$Target = '',
  [string]$Branch = '',
  [string]$Release = '',
  [switch]$Rebuild,
  [switch]$Rollback,
  [switch]$Status,
  [switch]$Yes
)
$ErrorActionPreference = 'Continue'   # native programs' stderr must not stop the script; results are checked
$ProgressPreference = 'SilentlyContinue'
$Repo = Split-Path $PSScriptRoot -Parent
$Releases = Join-Path $Repo 'releases'
$TargetsFile = Join-Path $env:USERPROFILE '.mbm\deploy-targets.json'
$KnownHosts = Join-Path $env:USERPROFILE '.ssh\known_hosts_mbm'
$Started = Get-Date
$Phases = [ordered]@{}

function Step($t) { Write-Host ""; Write-Host "== $t" -ForegroundColor Cyan }
function Ok($t) { Write-Host "  OK    $t" -ForegroundColor Green }
function Warn($t) { Write-Host "  WARN  $t" -ForegroundColor Yellow }
function Info($t) { Write-Host "        $t" }
function Halt($t) { Write-Host ""; Write-Host "  STOP  $t" -ForegroundColor Red; Stop-Log; exit 1 }
function Ask($q) { if ($Yes) { Write-Host "$q [y/n]: y (-Yes)"; return $true }; (Read-Host "$q [y/n]") -match '^[yY]' }
function Took($since) { $s = (Get-Date) - $since; '{0}:{1:00}' -f [int][math]::Floor($s.TotalMinutes), $s.Seconds }
function Set-Prop($o, $n, $v) { $o | Add-Member -NotePropertyName $n -NotePropertyValue $v -Force }
$script:logging = $false
function Stop-Log { if ($script:logging) { try { Stop-Transcript | Out-Null } catch {}; $script:logging = $false } }

# ---------------------------------------------------------------- servers
function Load-Targets {
  if (-not (Test-Path $TargetsFile)) { return @() }
  try { return @((Get-Content -Raw $TargetsFile | ConvertFrom-Json).targets) } catch { Warn "can't read $TargetsFile"; return @() }
}
function Save-Targets($list) {
  New-Item -ItemType Directory (Split-Path $TargetsFile) -Force | Out-Null
  @{ targets = @($list) } | ConvertTo-Json -Depth 6 | Set-Content -Path $TargetsFile -Encoding UTF8
}
function SshArgs($t) {
  @('-i', $t.key, '-o', 'IdentitiesOnly=yes', '-o', "UserKnownHostsFile=$KnownHosts", '-o', 'StrictHostKeyChecking=yes',
    '-o', 'HostKeyAlgorithms=ssh-ed25519', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20', '-o', 'LogLevel=ERROR')
}
# PowerShell on the server, sent encoded (the server's SSH shell is cmd: no quoting trouble)
function Remote($t, $script) {
  $enc = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes("`$ProgressPreference='SilentlyContinue'`n" + $script))
  $out = & ssh.exe @(SshArgs $t) "$($t.user)@$($t.host)" "powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand $enc" 2>&1 | ForEach-Object { "$_" }
  return @{ code = $LASTEXITCODE; out = @($out) }
}
function RemoteJson($t, $script) {
  $r = Remote $t $script
  $line = $r.out | Where-Object { $_ -match '^\s*\{' } | Select-Object -Last 1
  if ($r.code -ne 0 -or -not $line) { return $null }
  try { return ($line | ConvertFrom-Json) } catch { return $null }
}
# Streams a server script's output, each line with the time since it started
function RemoteStream($t, $command) {
  $t0 = Get-Date
  $script:streamed = New-Object System.Collections.ArrayList
  & ssh.exe @(SshArgs $t) "$($t.user)@$($t.host)" $command 2>&1 | ForEach-Object {
    $l = "$_"
    [void]$script:streamed.Add([pscustomobject]@{ at = Get-Date; line = $l })
    if ($l.Trim()) { Write-Host ("  [" + (Took $t0) + "] " + $l) }
  }
  return $LASTEXITCODE
}
$Probe = @'
$r = @{}
$r.converted = Test-Path 'C:\MBM\setup\install-release.ps1'
$j = 'C:\MBM\app\release.json'
if (Test-Path $j) { $r.release = Get-Content -Raw $j | ConvertFrom-Json }
try { $r.node = (& node -v) } catch { $r.node = $null }
$r.freeGB = [math]::Round((Get-PSDrive C).Free / 1GB, 1)
$s = Get-Service multibusinesssyncservice.exe -ErrorAction SilentlyContinue
$r.service = if ($s) { [string]$s.Status } else { 'missing' }
$r.computer = $env:COMPUTERNAME
$r | ConvertTo-Json -Depth 6 -Compress
'@
function Probe($t) { RemoteJson $t $Probe }
function NodeMajor($v) { if ($v -match 'v?(\d+)\.') { [int]$Matches[1] } else { 0 } }

function Add-Target($list) {
  Write-Host ""
  Write-Host "A new server (it must run releases already, C:\MBM, with the AI's SSH set up: runbook steps 1-6)."
  $name = (Read-Host "Short name (e.g. dev, prod, srv1)").Trim()
  if (-not $name -or ($list | Where-Object { $_.name -eq $name })) { Halt "a new, unused name is needed." }
  $h = (Read-Host "Tailnet address (e.g. 100.112.102.94)").Trim()
  $keys = @(Get-ChildItem (Join-Path $env:USERPROFILE '.ssh') -Filter 'mbm_*_ed25519' -File -ErrorAction SilentlyContinue | ForEach-Object { $_.FullName })
  if ($keys.Count) { for ($i = 0; $i -lt $keys.Count; $i++) { Write-Host ("  [" + ($i + 1) + "] " + $keys[$i]) } }
  $k = (Read-Host "SSH key (number above, or a path)").Trim()
  if ($k -match '^\d+$' -and [int]$k -ge 1 -and [int]$k -le $keys.Count) { $k = $keys[[int]$k - 1] }
  if (-not (Test-Path $k)) { Halt "no key at $k." }
  $url = (Read-Host "MBM's address (e.g. https://mbm-dev1.tail2cac9d.ts.net:8080)").Trim().TrimEnd('/')
  $prod = (Read-Host "Is this production (people work on it)? [y/n]") -match '^[yY]'
  $t = [pscustomobject]@{ name = $name; host = $h; user = 'mbm-ai'; key = $k; url = $url; production = $prod; history = @() }
  Write-Host "  Checking SSH (the host key must already be in $KnownHosts)..."
  $p = Probe $t
  if (-not $p) { Halt "no answer over SSH from mbm-ai@$h with that key (or its host key isn't in known_hosts_mbm yet)." }
  Ok ("answers: " + $p.computer)
  $list = @($list) + $t; Save-Targets $list
  Ok "remembered as '$name'"
  return $t
}
function Pick-Target($list) {
  $sorted = @($list | Sort-Object { if ($_.lastAt) { $_.lastAt } else { '' } } -Descending)
  Write-Host ""
  Write-Host "Servers:"
  for ($i = 0; $i -lt $sorted.Count; $i++) {
    $s = $sorted[$i]
    $last = if ($s.lastRelease) { "last: $($s.lastRelease) ($($s.lastResult), $($s.lastAt))" } else { "never deployed from here" }
    Write-Host ("  [" + ($i + 1) + "] " + $s.name.PadRight(8) + " " + $s.host.PadRight(16) + $(if ($s.production) { " PRODUCTION " } else { " " }) + $last)
  }
  Write-Host "  [n] a new server"
  $a = (Read-Host ("Server" + $(if ($sorted.Count) { " [1]" } else { "" }))).Trim()
  if (-not $a -and $sorted.Count) { return $sorted[0] }
  if ($a -match '^[nN]$' -or -not $sorted.Count) { return Add-Target $list }
  if ($a -match '^\d+$' -and [int]$a -ge 1 -and [int]$a -le $sorted.Count) { return $sorted[[int]$a - 1] }
  $byName = $sorted | Where-Object { $_.name -eq $a } | Select-Object -First 1
  if ($byName) { return $byName }
  Halt "no server '$a'."
}
function Remember($list, $t, $releaseName, $result, $note) {
  $now = (Get-Date).ToString('yyyy-MM-dd HH:mm')
  foreach ($x in $list) {
    if ($x.name -ne $t.name) { continue }
    Set-Prop $x 'lastRelease' $releaseName; Set-Prop $x 'lastResult' $result; Set-Prop $x 'lastAt' $now
    $h = @($x.history) + [pscustomobject]@{ at = $now; release = $releaseName; result = $result; note = $note }
    Set-Prop $x 'history' @($h | Select-Object -Last 20)
  }
  Save-Targets $list
}

# ---------------------------------------------------------------- -Status
$targets = @(Load-Targets)
if ($Status) {
  if (-not $targets.Count) { Write-Host "No servers remembered yet: npm run deploy adds one."; exit 0 }
  Step "Servers"
  foreach ($t in $targets) {
    $p = Probe $t
    $run = if (-not $p) { 'no answer' } elseif ($p.release) { "$($p.release.name) (POS app $($p.release.electron.version)), service $($p.service), $($p.freeGB) GB free" } else { 'no release' }
    Write-Host ("  " + $t.name.PadRight(8) + $(if ($t.production) { " PRODUCTION" } else { "" }) + "  " + $run)
    if ($t.lastAt) { Info ("last from here: $($t.lastRelease), $($t.lastResult), $($t.lastAt)") }
  }
  exit 0
}

# ---------------------------------------------------------------- the server
$interactive = -not $Target
$t = if ($Target) { $targets | Where-Object { $_.name -eq $Target } | Select-Object -First 1 } else { Pick-Target $targets }
if (-not $t) {
  Write-Host "'$Target' isn't a remembered server."
  if (-not (Ask "Add it now?")) { exit 1 }
  $t = Add-Target $targets
}
$targets = @(Load-Targets)
New-Item -ItemType Directory (Join-Path $Releases 'deploy-logs') -Force | Out-Null
$log = Join-Path $Releases ("deploy-logs\" + (Get-Date).ToString('yyyyMMdd-HHmm') + "-" + $t.name + ".log")
try { Start-Transcript -Path $log | Out-Null; $script:logging = $true } catch {}

Step "The server: $($t.name) ($($t.user)@$($t.host))$(if ($t.production) { ', PRODUCTION' })"
$p0 = Get-Date
$before = Probe $t
if (-not $before) { Halt "no answer over SSH. Is the server on, on the tailnet? (tailscale status)" }
if (-not $before.converted) { Halt "$($before.computer) doesn't run releases yet (no C:\MBM\setup\install-release.ps1): convert it first (docs/runbooks/new-mbm-server.md section 9)." }
$oldName = if ($before.release) { $before.release.name } else { '(none)' }
$oldPos = if ($before.release -and $before.release.electron) { $before.release.electron.version } else { $null }
Ok "$($before.computer): runs $oldName, Node $($before.node), service $($before.service), $($before.freeGB) GB free"
$Phases['check'] = Took $p0

# ---------------------------------------------------------------- -Rollback
if ($Rollback) {
  if ($t.production) { if ((Read-Host "PRODUCTION: type the server's name ($($t.name)) to roll back") -ne $t.name) { Halt "not confirmed." } }
  elseif (-not (Ask "Put the previous release back on $($t.name)?")) { exit 1 }
  Step "Rolling back"
  $r0 = Get-Date
  $code = RemoteStream $t "powershell -NoProfile -ExecutionPolicy Bypass -File C:\MBM\setup\rollback-release.ps1"
  $after = Probe $t
  $nowName = if ($after -and $after.release) { $after.release.name } else { '?' }
  $result = if ($code -eq 0) { 'rolled back' } else { 'ROLLBACK FAILED' }
  Remember $targets $t $nowName $result "rollback from $oldName"
  Step "Summary"
  Info "server     $($t.name): $oldName -> $nowName"
  Info "result     $result (took $(Took $r0))"
  Info "log        $log"
  Stop-Log; exit $code
}

# ---------------------------------------------------------------- which release
Push-Location $Repo
try {
  $rel = $null; $relJson = $null; $branchShown = ''
  if (-not $Release -and -not $Branch -and $interactive) {
    # Production: suggest the release last deployed successfully to a test server
    if ($t.production) {
      $tested = $targets | Where-Object { -not $_.production -and $_.lastResult -eq 'ok' -and $_.lastRelease } | Sort-Object lastAt -Descending | Select-Object -First 1
      if ($tested -and (Test-Path (Join-Path $Releases "$($tested.lastRelease).zip"))) {
        if (Ask "Deploy the release tested on $($tested.name), $($tested.lastRelease)?") { $Release = $tested.lastRelease }
      }
    }
    if (-not $Release) {
      $cur = (& git rev-parse --abbrev-ref HEAD).Trim()
      $b = (Read-Host "Branch to build [$cur]").Trim()
      if ($b) { $Branch = $b }
    }
  }
  if ($Release) {
    $name = [IO.Path]::GetFileNameWithoutExtension($Release)
    $relJson = Join-Path $Releases "$name.json"
    if (-not (Test-Path $relJson) -or -not (Test-Path (Join-Path $Releases "$name.zip"))) { Halt "no releases\$name.zip with its .json here." }
    $branchShown = '(an existing release)'
  } else {
    if ($Branch) {
      & git fetch origin $Branch 2>&1 | Out-Null
      $ref = if (& git rev-parse --verify --quiet "refs/heads/$Branch") { $Branch } elseif (& git rev-parse --verify --quiet "refs/remotes/origin/$Branch") { "origin/$Branch" } else { $null }
      if (-not $ref) { Halt "no branch '$Branch' here or on origin." }
      $branchShown = $ref
    } else {
      $ref = 'HEAD'; $branchShown = (& git rev-parse --abbrev-ref HEAD).Trim()
      if (& git status --porcelain) { Warn "uncommitted changes are NOT in the release (it builds the last commit)" }
    }
    $commit = (& git rev-parse "$ref^{commit}").Trim()
    $short = $commit.Substring(0, 8)
    Info ("to build: $branchShown at $short " + (& git log -1 --format='"%s"' $commit))
    # The workstation builds node_modules for the server's Node
    $here = NodeMajor (& node -v); $there = NodeMajor $before.node
    if ($there -and $here -ne $there) { Halt "this workstation has Node $here, the server Node ${there}: a release must be built with the server's Node (nvm use $there)." }
    # The zip already built for this commit, unless -Rebuild
    if (-not $Rebuild) {
      $relJson = Get-ChildItem $Releases -Filter 'mbm-*.json' -File -ErrorAction SilentlyContinue | Sort-Object Name -Descending |
        Where-Object { (Get-Content -Raw $_.FullName | ConvertFrom-Json).commit -eq $commit -and (Test-Path ($_.FullName -replace '\.json$', '.zip')) } |
        Select-Object -First 1 -ExpandProperty FullName
      if ($relJson) { Ok ("already built: " + [IO.Path]::GetFileNameWithoutExtension($relJson) + " (-Rebuild builds it again)") }
    }
    if (-not $relJson) {
      Step "Building $branchShown ($short): npm run release"
      $b0 = Get-Date
      & cmd.exe /c "npm run release -- --ref $ref 2>&1" | ForEach-Object { Write-Host ("  [" + (Took $b0) + "] " + $_) }
      if ($LASTEXITCODE -ne 0) { Halt "the build stopped (above). Nothing was sent to the server." }
      $relJson = Get-ChildItem $Releases -Filter 'mbm-*.json' -File | Sort-Object LastWriteTime -Descending |
        Where-Object { (Get-Content -Raw $_.FullName | ConvertFrom-Json).commit -eq $commit } | Select-Object -First 1 -ExpandProperty FullName
      if (-not $relJson) { Halt "the build finished but no release for $short is in releases\." }
      $Phases['build'] = Took $b0
      Ok ("built " + [IO.Path]::GetFileNameWithoutExtension($relJson) + " in " + $Phases['build'])
    }
  }
} finally { Pop-Location }
$rel = Get-Content -Raw $relJson | ConvertFrom-Json
$name = $rel.name
if ($name -notmatch '^mbm-\d{8}-\d{4}-[0-9a-f]{8}$') { Halt "unexpected release name '$name'." }
$zip = Join-Path $Releases "$name.zip"; $sha = Join-Path $Releases "$name.sha256"
$zipMB = [math]::Round((Get-Item $zip).Length / 1MB)

# ---------------------------------------------------------------- what changes
Step "What changes on $($t.name)"
$newPos = if ($rel.electron) { $rel.electron.version } else { $null }
$migNew = if ($before.release -and $before.release.migrations) { $rel.migrations.count - $before.release.migrations.count } else { $null }
Info "release    $oldName -> $name"
Info ("migrations " + $(if ($null -eq $migNew) { "$($rel.migrations.count) in all" } elseif ($migNew -gt 0) { "$migNew new (last $($rel.migrations.last)): the database changes; a backup is made first" } else { "none new" }))
$posLine = if (-not $newPos) { "not in this release" } elseif ($oldPos -eq $newPos) { "unchanged ($newPos): the tills need nothing" } else { "$(if ($oldPos) { $oldPos } else { '?' }) -> ${newPos}: the TILLS NEED THE NEW POS APP after this" }
Info "POS app    $posLine"
# electron/ changed without a version bump: the tills would never be offered it
$posWarn = $null
if ($before.release -and $before.release.commit -and $oldPos -eq $newPos) {
  Push-Location $Repo
  & git cat-file -e "$($before.release.commit)^{commit}" 2>$null
  if ($LASTEXITCODE -eq 0) {
    $changed = @(& git diff --name-only $before.release.commit $rel.commit -- electron/ 2>$null)
    if ($changed.Count) { $posWarn = "electron/ changed ($($changed.Count) files) but its version wasn't bumped: the tills won't be offered it. Bump electron/package.json and build again." ; Warn $posWarn }
  }
  Pop-Location
}
if ($before.release -and $before.release.name -eq $name) { Warn "the server runs this release already: it is installed again" }
$hereNode = NodeMajor $rel.node; $thereNode = NodeMajor $before.node
if ($thereNode -and $hereNode -ne $thereNode) { Halt "the release was built with Node $hereNode, the server has Node ${thereNode}: install-release.ps1 would refuse it." }
$needGB = [math]::Ceiling($zipMB * 5 / 1024) + 1
if ($before.freeGB -lt $needGB) { Halt "the server has $($before.freeGB) GB free; about $needGB GB are needed. Delete old zips in C:\MBM\incoming first." }
if (-not $t.production) {
  if (-not (Ask "Deploy $name to $($t.name)?")) { Halt "not confirmed: nothing was sent." }
}
if ($t.production) {
  Write-Host ""
  Write-Host "  PRODUCTION: MBM stops for a few minutes during the install. Do it at a quiet time in Zimbabwe, and tell the shops." -ForegroundColor Yellow
  if ($Yes) { Halt "-Yes is not accepted for production: type the name." }
  if ((Read-Host "Type the server's name ($($t.name)) to deploy $name") -ne $t.name) { Halt "not confirmed: nothing was sent." }
}

# ---------------------------------------------------------------- copy
Step "Copying $name ($zipMB MB) to $($t.name)"
$c0 = Get-Date
$Finish = @'
$in = 'C:\MBM\incoming'; $n = '__NAME__'; $finish = __FINISH__
New-Item -ItemType Directory $in -Force | Out-Null
$p = "$in\$n.zip.part"; $z = "$in\$n.zip"; $r = @{ ok = $false; partLocked = $false }
if ($finish -and (Test-Path $p)) { if (Test-Path $z) { Remove-Item $z -Force }; Rename-Item $p "$n.zip" }
if (-not $finish -and (Test-Path $p)) { try { Remove-Item $p -Force -ErrorAction Stop } catch { $r.partLocked = $true } }
if ((Test-Path $z) -and (Test-Path "$in\$n.sha256")) {
  $want = ((Get-Content -Raw "$in\$n.sha256").Trim() -split '\s+')[0].ToLower()
  $r.ok = ((Get-FileHash $z -Algorithm SHA256).Hash.ToLower() -eq $want)
}
$r | ConvertTo-Json -Compress
'@
$pre = RemoteJson $t ($Finish.Replace('__NAME__', $name).Replace('__FINISH__', '$false'))
if (-not $pre) { Halt "couldn't check C:\MBM\incoming on the server." }
if ($pre.partLocked) { Halt "a copy cut half-way left $name.zip.part locked on the server: restart the server (or wait), then run this again." }
if ($pre.ok) { Ok "the server has it already (SHA-256 checked): not copied again" }
else {
  $dest = "$($t.user)@$($t.host):C:/MBM/incoming/"
  & scp.exe @(SshArgs $t) $sha $dest
  if ($LASTEXITCODE -ne 0) { Halt "copying the .sha256 failed." }
  & scp.exe @(SshArgs $t) $zip "$($dest)$name.zip.part"   # scp shows its own progress
  if ($LASTEXITCODE -ne 0) { Halt "the copy stopped. Run this again (a locked .part needs a server restart first)." }
  $fin = RemoteJson $t ($Finish.Replace('__NAME__', $name).Replace('__FINISH__', '$true'))
  if (-not $fin -or -not $fin.ok) { Halt "the copy on the server doesn't match the SHA-256: not installed. Run this again." }
  $secs = [math]::Max(1, ((Get-Date) - $c0).TotalSeconds)
  Ok ("copied and SHA-256 checked: " + (Took $c0) + ", " + [math]::Round($zipMB / $secs, 1) + " MB/s")
}
$Phases['copy'] = Took $c0

# ---------------------------------------------------------------- install
Step "Installing on $($t.name) (install-release.ps1: backup, switch, migrations, start)"
$i0 = Get-Date
$code = RemoteStream $t "powershell -NoProfile -ExecutionPolicy Bypass -File C:\MBM\setup\install-release.ps1 -Zip C:\MBM\incoming\$name.zip"
$installOut = @($script:streamed)
$Phases['install'] = Took $i0
$backup = $null
foreach ($o in $installOut) { if ($o.line -match 'OK\s+backup (\S.*)$') { $backup = $Matches[1] } }
# Downtime: from "5. Switch" (the service stops) to "the server answers"
$down = $null
$sw = $installOut | Where-Object { $_.line -match '== 5\. Switch' } | Select-Object -First 1
$up = $installOut | Where-Object { $_.line -match 'the server answers' } | Select-Object -Last 1
if ($sw -and $up) { $d = $up.at - $sw.at; $down = '{0}:{1:00}' -f [int][math]::Floor($d.TotalMinutes), $d.Seconds }
$after = Probe $t
$nowName = if ($after -and $after.release) { $after.release.name } else { $null }

# ---------------------------------------------------------------- check from here
$v0 = Get-Date
$answered = $null
if ($code -eq 0) {
  Step "Checking from this workstation: $($t.url)"
  $deadline = (Get-Date).AddSeconds(180)
  do {
    $j = & curl.exe -s --ssl-no-revoke --max-time 10 "$($t.url)/api/health" 2>$null
    if (-not $j) { $j = & curl.exe -sk --max-time 10 "$($t.url)/api/health" 2>$null }
    if ($j) { try { $answered = ($j | ConvertFrom-Json).release.version } catch {} }
    if ($answered -eq $rel.version) { break }; Start-Sleep 5
  } while ((Get-Date) -lt $deadline)
  if ($answered -eq $rel.version) { Ok "$($t.url) answers $answered" }
  else { Warn ("$($t.url) answers " + $(if ($answered) { $answered } else { 'nothing' }) + " from here (the server itself said the new version: a network or address problem, not the release)") }
}
$Phases['check after'] = Took $v0

# ---------------------------------------------------------------- roll back at once on failure
$result = 'ok'; $rolledBack = $false
if ($code -ne 0) {
  $result = 'FAILED'
  if ($nowName -and $nowName -ne $before.release.name -and $before.release) {
    Step "The install failed after the switch: rolling back at once"
    $rb0 = Get-Date
    $rbCode = RemoteStream $t "powershell -NoProfile -ExecutionPolicy Bypass -File C:\MBM\setup\rollback-release.ps1"
    $Phases['rollback'] = Took $rb0
    $after = Probe $t
    $nowName = if ($after -and $after.release) { $after.release.name } else { '?' }
    $rolledBack = ($rbCode -eq 0 -and $nowName -eq $before.release.name)
    $result = if ($rolledBack) { 'FAILED, rolled back' } else { 'FAILED, ROLLBACK FAILED' }
  } else {
    $result = 'FAILED before the switch (nothing changed)'
  }
}
Remember $targets $t $(if ($result -eq 'ok') { $name } else { $nowName }) $(if ($result -eq 'ok') { 'ok' } else { $result }) "deploy $name from $branchShown"

# ---------------------------------------------------------------- tidy
if ($result -eq 'ok') {
  $tidy = Remote $t ("Get-ChildItem C:\MBM\incoming -Filter 'mbm-*.zip' | Sort-Object Name -Descending | Where-Object { `$_.Name -ne '$name.zip' } | Select-Object -Skip 1 | ForEach-Object { Remove-Item `$_.FullName -Force -ErrorAction SilentlyContinue; Remove-Item (`$_.FullName -replace '\.zip$', '.sha256') -Force -ErrorAction SilentlyContinue; `$_.Name }")
  $gone = @($tidy.out | Where-Object { $_ -match '^mbm-' })
  if ($gone.Count) { Ok ("removed old zips on the server: " + ($gone -join ', ')) }
}

# ---------------------------------------------------------------- summary
Step "Summary"
$color = if ($result -eq 'ok') { 'Green' } else { 'Red' }
Write-Host ("  result      " + $result) -ForegroundColor $color
Info "server      $($t.name) ($($before.computer))$(if ($t.production) { ', PRODUCTION' })"
Info "built from  $branchShown, commit $($rel.commit.Substring(0, 8))"
Info "release     $oldName -> $(if ($nowName) { $nowName } else { '?' })"
Info "version     $(if ($after -and $after.release) { $after.release.version } else { '?' })$(if ($answered) { " (answers at $($t.url))" })"
Info ("migrations  " + $(if ($null -eq $migNew) { "$($rel.migrations.count) in all" } elseif ($migNew -gt 0) { "$migNew new" } else { "none new" }))
if ($backup) { Info "backup      $backup (C:\MBM\backups on the server)" }
if ($down) { Info "downtime    about $down (service stopped -> the new version answering)" }
Info ("time        " + (($Phases.GetEnumerator() | ForEach-Object { "$($_.Key) $($_.Value)" }) -join ', ') + "; all " + (Took $Started))
if ($result -eq 'ok') {
  if ($newPos -and $oldPos -ne $newPos) {
    Write-Host "  POS app     $(if ($oldPos) { $oldPos } else { '?' }) -> ${newPos}: UPDATE THE TILLS" -ForegroundColor Yellow
    Info "            on each till (as administrator): powershell -ExecutionPolicy Bypass -File .\install-pos.ps1 -Server $($t.url)"
    Info "            or the sign-in screen's 'update available' -> Download"
  } else { Info "POS app     $posLine" }
  if ($posWarn) { Write-Host "  WARN        $posWarn" -ForegroundColor Yellow }
  Info "undo        .\deploy\deploy.ps1 -Target $($t.name) -Rollback"
  if (-not $t.production) {
    $prodT = $targets | Where-Object { $_.production } | Select-Object -First 1
    if ($prodT) { Info "next        after testing: .\deploy\deploy.ps1 -Target $($prodT.name) -Release $name" }
  }
} else {
  Info "errors      C:\MBM\app\windows-service\daemon\multibusinesssyncservice.err.log on the server; the install's output above"
}
Info "log         $log"
Stop-Log
exit $(if ($result -eq 'ok') { 0 } else { 1 })
