#Requires -RunAsAdministrator
<#
  MBM: install a release. The same script on every server, run by you or, at
  your word, by the AI over SSH. It ASKS NOTHING, so it runs the same both ways.

  Copy the release to C:\MBM\incoming\ (mbm-<date>-<commit>.zip and its .sha256,
  from `npm run release`). Then:
    powershell -ExecutionPolicy Bypass -File C:\MBM\setup\install-release.ps1 [-Zip <file>]

  1. checks the zip's SHA-256 and that this server's Node matches the release;
  2. says which release is installed now and which one this is;
  3. checks the settings (.env.local) with the NEW release's checker;
  4. backs up the database first (backup-now.ps1), and stops if that fails;
  5. stops the service, keeps the running release in C:\MBM\previous\, puts the
     new one in C:\MBM\app and moves this server's own files into it
     (.env.local, certs, data, backups, logs, uploads, the service's files);
  6. applies the new migrations (prisma migrate deploy, never db push);
  7. starts the service and asks the RUNNING server which release answers,
     restarting once if it's the old one;
  8. keeps the last 3 previous releases.
  Something wrong after step 5: rollback-release.ps1 puts the previous one back.
#>
param(
  [string]$Zip = '',
  [string]$Root = 'C:\MBM',
  [string]$Service = 'multibusinesssyncservice.exe',
  [switch]$NoStart
)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$App = Join-Path $Root 'app'
$Prev = Join-Path $Root 'previous'
$Stage = Join-Path $Root 'staging'
# This server's own files, moved from release to release (never in a release)
$Keep = @('.env.local', 'certs', 'data', 'config\service-config.json', 'backups', 'logs', 'public\uploads', 'public\exports', 'windows-service\daemon')

function Step($t) { Write-Host ""; Write-Host "== $t" -ForegroundColor Cyan }
function Ok($t) { Write-Host "  OK    $t" -ForegroundColor Green }
function Warn($t) { Write-Host "  WARN  $t" -ForegroundColor Yellow }
function Halt($t) { Write-Host ""; Write-Host "  STOP  $t" -ForegroundColor Red; exit 1 }
function EnvValue($file, $name) {
  $m = Select-String -Path $file -Pattern "^\s*$name\s*=\s*(.*)$" | Select-Object -Last 1
  if ($m) { $m.Matches[0].Groups[1].Value.Trim().Trim('"').Trim("'") } else { $null }
}
function Move-Kept($from, $to) {
  foreach ($k in $Keep) {
    $src = Join-Path $from $k
    if (-not (Test-Path $src)) { continue }
    $dst = Join-Path $to $k
    if (Test-Path $dst) { Remove-Item $dst -Recurse -Force }
    $parent = Split-Path $dst -Parent
    if (-not (Test-Path $parent)) { New-Item -ItemType Directory $parent -Force | Out-Null }
    Move-Item $src $dst
  }
}
function Health($envFile) {
  $port = EnvValue $envFile 'PORT'; if (-not $port) { $port = '8080' }
  foreach ($scheme in 'https', 'http') {
    $j = (& curl.exe -sk --max-time 5 "${scheme}://127.0.0.1:$port/api/health") 2>$null
    if ($j) { try { return ($j | ConvertFrom-Json) } catch {} }
  }
  return $null
}
function Running-Release($envFile, $seconds) {
  $deadline = (Get-Date).AddSeconds($seconds)
  do {
    $h = Health $envFile
    if ($h -and $h.release) { return $h.release.version }
    Start-Sleep 5
  } while ((Get-Date) -lt $deadline)
  return $null
}

Write-Host ("MBM release install on " + $env:COMPUTERNAME + ", " + (Get-Date -Format 'yyyy-MM-dd HH:mm'))

Step "1. The release"
if (-not $Zip) {
  $Zip = (Get-ChildItem (Join-Path $Root 'incoming') -Filter 'mbm-*.zip' -ErrorAction SilentlyContinue | Sort-Object Name -Descending | Select-Object -First 1).FullName
  if (-not $Zip) { Halt "no mbm-*.zip in $Root\incoming: copy the release there first." }
}
$sumFile = [IO.Path]::ChangeExtension($Zip, 'sha256')
if (-not (Test-Path $sumFile)) { Halt "$sumFile is missing: copy the release with its SHA-256." }
$want = ((Get-Content -Raw $sumFile).Trim() -split '\s+')[0].ToLower()
$got = (Get-FileHash $Zip -Algorithm SHA256).Hash.ToLower()
if ($got -ne $want) { Halt "SHA-256 differs: $got, expected $want. Do not install it; copy it again." }
Ok ("SHA-256 " + $got)
if (Test-Path $Stage) { Remove-Item $Stage -Recurse -Force }
New-Item -ItemType Directory $Stage | Out-Null
& "$env:SystemRoot\System32\tar.exe" -x -f $Zip -C $Stage
if ($LASTEXITCODE -ne 0) { Halt "could not unpack $Zip" }
$relFile = Join-Path $Stage 'release.json'
if (-not (Test-Path $relFile)) { Halt "the zip has no release.json: not a release from npm run release." }
$new = Get-Content -Raw $relFile | ConvertFrom-Json
Ok ("this release: " + $new.version + " (" + $new.migrations.count + " migrations, built " + $new.builtAt + ")")
$nodeHere = (& node -v)
if ($nodeHere.Split('.')[0] -ne $new.node.Split('.')[0]) { Halt "this server has Node $nodeHere; the release was built with $($new.node). Install Node $($new.node.Split('.')[0].TrimStart('v')) first (03-prerequisites.ps1)." }
Ok "Node $nodeHere"

Step "2. Installed now"
$old = $null
if (Test-Path (Join-Path $App 'release.json')) { $old = Get-Content -Raw (Join-Path $App 'release.json') | ConvertFrom-Json; Ok ("installed: " + $old.version) }
elseif (Test-Path (Join-Path $App '.git')) { Warn "$App is a git checkout (the old way): it is kept in $Prev, and its own files move to the release" }
elseif (Test-Path $App) { Ok "no release yet (first install): settings only" }
else { Halt "$App does not exist: run 04-configure.ps1 first (it writes the settings)." }
if ($old -and $old.version -eq $new.version) { Warn "the same release is installed already: installing it again" }

Step "3. Settings"
$envFile = Join-Path $App '.env.local'
if (-not (Test-Path $envFile)) { Halt "$envFile is missing: run 04-configure.ps1." }
& node (Join-Path $Stage 'scripts\check-env.js') --file $envFile --server
if ($LASTEXITCODE -ne 0) { Halt "fix the settings above (04-configure.ps1), then run this again. Nothing was changed." }
$env:DATABASE_URL = EnvValue $envFile 'DATABASE_URL'

Step "4. Backup first"
$backup = Join-Path $PSScriptRoot 'backup-now.ps1'
& powershell -NoProfile -ExecutionPolicy Bypass -File $backup -Root $Root -Quiet
if ($LASTEXITCODE -eq 2) { Ok "the database is empty: nothing to back up" }
elseif ($LASTEXITCODE -ne 0) { Halt "the backup failed: nothing was changed." }

Step "5. Switch"
$svc = Get-CimInstance Win32_Service -Filter "Name='$Service'" -ErrorAction SilentlyContinue
if ($svc -and $svc.State -ne 'Stopped') {
  Stop-Service $Service -Force
  $deadline = (Get-Date).AddSeconds(90)
  while ((Get-Service $Service).Status -ne 'Stopped' -and (Get-Date) -lt $deadline) { Start-Sleep 2 }
  if ((Get-Service $Service).Status -ne 'Stopped') { Halt "the service didn't stop within 90 s. Nothing was changed." }
  Ok "service stopped"
}
# Node processes still running from the app folder hold its files
Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -and $_.CommandLine -like "*$App*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep 2
if (-not (Test-Path $Prev)) { New-Item -ItemType Directory $Prev | Out-Null }
$oldName = if ($old) { $old.name } elseif (Test-Path (Join-Path $App '.git')) { 'git-checkout' } else { 'settings' }
$keptAt = Join-Path $Prev ($oldName + '-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
try {
  Move-Item $App $keptAt
} catch { Halt "could not move $App aside (a program still has files open there: $($_.Exception.Message)). Nothing was changed; start the service again." }
try {
  Move-Item $Stage $App
  Move-Kept $keptAt $App
} catch {
  Warn "the switch failed ($($_.Exception.Message)): putting the previous release back"
  if (Test-Path $App) { Move-Kept $App $keptAt; Remove-Item $App -Recurse -Force }
  Move-Item $keptAt $App
  if ($svc) { Start-Service $Service }
  Halt "the previous release is back and running. Send the lines above to the AI."
}
Set-Content -Path (Join-Path $keptAt 'KEPT.txt') -Value "Replaced by $($new.name) on $(Get-Date -Format 'yyyy-MM-dd HH:mm'). Its own files moved to $App." -Encoding ascii
Ok "installed in $App; the previous one is in $keptAt"

Step "6. Migrations"
Push-Location $App
try {
  & node node_modules\prisma\build\index.js migrate deploy
  $migExit = $LASTEXITCODE
} finally { Pop-Location }
if ($migExit -ne 0) {
  Halt "the migrations failed (above). The database may be part-way: rollback-release.ps1 puts the previous release back; restore the backup from step 4 only if the AI says so."
}
Ok "migrations applied"

Step "7. Start"
if ($NoStart -or -not $svc) {
  if (-not $svc) { Warn "the MBM service is not installed yet: 05-install.ps1 installs it" }
  else { Warn "not started (-NoStart)" }
} else {
  Start-Service $Service
  Ok "service starting (it seeds reference data and checks the build: up to a few minutes)"
  $want = $new.version
  $running = Running-Release $envFile 300
  if ($running -ne $want) {
    Warn ("the server answers " + $(if ($running) { $running } else { "nothing" }) + ", not " + $want + ": restarting the service once")
    Restart-Service $Service -Force
    $running = Running-Release $envFile 300
    if ($running -ne $want) { Halt ("the server answers " + $(if ($running) { $running } else { "nothing" }) + ", not " + $want + ". Logs: $App\windows-service\daemon\*.log. rollback-release.ps1 puts the previous release back.") }
  }
  Ok "the server answers $running"
}

Step "8. Clean-up"
$all = Get-ChildItem $Prev -Directory | Sort-Object LastWriteTime -Descending
$all | Select-Object -Skip 3 | ForEach-Object { Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue; Ok ("removed old " + $_.Name) }
Ok ("previous releases kept: " + (($all | Select-Object -First 3).Name -join ', '))

Write-Host ""
Write-Host ("Done: " + $(if ($old) { $old.version } else { $oldName }) + "  ->  " + $new.version) -ForegroundColor Cyan
