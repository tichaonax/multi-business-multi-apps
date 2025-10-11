#!/usr/bin/env pwsh
#
# Post-Merge Git Hook (PowerShell/Windows - INTELLIGENT VERSION)
# Automatically runs after 'git pull' or 'git merge'
#
# This hook intelligently detects what changed and runs the appropriate workflow:
# - Scripts, migrations, or package.json changed: Run full setup with DB detection
# - Only source files changed: Quick rebuild
# - Nothing significant changed: Skip
#

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "🔄 POST-MERGE HOOK: Analyzing changes..." -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Get changed files between ORIG_HEAD and HEAD
$changedFiles = git diff-tree -r --name-only --no-commit-id ORIG_HEAD HEAD

# Check what types of files changed
$packageChanged = $changedFiles -match "package.json"
$scriptsChanged = $changedFiles -match "scripts/"
$migrationsChanged = $changedFiles -match "prisma/migrations/"
$schemaChanged = $changedFiles -match "prisma/schema.prisma"
$srcChanged = $changedFiles -match "src/"

# Determine if we need full setup
$needsFullSetup = $false

if ($packageChanged) {
  Write-Host "📦 package.json changed" -ForegroundColor Yellow
  $needsFullSetup = $true
}

if ($scriptsChanged) {
  Write-Host "📜 Setup scripts changed" -ForegroundColor Yellow
  $needsFullSetup = $true
}

if ($migrationsChanged) {
  Write-Host "🗄️  Database migrations changed" -ForegroundColor Yellow
  $needsFullSetup = $true
}

if ($schemaChanged) {
  Write-Host "📐 Prisma schema changed" -ForegroundColor Yellow
  $needsFullSetup = $true
}

if ($srcChanged) {
  Write-Host "🔧 Source files changed" -ForegroundColor Yellow
}

Write-Host ""

# Run appropriate workflow
if ($needsFullSetup) {
  Write-Host "🚀 Running full intelligent setup workflow..." -ForegroundColor Green
  npm run setup:update

} elseif ($srcChanged) {
  Write-Host "🔨 Running quick rebuild (source files only)..." -ForegroundColor Yellow

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
  Write-Host "ℹ️  No significant changes detected - skipping rebuild" -ForegroundColor Gray
  Write-Host "💡 To manually run setup: npm run setup:update" -ForegroundColor Cyan
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
