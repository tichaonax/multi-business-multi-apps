/**
 * Simple Windows Printer Test - Version 2
 * Uses PowerShell Out-Printer instead of print command
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Configuration
const PRINTER_NAME = 'RONGTA 80mm Series Printer';

/**
 * Generate a simple receipt (plain text, no ESC/POS)
 */
function generateSimpleReceipt() {
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
 * Print using PowerShell Out-Printer cmdlet
 */
async function printWithPowerShell(printerName, content) {
  const tempDir = process.env.TEMP || os.tmpdir();
  const tempFile = path.join(tempDir, `test-print-${Date.now()}.txt`);

  try {
    console.log('\n🖨️  Testing Windows Printer (PowerShell Out-Printer)\n');
    console.log(`Printer: ${printerName}`);
    console.log(`Temp file: ${tempFile}`);
    console.log(`Content length: ${content.length} characters\n`);

    // Write content to temp file
    fs.writeFileSync(tempFile, content, 'utf8');

    console.log('📄 Receipt preview:');
    console.log('─'.repeat(50));
    console.log(content);
    console.log('─'.repeat(50));
    console.log('\n📤 Sending to printer using PowerShell...\n');

    // Use PowerShell Out-Printer cmdlet
    const psCmd = `Get-Content "${tempFile}" | Out-Printer -Name "${printerName}"`;

    const result = execSync(`powershell -Command "${psCmd}"`, {
      encoding: 'utf8',
      timeout: 30000,
      shell: 'cmd.exe',
    });

    console.log('✅ Print command executed successfully!');
    if (result) {
      console.log(`Result: ${result}`);
    }

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
    console.log('1. Check printer is powered on');
    console.log('2. Verify printer has paper loaded');
    console.log('3. Check printer is not showing any error lights');
    console.log('4. Try printing a test page from Windows printer settings');

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
 * Main execution
 */
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('  WINDOWS PRINTER TEST v2 (PowerShell Method)');
  console.log('='.repeat(60));

  console.log(`\n🎯 Target Printer: "${PRINTER_NAME}"\n`);

  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Generate test receipt
  const testReceipt = generateSimpleReceipt();

  // Print test receipt
  await printWithPowerShell(PRINTER_NAME, testReceipt);
}

// Run the test
main().catch(console.error);
