# PowerShell RAW Print Test
# Uses .NET Printing API to send RAW data

$printerName = "EPSON TM-T20III Receipt"

Write-Host ""
Write-Host "=== PowerShell RAW Print API Test ==="
Write-Host ""

# Create test data with ESC/POS commands
$ESC = [char]0x1B
$LF = [char]0x0A
$GS = [char]0x1D

$content = ""
$content += "$ESC@"  # Initialize
$content += "RAW API TEST$LF"
$content += "Line 1$LF"
$content += "Line 2$LF"
$content += "$LF$LF$LF$LF"
$content += "$GS" + "V" + [char]0x00  # Cut

# Convert to bytes
$bytes = [System.Text.Encoding]::GetEncoding("IBM437").GetBytes($content)

Write-Host "Content size: $($bytes.Length) bytes"
Write-Host "Printer: $printerName"
Write-Host ""

# Use .NET Printing classes
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Printing

try {
    # Create print queue
    $printServer = New-Object System.Printing.PrintServer
    $printQueue = $printServer.GetPrintQueue($printerName)

    Write-Host "OK - Print queue created"
    Write-Host "  Status: $($printQueue.QueueStatus)"
    Write-Host "  Is offline: $($printQueue.IsOffline)"
    Write-Host "  Is paused: $($printQueue.IsPaused)"
    Write-Host ""

    # Create print job with RAW data type
    $printJob = $printQueue.AddJob("RAW Test")
    $stream = $printJob.JobStream

    Write-Host "OK - Print job created (ID: $($printJob.JobIdentifier))"
    Write-Host "OK - Writing $($bytes.Length) bytes..."

    $stream.Write($bytes, 0, $bytes.Length)
    $stream.Close()

    Write-Host "SUCCESS: RAW data written to print queue"
    Write-Host ""
    Write-Host "** CHECK YOUR PRINTER NOW **"
    Write-Host ""

} catch {
    Write-Host "ERROR occurred"
    Write-Host $_.Exception.Message
    exit 1
}
