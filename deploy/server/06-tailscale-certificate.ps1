#Requires -RunAsAdministrator
<#
  MBM server, step 6: a trusted HTTPS certificate for this server's tailnet
  name, renewed by itself (as Farm Control does: its ADR 0016 and
  "certificate -auto"). Browsers, tills and phones then open
  https://<name>.ts.net:<port> with no certificate warning. The IP keeps
  the server's own certificate: MBM picks by the name asked for
  (server.ts), so both work.

    powershell -ExecutionPolicy Bypass -File C:\MBM\setup\06-tailscale-certificate.ps1

  Run once. It:
  - asks Tailscale for the certificate (Let's Encrypt, 90 days) into
    <app>\certs\tailscale\ (carried from release to release with certs\);
    MBM uses it within seconds, no restart;
  - sets up the scheduled task "MBM certificate": as SYSTEM, every 15
    minutes, it runs this with -Renew, which renews when the certificate is
    missing or under 30 days from its end, and otherwise only notes the
    check. Nobody has to renew it by hand.
  Every attempt is noted in certs\tailscale\status.json; 00-status.ps1
  shows it. -AutoOff removes the task.

  Needs, in the Tailscale admin console → DNS: MagicDNS and HTTPS
  Certificates both on.
#>
param([string]$Root = 'C:\MBM', [string]$App = '', [switch]$Renew, [switch]$AutoOff)
$ErrorActionPreference = 'Stop'
if (-not $App) { $App = Join-Path $Root 'app' }
$Dir = Join-Path $App 'certs\tailscale'
$CertFile = Join-Path $Dir 'cert.pem'
$KeyFile = Join-Path $Dir 'key.pem'
$StatusFile = Join-Path $Dir 'status.json'
$Task = 'MBM certificate'
$RenewWithinDays = 30

function Step($t) { if (-not $Renew) { Write-Host ""; Write-Host "== $t" -ForegroundColor Cyan } }
function Ok($t) { if (-not $Renew) { Write-Host "  OK    $t" -ForegroundColor Green } }
function Todo($t) { Write-Host "  TODO  $t" -ForegroundColor Yellow }
function Read-Cert($path) { New-Object System.Security.Cryptography.X509Certificates.X509Certificate2((Resolve-Path $path).Path) }

# What the task did, for 00-status.ps1 (Farm Control's cert status)
function Note($ok, $message, $notAfter) {
  New-Item -ItemType Directory $Dir -Force | Out-Null
  $st = if (Test-Path $StatusFile) { Get-Content -Raw $StatusFile | ConvertFrom-Json } else { [pscustomobject]@{} }
  $now = (Get-Date).ToUniversalTime().ToString('o')
  $st | Add-Member -Force NoteProperty checkedAt $now
  if ($null -ne $ok) {
    $st | Add-Member -Force NoteProperty lastAttempt ([pscustomobject]@{
      at = $now; ok = $ok; by = $(if ($Renew) { 'automatic' } else { 'by hand' }); message = $message
      notAfter = $(if ($notAfter) { $notAfter.ToUniversalTime().ToString('o') } else { $null })
    })
  }
  $st | ConvertTo-Json -Depth 4 | Set-Content -Path $StatusFile -Encoding utf8
}
# A failure: noted; loud by hand, quiet in the task (the status says it)
function Fail($t) {
  Note $false $t $null
  if ($Renew) { exit 0 }
  Write-Host ""; Write-Host "  STOP  $t" -ForegroundColor Red; exit 1
}

if ($AutoOff) {
  Unregister-ScheduledTask -TaskName $Task -Confirm:$false -ErrorAction SilentlyContinue
  Write-Host "Automatic renewal is off: run this script again before the certificate ends." -ForegroundColor Yellow
  exit 0
}

# The task's quick path: nothing to do while the certificate has time left
if ($Renew -and (Test-Path $CertFile) -and (Test-Path $KeyFile)) {
  try {
    $c = Read-Cert $CertFile
    if (($c.NotAfter - (Get-Date)).TotalDays -gt $RenewWithinDays) { Note $null $null $null; exit 0 }
  } catch { }
}

Step "Tailscale"
# Tailscale's own path first: another "tailscale" on the PATH (Git has one) isn't it
$ts = Join-Path $env:ProgramFiles 'Tailscale\tailscale.exe'
if (-not (Test-Path $ts)) { $ts = (Get-Command tailscale.exe -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1).Source }
if (-not $ts) { $ts = 'missing' }
if (-not (Test-Path $ts)) { Fail "Tailscale isn't installed: 01-tailscale-and-ssh.ps1 first." }
$st = (& $ts status --json) | ConvertFrom-Json
$name = ([string]$st.Self.DNSName).TrimEnd('.')
if ($st.BackendState -ne 'Running' -or -not $name) { Fail "Tailscale isn't connected (state $($st.BackendState))." }
if (@($st.CertDomains) -notcontains $name) {
  Fail "the tailnet doesn't give HTTPS certificates. Tailscale admin console → DNS: turn on MagicDNS and HTTPS Certificates."
}
Ok "tailnet name: $name"

Step "The certificate"
$need = $true
if ((Test-Path $CertFile) -and (Test-Path $KeyFile)) {
  $c = Read-Cert $CertFile
  $days = [int]($c.NotAfter - (Get-Date)).TotalDays
  if ($c.GetNameInfo('DnsName', $false) -eq $name -and $days -gt $RenewWithinDays) {
    Ok "have one for $name, $days days left (until $($c.NotAfter.ToString('yyyy-MM-dd')))"
    $need = $false
  }
}
if ($need) {
  New-Item -ItemType Directory $Dir -Force | Out-Null
  $newCert = Join-Path $Dir 'new-cert.pem'; $newKey = Join-Path $Dir 'new-key.pem'
  try {
    $out = & $ts cert --cert-file $newCert --key-file $newKey $name 2>&1
    if ($LASTEXITCODE -ne 0) { Fail ("tailscale cert failed: " + (($out | Out-String).Trim())) }
    $c = Read-Cert $newCert
    if ($c.GetNameInfo('DnsName', $false) -ne $name) { Fail "Tailscale gave a certificate for $($c.GetNameInfo('DnsName', $false)), not $name. Nothing was changed." }
    # The key first: server.ts reloads when cert.pem changes, and finds its key ready
    Move-Item $newKey $KeyFile -Force
    Move-Item $newCert $CertFile -Force
  } finally { Remove-Item $newCert, $newKey -ErrorAction SilentlyContinue }
  icacls $KeyFile /inheritance:r /grant "Administrators:F" /grant "SYSTEM:F" | Out-Null
  Note $true ("renewed until " + $c.NotAfter.ToString('yyyy-MM-dd')) $c.NotAfter
  Ok "certificate for $name until $($c.NotAfter.ToString('yyyy-MM-dd')), in $Dir; MBM uses it within seconds"
} else { Note $null $null $null }
if ($Renew) { exit 0 }

Step "Automatic renewal"
# The task runs this very script where it is (C:\MBM\setup on a server, the
# repo's deploy\server on a development machine): a fixed place, not a release
$script = $PSCommandPath
if ($script -like "$App\*" -and $script -notlike '*\deploy\server\*') {
  Todo "this script is inside the app folder, which a release replaces: run it from C:\MBM\setup"
} else {
  try {
    $action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$script`" -Root `"$Root`" -App `"$App`" -Renew"
    $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 15)
    $principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
    $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 10)
    Register-ScheduledTask -TaskName $Task -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
    Start-ScheduledTask -TaskName $Task
  } catch { Fail ("could not set up the task: " + $_.Exception.Message) }
  Ok "the task '$Task' checks every 15 minutes as SYSTEM and renews when under $RenewWithinDays days are left (off: -AutoOff)"
}

Step "Sign-in at this address"
$envFile = Join-Path $App '.env.local'
$port = 8080
if (Test-Path $envFile) {
  $m = Select-String -Path $envFile -Pattern '^\s*PORT\s*=\s*"?(\d+)' | Select-Object -First 1
  if ($m) { $port = [int]$m.Matches[0].Groups[1].Value }
  if (Select-String -Path $envFile -Pattern '^\s*AUTH_TRUST_HOST\s*=\s*"?true' -Quiet) { Ok "AUTH_TRUST_HOST=true: sign-in works at the name and the IP" }
  else { Todo "add AUTH_TRUST_HOST=true to $envFile (or run 04-configure.ps1) and restart MBM: otherwise sign-in only works at NEXTAUTH_URL" }
}

Write-Host ""
Write-Host "MBM by name: https://${name}:$port   (the IP keeps working with its own certificate)" -ForegroundColor Cyan
