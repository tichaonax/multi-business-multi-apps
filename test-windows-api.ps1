# Use Windows API P/Invoke to send RAW data
# This mimics what the test print page does

Add-Type @"
using System;
using System.Runtime.InteropServices;

public class RawPrinter {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public class DOC_INFO_1 {
        [MarshalAs(UnmanagedType.LPStr)]
        public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)]
        public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)]
        public string pDatatype;
    }

    [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DOC_INFO_1 di);

    [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);
}
"@

$printerName = "EPSON TM-T20III Receipt"

Write-Host ""
Write-Host "=== Windows API RAW Print Test ==="
Write-Host ""

# Create simple test data
$testData = "WINDOWS API TEST`r`nLine 1`r`nLine 2`r`nLine 3`r`n`r`n`r`n`r`n"
$bytes = [System.Text.Encoding]::ASCII.GetBytes($testData)

Write-Host "Data size: $($bytes.Length) bytes"
Write-Host "Printer: $printerName"
Write-Host ""

# Open printer
$hPrinter = [IntPtr]::Zero
$result = [RawPrinter]::OpenPrinter($printerName, [ref]$hPrinter, [IntPtr]::Zero)

if (-not $result) {
    Write-Host "ERROR: Could not open printer"
    Write-Host "Error code: $([Runtime.InteropServices.Marshal]::GetLastWin32Error())"
    exit 1
}

Write-Host "OK: Printer opened (Handle: $hPrinter)"

try {
    # Start document
    $docInfo = New-Object RawPrinter+DOC_INFO_1
    $docInfo.pDocName = "RAW API Test"
    $docInfo.pOutputFile = $null
    $docInfo.pDatatype = "RAW"

    $result = [RawPrinter]::StartDocPrinter($hPrinter, 1, $docInfo)
    if (-not $result) {
        throw "StartDocPrinter failed: $([Runtime.InteropServices.Marshal]::GetLastWin32Error())"
    }

    Write-Host "OK: Document started"

    # Start page
    $result = [RawPrinter]::StartPagePrinter($hPrinter)
    if (-not $result) {
        throw "StartPagePrinter failed: $([Runtime.InteropServices.Marshal]::GetLastWin32Error())"
    }

    Write-Host "OK: Page started"

    # Write data
    $pBytes = [Runtime.InteropServices.Marshal]::AllocHGlobal($bytes.Length)
    [Runtime.InteropServices.Marshal]::Copy($bytes, 0, $pBytes, $bytes.Length)

    $written = 0
    $result = [RawPrinter]::WritePrinter($hPrinter, $pBytes, $bytes.Length, [ref]$written)

    [Runtime.InteropServices.Marshal]::FreeHGlobal($pBytes)

    if (-not $result) {
        throw "WritePrinter failed: $([Runtime.InteropServices.Marshal]::GetLastWin32Error())"
    }

    Write-Host "OK: Wrote $written bytes"

    # End page
    [RawPrinter]::EndPagePrinter($hPrinter) | Out-Null
    Write-Host "OK: Page ended"

    # End document
    [RawPrinter]::EndDocPrinter($hPrinter) | Out-Null
    Write-Host "OK: Document ended"

    Write-Host ""
    Write-Host "SUCCESS: Print job completed!"
    Write-Host ""
    Write-Host "** CHECK YOUR PRINTER NOW **"
    Write-Host ""

} finally {
    # Close printer
    [RawPrinter]::ClosePrinter($hPrinter) | Out-Null
    Write-Host "OK: Printer closed"
}
