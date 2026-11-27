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

  The installer also sets up the "MBM POS Updater" task for this server
  (MBM-352): from then on the POS app's "Update now" installs new versions
  without a Windows prompt, for any user. The POS app carries the R710
  agent, so this updates the agent too.

  Before deploying a server with MBM-352, run this once on every till on POS
  app 1.0.37 or older: those can't update themselves and would be blocked.

  -StartAtLogin: also start the POS app whenever anyone signs in to this
  machine (a shortcut in the all-users Startup folder). For a server whose
  screen is used as a till (e.g. prod; not MBM-SRV1). It also skips starting
  the app straight after installing: run over SSH, that would start a hidden
  copy no one can see. Sign in (or double-click the shortcut) to start it.

  -Insecure: the till doesn't trust the server's certificate yet (install
  it with npm run cert:install instead when you can). The SHA-256 is still
  checked.
#>
param([Parameter(Mandatory)][string]$Server, [switch]$Insecure, [switch]$Force, [switch]$StartAtLogin)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$Server = $Server.TrimEnd('/')
[string[]]$curlTls = @(); if ($Insecure) { $curlTls = @('-k') }

function Step($t) { Write-Host ""; Write-Host "== $t" -ForegroundColor Cyan }
function Ok($t) { Write-Host "  OK    $t" -ForegroundColor Green }
function Halt($t) { Write-Host ""; Write-Host "  STOP  $t" -ForegroundColor Red; exit 1 }
function Installed-Version {
  $keys = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*', 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*'
  $k = Get-ItemProperty $keys -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -like 'Multi-Business POS*' } | Select-Object -First 1
  if ($k) { $k.DisplayVersion } else { $null }
}
function Set-StartAtLogin {
  if (-not $StartAtLogin) { return }
  $exe = Join-Path $env:ProgramFiles 'Multi-Business POS\Multi-Business POS.exe'
  if (-not (Test-Path $exe)) { Halt "no $exe to start at sign-in" }
  $lnk = Join-Path $env:ProgramData 'Microsoft\Windows\Start Menu\Programs\StartUp\Multi-Business POS.lnk'
  $sc = (New-Object -ComObject WScript.Shell).CreateShortcut($lnk)
  $sc.TargetPath = $exe
  $sc.WorkingDirectory = Split-Path $exe
  $sc.Save()
  Ok "starts at every sign-in ($lnk)"
}

Step "What the server has"
$j = & curl.exe -sS --fail @curlTls --max-time 15 "$Server/api/public/electron/download?info=1"
if ($LASTEXITCODE -ne 0) { Halt "could not reach $Server (wrong address, server down, or its certificate isn't trusted here: try -Insecure)" }
$info = ($j | ConvertFrom-Json).data
if (-not $info.sha256) { Halt "the server's release carries no POS app installer (older than MBM-341?)" }
Ok ("server: POS app " + $info.version)
$before = Installed-Version
Ok ("this till: " + $(if ($before) { $before } else { "not installed" }))
if ($before -eq $info.version -and -not $Force) { Set-StartAtLogin; Write-Host ""; Write-Host "Nothing to do." -ForegroundColor Cyan; exit 0 }

Step "Download"
$file = Join-Path $env:TEMP $info.file
& curl.exe -sS --fail @curlTls --max-time 600 -o $file "$Server/api/public/electron/download"
if ($LASTEXITCODE -ne 0) { Halt "download failed" }
$hash = (Get-FileHash $file -Algorithm SHA256).Hash.ToLower()
if ($hash -ne $info.sha256.ToLower()) { Remove-Item $file -Force; Halt "SHA-256 doesn't match what the server says: not installed" }
Ok ("$($info.file), SHA-256 checked")

Step "Install"
$installArgs = if ($StartAtLogin) { @('/S') } else { @('/S', '--force-run') }
# MBM-352: the installer also sets up the "MBM POS Updater" task for this
# server, so the till can update itself from the POS app afterwards (no admin)
$installArgs += "--mbm-server=$Server"
$p = Start-Process $file -ArgumentList $installArgs -Wait -PassThru
Remove-Item $file -Force -ErrorAction SilentlyContinue
if ($p.ExitCode -ne 0) { Halt "the installer exited with $($p.ExitCode)" }
$after = Installed-Version
if ($after -ne $info.version) { Halt "installed version is $after, not $($info.version)" }
Ok "installed"
Set-StartAtLogin

Write-Host ""
Write-Host ("POS app: " + $(if ($before) { $before } else { "none" }) + "  ->  $after") -ForegroundColor Cyan
