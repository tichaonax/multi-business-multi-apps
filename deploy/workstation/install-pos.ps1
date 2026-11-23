#Requires -RunAsAdministrator
<#
  MBM till: install or update the POS app (Electron) from the MBM server.
  Asks nothing, so you or the AI run it the same way.

    powershell -ExecutionPolicy Bypass -File .\install-pos.ps1 -Server https://MBM-SRV1:8080

  1. Asks the server which POS app its release carries (and its SHA-256).
  2. Leaves alone a till that already has it.
  3. Downloads it, checks the SHA-256, installs silently (the installer
     closes the running app first and starts the new one).
  4. Says old -> new version.

  -Insecure: the till doesn't trust the server's certificate yet (install
  it with npm run cert:install instead when you can). The SHA-256 is still
  checked.
#>
param([Parameter(Mandatory)][string]$Server, [switch]$Insecure, [switch]$Force)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$Server = $Server.TrimEnd('/')
$curlTls = if ($Insecure) { @('-k') } else { @() }

function Step($t) { Write-Host ""; Write-Host "== $t" -ForegroundColor Cyan }
function Ok($t) { Write-Host "  OK    $t" -ForegroundColor Green }
function Halt($t) { Write-Host ""; Write-Host "  STOP  $t" -ForegroundColor Red; exit 1 }
function Installed-Version {
  $keys = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*', 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*'
  $k = Get-ItemProperty $keys -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -like 'Multi-Business POS*' } | Select-Object -First 1
  if ($k) { $k.DisplayVersion } else { $null }
}

Step "What the server has"
$j = & curl.exe -sS --fail @curlTls --max-time 15 "$Server/api/public/electron/download?info=1"
if ($LASTEXITCODE -ne 0) { Halt "could not reach $Server (wrong address, server down, or its certificate isn't trusted here: try -Insecure)" }
$info = ($j | ConvertFrom-Json).data
if (-not $info.sha256) { Halt "the server's release carries no POS app installer (older than MBM-341?)" }
Ok ("server: POS app " + $info.version)
$before = Installed-Version
Ok ("this till: " + $(if ($before) { $before } else { "not installed" }))
if ($before -eq $info.version -and -not $Force) { Write-Host ""; Write-Host "Nothing to do." -ForegroundColor Cyan; exit 0 }

Step "Download"
$file = Join-Path $env:TEMP $info.file
& curl.exe -sS --fail @curlTls --max-time 600 -o $file "$Server/api/public/electron/download"
if ($LASTEXITCODE -ne 0) { Halt "download failed" }
$hash = (Get-FileHash $file -Algorithm SHA256).Hash.ToLower()
if ($hash -ne $info.sha256.ToLower()) { Remove-Item $file -Force; Halt "SHA-256 doesn't match what the server says: not installed" }
Ok ("$($info.file), SHA-256 checked")

Step "Install"
$p = Start-Process $file -ArgumentList '/S', '--force-run' -Wait -PassThru
Remove-Item $file -Force -ErrorAction SilentlyContinue
if ($p.ExitCode -ne 0) { Halt "the installer exited with $($p.ExitCode)" }
$after = Installed-Version
if ($after -ne $info.version) { Halt "installed version is $after, not $($info.version)" }
Ok "installed"

Write-Host ""
Write-Host ("POS app: " + $(if ($before) { $before } else { "none" }) + "  ->  $after") -ForegroundColor Cyan
