#!/usr/bin/env pwsh
#
# Post-merge hook, PowerShell twin of .githooks/post-merge (MBM-341): REPORT ONLY.
# Git runs `post-merge` itself; this copy is for running by hand on Windows.
# It never stops the service, installs or builds.
#
$changed = git diff-tree -r --name-only --no-commit-id ORIG_HEAD HEAD 2>$null
if (-not $changed) { exit 0 }
function Has($p) { [bool]($changed | Select-String -Quiet -Pattern $p) }

Write-Host ""
Write-Host "== Post-merge: what changed" -ForegroundColor Cyan
if (Has 'package.json')         { Write-Host "  package.json        -> dependencies may have changed" }
if (Has 'prisma/migrations/')   { Write-Host "  prisma/migrations/  -> new database migrations" }
if (Has 'prisma/schema.prisma') { Write-Host "  prisma/schema.prisma -> the Prisma client must be regenerated" }
if (Has 'windows-service/')     { Write-Host "  windows-service/    -> the service files changed" }
if (Has '^src/')                { Write-Host "  src/                -> application code" }
Write-Host ""
Write-Host "  Nothing was stopped, installed or built."
Write-Host "  Dev machine:  npm run setup:update   then restart the service when ready"
Write-Host "  A server:     deploy/server/install-release.ps1 (docs/runbooks/new-mbm-server.md)"
Write-Host ""
exit 0
