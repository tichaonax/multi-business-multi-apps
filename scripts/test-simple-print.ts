/**
 * Simple Windows Printer Test
 * Tests printing without ESC/POS commands - using standard Windows driver
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Configuration
const PRINTER_NAME = 'EPSON TM-T20III Receipt'; // Change this to match your printer name
const TEST_RECEIPT = generateSimpleReceipt();

/**
 * Generate a simple receipt (plain text, no ESC/POS)
 */
function generateSimpleReceipt(): string {
  const receipt = `
=====================================
       MULTI-BUSINESS POS
       123 Main Street
       City, State 12345
       Tel: (555) 123-4567
=====================================

Receipt #: RCT-001
Date: ${new Date().toLocaleString()}
Cashier: Test User

-------------------------------------
ITEMS
-------------------------------------
Product A            $10.00
Product B            $15.50
Product C            $7.25
-------------------------------------
Subtotal:            $32.75
Tax (8%):            $2.62
-------------------------------------
TOTAL:               $35.37
-------------------------------------

Payment Method: Cash
Amount Tendered:     $40.00
Change:              $4.63

=====================================
      Thank you for your business!
       Please come again!
=====================================


`;

  return receipt;
}

/**
 * Print to Windows printer using standard print command
 */
async function printToWindows(printerName: string, content: string): Promise<void> {
  // Create temp file
  const tempDir = process.env.TEMP || os.tmpdir();
  const tempFile = path.join(tempDir, `test-print-${Date.now()}.txt`);

  try {
    console.log('\n🖨️  Testing Windows Printer (Standard Driver)\n');
    console.log(`Printer: ${printerName}`);
    console.log(`Temp file: ${tempFile}`);
    console.log(`Content length: ${content.length} characters\n`);

    // Write content to temp file
    fs.writeFileSync(tempFile, content, 'utf8');

    console.log('📄 Receipt preview:');
    console.log('─'.repeat(50));
    console.log(content);
    console.log('─'.repeat(50));
    console.log('\n📤 Sending to printer...\n');

    // Use Windows PRINT command
    const printCmd = `print /D:"${printerName}" "${tempFile}"`;

    const result = execSync(printCmd, {
      encoding: 'utf8',
      timeout: 30000,
      shell: 'cmd.exe',
    });

    console.log('✅ Print command executed successfully!');
    console.log(`Result: ${result}`);

    console.log('\n✨ Test completed!\n');
    console.log('Please check your printer for the receipt.\n');

  } catch (error) {
    console.error('\n❌ Print failed:');
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }

    console.log('\n💡 Troubleshooting tips:');
    console.log('1. Check printer name is correct');
    console.log('2. Verify printer is online and ready');
    console.log('3. Try running this to see available printers:');
    console.log('   powershell -Command "Get-Printer | Select-Object Name"');

  } finally {
    // Clean up temp file
    setTimeout(() => {
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
          console.log(`🧹 Cleaned up temp file: ${tempFile}\n`);
        }
      } catch (err) {
        console.warn(`⚠️  Failed to delete temp file: ${tempFile}`);
      }
    }, 5000);
  }
}

/**
 * List available Windows printers
 */
function listPrinters(): void {
  console.log('\n📋 Available Windows Printers:\n');

  try {
    const output = execSync(
      'powershell -Command "Get-Printer | Select-Object Name, PrinterStatus, DriverName | Format-Table -AutoSize"',
      { encoding: 'utf8' }
    );

    console.log(output);
  } catch (error) {
    console.error('❌ Failed to list printers:', error);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('  WINDOWS PRINTER TEST (No ESC/POS)');
  console.log('='.repeat(60));

  // List available printers first
  listPrinters();

  // Ask user to confirm printer name
  console.log(`🎯 Target Printer: "${PRINTER_NAME}"\n`);
  console.log('If this is incorrect, please edit the script and change PRINTER_NAME.\n');

  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Print test receipt
  await printToWindows(PRINTER_NAME, TEST_RECEIPT);
}

// Run the test
main().catch(console.error);
