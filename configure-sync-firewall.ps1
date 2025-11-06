# Configure Windows Firewall for Multi-Business Sync Service
# Run this script as Administrator on BOTH servers

Write-Host "🔧 Configuring Windows Firewall for Sync Service..." -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ ERROR: This script must be run as Administrator" -ForegroundColor Red
    Write-Host "   Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Running as Administrator" -ForegroundColor Green
Write-Host ""

# Remove existing rules if they exist
Write-Host "🧹 Removing any existing rules..." -ForegroundColor Yellow
Remove-NetFirewallRule -DisplayName "Multi-Business Sync Discovery" -ErrorAction SilentlyContinue
Remove-NetFirewallRule -DisplayName "Multi-Business Sync Discovery Out" -ErrorAction SilentlyContinue
netsh advfirewall firewall delete rule name="Allow Multicast 224.0.0.251" 2>$null

# Create inbound rule for UDP 5353
Write-Host "📥 Creating inbound UDP 5353 rule..." -ForegroundColor Cyan
try {
    New-NetFirewallRule -DisplayName "Multi-Business Sync Discovery" `
        -Direction Inbound `
        -Protocol UDP `
        -LocalPort 5353 `
        -Action Allow `
        -Profile Any `
        -Enabled True | Out-Null
    Write-Host "   ✅ Inbound rule created" -ForegroundColor Green
}
catch {
    Write-Host "   ❌ Failed to create inbound rule: $_" -ForegroundColor Red
    exit 1
}

# Create outbound rule for UDP 5353
Write-Host "📤 Creating outbound UDP 5353 rule..." -ForegroundColor Cyan
try {
    New-NetFirewallRule -DisplayName "Multi-Business Sync Discovery Out" `
        -Direction Outbound `
        -Protocol UDP `
        -RemotePort 5353 `
        -Action Allow `
        -Profile Any `
        -Enabled True | Out-Null
    Write-Host "   ✅ Outbound rule created" -ForegroundColor Green
}
catch {
    Write-Host "   ❌ Failed to create outbound rule: $_" -ForegroundColor Red
    exit 1
}

# Allow multicast group 224.0.0.251
Write-Host "🌐 Allowing multicast group 224.0.0.0/4..." -ForegroundColor Cyan
$result = netsh advfirewall firewall add rule name="Allow Multicast 224.0.0.251" dir=in action=allow protocol=UDP remoteip=224.0.0.0/4 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Multicast rule created" -ForegroundColor Green
}
else {
    Write-Host "   ❌ Failed to create multicast rule: $result" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Firewall configuration complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Run this script on the OTHER server as Administrator" -ForegroundColor White
Write-Host "   2. Restart sync service on BOTH servers:" -ForegroundColor White
Write-Host "      npm run service:restart" -ForegroundColor Cyan
Write-Host "   3. Wait 30 seconds for discovery" -ForegroundColor White
Write-Host "   4. Check peers:" -ForegroundColor White
Write-Host "      node check-sync-peers.js" -ForegroundColor Cyan
Write-Host ""
Write-Host "Expected result: Each server should see 2 nodes instead of 1" -ForegroundColor Green
