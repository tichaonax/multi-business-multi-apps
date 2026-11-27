#Requires -RunAsAdministrator
<#
  MBM till: printing with QZ Tray, and trust in the MBM server: without the
  USB stick, Site Manager clicks or setup-ssl.bat. Asks nothing, so you or
  the AI run it the same way; safe to run again (does nothing when done).

    powershell -ExecutionPolicy Bypass -File .\setup-printing.ps1 -Server https://MBM-SRV1.tail1234.ts.net:8080
    powershell -ExecutionPolicy Bypass -File .\setup-printing.ps1 -Server https://192.168.8.109:8080

  1. The server: when the till opens MBM by IP, it trusts the server's root
     certificate (from /api/public/root-ca; its SHA-1 is shown to compare
     with 00-status.ps1 on the server). By the tailnet name: nothing to do,
     its certificate is trusted everywhere.
  2. QZ Tray: installed? (QZ 2.2 brings its own Java.)
  3. MBM's QZ signing certificate (from /api/qz/certificate) as QZ's
     override.crt: QZ then prints for MBM with no Allow/Deny popup, from
     either address (QZ trusts the certificate, not the address).
  4. Restarts QZ when its certificate changed.
#>
param([Parameter(Mandatory)][string]$Server)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$Server = $Server.TrimEnd('/')
$QzDir = Join-Path $env:ProgramFiles 'QZ Tray'
$Override = Join-Path $QzDir 'override.crt'

function Step($t) { Write-Host ""; Write-Host "== $t" -ForegroundColor Cyan }
function Ok($t) { Write-Host "  OK    $t" -ForegroundColor Green }
function Todo($t) { Write-Host "  TODO  $t" -ForegroundColor Yellow }
function Halt($t) { Write-Host ""; Write-Host "  STOP  $t" -ForegroundColor Red; exit 1 }
function Read-Pem($text) {
  $b64 = ($text -replace '-----[^-]+-----', '') -replace '\s', ''
  New-Object System.Security.Cryptography.X509Certificates.X509Certificate2(, [Convert]::FromBase64String($b64))
}
# curl.exe uses Windows' certificate store: what it trusts, Chrome and Edge trust
function Get-Text($url, [switch]$AnyCert) {
  [string[]]$tls = @(); if ($AnyCert) { $tls = @('-k') }
  $ErrorActionPreference = 'Continue'   # curl's errors are an answer here, not a stop
  # --ssl-no-revoke: a private root (mkcert) has no revocation list, and
  # Windows' curl fails without one; Chrome and Edge don't ask for it
  $out = & curl.exe -s --fail --ssl-no-revoke @tls --max-time 20 $url 2>$null
  if ($LASTEXITCODE -ne 0) { return $null }
  ($out | Out-String)
}

$hostName = ([Uri]$Server).Host
$byName = $hostName -like '*.ts.net'

Step "1. Trust in the MBM server ($hostName)"
if ($null -ne (Get-Text "$Server/api/health")) {
  Ok "this till trusts $Server already$(if ($byName) { ' (the tailnet name: trusted everywhere)' })"
} elseif ($byName) {
  Halt "$Server doesn't answer, or its certificate isn't trusted: is this till on the tailnet, and has the server run 06-tailscale-certificate.ps1?"
} else {
  $pem = Get-Text "$Server/api/public/root-ca" -AnyCert
  if (-not $pem) { Halt "$Server doesn't answer (or has no certs\rootCA.pem to give): check the address, or open MBM by its tailnet name instead." }
  $ca = Read-Pem $pem
  if (-not ($ca.Extensions | Where-Object { $_ -is [System.Security.Cryptography.X509Certificates.X509BasicConstraintsExtension] -and $_.CertificateAuthority })) { Halt "what the server gave isn't a root certificate. Nothing was changed." }
  Write-Host "  root certificate: $($ca.Subject)"
  Write-Host "  SHA-1 $($ca.Thumbprint): the same as on the server (00-status.ps1)"
  $store = New-Object System.Security.Cryptography.X509Certificates.X509Store('Root', 'LocalMachine')
  $store.Open('ReadWrite'); $store.Add($ca); $store.Close()
  if ($null -ne (Get-Text "$Server/api/health")) { Ok "trusted for every user of this till (restart Chrome/Edge)" }
  else { Halt "the root certificate is installed, but $Server still isn't trusted: its certificate may not cover $hostName (server: npm run cert:generate -- --add $hostName)." }
}

Step "2. QZ Tray"
if (-not (Test-Path (Join-Path $QzDir 'qz-tray.exe'))) {
  Todo "QZ Tray isn't installed: get 2.2.6 from https://qz.io/download (it brings its own Java), then run this again"
  exit 1
}
Ok "installed in $QzDir"

Step "3. MBM's QZ signing certificate"
$pem = Get-Text "$Server/api/qz/certificate"
if (-not $pem -or $pem -notmatch 'BEGIN CERTIFICATE') { Halt "$Server has no QZ signing certificate (QZ_CERTIFICATE in its .env.local): printing would ask Allow/Deny on every till." }
$qz = Read-Pem $pem
Ok "$($qz.Subject), until $($qz.NotAfter.ToString('yyyy-MM-dd')), SHA-1 $($qz.Thumbprint)"
$changed = $true
if (Test-Path $Override) {
  try { $had = Read-Pem (Get-Content -Raw $Override) } catch { $had = $null }
  if ($had -and $had.Thumbprint -eq $qz.Thumbprint) { Ok "QZ trusts it already (override.crt)"; $changed = $false }
  else {
    $keep = "$Override.before-" + (Get-Date -Format 'yyyyMMdd-HHmmss')
    Copy-Item $Override $keep
    Write-Host "  QZ trusted another certificate$(if ($had) { " ($($had.Subject))" }): kept as $keep"
  }
}
if ($changed) {
  [IO.File]::WriteAllText($Override, ($pem.Trim() + "`n"))
  Ok "QZ now trusts MBM's certificate (override.crt): no Allow/Deny popup"
}

Step "4. QZ running"
$running = Get-Process javaw, java -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "$QzDir*" }
if ($changed -and $running) { $running | Stop-Process -Force; Start-Sleep 2; $running = $null; Write-Host "  stopped QZ to load the certificate" }
if (-not $running) {
  $console = (Get-CimInstance Win32_ComputerSystem).UserName
  if ($console) {
    # Through Explorer: QZ runs as the signed-in user, not as administrator
    Start-Process explorer.exe "`"$(Join-Path $QzDir 'qz-tray.exe')`""
    $deadline = (Get-Date).AddSeconds(30)
    do { Start-Sleep 2; $running = Get-Process javaw, java -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "$QzDir*" } } while (-not $running -and (Get-Date) -lt $deadline)
  }
  if ($running) { Ok "QZ Tray started" } else { Todo "QZ Tray isn't running: it starts at the next sign-in (or start it from the Start menu)" }
} else { Ok "QZ Tray running" }

Write-Host ""
Write-Host "Printing is set up for $Server. Test: Admin > Printers > Test print." -ForegroundColor Cyan
