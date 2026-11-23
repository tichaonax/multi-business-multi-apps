#Requires -RunAsAdministrator
<#
  MBM: put the previous release back (the newest in C:\MBM\previous). Asks
  nothing, like install-release.ps1, so you or the AI run it the same way.

    powershell -ExecutionPolicy Bypass -File C:\MBM\setup\rollback-release.ps1

  The release files only. The database keeps the newer release's migrations:
  they only add, so the previous release normally runs on them. If it does
  not, restore the backup install-release.ps1 made just before (C:\MBM\backups)
  into an empty database: the AI walks you through it.
#>
param([string]$Root = 'C:\MBM', [string]$Service = 'multibusinesssyncservice.exe')
$ErrorActionPreference = 'Stop'
$App = Join-Path $Root 'app'
$Prev = Join-Path $Root 'previous'
$Keep = @('.env.local', 'certs', 'data', 'config\service-config.json', 'backups', 'logs', 'public\uploads', 'public\exports', 'windows-service\daemon')

function Step($t) { Write-Host ""; Write-Host "== $t" -ForegroundColor Cyan }
function Ok($t) { Write-Host "  OK    $t" -ForegroundColor Green }
function Halt($t) { Write-Host ""; Write-Host "  STOP  $t" -ForegroundColor Red; exit 1 }
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

Step "What"
$back = Get-ChildItem $Prev -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -notlike '*-rolled-back-*' } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $back) { Halt "no previous release in $Prev" }
$now = if (Test-Path (Join-Path $App 'release.json')) { (Get-Content -Raw (Join-Path $App 'release.json') | ConvertFrom-Json).name } else { 'unknown' }
Ok "now: $now"
Ok ("back to: " + $back.Name)

Step "Switch"
$svc = Get-Service $Service -ErrorAction SilentlyContinue
if ($svc -and $svc.Status -ne 'Stopped') {
  Stop-Service $Service -Force
  $deadline = (Get-Date).AddSeconds(90)
  while ((Get-Service $Service).Status -ne 'Stopped' -and (Get-Date) -lt $deadline) { Start-Sleep 2 }
  Ok "service stopped"
}
Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -and $_.CommandLine -like "*$App*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep 2
$aside = Join-Path $Prev ($now + '-rolled-back-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
Move-Item $App $aside
Move-Item $back.FullName $App
Move-Kept $aside $App
Remove-Item (Join-Path $App 'KEPT.txt') -ErrorAction SilentlyContinue
Ok "$($back.Name) is in $App; $now is kept in $aside"

Step "Start"
if ($svc) {
  Start-Service $Service
  Ok "service starting"
  if (Test-Path (Join-Path $App 'release.json')) {
    $want = (Get-Content -Raw (Join-Path $App 'release.json') | ConvertFrom-Json).version
    $port = (Select-String -Path (Join-Path $App '.env.local') -Pattern '^\s*PORT\s*=\s*"?(\d+)' | Select-Object -First 1)
    $port = if ($port) { $port.Matches[0].Groups[1].Value } else { '8080' }
    $deadline = (Get-Date).AddSeconds(300); $running = $null
    do {
      foreach ($scheme in 'https', 'http') {
        $j = (& curl.exe -sk --max-time 5 "${scheme}://127.0.0.1:$port/api/health") 2>$null
        if ($j) { try { $running = ($j | ConvertFrom-Json).release.version; break } catch {} }
      }
      if ($running) { break }; Start-Sleep 5
    } while ((Get-Date) -lt $deadline)
    if ($running -eq $want) { Ok "the server answers $running" } else { Halt ("the server answers " + $(if ($running) { $running } else { "nothing" }) + ", not $want") }
  }
}
Write-Host ""
Write-Host "Rolled back: $now  ->  $($back.Name)" -ForegroundColor Cyan
