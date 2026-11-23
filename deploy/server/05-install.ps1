#Requires -RunAsAdministrator
<#
  MBM server, step 5: the first install. Run once per server; later releases
  only need install-release.ps1.
    - installs the newest release from C:\MBM\incoming (install-release.ps1);
    - the first administrator, only when the database has no users
      (a NEW server; a restored one keeps its people);
    - the MBM Windows service (starts at boot, after PostgreSQL);
    - the firewall rule so the tills and other computers reach MBM;
    - starts it and checks the release that answers.
  Asks y/n before each change; safe to run again.

    powershell -ExecutionPolicy Bypass -File C:\MBM\setup\05-install.ps1
#>
param([string]$Root = 'C:\MBM', [string]$Service = 'multibusinesssyncservice.exe')
$ErrorActionPreference = 'Stop'
$App = Join-Path $Root 'app'
$envFile = Join-Path $App '.env.local'

function Step($t) { Write-Host ""; Write-Host "== $t" -ForegroundColor Cyan }
function Ok($t) { Write-Host "  OK    $t" -ForegroundColor Green }
function Todo($t) { Write-Host "  TODO  $t" -ForegroundColor Yellow }
function Halt($t) { Write-Host ""; Write-Host "  STOP  $t" -ForegroundColor Red; exit 1 }
function Ask($q) { (Read-Host "$q [y/n]") -match '^[yY]' }
function EnvValue($name) {
  $m = Select-String -Path $envFile -Pattern "^\s*$name\s*=\s*(.*)$" | Select-Object -Last 1
  if ($m) { $m.Matches[0].Groups[1].Value.Trim().Trim('"').Trim("'") } else { $null }
}

Step "Settings"
if (-not (Test-Path $envFile)) { Halt "$envFile is missing: run 04-configure.ps1 first." }
Ok ".env.local"
$env:DATABASE_URL = EnvValue 'DATABASE_URL'
$port = EnvValue 'PORT'; if (-not $port) { $port = '8080' }

Step "The release"
if (Test-Path (Join-Path $App 'release.json')) {
  Ok ("installed: " + (Get-Content -Raw (Join-Path $App 'release.json') | ConvertFrom-Json).version)
} else {
  & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'install-release.ps1') -Root $Root -Service $Service -NoStart
  if ($LASTEXITCODE -ne 0) { Halt "install-release.ps1 stopped (above)." }
}

Step "The first administrator"
$bin = Split-Path (Get-ChildItem 'C:\Program Files\PostgreSQL\*\bin\psql.exe' | Sort-Object FullName -Descending | Select-Object -First 1).FullName
$users = (& "$bin\psql.exe" -d (($env:DATABASE_URL -split '\?')[0]) -tAc 'SELECT count(*) FROM "users"').Trim()
if ([int]$users -gt 0) { Ok "$users people already (restored or made before): none added" }
elseif (Ask "No users yet. Make the first administrator (admin@business.local)?") {
  Push-Location $App; try { & node scripts\create-admin.js } finally { Pop-Location }
  if ($LASTEXITCODE -ne 0) { Halt "could not make the administrator (above)." }
  Todo "sign in as admin@business.local with the password admin123 and CHANGE IT at once"
} else { Todo "no administrator yet" }

Step "The MBM service"
$svc = Get-CimInstance Win32_Service -Filter "Name='$Service'" -ErrorAction SilentlyContinue
if ($svc) { Ok ("installed: " + $svc.PathName) }
elseif (Ask "Install the MBM Windows service (starts at boot, after PostgreSQL)?") {
  Push-Location $App; try { & node windows-service\force-install-hybrid.js } finally { Pop-Location }
  $svc = Get-CimInstance Win32_Service -Filter "Name='$Service'" -ErrorAction SilentlyContinue
  if (-not $svc) { Halt "the service was not installed (above)." }
  Ok ("installed: " + $svc.PathName)
} else { Todo "no service: MBM won't run by itself" }
if ($svc -and $svc.StartMode -ne 'Auto') { Set-Service $Service -StartupType Automatic; Ok "starts at boot" }

Step "Firewall"
$rule = "MBM app (TCP $port)"
if (Get-NetFirewallRule -DisplayName $rule -ErrorAction SilentlyContinue) { Ok $rule }
elseif (Ask "Let the tills and other computers on the network reach MBM on port $port?") {
  New-NetFirewallRule -DisplayName $rule -Direction Inbound -Protocol TCP -LocalPort $port -Action Allow -Profile Domain, Private | Out-Null
  Ok "$rule (private and domain networks)"
} else { Todo "other computers can't reach MBM" }

Step "Certificates"
if (Test-Path (Join-Path $App 'certs\rootCA.pem')) { Ok "certs\ is there (HTTPS)" }
else { Todo "no certs\: HTTPS needs them (docs/TECHNICAL-DEPLOYMENT-GUIDE.md section 7.1; scripts\install-server-cert.ps1). Plain HTTP works meanwhile." }

Step "Start"
if ($svc) {
  if ((Get-Service $Service).Status -ne 'Running') { Start-Service $Service }
  $want = (Get-Content -Raw (Join-Path $App 'release.json') | ConvertFrom-Json).version
  $deadline = (Get-Date).AddSeconds(300); $running = $null
  do {
    foreach ($scheme in 'https', 'http') {
      $j = (& curl.exe -sk --max-time 5 "${scheme}://127.0.0.1:$port/api/health") 2>$null
      if ($j) { try { $running = ($j | ConvertFrom-Json).release.version; break } catch {} }
    }
    if ($running) { break }; Start-Sleep 5
  } while ((Get-Date) -lt $deadline)
  if ($running -eq $want) { Ok "the server answers $running" }
  else { Halt ("the server answers " + $(if ($running) { $running } else { "nothing" }) + ", not $want. Logs: $App\windows-service\daemon\*.log") }
}

Write-Host ""
Write-Host "Done. From now on, every release: C:\MBM\setup\install-release.ps1. Status: 00-status.ps1" -ForegroundColor Cyan
