# Diagnose EPSON Printer Configuration

$printerName = "EPSON TM-T20III Receipt"

Write-Host "=== EPSON TM-T20III Printer Diagnosis ===" -ForegroundColor Cyan
Write-Host ""

# Get printer details
$printer = Get-Printer -Name $printerName
Write-Host "Printer Name: $($printer.Name)" -ForegroundColor Yellow
Write-Host "Driver Name: $($printer.DriverName)"
Write-Host "Port Name: $($printer.PortName)"
Write-Host "Print Processor: $($printer.PrintProcessor)"
Write-Host "Datatype: $($printer.Datatype)"
Write-Host "Status: $($printer.PrinterStatus)"
Write-Host ""

# Get port details
$port = Get-PrinterPort -Name $printer.PortName
Write-Host "=== Port Configuration ===" -ForegroundColor Cyan
Write-Host "Port Name: $($port.Name)"
Write-Host "Port Type: $($port.Description)"
Write-Host "Port Monitor: $($port.PortMonitor)"
Write-Host ""

# Check printer configuration
$printerConfig = Get-PrintConfiguration -PrinterName $printerName
Write-Host "=== Print Configuration ===" -ForegroundColor Cyan
Write-Host "Collate: $($printerConfig.Collate)"
Write-Host "Color: $($printerConfig.Color)"
Write-Host "Duplex Mode: $($printerConfig.DuplexingMode)"
Write-Host ""

# Check printer driver properties
Write-Host "=== Driver Properties ===" -ForegroundColor Cyan
$driver = Get-PrinterDriver -Name $printer.DriverName
Write-Host "Driver Name: $($driver.Name)"
Write-Host "Driver Path: $($driver.InfPath)"
Write-Host "Environment: $($driver.PrinterEnvironment)"
Write-Host ""

# Most importantly - check the datatype
Write-Host "=== Critical Check ===" -ForegroundColor Red
Write-Host "Current Datatype: $($printer.Datatype)"
Write-Host ""
Write-Host "For ESC/POS printing to work, the datatype should be:" -ForegroundColor Yellow
Write-Host "  - RAW (for direct ESC/POS commands)"
Write-Host ""
Write-Host "If it shows something else like 'EMF' or 'NT EMF', that's the problem!" -ForegroundColor Yellow
Write-Host ""

# Check if we can change to RAW
Write-Host "=== Available Datatypes for this printer ===" -ForegroundColor Cyan
$datatypes = Get-PrinterProperty -PrinterName $printerName -ErrorAction SilentlyContinue
if ($datatypes) {
    $datatypes | Format-Table -AutoSize
} else {
    Write-Host "Could not retrieve printer properties"
}
