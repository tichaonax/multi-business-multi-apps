# Check EPSON printer status
$printer = Get-Printer -Name "EPSON TM-T20III Receipt"

Write-Host "=== Printer Status ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Name:" $printer.Name
Write-Host "Status:" $printer.PrinterStatus
Write-Host "Job Count:" $printer.JobCount
Write-Host "Port Name:" $printer.PortName
Write-Host "Driver Name:" $printer.DriverName
Write-Host ""

# Check print jobs
Write-Host "=== Print Jobs ===" -ForegroundColor Cyan
$jobs = Get-PrintJob -PrinterName "EPSON TM-T20III Receipt" -ErrorAction SilentlyContinue

if ($jobs) {
    $jobs | Format-Table -Property Id, JobStatus, SubmittedTime, DocumentName, TotalPages -AutoSize
} else {
    Write-Host "No print jobs in queue" -ForegroundColor Green
}
Write-Host ""

# Check port details
Write-Host "=== Port Details ===" -ForegroundColor Cyan
$port = Get-PrinterPort -Name $printer.PortName
Write-Host "Port Name:" $port.Name
Write-Host "Port Type:" $port.Description
Write-Host ""
