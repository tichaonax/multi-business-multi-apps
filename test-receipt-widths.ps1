# Test Different Receipt Widths to Find Optimal Setting
# EPSON TM-T20III with 80mm paper can typically do 48 characters

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
Write-Host "=== Receipt Width Test ==="
Write-Host ""
Write-Host "Testing different character widths to find optimal settings"
Write-Host ""

# Test widths: 32, 42, 48 (common thermal printer widths)
$widths = @(32, 42, 48)

foreach ($width in $widths) {
    Write-Host "Testing width: $width characters"

    $ESC = [char]0x1B
    $GS = [char]0x1D
    $LF = [char]0x0A

    $line = "=" * $width

    $receipt = ""
    $receipt += "$ESC@"  # Initialize
    $receipt += "$ESC" + "a" + [char]0x01  # Center
    $receipt += "WIDTH TEST: $width chars$LF"
    $receipt += "$ESC" + "a" + [char]0x00  # Left
    $receipt += "$line$LF"
    $receipt += "0123456789" * [Math]::Floor($width / 10) + "0123456789".Substring(0, $width % 10) + "$LF"
    $receipt += "$line$LF"

    # Test item with price alignment
    $itemName = "Test Item"
    $price = "`$12.99"
    $padding = " " * ($width - $itemName.Length - $price.Length)
    $receipt += "$itemName$padding$price$LF"

    $receipt += "$line$LF"
    $receipt += "$LF$LF"

    $bytes = [System.Text.Encoding]::GetEncoding("IBM437").GetBytes($receipt)

    # Print it
    $hPrinter = [IntPtr]::Zero
    [RawPrinter]::OpenPrinter($printerName, [ref]$hPrinter, [IntPtr]::Zero) | Out-Null

    $docInfo = New-Object RawPrinter+DOC_INFO_1
    $docInfo.pDocName = "Width Test $width"
    $docInfo.pOutputFile = $null
    $docInfo.pDatatype = "RAW"

    [RawPrinter]::StartDocPrinter($hPrinter, 1, $docInfo) | Out-Null
    [RawPrinter]::StartPagePrinter($hPrinter) | Out-Null

    $pBytes = [Runtime.InteropServices.Marshal]::AllocHGlobal($bytes.Length)
    [Runtime.InteropServices.Marshal]::Copy($bytes, 0, $pBytes, $bytes.Length)

    $written = 0
    [RawPrinter]::WritePrinter($hPrinter, $pBytes, $bytes.Length, [ref]$written) | Out-Null

    [Runtime.InteropServices.Marshal]::FreeHGlobal($pBytes)

    [RawPrinter]::EndPagePrinter($hPrinter) | Out-Null
    [RawPrinter]::EndDocPrinter($hPrinter) | Out-Null
    [RawPrinter]::ClosePrinter($hPrinter) | Out-Null

    Write-Host "  Sent $written bytes"

    # Wait between tests
    Start-Sleep -Milliseconds 500
}

Write-Host ""
Write-Host "All width tests sent!"
Write-Host ""
Write-Host "** CHECK YOUR PRINTER **"
Write-Host "You should see 3 receipts showing different widths."
Write-Host "Find which one uses the full width without wrapping:"
Write-Host "  - Look at the line of numbers (0123456789...)"
Write-Host "  - Look at the equals signs (====...)"
Write-Host "  - The correct width should reach edge-to-edge"
Write-Host ""
Write-Host "Tell me which width looks best:"
Write-Host "  32, 42, or 48 characters?"
Write-Host ""
