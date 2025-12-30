/**
 * Windows Print Spooler Integration
 * For non-thermal printers (label, document) that use Windows print drivers
 */

import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

/**
 * Print text via Windows print spooler
 * Uses PowerShell Out-Printer which properly formats text for laser/inkjet printers
 *
 * @param text - The text content to print
 * @param printerName - The name of the printer (must match Windows printer name)
 * @param copies - Number of copies to print (default: 1)
 */
export async function printViaSpooler(
  text: string,
  printerName: string,
  copies: number = 1
): Promise<void> {
  const tempFile = join(tmpdir(), `print-job-${Date.now()}.txt`);

  try {
    console.log(`[PrintSpooler] Writing ${text.length} bytes to temp file: ${tempFile}`);
    writeFileSync(tempFile, text, 'utf-8');

    // Use PowerShell Get-Content | Out-Printer to print through Windows spooler
    // This properly formats the text using the printer's driver
    for (let i = 0; i < copies; i++) {
      const command = `powershell -Command "Get-Content '${tempFile}' | Out-Printer -Name '${printerName}'"`;

      console.log(`[PrintSpooler] Sending copy ${i + 1}/${copies} to printer via Windows spooler...`);
      await execAsync(command);
    }

    console.log(`[PrintSpooler] ✅ Print job sent successfully (${copies} copy/copies)`);
  } catch (error) {
    console.error(`[PrintSpooler] ❌ Error:`, error);
    throw new Error(`Failed to print via spooler: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    // Clean up temp file
    try {
      unlinkSync(tempFile);
      console.log(`[PrintSpooler] Cleaned up temp file`);
    } catch (cleanupError) {
      console.warn(`[PrintSpooler] Could not delete temp file:`, cleanupError);
    }
  }
}

/**
 * Print an image file via Windows print spooler
 * Uses rundll32 to directly print to the specified printer without UI popup
 *
 * @param imagePath - Full path to the image file
 * @param printerName - The name of the printer (must match Windows printer name)
 * @param copies - Number of copies to print (default: 1)
 */
export async function printImageFile(
  imagePath: string,
  printerName: string,
  copies: number = 1
): Promise<void> {
  if (!existsSync(imagePath)) {
    throw new Error(`Image file not found: ${imagePath}`);
  }

  try {
    console.log(`[PrintSpooler] Printing image file: ${imagePath}`);
    console.log(`[PrintSpooler] Printer: ${printerName}`);
    console.log(`[PrintSpooler] Copies: ${copies}`);

    // Use rundll32 with shimgvw.dll to print directly to the specified printer
    // This prints the image without showing any UI
    for (let i = 0; i < copies; i++) {
      // Direct print using rundll32 - this sends to Windows print spooler without UI
      const command = `rundll32.exe shimgvw.dll,ImageView_PrintTo /pt "${imagePath}" "${printerName}"`;

      console.log(`[PrintSpooler] Sending copy ${i + 1}/${copies} to printer...`);
      console.log(`[PrintSpooler] Command: ${command}`);

      await execAsync(command);

      // Small delay between copies to ensure they queue properly
      if (i < copies - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`[PrintSpooler] ✅ Image print job sent successfully (${copies} copy/copies)`);
  } catch (error) {
    console.error(`[PrintSpooler] ❌ Error printing image:`, error);
    throw new Error(`Failed to print image via spooler: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

