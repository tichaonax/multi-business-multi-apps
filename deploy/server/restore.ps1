#Requires -RunAsAdministrator
<#
  MBM: restore a database backup (from backup-now.ps1) into an EMPTY database.
  For moving to a new server: after 03 and 04, before 05.

    powershell -ExecutionPolicy Bypass -File C:\MBM\setup\restore.ps1 -Dump C:\MBM\incoming\mbm-OLD-20261123-0400.dump

  - checks the dump's SHA-256 (its .sha256 beside it);
  - REFUSES a database that has any table: it never overwrites data;
  - asks y/n, then restores in one transaction (all or nothing), owned by
    MBM's own database user;
  - shows the counts of a few main tables, to compare with the old server.
  05-install.ps1 then applies only the migrations newer than the backup.
#>
param([Parameter(Mandatory = $true)][string]$Dump, [string]$Root = 'C:\MBM')
$ErrorActionPreference = 'Stop'
$App = Join-Path $Root 'app'

function Step($t) { Write-Host ""; Write-Host "== $t" -ForegroundColor Cyan }
function Ok($t) { Write-Host "  OK    $t" -ForegroundColor Green }
function Halt($t) { Write-Host ""; Write-Host "  STOP  $t" -ForegroundColor Red; exit 1 }
function Ask($q) { (Read-Host "$q [y/n]") -match '^[yY]' }

Step "The backup"
if (-not (Test-Path $Dump)) { Halt "$Dump is missing" }
$sum = [IO.Path]::ChangeExtension($Dump, 'sha256')
if (-not (Test-Path $sum)) { Halt "$sum is missing: copy the backup with its SHA-256" }
$want = ((Get-Content -Raw $sum).Trim() -split '\s+')[0].ToLower()
$got = (Get-FileHash $Dump -Algorithm SHA256).Hash.ToLower()
if ($got -ne $want) { Halt "SHA-256 differs: the copy is damaged. Copy it again." }
Ok ("SHA-256 " + $got.Substring(0, 16) + "..., " + [math]::Round((Get-Item $Dump).Length / 1MB) + " MB")

Step "The database"
$envFile = Join-Path $App '.env.local'
if (-not (Test-Path $envFile)) { Halt "$envFile is missing: run 04-configure.ps1 first" }
$m = Select-String -Path $envFile -Pattern '^\s*DATABASE_URL\s*=\s*(.*)$' | Select-Object -Last 1
$url = ($m.Matches[0].Groups[1].Value.Trim().Trim('"').Trim("'") -split '\?')[0]
$bin = Split-Path (Get-ChildItem 'C:\Program Files\PostgreSQL\*\bin\pg_restore.exe' | Sort-Object FullName -Descending | Select-Object -First 1).FullName
$tables = (& "$bin\psql.exe" -d $url -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")
if ($LASTEXITCODE -ne 0) { Halt "can't reach the database named in .env.local" }
if ([int]$tables -gt 0) { Halt "the database has $tables tables already. Restore only goes into an empty database: nothing was changed." }
$dbUser = (& "$bin\psql.exe" -d $url -tAc "SELECT current_user").Trim()
Ok "empty; MBM's user is $dbUser"

if (-not (Ask "Restore $(Split-Path $Dump -Leaf) into it?")) { Write-Host "Nothing was changed."; exit 0 }

Step "Restore"
& "$bin\pg_restore.exe" -d $url --no-owner --no-privileges --role=$dbUser --single-transaction --exit-on-error $Dump
if ($LASTEXITCODE -ne 0) { Halt "the restore failed (above) and was undone: the database is empty again. Send the lines above to the AI." }
Ok "restored"

Step "Counts (compare with the old server)"
foreach ($t in 'users', 'businesses', 'employees', 'business_orders', 'images', '_prisma_migrations') {
  $n = (& "$bin\psql.exe" -d $url -tAc "SELECT count(*) FROM `"$t`"" 2>$null)
  if ($LASTEXITCODE -eq 0) { Write-Host ("  {0,-20} {1}" -f $t, $n.Trim()) }
}
Write-Host ""
Write-Host "Next: C:\MBM\setup\05-install.ps1" -ForegroundColor Cyan
