#Requires -RunAsAdministrator
<#
  MBM: back up the whole database now. Asks nothing (install-release.ps1 runs it).

    powershell -ExecutionPolicy Bypass -File C:\MBM\setup\backup-now.ps1 [-App <folder>]

  pg_dump, custom format (every table, images included, and the migration
  history): C:\MBM\backups\mbm-<computer>-<date>.dump with its .sha256. The
  dump is read back (pg_restore --list) before it counts as made.
  -App: the app folder whose .env.local names the database (default C:\MBM\app;
  on the old server, its checkout, e.g. C:\Users\...\multi-business-multi-apps).

  Exit 0 made, 1 failed, 2 the database is empty (nothing to back up).
#>
param([string]$Root = 'C:\MBM', [string]$App = '', [switch]$Quiet)
$ErrorActionPreference = 'Stop'
if (-not $App) { $App = Join-Path $Root 'app' }

function Ok($t) { Write-Host "  OK    $t" -ForegroundColor Green }
function Fail($t) { Write-Host "  STOP  $t" -ForegroundColor Red; exit 1 }

$envFile = Join-Path $App '.env.local'
if (-not (Test-Path $envFile)) { Fail "$envFile is missing" }
$m = Select-String -Path $envFile -Pattern '^\s*DATABASE_URL\s*=\s*(.*)$' | Select-Object -Last 1
if (-not $m) { Fail "no DATABASE_URL in $envFile" }
# libpq doesn't know Prisma's ?schema=... : drop the query part
$url = ($m.Matches[0].Groups[1].Value.Trim().Trim('"').Trim("'") -split '\?')[0]

$bin = Get-ChildItem 'C:\Program Files\PostgreSQL\*\bin\pg_dump.exe' -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | Select-Object -First 1
if (-not $bin) { Fail "pg_dump not found (PostgreSQL's bin folder)" }
$bin = Split-Path $bin.FullName

$tables = (& "$bin\psql.exe" -d $url -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'") 2>$null
if ($LASTEXITCODE -ne 0) { Fail "can't reach the database named in $envFile" }
if ([int]$tables -eq 0) { if (-not $Quiet) { Write-Host "  the database is empty: nothing to back up" }; exit 2 }

$dir = Join-Path $Root 'backups'
if (-not (Test-Path $dir)) { New-Item -ItemType Directory $dir | Out-Null }
$file = Join-Path $dir ("mbm-" + $env:COMPUTERNAME + "-" + (Get-Date -Format 'yyyyMMdd-HHmmss') + ".dump")
Write-Host "  backing up $tables tables to $file ..."
& "$bin\pg_dump.exe" -d $url -Fc -Z 6 -f $file
if ($LASTEXITCODE -ne 0) { Remove-Item $file -ErrorAction SilentlyContinue; Fail "pg_dump failed (above)" }
& "$bin\pg_restore.exe" --list $file | Out-Null
if ($LASTEXITCODE -ne 0) { Fail "the backup can't be read back: $file" }
$hash = (Get-FileHash $file -Algorithm SHA256).Hash.ToLower()
"$hash  $(Split-Path $file -Leaf)" | Set-Content -Path ([IO.Path]::ChangeExtension($file, 'sha256')) -Encoding ascii
Ok ("backup " + (Split-Path $file -Leaf) + " (" + [math]::Round((Get-Item $file).Length / 1MB) + " MB, SHA-256 " + $hash.Substring(0, 16) + "...)")

# Keep the newest 10 (a backup per install adds up)
Get-ChildItem $dir -Filter 'mbm-*.dump' | Sort-Object LastWriteTime -Descending | Select-Object -Skip 10 | ForEach-Object {
  Remove-Item $_.FullName, ([IO.Path]::ChangeExtension($_.FullName, 'sha256')) -ErrorAction SilentlyContinue
}
exit 0
