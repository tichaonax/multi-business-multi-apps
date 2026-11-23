#Requires -RunAsAdministrator
<#
  MBM server, step 4: MBM's settings (C:\MBM\app\.env.local) and its keys.

  A NEW server:      new secrets are generated.
  REPLACING a server (-From C:\MBM\from-old): a folder with the old server's
                     .env.local, certs\ and data\ (copied by the AI or by you).
                     Its ENCRYPTION_KEY, NEXTAUTH_SECRET, QZ keys and other
                     settings are kept: with another ENCRYPTION_KEY, the
                     restored database's encrypted fields can't be read. Its
                     certs\ and data\ (Farm Control's signing key) are copied.
  Either way the database address comes from step 3.

  Never prints a value. Never overwrites an existing .env.local without asking.

    powershell -ExecutionPolicy Bypass -File C:\MBM\setup\04-configure.ps1 [-From C:\MBM\from-old]
#>
param([string]$Root = 'C:\MBM', [string]$From = '', [int]$Port = 8080, [switch]$Yes)
$ErrorActionPreference = 'Stop'
$App = Join-Path $Root 'app'
$envFile = Join-Path $App '.env.local'

function Step($t) { Write-Host ""; Write-Host "== $t" -ForegroundColor Cyan }
function Ok($t) { Write-Host "  OK    $t" -ForegroundColor Green }
function Todo($t) { Write-Host "  TODO  $t" -ForegroundColor Yellow }
function Halt($t) { Write-Host ""; Write-Host "  STOP  $t" -ForegroundColor Red; exit 1 }
# -Yes: every question answered y (the AI over SSH, where nobody can answer); each one is still printed
function Ask($q) { if ($Yes) { Write-Host "$q [y/n]: y (-Yes)"; return $true }; (Read-Host "$q [y/n]") -match '^[yY]' }
function RandomHex($n) { $b = New-Object byte[] $n; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); ($b | ForEach-Object { $_.ToString('x2') }) -join '' }
function RandomB64($n) { $b = New-Object byte[] $n; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); [Convert]::ToBase64String($b) }
function Read-Env($file) {
  $h = [ordered]@{}
  foreach ($l in Get-Content $file) { if ($l -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') { $h[$Matches[1]] = $Matches[2].Trim() } }
  $h
}

Step "Where"
if (-not (Test-Path $App)) { New-Item -ItemType Directory $App | Out-Null }
Ok $App
if (Test-Path $envFile) {
  if (-not (Ask ".env.local exists already. Replace it (the old one is kept as .env.local.before-04)?")) { Ok "kept as it is"; Write-Host "Next: C:\MBM\setup\05-install.ps1" -ForegroundColor Cyan; exit 0 }
  Copy-Item $envFile "$envFile.before-04" -Force
}

Step "The database address (step 3)"
$urlFile = Join-Path $Root 'setup\.database-url'
if (Test-Path $urlFile) { $dbUrl = (Get-Content -Raw $urlFile).Trim(); Ok "from step 3" }
else {
  Todo "no address from step 3"
  $s = Read-Host -AsSecureString "DATABASE_URL (postgresql://user:password@localhost:5432/multi_business_db)"
  $dbUrl = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))
  if ($dbUrl -notmatch '^postgres(ql)?://') { Halt "that is not a postgresql:// address" }
}

$settings = [ordered]@{}
if ($From) {
  Step "The old server's settings ($From)"
  $oldEnv = Join-Path $From '.env.local'
  if (-not (Test-Path $oldEnv)) { Halt "$oldEnv is missing" }
  $settings = Read-Env $oldEnv
  if (-not $settings.Contains('ENCRYPTION_KEY')) { Halt "the old .env.local has no ENCRYPTION_KEY: ask the AI before going on" }
  Ok ("kept " + $settings.Count + " settings, among them ENCRYPTION_KEY and NEXTAUTH_SECRET")
  foreach ($d in 'certs', 'data') {
    $src = Join-Path $From $d
    if (Test-Path $src) { Copy-Item $src (Join-Path $App $d) -Recurse -Force; Ok "$d\ copied" } else { Todo "the old server had no $d\" }
  }
} else {
  Step "New secrets"
  $settings['NEXTAUTH_SECRET'] = '"' + (RandomB64 32) + '"'
  $settings['ENCRYPTION_KEY'] = '"' + (RandomHex 32) + '"'
  Ok "NEXTAUTH_SECRET and ENCRYPTION_KEY generated"
  Todo "keep a copy of C:\MBM\app\.env.local in your password manager: without ENCRYPTION_KEY a backup's encrypted fields can't be read"
}
$settings['DATABASE_URL'] = '"' + $dbUrl + '"'
$settings['NODE_ENV'] = '"production"'
if (-not $settings.Contains('PORT')) { $settings['PORT'] = "$Port" }
# Sign-in at any of the server's addresses (the tailnet name with its trusted
# certificate, the IP, localhost): NextAuth takes the address from the request
$settings['AUTH_TRUST_HOST'] = 'true'

Step "Write .env.local"
$lines = @("# MBM settings, written by 04-configure.ps1 on $(Get-Date -Format 'yyyy-MM-dd HH:mm'). Never commit or send this file.")
foreach ($k in $settings.Keys) { $lines += "$k=$($settings[$k])" }
Set-Content -Path $envFile -Value $lines -Encoding ascii
icacls $envFile /inheritance:r /grant "Administrators:F" /grant "SYSTEM:F" | Out-Null
Ok ".env.local written (administrators and SYSTEM only)"
if (Test-Path $urlFile) { Remove-Item $urlFile -Force; Ok "step 3's note removed" }

Step "Check"
$check = Join-Path $App 'scripts\check-env.js'
if (Test-Path $check) { & node $check --file $envFile --server }
else { Todo "no release here yet: 05-install.ps1 installs it and checks the settings" }

Write-Host ""
Write-Host "Next: C:\MBM\setup\05-install.ps1" -ForegroundColor Cyan
