<#
Lightweight interactive PowerShell helper to guide a user through installing/updating/removing
the Windows service for the Multi-Business Sync Service.

This script will NOT execute potentially destructive steps without interactive confirmation.
Run from an elevated PowerShell prompt.

Usage:
  .\scripts\install-service-windows.ps1  # interactive
  .\scripts\install-service-windows.ps1 -Action install -AutoConfirm  # non-interactive (use with caution)

#>

param(
    [ValidateSet('install', 'update', 'rollback', 'uninstall', 'status', 'start', 'stop')]
    [string]$Action = 'install',
    [switch]$AutoConfirm
)

function Confirm-Or-Exit([string]$message) {
    if ($AutoConfirm) { return $true }
    $res = Read-Host "$message [y/N]"
    if ($res -match '^(y|Y)') { return $true }
    Write-Host "Aborted by user." -ForegroundColor Yellow
    exit 0
}

function Invoke-ProcessCommand([string]$cmd) {
    Write-Host "Running: $cmd" -ForegroundColor Cyan
    $proc = Start-Process -FilePath pwsh -ArgumentList "-NoProfile -Command $cmd" -Wait -PassThru -NoNewWindow
    return $proc.ExitCode
}

Write-Host "Multi-Business Sync Service helper - Action: $Action" -ForegroundColor Green

if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "This script must be run as Administrator." -ForegroundColor Red
    exit 1
}

switch ($Action) {
    'install' {
        Confirm-Or-Exit "This will install the Windows service. Continue?"
        # Run npm install helper
        $code = Invoke-ProcessCommand 'npm run service:install'
        if ($code -ne 0) { Write-Host "Install failed with exit code $code" -ForegroundColor Red; exit $code }
        Write-Host "Install completed." -ForegroundColor Green
    }
    'update' {
        Confirm-Or-Exit "This will run service update. Continue?"
        $code = Invoke-ProcessCommand 'npm run service:update'
        if ($code -ne 0) { Write-Host "Update failed with exit code $code" -ForegroundColor Red; exit $code }
        Write-Host "Update completed." -ForegroundColor Green
    }
    'rollback' {
        Confirm-Or-Exit "This will run a rollback of the service. Continue?"
        $code = Invoke-ProcessCommand 'npm run service:rollback'
        if ($code -ne 0) { Write-Host "Rollback failed with exit code $code" -ForegroundColor Red; exit $code }
        Write-Host "Rollback completed." -ForegroundColor Green
    }
    'uninstall' {
        Confirm-Or-Exit "This will uninstall the Windows service and remove the registration. Continue?"
        $code = Invoke-ProcessCommand 'npm run service:uninstall'
        if ($code -ne 0) { Write-Host "Uninstall failed with exit code $code" -ForegroundColor Red; exit $code }
        Write-Host "Uninstall completed." -ForegroundColor Green
    }
    'status' {
        Write-Host "Service status:" -ForegroundColor Green
        npm run service:status
    }
    'start' {
        Confirm-Or-Exit "Start the service now?"
        npm run service:start
    }
    'stop' {
        Confirm-Or-Exit "Stop the service now?"
        npm run service:stop
    }
}

Write-Host "Done." -ForegroundColor Green
