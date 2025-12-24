# Test ESC/POS Commands with Windows API (the method that works!)
# Now let's test if ESC/POS commands work with this method

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
Write-Host "=== ESC/POS Test with Windows API ==="
Write-Host ""

# Create ESC/POS receipt with full formatting
$ESC = [char]0x1B
$GS = [char]0x1D
$LF = [char]0x0A

$receipt = ""
$receipt += "$ESC@"  # Initialize printer
$receipt += "$ESC" + "a" + [char]0x01  # Center align
$receipt += "================================$LF"
$receipt += "  ESC/POS FORMATTING TEST$LF"
$receipt += "================================$LF"
$receipt += "$ESC" + "a" + [char]0x00  # Left align
$receipt += "$LF"
$receipt += "Receipt: 2025-12-21-001$LF"
$receipt += "Date: $((Get-Date).ToString())$LF"
$receipt += "Cashier: Test User$LF"
$receipt += "$LF"
$receipt += "1x Burger" + (" " * 29) + "`$12.99$LF"
$receipt += "1x Fries" + (" " * 30) + "`$4.99$LF"
$receipt += "1x WiFi Token" + (" " * 24) + "`$5.00$LF"
$receipt += "$LF"
$receipt += "Subtotal" + (" " * 28) + "`$22.98$LF"
$receipt += "Tax" + (" " * 33) + "`$1.84$LF"
$receipt += "TOTAL" + (" " * 31) + "`$24.82$LF"
$receipt += "$LF"
$receipt += "Payment: CASH$LF"
$receipt += "$LF"
$receipt += "--------------------------------$LF"
$receipt += "$ESC" + "a" + [char]0x01  # Center align
$receipt += "WiFi Token: ABC12345$LF"
$receipt += "Duration: 60 minutes$LF"
$receipt += "$ESC" + "a" + [char]0x00  # Left align
$receipt += "--------------------------------$LF"
$receipt += "$LF"
$receipt += "$ESC" + "a" + [char]0x01  # Center align
$receipt += "Thank you for your business!$LF"
$receipt += "$LF$LF$LF"
$receipt += "$GS" + "V" + [char]0x00  # Cut paper

$bytes = [System.Text.Encoding]::GetEncoding("IBM437").GetBytes($receipt)

Write-Host "Receipt size: $($bytes.Length) bytes"
Write-Host "Printer: $printerName"
Write-Host ""

# Open printer
$hPrinter = [IntPtr]::Zero
$result = [RawPrinter]::OpenPrinter($printerName, [ref]$hPrinter, [IntPtr]::Zero)

if (-not $result) {
    Write-Host "ERROR: Could not open printer"
    exit 1
}

Write-Host "OK: Printer opened"

try {
    # Start document
    $docInfo = New-Object RawPrinter+DOC_INFO_1
    $docInfo.pDocName = "ESC/POS Receipt"
    $docInfo.pOutputFile = $null
    $docInfo.pDatatype = "RAW"

    $result = [RawPrinter]::StartDocPrinter($hPrinter, 1, $docInfo)
    if (-not $result) {
        throw "StartDocPrinter failed"
    }

    Write-Host "OK: Document started"

    # Start page
    [RawPrinter]::StartPagePrinter($hPrinter) | Out-Null
    Write-Host "OK: Page started"

    # Write data
    $pBytes = [Runtime.InteropServices.Marshal]::AllocHGlobal($bytes.Length)
    [Runtime.InteropServices.Marshal]::Copy($bytes, 0, $pBytes, $bytes.Length)

    $written = 0
    $result = [RawPrinter]::WritePrinter($hPrinter, $pBytes, $bytes.Length, [ref]$written)

    [Runtime.InteropServices.Marshal]::FreeHGlobal($pBytes)

    if (-not $result) {
        throw "WritePrinter failed"
    }

    Write-Host "OK: Wrote $written bytes"

    # End page
    [RawPrinter]::EndPagePrinter($hPrinter) | Out-Null
    Write-Host "OK: Page ended"

    # End document
    [RawPrinter]::EndDocPrinter($hPrinter) | Out-Null
    Write-Host "OK: Document ended"

    Write-Host ""
    Write-Host "SUCCESS: ESC/POS receipt sent!"
    Write-Host ""
    Write-Host "** CHECK YOUR PRINTER **"
    Write-Host "You should see a formatted receipt with:"
    Write-Host "  - Centered header"
    Write-Host "  - Receipt items with prices"
    Write-Host "  - WiFi token info"
    Write-Host "  - Paper cut at the end"
    Write-Host ""

} finally {
    [RawPrinter]::ClosePrinter($hPrinter) | Out-Null
}
