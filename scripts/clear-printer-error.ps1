# Clear EPSON Printer Error State
# Run as Administrator: powershell -ExecutionPolicy Bypass -File scripts/clear-printer-error.ps1

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " CLEAR EPSON TM-T20III PRINTER ERROR" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

$printerName = "EPSON TM-T20III Receipt"

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "WARNING: Not running as Administrator" -ForegroundColor Yellow
    Write-Host "Some operations may fail without admin rights" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "Step 1: Checking printer status..." -ForegroundColor Green
try {
    $printer = Get-Printer -Name $printerName -ErrorAction Stop
    Write-Host "  Name: $($printer.Name)" -ForegroundColor White
    Write-Host "  Status: $($printer.PrinterStatus)" -ForegroundColor White
    Write-Host "  Port: $($printer.PortName)" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "  ERROR: Printer not found!" -ForegroundColor Red
    Write-Host "  $_" -ForegroundColor Red
    exit 1
}

Write-Host "Step 2: Clearing all print jobs..." -ForegroundColor Green
try {
    $jobs = Get-PrintJob -PrinterName $printerName -ErrorAction SilentlyContinue
    if ($jobs) {
        $jobs | Remove-PrintJob
        Write-Host "  Removed $($jobs.Count) print job(s)" -ForegroundColor White
    } else {
        Write-Host "  No print jobs to clear" -ForegroundColor White
    }
    Write-Host ""
} catch {
    Write-Host "  Warning: Could not clear print jobs" -ForegroundColor Yellow
    Write-Host "  $_" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "Step 3: Pausing printer..." -ForegroundColor Green
try {
    Set-Printer -Name $printerName -PrinterStatus Paused -ErrorAction Stop
    Write-Host "  Printer paused" -ForegroundColor White
    Start-Sleep -Seconds 2
} catch {
    Write-Host "  Could not pause printer (may need admin rights)" -ForegroundColor Yellow
}

Write-Host "Step 4: Resuming printer..." -ForegroundColor Green
try {
    Set-Printer -Name $printerName -PrinterStatus Normal -ErrorAction Stop
    Write-Host "  Printer resumed" -ForegroundColor White
    Start-Sleep -Seconds 2
} catch {
    Write-Host "  Could not resume printer (may need admin rights)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 5: Checking new status..." -ForegroundColor Green
try {
    $printer = Get-Printer -Name $printerName -ErrorAction Stop
    Write-Host "  Name: $($printer.Name)" -ForegroundColor White
    Write-Host "  Status: $($printer.PrinterStatus)" -ForegroundColor White
    Write-Host "  Port: $($printer.PortName)" -ForegroundColor White
    Write-Host ""

    if ($printer.PrinterStatus -eq "Normal") {
        Write-Host "SUCCESS: Printer status is now Normal!" -ForegroundColor Green
    } elseif ($printer.PrinterStatus -like "*Error*") {
        Write-Host "WARNING: Printer still shows Error status" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "MANUAL FIX REQUIRED:" -ForegroundColor Yellow
        Write-Host "  1. Turn printer OFF" -ForegroundColor White
        Write-Host "  2. Unplug USB cable from computer" -ForegroundColor White
        Write-Host "  3. Wait 10 seconds" -ForegroundColor White
        Write-Host "  4. Plug USB cable back in" -ForegroundColor White
        Write-Host "  5. Turn printer ON" -ForegroundColor White
        Write-Host "  6. Wait 30 seconds for Windows to recognize it" -ForegroundColor White
        Write-Host "  7. Run this script again" -ForegroundColor White
    }
} catch {
    Write-Host "  ERROR: Could not check status" -ForegroundColor Red
    Write-Host "  $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " NEXT STEPS" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. If status is Normal, test printing:" -ForegroundColor White
Write-Host "   node scripts/test-epson-printer.js" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. If test works, try from app:" -ForegroundColor White
Write-Host "   http://localhost:8080/admin/printers" -ForegroundColor Cyan
Write-Host "   Click 'Direct Test' button" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. If still not working:" -ForegroundColor White
Write-Host "   - Power cycle printer (OFF, unplug USB, wait, plug, ON)" -ForegroundColor Yellow
Write-Host "   - Run: node scripts/check-windows-printers.js" -ForegroundColor Cyan
Write-Host ""
