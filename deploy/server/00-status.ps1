<#
  MBM server: what is done and what is next. READ-ONLY: changes nothing.
  Safe for you or the AI (over SSH) to run at any time.

    powershell -ExecutionPolicy Bypass -File C:\MBM\setup\00-status.ps1

  It never prints a secret: settings are checked by name (scripts/check-env.js).
#>
param([string]$Root = 'C:\MBM', [string]$Service = 'multibusinesssyncservice.exe', [int]$Port = 0)
$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'
$App = Join-Path $Root 'app'
$todo = @()

function Step($t) { Write-Host ""; Write-Host "== $t" -ForegroundColor Cyan }
function Ok($t) { Write-Host "  OK    $t" -ForegroundColor Green }
function Todo($t, $next) { Write-Host "  TODO  $t" -ForegroundColor Yellow; if ($next) { $script:todo += $next } }
function Bad($t, $next) { Write-Host "  FAIL  $t" -ForegroundColor Red; if ($next) { $script:todo += $next } }
function Info($t) { Write-Host "        $t" }

Write-Host ("MBM server status on " + $env:COMPUTERNAME + ", " + (Get-Date -Format 'yyyy-MM-dd HH:mm'))

Step "Access"
$ts = Get-NetAdapter -ErrorAction SilentlyContinue | Where-Object { $_.InterfaceDescription -like '*Tailscale*' -and $_.Status -eq 'Up' }
$tsIp = if ($ts) { (Get-NetIPAddress -InterfaceIndex $ts.ifIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue).IPAddress } else { $null }
if ($tsIp) { Ok "Tailscale up: $tsIp" } else { Todo "Tailscale not connected" '01-tailscale-and-ssh.ps1' }
$sshd = Get-Service sshd -ErrorAction SilentlyContinue
if ($sshd -and $sshd.Status -eq 'Running') { Ok "OpenSSH server running" } else { Todo "OpenSSH server not running" '01-tailscale-and-ssh.ps1' }
if (Get-LocalUser -Name 'mbm-ai' -ErrorAction SilentlyContinue) { Ok "AI account mbm-ai exists" } else { Todo "no AI account (optional)" $null }

Step "Windows"
Ok ("Windows " + (Get-CimInstance Win32_OperatingSystem).Caption)
$c = Get-PSDrive C
Info ("C: free " + [math]::Round($c.Free / 1GB) + " GB of " + [math]::Round(($c.Used + $c.Free) / 1GB) + " GB")
if ($c.Free -lt 20GB) { Bad "less than 20 GB free on C:" $null }
$w32 = Get-Service W32Time -ErrorAction SilentlyContinue
if ($w32 -and $w32.StartType -eq 'Automatic' -and $w32.Status -eq 'Running') { Ok "clock service runs from boot" } else { Todo "clock service not running from boot" '02-windows.ps1' }

Step "Programs"
$node = (Get-Command node -ErrorAction SilentlyContinue)
if ($node) { Ok ("Node " + (& node -v)) } else { Todo "Node.js missing" '03-prerequisites.ps1' }
$pg = Get-Service -Name 'postgresql*' -ErrorAction SilentlyContinue | Select-Object -First 1
if ($pg) {
  if ($pg.Status -eq 'Running') { Ok ("PostgreSQL service " + $pg.Name + " running") } else { Bad ("PostgreSQL service " + $pg.Name + " is " + $pg.Status) '03-prerequisites.ps1' }
  if ($pg.Name -ne 'postgresql-x64-18') { Todo ("PostgreSQL service is " + $pg.Name + ": MBM's service expects postgresql-x64-18") $null }
} else { Todo "PostgreSQL missing" '03-prerequisites.ps1' }
$pgBin = Get-ChildItem 'C:\Program Files\PostgreSQL\*\bin\pg_dump.exe' -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | Select-Object -First 1
if ($pgBin) { Ok ("pg_dump " + (& $pgBin.FullName --version)) } else { Todo "pg_dump not found (backups)" '03-prerequisites.ps1' }

if (Test-Path 'C:\Program Files\Google\Chrome\Application\chrome.exe') { Ok "Google Chrome (payroll PDFs)" } else { Todo "Google Chrome missing: payslip and voucher PDFs won't work" '03-prerequisites.ps1' }

Step "The app"
$rel = Join-Path $App 'release.json'
if (Test-Path $rel) {
  $r = Get-Content -Raw $rel | ConvertFrom-Json
  Ok ("release " + $r.name + " (commit " + $r.commit.Substring(0, 8) + ", " + $r.migrations.count + " migrations)")
} elseif (Test-Path (Join-Path $App '.git')) {
  Todo ("$App is a git checkout (old model): new releases come from install-release.ps1") $null
} elseif (Test-Path $App) { Bad "$App has no release.json" '05-install.ps1' }
else { Todo "no app installed in $App" '04-configure.ps1' }
$prev = Get-ChildItem (Join-Path $Root 'previous') -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending
if ($prev) { Info ("previous releases kept: " + (($prev | Select-Object -First 3).Name -join ', ')) }

$envFile = Join-Path $App '.env.local'
if ((Test-Path $envFile) -and $node -and (Test-Path (Join-Path $App 'scripts\check-env.js'))) {
  & node (Join-Path $App 'scripts\check-env.js') --file $envFile --server | ForEach-Object { Write-Host "  $_" }
  if ($LASTEXITCODE -ne 0) { $todo += '04-configure.ps1' }
} elseif (Test-Path $App) { Todo "no .env.local" '04-configure.ps1' }

Step "Service"
$svc = Get-CimInstance Win32_Service -Filter "Name='$Service'" -ErrorAction SilentlyContinue
if ($svc) {
  if ($svc.State -eq 'Running') { Ok ("$Service running (" + $svc.StartMode + ")") } else { Bad ("$Service is " + $svc.State) $null }
  Info ("program: " + $svc.PathName)
} else { Todo "MBM service not installed" '05-install.ps1' }

if ($Port -eq 0) {
  $Port = 8080
  if (Test-Path $envFile) { $m = Select-String -Path $envFile -Pattern '^\s*PORT\s*=\s*"?(\d+)' | Select-Object -First 1; if ($m) { $Port = [int]$m.Matches[0].Groups[1].Value } }
}
$health = $null
foreach ($scheme in 'https', 'http') {
  $j = (& curl.exe -sk --max-time 5 "${scheme}://127.0.0.1:$Port/api/health") 2>$null
  if ($j) { try { $health = $j | ConvertFrom-Json; break } catch {} }
}
if ($health) {
  Ok ("answers on port ${Port}: " + $health.status + ", database " + $health.database + ", up " + $health.uptime.formatted)
  if ($health.release) { Ok ("running release " + $health.release.version + " (" + $health.release.source + ")") } else { Todo "the running release does not say its version (older than MBM-341)" $null }
} elseif ($svc -and $svc.State -eq 'Running') { Bad "the service runs but nothing answers on port $Port" $null }

$fw = Get-NetFirewallRule -DisplayName 'MBM app*' -ErrorAction SilentlyContinue | Where-Object Enabled -eq 'True'
if ($fw) { Ok "firewall rule for the app" } else { Todo "no 'MBM app' firewall rule (other computers can't reach it)" '05-install.ps1' }

Step "Backups"
$bk = Get-ChildItem (Join-Path $Root 'backups') -Filter '*.dump' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($bk) { Ok ("last database backup: " + $bk.Name + " (" + [math]::Round($bk.Length / 1MB) + " MB, " + $bk.LastWriteTime.ToString('yyyy-MM-dd HH:mm') + ")") }
else { Todo "no database backup in $Root\backups" 'backup-now.ps1' }

Write-Host ""
$next = $todo | Where-Object { $_ } | Select-Object -Unique | Sort-Object | Select-Object -First 1
if ($next) { Write-Host "Next: C:\MBM\setup\$next" -ForegroundColor Cyan } else { Write-Host "Nothing to do." -ForegroundColor Cyan }
