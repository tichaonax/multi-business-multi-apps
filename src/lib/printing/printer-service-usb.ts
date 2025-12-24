/**
 * USB/Local Printer Service
 * Handles actual printing to USB or network printers
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Try to load printer package if available
let printerPackage: any = null;
try {
  printerPackage = require('printer');
  console.log('✅ Using printer package for RAW printing');
} catch (error) {
  console.warn('⚠️  printer package not available, falling back to Windows print command');
}

export interface PrintOptions {
  printerName: string;
  copies?: number;
  paperSize?: string;
}

/**
 * Send text to USB printer on Windows
 */
export async function sendToPrinter(
  content: string,
  options: PrintOptions
): Promise<void> {
  const { printerName, copies = 1 } = options;

  if (process.platform === 'win32') {
    await printWindows(content, printerName, copies);
  } else if (process.platform === 'darwin') {
    await printMacOS(content, printerName, copies);
  } else if (process.platform === 'linux') {
    await printLinux(content, printerName, copies);
  } else {
    throw new Error(`Unsupported platform: ${process.platform}`);
  }
}

/**
 * Print on Windows using Windows print spooler OR direct USB port
 * Supports:
 * - Windows registered printers (via print spooler)
 * - Direct USB port (USB001, \\.\USB001, etc.)
 * - COM ports (COM1, COM5, \\.\COM5, etc.)
 */
async function printWindows(
  content: string,
  printerName: string,
  copies: number
): Promise<void> {
  // Check if printerName is a direct USB/COM port
  const isDirectPort = /^(USB\d{3}|COM\d+|LPT\d+|TMUSB\d+|RongtaUSB.*)$/i.test(printerName);

  if (isDirectPort) {
    // Print directly to USB/COM port
    await printToDirectPort(content, printerName, copies);
  } else if (printerPackage) {
    // Use printer package for RAW printing (most reliable method)
    await printWithPrinterPackage(content, printerName, copies);
  } else {
    // Fallback to Windows print command
    await printToWindowsPrinter(content, printerName, copies);
  }
}

/**
 * Print directly to USB or COM port (bypasses Windows print spooler)
 */
async function printToDirectPort(
  content: string,
  portName: string,
  copies: number
): Promise<void> {
  // Create temp file for print job
  const tempDir = process.env.TEMP || os.tmpdir();
  const tempFile = path.join(tempDir, `print-${Date.now()}.prn`);

  try {
    // Write binary content to temp file
    fs.writeFileSync(tempFile, Buffer.from(content, 'binary'));

    // Normalize port name (add \\.\ prefix if not present)
    let normalizedPort = portName.toUpperCase();
    if (!normalizedPort.startsWith('\\\\.\\')) {
      normalizedPort = `\\\\.\\${normalizedPort}`;
    }

    console.log(`🖨️  Direct USB Port: ${portName} (${normalizedPort})`);
    console.log(`📄  Temp file: ${tempFile}`);
    console.log(`📊  Content size: ${content.length} bytes`);

    for (let i = 0; i < copies; i++) {
      // Use PowerShell to write directly to USB port
      // This bypasses Windows print spooler completely
      const psScript = `
        $port = "${normalizedPort}"
        $data = [System.IO.File]::ReadAllBytes("${tempFile.replace(/\\/g, '\\\\')}")

        try {
          $stream = New-Object System.IO.FileStream($port, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Write)
          $stream.Write($data, 0, $data.Length)
          $stream.Flush()
          $stream.Close()
          Write-Host "SUCCESS: Data sent to port"
        } catch {
          Write-Host "ERROR: $_"
          exit 1
        }
      `.trim();

      execSync(`powershell -Command "${psScript.replace(/"/g, '\\"')}"`, {
        encoding: 'utf8',
        timeout: 30000,
        shell: 'cmd.exe',
      });

      if (copies > 1) {
        console.log(`   📄 Copy ${i + 1} of ${copies} sent to port`);
      }

      // Small delay between copies
      if (i < copies - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`✅ Sent ${content.length} bytes to port: ${portName}`);

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`\n❌ Direct port print error:`, error);
    throw new Error(`Direct port print failed: ${errorMsg}`);
  } finally {
    // Clean up temp file
    setTimeout(() => {
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      } catch (err) {
        console.warn(`Failed to delete temp file: ${tempFile}`);
      }
    }, 5000);
  }
}

/**
 * Print using printer npm package (RAW method)
 * This is the most reliable method for Windows printers
 */
async function printWithPrinterPackage(
  content: string,
  printerName: string,
  copies: number
): Promise<void> {
  console.log(`🖨️  Using printer package RAW method`);
  console.log(`📋  Printer: ${printerName}`);
  console.log(`📊  Content size: ${content.length} bytes`);
  console.log(`📄  Copies: ${copies}`);

  const data = Buffer.from(content, 'binary');

  return new Promise((resolve, reject) => {
    let printedCopies = 0;

    const printCopy = () => {
      printerPackage.printDirect({
        data: data,
        printer: printerName,
        type: 'RAW',
        success: (jobID: string) => {
          printedCopies++;
          console.log(`   ✅ Copy ${printedCopies} of ${copies} sent (Job ID: ${jobID})`);

          if (printedCopies < copies) {
            // Print next copy after small delay
            setTimeout(printCopy, 500);
          } else {
            console.log(`✅ All ${copies} copies sent to printer: ${printerName}`);
            resolve();
          }
        },
        error: (err: Error) => {
          console.error(`❌ Print error:`, err);
          reject(new Error(`Printer package error: ${err.message}`));
        }
      });
    };

    // Start printing first copy
    printCopy();
  });
}

/**
 * Print to Windows registered printer via print spooler
 */
async function printToWindowsPrinter(
  content: string,
  printerName: string,
  copies: number
): Promise<void> {
  // Create temp file for print job
  const tempDir = process.env.TEMP || os.tmpdir();
  const tempFile = path.join(tempDir, `print-${Date.now()}.prn`);

  try {
    // Write binary content to temp file
    // ESC/POS commands must be written as binary data, not UTF-8 text
    fs.writeFileSync(tempFile, Buffer.from(content, 'binary'));

    console.log(`🖨️  Printer: ${printerName}`);
    console.log(`📄  Temp file: ${tempFile}`);
    console.log(`📊  Content size: ${content.length} bytes`);

    // Use Windows PRINT command which properly handles RAW data through the spooler
    for (let i = 0; i < copies; i++) {
      const printCmd = `print /D:"${printerName}" "${tempFile}"`;

      execSync(printCmd, {
        encoding: 'utf8',
        timeout: 30000,
        shell: 'cmd.exe',
      });

      if (copies > 1) {
        console.log(`   📄 Copy ${i + 1} of ${copies} sent to spooler`);
      }

      // Small delay between copies to prevent spooler issues
      if (i < copies - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`✅ Sent ${content.length} bytes to printer: ${printerName}`);

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`\n❌ Windows print error:`, error);
    throw new Error(`Windows print failed: ${errorMsg}`);
  } finally {
    // Clean up temp file after a delay to ensure print spooler has read it
    setTimeout(() => {
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      } catch (err) {
        console.warn(`Failed to delete temp file: ${tempFile}`);
      }
    }, 10000);
  }
}

/**
 * Print on macOS using lpr
 */
async function printMacOS(
  content: string,
  printerName: string,
  copies: number
): Promise<void> {
  const tempFile = path.join(os.tmpdir(), `print-${Date.now()}.txt`);

  try {
    fs.writeFileSync(tempFile, content, 'utf8');

    const command = `lpr -P "${printerName}" -# ${copies} "${tempFile}"`;
    execSync(command, { stdio: 'pipe' });

    console.log(`✅ Sent to macOS printer: ${printerName}`);

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`macOS print failed: ${errorMsg}`);
  } finally {
    setTimeout(() => {
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      } catch (err) {
        console.warn(`Failed to delete temp file: ${tempFile}`);
      }
    }, 5000);
  }
}

/**
 * Print on Linux using lp
 */
async function printLinux(
  content: string,
  printerName: string,
  copies: number
): Promise<void> {
  const tempFile = path.join(os.tmpdir(), `print-${Date.now()}.txt`);

  try {
    fs.writeFileSync(tempFile, content, 'utf8');

    const command = `lp -d "${printerName}" -n ${copies} "${tempFile}"`;
    execSync(command, { stdio: 'pipe' });

    console.log(`✅ Sent to Linux printer: ${printerName}`);

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`Linux print failed: ${errorMsg}`);
  } finally {
    setTimeout(() => {
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      } catch (err) {
        console.warn(`Failed to delete temp file: ${tempFile}`);
      }
    }, 5000);
  }
}

/**
 * List available printers on the system with port information
 */
export async function listSystemPrinters(): Promise<string[]> {
  try {
    if (process.platform === 'win32') {
      const output = execSync('powershell -Command "Get-Printer | Select-Object -ExpandProperty Name"', {
        encoding: 'utf8',
      });
      return output.trim().split('\n').map(name => name.trim()).filter(Boolean);
    } else if (process.platform === 'darwin') {
      const output = execSync('lpstat -p | awk \'{print $2}\'', {
        encoding: 'utf8',
      });
      return output.trim().split('\n').map(name => name.trim()).filter(Boolean);
    } else if (process.platform === 'linux') {
      const output = execSync('lpstat -p | awk \'{print $2}\'', {
        encoding: 'utf8',
      });
      return output.trim().split('\n').map(name => name.trim()).filter(Boolean);
    }
    return [];
  } catch (error) {
    console.error('Failed to list system printers:', error);
    return [];
  }
}

/**
 * List available printers with detailed information including ports
 */
export async function listSystemPrintersDetailed(): Promise<Array<{name: string, portName: string, driverName: string, type: string}>> {
  try {
    if (process.platform === 'win32') {
      const output = execSync('powershell -Command "Get-Printer | Select-Object Name, PortName, DriverName, Type | ConvertTo-Json"', {
        encoding: 'utf8',
      });

      if (!output.trim()) return [];

      const printers = JSON.parse(output);
      if (Array.isArray(printers)) {
        return printers.map(p => ({
          name: p.Name,
          portName: p.PortName,
          driverName: p.DriverName,
          type: p.Type
        }));
      } else {
        return [{
          name: printers.Name,
          portName: printers.PortName,
          driverName: printers.DriverName,
          type: printers.Type
        }];
      }
    } else if (process.platform === 'darwin') {
      // For macOS, return basic info since port details are harder to get
      const names = await listSystemPrinters();
      return names.map(name => ({
        name,
        portName: 'Unknown',
        driverName: 'Unknown',
        type: 'Local'
      }));
    } else if (process.platform === 'linux') {
      // For Linux, return basic info
      const names = await listSystemPrinters();
      return names.map(name => ({
        name,
        portName: 'Unknown',
        driverName: 'Unknown',
        type: 'Local'
      }));
    }
    return [];
  } catch (error) {
    console.error('Failed to list system printers with details:', error);
    return [];
  }
}

/**
 * Check if a printer is available
 */
export async function isPrinterAvailable(printerName: string): Promise<boolean> {
  const printers = await listSystemPrinters();
  return printers.includes(printerName);
}
