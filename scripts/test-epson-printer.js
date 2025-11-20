/**
 * Test EPSON TM-T20III Receipt Printer
 * Tests printing using Windows printer driver
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const printerName = 'EPSON TM-T20III Receipt';

console.log('═'.repeat(60));
console.log(' TEST EPSON TM-T20III RECEIPT PRINTER');
console.log('═'.repeat(60));
console.log('');

// Generate ESC/POS test receipt
function generateTestReceipt() {
  const ESC = '\x1B';
  const GS = '\x1D';
  const LF = '\x0A';
  const CUT = GS + 'V' + '\x41' + String.fromCharCode(3);

  let receipt = '';

  // Initialize printer
  receipt += ESC + '@';  // Initialize/reset
  receipt += ESC + 'l' + String.fromCharCode(0);  // Set left margin to 0
  receipt += ESC + 'G' + String.fromCharCode(1); // Double-strike ON (darker text)

  // Center align header
  receipt += ESC + 'a' + String.fromCharCode(1);
  receipt += '='.repeat(42) + LF;
  receipt += 'EPSON TM-T20III TEST' + LF;
  receipt += 'ESC/POS COMMANDS' + LF;
  receipt += '='.repeat(42) + LF;

  // Left align content
  receipt += ESC + 'a' + String.fromCharCode(0);
  receipt += LF;
  receipt += 'Test Date: ' + new Date().toLocaleString() + LF;
  receipt += 'Printer: ' + printerName + LF;
  receipt += 'Method: Windows Driver + ESC/POS' + LF;
  receipt += LF;

  receipt += '='.repeat(42) + LF;
  receipt += 'TEST ITEMS:' + LF;
  receipt += '='.repeat(42) + LF;
  receipt += '2x Test Item 1               $20.00' + LF;
  receipt += '1x Test Item 2               $15.50' + LF;
  receipt += '3x Test Item 3               $15.00' + LF;
  receipt += '='.repeat(42) + LF;
  receipt += LF;
  receipt += 'Subtotal                     $50.50' + LF;
  receipt += 'Tax                           $4.04' + LF;
  receipt += '='.repeat(42) + LF;

  // Bold total
  receipt += ESC + 'E' + String.fromCharCode(1); // Bold ON
  receipt += 'TOTAL                        $54.54' + LF;
  receipt += ESC + 'E' + String.fromCharCode(0); // Bold OFF

  receipt += '='.repeat(42) + LF;
  receipt += LF;

  // Center align footer
  receipt += ESC + 'a' + String.fromCharCode(1);
  receipt += '- - - - - - - - - - - - - - - - - - - -' + LF;
  receipt += 'Thank you!' + LF;
  receipt += LF;
  receipt += 'If text is dark and aligned,' + LF;
  receipt += 'the printer is working!' + LF;
  receipt += LF + LF;

  // Cut paper
  receipt += CUT;

  return receipt;
}

async function testPrint() {
  console.log('🖨️  Testing printer: ' + printerName);
  console.log('');

  const tempDir = process.env.TEMP || os.tmpdir();
  const tempFile = path.join(tempDir, `epson-test-${Date.now()}.prn`);

  try {
    // Step 1: Check printer exists and status
    console.log('📋 Step 1: Checking printer status...');

    const statusScript = `
      $printer = Get-Printer -Name "${printerName}"
      if ($printer) {
        Write-Host "Name: $($printer.Name)"
        Write-Host "Status: $($printer.PrinterStatus)"
        Write-Host "Port: $($printer.PortName)"
      } else {
        Write-Host "ERROR: Printer not found"
        exit 1
      }
    `.trim();

    const status = execSync(`powershell -Command "${statusScript.replace(/"/g, '\\"')}"`, {
      encoding: 'utf8',
      shell: 'cmd.exe',
      timeout: 10000,
    });

    console.log(status);

    if (status.includes('Error')) {
      console.log('');
      console.log('⚠️  WARNING: Printer status shows Error');
      console.log('   Attempting to print anyway...');
      console.log('   If print fails, run: node scripts/fix-epson-printer.js');
    }

    console.log('');

    // Step 2: Generate test receipt
    console.log('📝 Step 2: Generating ESC/POS test receipt...');
    const receipt = generateTestReceipt();
    fs.writeFileSync(tempFile, Buffer.from(receipt, 'binary'));
    console.log(`   ✅ Created: ${tempFile}`);
    console.log(`   📊 Size: ${receipt.length} bytes`);
    console.log('');

    // Step 3: Send to printer using Windows print command
    console.log('🖨️  Step 3: Sending to Windows printer driver...');

    // Use Windows PRINT command for RAW data
    const printCmd = `print /D:"${printerName}" "${tempFile}"`;

    execSync(printCmd, {
      encoding: 'utf8',
      timeout: 30000,
      shell: 'cmd.exe',
    });

    console.log('   ✅ Print job sent to Windows spooler');
    console.log('');

    console.log('✅ TEST COMPLETE!');
    console.log('─'.repeat(60));
    console.log('');
    console.log('📋 WHAT TO CHECK:');
    console.log('   1. Did the printer print a receipt?');
    console.log('   2. Is the text dark and readable?');
    console.log('   3. Are the headers centered?');
    console.log('   4. Did the paper cut automatically?');
    console.log('   5. Are there no extra margins?');
    console.log('');
    console.log('💡 IF NO RECEIPT PRINTED:');
    console.log('   1. Check printer is turned ON');
    console.log('   2. Check paper is loaded');
    console.log('   3. Check USB cable is connected');
    console.log('   4. Run: node scripts/fix-epson-printer.js');
    console.log('   5. Try test page from printer properties');
    console.log('─'.repeat(60));

  } catch (error) {
    console.error('\n❌ Test failed!');
    console.error('Error:', error.message);
    console.log('\n🔍 TROUBLESHOOTING:');
    console.log('   1. Run: node scripts/check-windows-printers.js');
    console.log('   2. Verify printer shows in Windows');
    console.log('   3. Run: node scripts/fix-epson-printer.js');
    console.log('   4. Check printer is powered on');
    console.log('   5. Try printing from Notepad to verify driver');
  } finally {
    // Clean up temp file
    setTimeout(() => {
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
          console.log('\n🗑️  Cleaned up temp file');
        }
      } catch (err) {
        console.warn(`Failed to delete temp file: ${tempFile}`);
      }
    }, 10000);
  }
}

testPrint()
  .then(() => {
    console.log('');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script error:', error);
    process.exit(1);
  });
