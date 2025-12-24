# Check EPSON Printer Settings and Configuration

$printerName = "EPSON TM-T20III Receipt"

Write-Host ""
Write-Host "=== EPSON Printer Diagnostics ==="
Write-Host ""

# 1. Get printer details
Write-Host "1. Printer Information:"
Write-Host "   ----------------------"
$printer = Get-Printer -Name $printerName
Write-Host "   Name: $($printer.Name)"
Write-Host "   Status: $($printer.PrinterStatus)"
Write-Host "   Driver: $($printer.DriverName)"
Write-Host "   Port: $($printer.PortName)"
Write-Host "   Shared: $($printer.Shared)"
Write-Host "   Published: $($printer.Published)"
Write-Host ""

# 2. Get port information
Write-Host "2. Port Information:"
Write-Host "   ------------------"
try {
    $port = Get-PrinterPort -Name $printer.PortName
    Write-Host "   Port Name: $($port.Name)"
    Write-Host "   Description: $($port.Description)"
    Write-Host "   Port Monitor: $($port.PortMonitor)"
} catch {
    Write-Host "   Could not get port details"
}
Write-Host ""

# 3. Get printer configuration
Write-Host "3. Printer Configuration:"
Write-Host "   -----------------------"
$config = Get-PrintConfiguration -PrinterName $printerName
Write-Host "   Paper Size: $($config.PaperSize)"
Write-Host "   Color: $($config.Color)"
Write-Host "   Duplex: $($config.DuplexingMode)"
Write-Host "   Collate: $($config.Collate)"
Write-Host ""

# 4. Check print jobs
Write-Host "4. Print Queue Status:"
Write-Host "   -------------------"
$jobs = Get-PrintJob -PrinterName $printerName
if ($jobs) {
    Write-Host "   Jobs in queue: $($jobs.Count)"
    $jobs | Format-Table Id, DocumentName, JobStatus, Size -AutoSize
} else {
    Write-Host "   Queue is empty"
}
Write-Host ""

# 5. Check if driver supports RAW
Write-Host "5. Driver Information:"
Write-Host "   -------------------"
$driver = Get-PrinterDriver -Name $printer.DriverName
Write-Host "   Driver Name: $($driver.Name)"
Write-Host "   Version: $($driver.MajorVersion)"
Write-Host "   Environment: $($driver.PrinterEnvironment)"
Write-Host "   Data File: $($driver.DataFile)"
Write-Host "   Config File: $($driver.ConfigFile)"
Write-Host ""

# 6. Test if printer is responding
Write-Host "6. Printer Responsiveness:"
Write-Host "   -----------------------"
Write-Host "   Attempting to query printer status..."
try {
    $printerStatus = Get-Printer -Name $printerName | Select-Object -ExpandProperty PrinterStatus
    if ($printerStatus -eq "Normal") {
        Write-Host "   OK: Printer reports Normal status"
    } else {
        Write-Host "   WARNING: Printer status is $printerStatus"
    }
} catch {
    Write-Host "   ERROR: Could not query printer"
}
Write-Host ""

# 7. Check Windows Spooler service
Write-Host "7. Print Spooler Service:"
Write-Host "   ----------------------"
$spooler = Get-Service -Name Spooler
Write-Host "   Status: $($spooler.Status)"
Write-Host "   Start Type: $($spooler.StartType)"
Write-Host ""

Write-Host "=================================="
Write-Host ""
