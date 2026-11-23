#Requires -RunAsAdministrator
<#
  MBM server, step 1 (from a USB stick, or downloaded): the tailnet and the
  AI's SSH. Adapted from Farm Control's tools/newserver/01-tailscale-and-ssh.ps1.

    - Tailscale: installed, signed in, unattended (MBM reaches Farm Control
      over the tailnet);
    - Windows' OpenSSH Server, started at boot;
    - the local administrator mbm-ai, with ONLY the AI's public key
      (a key made for this server; the private half never leaves the laptop);
    - no password logins over SSH; port 22 from the tailnet only.

  The AI never sees a password. Run again at any time: done things are left alone.

  Put mbm-ai.pub (the AI's PUBLIC key, one line) next to this file. Then, in
  PowerShell as administrator:
    powershell -ExecutionPolicy Bypass -File .\01-tailscale-and-ssh.ps1
#>
# -RandomPassword: mbm-ai gets a random password nobody sees (run over SSH by
# the AI from another administrator account, where nobody can type one; the
# account only signs in with its key; an administrator can reset it)
param([string]$PublicKeyFile = (Join-Path $PSScriptRoot 'mbm-ai.pub'), [switch]$RandomPassword)
$ErrorActionPreference = 'Stop'

function Step($t) { Write-Host ""; Write-Host "== $t" -ForegroundColor Cyan }
function Ok($t) { Write-Host "  OK    $t" -ForegroundColor Green }
function Todo($t) { Write-Host "  TODO  $t" -ForegroundColor Yellow }
function Halt($t) { Write-Host ""; Write-Host "  STOP  $t" -ForegroundColor Red; exit 1 }

Step "The AI's public key"
if (-not (Test-Path $PublicKeyFile)) { Halt "mbm-ai.pub is not next to this script ($PublicKeyFile)." }
$key = (Get-Content -Raw $PublicKeyFile).Trim()
if ($key -notmatch '^ssh-ed25519 [A-Za-z0-9+/=]+ \S+$' -or ($key -split "`n").Count -ne 1) {
  Halt "mbm-ai.pub is not one public key line (ssh-ed25519 AAAA... comment). Never use a private key here."
}
Ok ("key " + ($key -split ' ')[2])

Step "Tailscale"
$ts = Join-Path $env:ProgramFiles 'Tailscale\tailscale.exe'
if (-not (Test-Path $ts)) {
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    Write-Host "  Installing Tailscale with winget..."
    winget install --id Tailscale.Tailscale -e --accept-source-agreements --accept-package-agreements
  }
  if (-not (Test-Path $ts)) { Halt "Install Tailscale from https://tailscale.com/download/windows, then run this script again." }
}
Ok "installed"
$state = ''
$ErrorActionPreference = 'Continue'
$raw = & $ts status --json 2>&1 | Out-String
$ErrorActionPreference = 'Stop'
# While another Windows account is signed in to the Tailscale app, only that
# account and SYSTEM may use its command line, unattended or not (seen on
# MBM-SRV1 and desktop-4us91kl, 2026-11-23). It is running, then: this
# account can't check unattended, so that account confirms it.
# Two wordings: "already in use by <user>" (signed in, not unattended) and
# "running in server mode ("<user>"); connection from ... not allowed" (unattended)
$inUseBy = if ($raw -match '(?:already in use by |running in server mode \(")([^\s,")]+)') { $Matches[1] -replace '\\\\', '\' } else { $null }
try { $state = ($raw | ConvertFrom-Json).BackendState } catch { $state = '' }
if ($inUseBy) {
  $tsIf = Get-NetAdapter -ErrorAction SilentlyContinue | Where-Object { $_.InterfaceDescription -like '*Tailscale*' -and $_.Status -eq 'Up' }
  $ip = if ($tsIf) { (Get-NetIPAddress -InterfaceIndex $tsIf.ifIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue).IPAddress } else { $null }
  if (-not $ip) { Halt "Tailscale is signed in by $inUseBy but not connected: as $inUseBy, open Tailscale and connect." }
  Ok "connected: $ip (signed in by $inUseBy)"
  Todo "as $inUseBy, check: tailscale debug prefs shows ""ForceDaemon"": true (else: tailscale set --unattended)"
}
elseif ($state -ne 'Running') {
  Write-Host "  Sign in: a sign-in link follows (or a browser opens). Use the tailnet's account (the same as Farm Control's)."
  & $ts up --unattended --accept-routes
  try { $state = (& $ts status --json | ConvertFrom-Json).BackendState } catch { $state = '' }
  if ($state -ne 'Running') { Halt "Tailscale is not signed in yet. Sign in, then run this script again." }
}
# Its answer is shown, and then checked (as Farm Control's 01): unattended
# keeps Tailscale up after a restart with nobody signed in.
if (-not $inUseBy) {
$ErrorActionPreference = 'Continue'
$said = & $ts set --unattended --accept-routes 2>&1 | Out-String
$setExit = $LASTEXITCODE
$unattended = $null
try { $unattended = (& $ts debug prefs 2>$null | Out-String | ConvertFrom-Json).ForceDaemon } catch { $unattended = $null }
$ErrorActionPreference = 'Stop'
if ($setExit -ne 0 -or $unattended -ne $true) {
  if ($said.Trim()) { Write-Host ("  Tailscale said: " + $said.Trim()) }
  Halt "Tailscale is not unattended: only the Windows account that signed it in can use it. Run this script in Terminal (Admin) as that account, or there: tailscale set --unattended (or the Tailscale menu: Run unattended)"
}
$ip = (& $ts ip -4 | Select-Object -First 1).Trim()
Ok "signed in, unattended: $ip"
}

Step "OpenSSH Server"
$cap = Get-WindowsCapability -Online -Name 'OpenSSH.Server*' | Select-Object -First 1
if ($cap.State -ne 'Installed') {
  if ($cap.State -eq 'InstallPending') { Halt "Windows finishes OpenSSH at the next restart: Restart-Computer, then run this script again." }
  Write-Host "  Adding the OpenSSH Server feature. This can take 10 to 20 minutes; leave this window alone."
  Add-WindowsCapability -Online -Name $cap.Name | Out-Null
  $cap = Get-WindowsCapability -Online -Name 'OpenSSH.Server*' | Select-Object -First 1
  if ($cap.State -ne 'Installed') { Halt "OpenSSH Server is $($cap.State): Restart-Computer, then run this script again." }
}
Ok "feature installed"
$sshd = 'C:\Windows\System32\OpenSSH\sshd.exe'
if (-not (Test-Path $sshd)) { Halt "$sshd is missing: Settings > System > Optional features: remove and add OpenSSH Server again." }
if (-not (Get-Service sshd -ErrorAction SilentlyContinue)) {
  New-Service -Name sshd -DisplayName 'OpenSSH SSH Server' -BinaryPathName $sshd -StartupType Automatic | Out-Null
  sc.exe privs sshd SeAssignPrimaryTokenPrivilege/SeTcbPrivilege/SeBackupPrivilege/SeRestorePrivilege/SeImpersonatePrivilege | Out-Null
}
Set-Service sshd -StartupType Automatic
Start-Service sshd
Ok "sshd running, starts at boot"

Step "The mbm-ai account"
if (-not (Get-LocalUser mbm-ai -ErrorAction SilentlyContinue)) {
  if ($RandomPassword) {
    $bytes = New-Object byte[] 24; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $pw = ConvertTo-SecureString ('Aa1!' + [Convert]::ToBase64String($bytes)) -AsPlainText -Force
    Write-Host "  mbm-ai gets a random password nobody sees (it signs in with its key only)."
  } else {
    Write-Host "  Choose a password for mbm-ai and keep it in your password manager."
    Write-Host "  It is never used over SSH and never given to the AI."
    $pw = Read-Host -AsSecureString "Password for mbm-ai"
  }
  New-LocalUser mbm-ai -Password $pw -FullName "MBM AI" -Description "Key-only SSH for the AI (MBM-341)" -PasswordNeverExpires | Out-Null
}
if (-not (Get-LocalGroupMember -Group Administrators | Where-Object { $_.Name -like '*\mbm-ai' })) {
  Add-LocalGroupMember -Group Administrators -Member mbm-ai
}
Ok "mbm-ai, a local administrator"

Step "The key"
$auth = 'C:\ProgramData\ssh\administrators_authorized_keys'
$have = @()
if (Test-Path $auth) { $have = @(Get-Content $auth) }
if ($have -notcontains $key) { Add-Content -Path $auth -Value $key -Encoding ascii }
icacls $auth /inheritance:r /grant "Administrators:F" /grant "SYSTEM:F" | Out-Null
Ok "in administrators_authorized_keys (Administrators and SYSTEM only)"

Step "Keys only"
$conf = 'C:\ProgramData\ssh\sshd_config'
$lines = @(Get-Content $conf)
if ($lines.Count -eq 0 -or $lines[0].Trim() -ne 'PasswordAuthentication no') {
  Copy-Item $conf "$conf.before-mbm" -Force
  Set-Content -Path $conf -Value (@('PasswordAuthentication no') + ($lines | Where-Object { $_.Trim() -ne 'PasswordAuthentication no' })) -Encoding ascii
  Restart-Service sshd
}
$t = & $sshd -T 2>$null | Select-String '^passwordauthentication '
if ("$t".Trim() -ne 'passwordauthentication no') { Halt "sshd still allows passwords ($t). Send this to the AI." }
Ok "passwordauthentication no"

Step "Port 22 from the tailnet only"
$rules = @(Get-NetFirewallRule | Where-Object { ($_.DisplayName -like '*ssh*' -or $_.Name -like '*ssh*') -and $_.Direction -eq 'Inbound' })
if ($rules.Count -eq 0) {
  New-NetFirewallRule -Name MBM-SSH-Tailnet -DisplayName "OpenSSH (tailnet only)" -Direction Inbound -Protocol TCP -LocalPort 22 -RemoteAddress 100.64.0.0/10 -Action Allow -Profile Any | Out-Null
} else {
  foreach ($r in $rules) { Set-NetFirewallRule -Name $r.Name -RemoteAddress 100.64.0.0/10 -Profile Any }
}
foreach ($r in @(Get-NetFirewallRule | Where-Object { ($_.DisplayName -like '*ssh*' -or $_.Name -like '*ssh*') -and $_.Direction -eq 'Inbound' })) {
  $a = ($r | Get-NetFirewallAddressFilter).RemoteAddress
  if ("$a" -notmatch '^100\.64\.0\.0') { Halt "Firewall rule $($r.Name) is open to $a. Send this to the AI." }
}
Ok "only from 100.64.0.0/10"

Step "Folders"
foreach ($d in 'C:\MBM', 'C:\MBM\setup', 'C:\MBM\incoming', 'C:\MBM\backups', 'C:\MBM\previous') {
  if (-not (Test-Path $d)) { New-Item -ItemType Directory $d | Out-Null }
}
Ok "C:\MBM with setup, incoming, backups, previous"

Step "Send these lines to the AI"
Write-Host ("  Computer name : " + $env:COMPUTERNAME)
Write-Host ("  Tailnet IP    : " + $ip)
Get-ChildItem C:\ProgramData\ssh\ssh_host_*_key.pub | ForEach-Object {
  Write-Host ("  Host key      : " + (& C:\Windows\System32\OpenSSH\ssh-keygen.exe -lf $_.FullName))
}
Write-Host ""
Write-Host "In the Tailscale admin console: Machines > this machine > Disable key expiry." -ForegroundColor Yellow
Write-Host "Next: the AI connects, checks, and copies the other scripts to C:\MBM\setup." -ForegroundColor Cyan
