/**
 * Windows RAW Printer Service
 *
 * Uses Windows Spooler API via PowerShell to send RAW data to thermal printers
 * This is the ONLY method that successfully prints to EPSON TM-T20III
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

export interface WindowsPrintOptions {
  printerName: string;
  copies?: number;
}

/**
 * Send RAW ESC/POS data to Windows printer using Windows Spooler API
 *
 * This uses PowerShell with P/Invoke to call Windows printing functions directly.
 * This is the most reliable method for thermal receipt printers on Windows.
 */
export async function printRawData(
  content: string,
  options: WindowsPrintOptions
): Promise<void> {
  const { printerName, copies = 1 } = options;

  // Convert content to bytes using IBM437 encoding (standard for ESC/POS)
  const bytes = Buffer.from(content, 'binary');

  // Create temp file for the print data
  const tempDir = process.env.TEMP || os.tmpdir();
  const tempFile = path.join(tempDir, `print-${Date.now()}.prn`);

  try {
    // Write binary content to temp file
    fs.writeFileSync(tempFile, bytes);

    console.log(`[WindowsRAW] Printing to: ${printerName}`);
    console.log(`[WindowsRAW] Data size: ${bytes.length} bytes`);
    console.log(`[WindowsRAW] Copies: ${copies}`);

    for (let copy = 0; copy < copies; copy++) {
      await printSingleCopy(printerName, tempFile, bytes.length);

      if (copies > 1) {
        console.log(`[WindowsRAW] Printed copy ${copy + 1} of ${copies}`);
        // Small delay between copies
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`[WindowsRAW] ✅ Print job completed successfully`);

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[WindowsRAW] ❌ Print failed:`, errorMsg);
    throw new Error(`Windows RAW print failed: ${errorMsg}`);
  } finally {
    // Clean up temp file after delay
    setTimeout(() => {
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      } catch (err) {
        console.warn(`[WindowsRAW] Failed to delete temp file: ${tempFile}`);
      }
    }, 5000);
  }
}

/**
 * Print a single copy using Windows Spooler API via PowerShell
 */
async function printSingleCopy(
  printerName: string,
  tempFile: string,
  dataSize: number
): Promise<void> {
  const tempDir = process.env.TEMP || os.tmpdir();
  const psScriptFile = path.join(tempDir, `print-script-${Date.now()}.ps1`);

  // PowerShell script that uses Windows Spooler API P/Invoke
  // This is the EXACT method that successfully printed in our tests
  const psScript = `
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

$ErrorActionPreference = "Stop"

$printerName = "${printerName.replace(/"/g, '""')}"
$filePath = "${tempFile.replace(/\\/g, '\\\\')}"

$bytes = [System.IO.File]::ReadAllBytes($filePath)

$hPrinter = [IntPtr]::Zero
$result = [RawPrinter]::OpenPrinter($printerName, [ref]$hPrinter, [IntPtr]::Zero)

if (-not $result) {
    throw "Failed to open printer: $printerName"
}

try {
    $docInfo = New-Object RawPrinter+DOC_INFO_1
    $docInfo.pDocName = "Receipt"
    $docInfo.pOutputFile = $null
    $docInfo.pDatatype = "RAW"

    $result = [RawPrinter]::StartDocPrinter($hPrinter, 1, $docInfo)
    if (-not $result) {
        throw "Failed to start document"
    }

    $result = [RawPrinter]::StartPagePrinter($hPrinter)
    if (-not $result) {
        throw "Failed to start page"
    }

    $pBytes = [Runtime.InteropServices.Marshal]::AllocHGlobal($bytes.Length)
    [Runtime.InteropServices.Marshal]::Copy($bytes, 0, $pBytes, $bytes.Length)

    $written = 0
    $result = [RawPrinter]::WritePrinter($hPrinter, $pBytes, $bytes.Length, [ref]$written)

    [Runtime.InteropServices.Marshal]::FreeHGlobal($pBytes)

    if (-not $result) {
        throw "Failed to write to printer"
    }

    [RawPrinter]::EndPagePrinter($hPrinter) | Out-Null
    [RawPrinter]::EndDocPrinter($hPrinter) | Out-Null

    Write-Output "OK:$written"

} finally {
    [RawPrinter]::ClosePrinter($hPrinter) | Out-Null
}
`.trim();

  try {
    // Write PowerShell script to temp file to avoid command-line escaping issues
    fs.writeFileSync(psScriptFile, psScript, 'utf8');

    const result = execSync(`powershell -ExecutionPolicy Bypass -File "${psScriptFile}"`, {
      encoding: 'utf8',
      timeout: 30000,
      shell: 'cmd.exe',
    });

    // Check result
    if (result.includes('OK:')) {
      const written = result.match(/OK:(\d+)/)?.[1];
      console.log(`[WindowsRAW] Wrote ${written} bytes to ${printerName}`);
    } else {
      throw new Error('Unexpected PowerShell output: ' + result);
    }

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`PowerShell print failed: ${errorMsg}`);
  } finally {
    // Clean up PowerShell script file
    setTimeout(() => {
      try {
        if (fs.existsSync(psScriptFile)) {
          fs.unlinkSync(psScriptFile);
        }
      } catch (err) {
        // Ignore cleanup errors
      }
    }, 1000);
  }
}

/**
 * Check if a Windows printer exists and is available
 */
export async function checkPrinterAvailable(printerName: string): Promise<boolean> {
  try {
    const result = execSync(
      `powershell -Command "Get-Printer -Name '${printerName.replace(/'/g, "''")}' | Select-Object -ExpandProperty PrinterStatus"`,
      {
        encoding: 'utf8',
        timeout: 5000,
      }
    );

    const status = result.trim();
    return status === 'Normal' || status === 'Idle';

  } catch (error) {
    console.error(`[WindowsRAW] Printer not available: ${printerName}`);
    return false;
  }
}

/**
 * List all available Windows printers
 */
export async function listWindowsPrinters(): Promise<Array<{
  name: string;
  portName: string;
  status: string;
}>> {
  try {
    const result = execSync(
      'powershell -Command "Get-Printer | Select-Object Name, PortName, PrinterStatus | ConvertTo-Json"',
      {
        encoding: 'utf8',
        timeout: 10000,
      }
    );

    const printers = JSON.parse(result);
    const printerArray = Array.isArray(printers) ? printers : [printers];

    return printerArray.map(p => ({
      name: p.Name,
      portName: p.PortName,
      status: p.PrinterStatus || 'Unknown',
    }));

  } catch (error) {
    console.error('[WindowsRAW] Failed to list printers:', error);
    return [];
  }
}
