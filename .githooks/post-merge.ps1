#!/usr/bin/env pwsh
#
# Post-Merge Git Hook (PowerShell/Windows)
# Automatically runs after 'git pull' or 'git merge'
#
# This hook rebuilds the sync service automatically to ensure
# the remote server has the latest compiled code after pulling updates.
#

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "🔄 POST-MERGE HOOK: Rebuilding sync service..." -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Get changed files between ORIG_HEAD and HEAD
$changedFiles = git diff-tree -r --name-only --no-commit-id ORIG_HEAD HEAD

# Check if package.json was updated (dependencies might have changed)
if ($changedFiles -match "package.json") {
  Write-Host "📦 package.json changed - running full setup..." -ForegroundColor Yellow
  npm run setup:update
} else {
  # Only rebuild the service if source files changed
  if ($changedFiles -match "src/") {
    Write-Host "🔧 Source files changed - rebuilding service..." -ForegroundColor Yellow

    # Clean Prisma client to prevent EPERM errors (Windows file locks)
    Write-Host "🧹 Cleaning Prisma client files..." -ForegroundColor Yellow
    Remove-Item -Path "node_modules\.prisma\client" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Path "node_modules\@prisma\client" -Recurse -Force -ErrorAction SilentlyContinue

    # Regenerate Prisma client in case schema changed
    Write-Host "🔄 Regenerating Prisma client..." -ForegroundColor Yellow
    try {
      npx prisma generate
    } catch {
      Write-Host "⚠️  Prisma generation failed, retrying after cleanup..." -ForegroundColor Yellow
      Start-Sleep -Seconds 2
      Remove-Item -Path "node_modules\.prisma\client" -Recurse -Force -ErrorAction SilentlyContinue
      Remove-Item -Path "node_modules\@prisma\client" -Recurse -Force -ErrorAction SilentlyContinue
      npx prisma generate
    }

    # Rebuild sync service
    npm run build:service

    Write-Host ""
    Write-Host "✅ Sync service rebuilt successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  REMINDER: If the service is running, restart it:" -ForegroundColor Yellow
    Write-Host "   npm run service:restart (as Administrator)" -ForegroundColor Yellow
    Write-Host ""
  } else {
    Write-Host "ℹ️  No source files changed - skipping rebuild" -ForegroundColor Gray
  }
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
