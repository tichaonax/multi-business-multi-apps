#Requires -RunAsAdministrator
<#
  MBM server, step 3: the programs MBM needs, and its database.
    - Node.js, the major version the releases are built with (-NodeMajor);
    - Google Chrome (payroll PDFs are printed with it);
    - PostgreSQL 18 as the Windows service postgresql-x64-18 (MBM's service
      depends on that name);
    - the database and its own user (not the postgres superuser), with a
      new random password. The address is kept for step 4 in a file only
      administrators can read; it is never printed.
  Asks y/n before each change; safe to run again. No git: the server only
  installs releases.

    powershell -ExecutionPolicy Bypass -File C:\MBM\setup\03-prerequisites.ps1
#>
param([int]$NodeMajor = 24, [string]$Database = 'multi_business_db', [string]$DbUser = 'mbm_app')
$ErrorActionPreference = 'Stop'

function Step($t) { Write-Host ""; Write-Host "== $t" -ForegroundColor Cyan }
function Ok($t) { Write-Host "  OK    $t" -ForegroundColor Green }
function Todo($t) { Write-Host "  TODO  $t" -ForegroundColor Yellow }
function Halt($t) { Write-Host ""; Write-Host "  STOP  $t" -ForegroundColor Red; exit 1 }
function Ask($q) { (Read-Host "$q [y/n]") -match '^[yY]' }
function Refresh-Path { $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User') }

Step "Node.js $NodeMajor"
$node = Get-Command node -ErrorAction SilentlyContinue
$have = if ($node) { [int]((& node -v).TrimStart('v').Split('.')[0]) } else { 0 }
if ($have -eq $NodeMajor) { Ok ("Node " + (& node -v)) }
else {
  if ($have) { Write-Host "  Node $(& node -v) is installed; releases need Node $NodeMajor." }
  if (Ask "Install Node.js $NodeMajor with winget?") {
    winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements
    Refresh-Path
    $have = [int]((& node -v).TrimStart('v').Split('.')[0])
    if ($have -ne $NodeMajor) { Halt "winget installed Node $(& node -v), not $NodeMajor. Install Node $NodeMajor from https://nodejs.org (Windows x64 .msi), then run this again." }
    Ok ("Node " + (& node -v))
  } else { Todo "Node $NodeMajor is needed" }
}

Step "Google Chrome (payslip and ZIMRA voucher PDFs)"
$chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
if (Test-Path $chrome) { Ok "installed" }
elseif (Ask "Install Google Chrome with winget? (MBM prints payslips and vouchers to PDF with it)") {
  winget install --id Google.Chrome -e --accept-source-agreements --accept-package-agreements
  if (Test-Path $chrome) { Ok "installed" } else { Todo "not at ${chrome}: install it from https://www.google.com/chrome" }
} else { Todo "no Chrome: payslip and voucher PDFs won't work" }

Step "PostgreSQL 18"
$pg = Get-Service postgresql-x64-18 -ErrorAction SilentlyContinue
if (-not $pg) {
  $other = Get-Service 'postgresql*' -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($other) { Halt ("PostgreSQL is installed as " + $other.Name + ". MBM's service depends on postgresql-x64-18: install 18, or send this to the AI.") }
  if (Ask "Install PostgreSQL 18 with winget? (its installer asks for the postgres superuser password: keep it in your password manager)") {
    winget install --id PostgreSQL.PostgreSQL.18 -e --accept-source-agreements --accept-package-agreements
    $pg = Get-Service postgresql-x64-18 -ErrorAction SilentlyContinue
  }
  if (-not $pg) { Halt "Install PostgreSQL 18 (https://www.postgresql.org/download/windows/), keep the service name postgresql-x64-18, then run this again." }
}
if ($pg.StartType -ne 'Automatic') { Set-Service postgresql-x64-18 -StartupType Automatic }
if ($pg.Status -ne 'Running') { Start-Service postgresql-x64-18 }
Ok "postgresql-x64-18 running, starts at boot"
$bin = 'C:\Program Files\PostgreSQL\18\bin'
if (-not (Test-Path "$bin\psql.exe")) { Halt "$bin\psql.exe is missing." }
Ok ((& "$bin\psql.exe" --version))

Step "The database"
$urlFile = 'C:\MBM\setup\.database-url'
if (Test-Path $urlFile) { Ok "made already (its address waits for step 4)"; Write-Host "Next: C:\MBM\setup\04-configure.ps1" -ForegroundColor Cyan; exit 0 }
Write-Host "  The postgres superuser's password is needed once, to make MBM's database and user."
$su = Read-Host -AsSecureString "postgres password"
$env:PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($su))
try {
  $q = { param($sql) (& "$bin\psql.exe" -h localhost -U postgres -d postgres -tAc $sql) }
  $exists = & $q "SELECT 1 FROM pg_database WHERE datname='$Database'"
  if ($LASTEXITCODE -ne 0) { Halt "could not sign in to PostgreSQL as postgres (wrong password?)." }
  if ($exists -eq '1') {
    Halt "database $Database exists already. If it is MBM's from an earlier try, put its address in .env.local by hand (step 4 asks), or drop it yourself first."
  }
  $bytes = New-Object byte[] 24; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $pw = ([Convert]::ToBase64String($bytes)) -replace '[+/=]', 'x'
  if (-not (Ask "Make database $Database with its own user $DbUser?")) { Todo "no database yet"; exit 0 }
  & $q "DO `$`$BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='$DbUser') THEN CREATE ROLE $DbUser LOGIN PASSWORD '$pw'; ELSE ALTER ROLE $DbUser LOGIN PASSWORD '$pw'; END IF; END`$`$" | Out-Null
  & $q "CREATE DATABASE $Database OWNER $DbUser ENCODING 'UTF8'" | Out-Null
  if ($LASTEXITCODE -ne 0) { Halt "could not make the database." }
  Ok "database $Database, owner $DbUser"
  "postgresql://${DbUser}:${pw}@localhost:5432/${Database}?schema=public" | Set-Content -Path $urlFile -Encoding ascii -NoNewline
  icacls $urlFile /inheritance:r /grant "Administrators:F" /grant "SYSTEM:F" | Out-Null
  Ok "its address is kept for step 4 (administrators only)"
} finally { Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue }

Write-Host ""
Write-Host "Next: C:\MBM\setup\04-configure.ps1" -ForegroundColor Cyan
