#Requires -RunAsAdministrator
<#
  MBM: remove the old git checkout once a server runs releases from C:\MBM\app
  (runbook section 9, the last step). Servers no longer use git: the checkout
  (node_modules, the build, git history: several GB) is only taking space.

    powershell -ExecutionPolicy Bypass -File C:\MBM\setup\remove-old-checkout.ps1 -Checkout C:\Users\user\apps\multi-business-multi-apps

  Refuses unless:
    - the MBM service runs C:\MBM\app and answers with that release;
    - nothing runs from the checkout any more;
    - every file this server keeps (.env.local, certs\, data\,
      public\uploads\, public\exports\) is in C:\MBM\app as well.
  The checkout's in-app backups (backups\) are MOVED to
  C:\MBM\backups\from-checkout, not deleted. Asks y/n before removing (-Yes:
  the AI over SSH, at your word). Git itself is left installed: other things
  on the machine may use it (-RemoveGit takes it off with winget).
#>
param([Parameter(Mandatory = $true)][string]$Checkout, [string]$Root = 'C:\MBM',
      [string]$Service = 'multibusinesssyncservice.exe', [switch]$Yes, [switch]$RemoveGit)
$ErrorActionPreference = 'Stop'
$App = Join-Path $Root 'app'

function Step($t) { Write-Host ""; Write-Host "== $t" -ForegroundColor Cyan }
function Ok($t) { Write-Host "  OK    $t" -ForegroundColor Green }
function Todo($t) { Write-Host "  TODO  $t" -ForegroundColor Yellow }
function Halt($t) { Write-Host ""; Write-Host "  STOP  $t" -ForegroundColor Red; exit 1 }
function Ask($q) { if ($Yes) { Write-Host "$q [y/n]: y (-Yes)"; return $true }; (Read-Host "$q [y/n]") -match '^[yY]' }

Step "The checkout"
$Checkout = $Checkout.TrimEnd('\')
if (-not (Test-Path (Join-Path $Checkout '.git'))) { Halt "$Checkout is not a git checkout: nothing to do here." }
if ($Checkout -like "$Root*") { Halt "$Checkout is inside ${Root}: not removed." }
Ok $Checkout

Step "MBM runs the release, not the checkout"
$svc = Get-CimInstance Win32_Service -Filter "Name='$Service'" -ErrorAction SilentlyContinue
if (-not $svc -or $svc.PathName -notlike "*$App\*") { Halt ("the MBM service doesn't run ${App} (" + $(if ($svc) { $svc.PathName } else { 'no service' }) + "): 05-install.ps1 first.") }
$want = (Get-Content -Raw (Join-Path $App 'release.json') | ConvertFrom-Json).version
$running = $null
foreach ($scheme in 'https', 'http') {
  $j = (& curl.exe -sk --max-time 5 "${scheme}://127.0.0.1:8080/api/health") 2>$null
  if ($j) { try { $running = ($j | ConvertFrom-Json).release.version; break } catch {} }
}
if ($running -ne $want) { Halt "the server answers $(if ($running) { $running } else { 'nothing' }), not ${want}: not removing the way back." }
Ok "the service runs $App and answers $running"
$users = @(Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like "*$Checkout*" -or $_.ExecutablePath -like "$Checkout\*" })
if ($users.Count) { Halt ("still running from the checkout: " + (($users | ForEach-Object { $_.Name + ' ' + $_.ProcessId }) -join ', ')) }
Ok "nothing runs from the checkout"

Step "This server's files are in $App"
$missing = @()
foreach ($f in '.env.local') { if ((Test-Path (Join-Path $Checkout $f)) -and -not (Test-Path (Join-Path $App $f))) { $missing += $f } }
foreach ($d in 'certs', 'data', 'public\uploads', 'public\exports') {
  $src = Join-Path $Checkout $d
  if (-not (Test-Path $src)) { continue }
  foreach ($file in Get-ChildItem $src -Recurse -File) {
    $rel = $file.FullName.Substring($Checkout.Length + 1)
    if (-not (Test-Path (Join-Path $App $rel))) { $missing += $rel }
  }
}
if ($missing.Count) { Halt ("not in $App yet (" + $missing.Count + "): " + (($missing | Select-Object -First 10) -join ', ') + ". Copy them first (04-configure.ps1 -From copies these folders).") }
Ok ".env.local, certs, data, public\uploads, public\exports: all there"

Step "In-app backups"
$oldBackups = Join-Path $Checkout 'backups'
$keep = Join-Path $Root 'backups\from-checkout'
if ((Test-Path $oldBackups) -and (Get-ChildItem $oldBackups -Recurse -File -ErrorAction SilentlyContinue | Select-Object -First 1)) {
  $mb = [math]::Round(((Get-ChildItem $oldBackups -Recurse -File | Measure-Object Length -Sum).Sum) / 1MB)
  if (-not (Ask "Move the checkout's in-app backups ($mb MB) to ${keep}? (n: they are removed with the checkout)")) { Todo "they go with the checkout" }
  else {
    New-Item -ItemType Directory $keep -Force | Out-Null
    Get-ChildItem $oldBackups | Move-Item -Destination $keep -Force
    Ok "moved to $keep (delete them there when you no longer need them)"
  }
} else { Ok "none" }

Step "Remove"
$gb = [math]::Round(((Get-ChildItem $Checkout -Recurse -File -Force -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum) / 1GB, 1)
if (-not (Ask "Remove $Checkout ($gb GB)? There is no way back to the git setup after this (a release rollback still works)")) { Write-Host "Nothing was removed."; exit 0 }
# robocopy /MIR from an empty folder: copes with node_modules' long paths
$empty = Join-Path $env:TEMP ('empty-' + [guid]::NewGuid())
New-Item -ItemType Directory $empty | Out-Null
& robocopy.exe $empty $Checkout /MIR /NFL /NDL /NJH /NJS /NP /R:1 /W:1 | Out-Null
Remove-Item $empty -Force
Remove-Item $Checkout -Recurse -Force -ErrorAction SilentlyContinue
if (Test-Path $Checkout) { Todo "some files are still there (in use?): restart Windows, then run this again" } else { Ok "removed: $gb GB freed" }

if ($RemoveGit) {
  Step "Git"
  if (Get-Command winget -ErrorAction SilentlyContinue) { winget uninstall --id Git.Git -e --silent | Out-Host; Ok "Git removed (winget)" }
  else { Todo "remove Git in Settings > Apps" }
}

Write-Host ""
Write-Host "Done. $(if (-not $RemoveGit) { 'Git itself is still installed (other things may use it; -RemoveGit takes it off).' })" -ForegroundColor Cyan
