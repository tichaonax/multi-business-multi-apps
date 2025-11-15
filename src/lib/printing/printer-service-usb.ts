/**
 * USB/Local Printer Service
 * Handles actual printing to USB or network printers
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

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
 * Print on Windows using Windows print spooler
 * This handles all printer types (USB, COM, Network) through the Windows spooler
 * which correctly manages COM port communication for thermal printers
 */
async function printWindows(
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
    // This works for all printer types: USB, COM port, and Network printers
    for (let i = 0; i < copies; i++) {
      const printCmd = `print /D:"${printerName}" "${tempFile}"`;

      execSync(printCmd, {
        encoding: 'utf8',
        timeout: 30000,
        shell: 'cmd.exe', // Use cmd.exe for Windows PRINT command
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
    }, 10000); // 10 second delay to ensure spooler has processed the file
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
 * List available printers on the system
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
 * Check if a printer is available
 */
export async function isPrinterAvailable(printerName: string): Promise<boolean> {
  const printers = await listSystemPrinters();
  return printers.includes(printerName);
}
