/**
 * Test USB/COM Direct Port Printing
 * Usage: node scripts/test-usb-printer.js [PORT_NAME]
 * Example: node scripts/test-usb-printer.js USB001
 * Example: node scripts/test-usb-printer.js COM5
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// Get port name from command line argument or default to USB001
const portName = process.argv[2] || 'USB001';

// Validate port name format
if (!/^(USB\d{3}|COM\d+|LPT\d+)$/i.test(portName)) {
  console.error('❌ Invalid port name format!');
  console.error('   Valid formats: USB001, USB002, COM1, COM5, LPT1, etc.\n');
  console.error('Usage: node scripts/test-usb-printer.js [PORT_NAME]');
  console.error('Example: node scripts/test-usb-printer.js USB001');
  process.exit(1);
}

// ESC/POS commands
const ESC = '\x1B';
const GS = '\x1D';
const LF = '\x0A';

function generateTestReceipt() {
  let receipt = '';

  // Initialize printer
  receipt += ESC + '@';  // Initialize/reset
  receipt += ESC + 'l' + String.fromCharCode(0);  // Set left margin to 0
  receipt += ESC + 'G' + String.fromCharCode(1); // Double-strike ON (darker text)

  // Center align
  receipt += ESC + 'a' + String.fromCharCode(1);
  receipt += '='.repeat(42) + LF;
  receipt += 'DIRECT PORT TEST' + LF;
  receipt += 'ESC/POS Thermal Printer' + LF;
  receipt += '='.repeat(42) + LF;

  // Left align
  receipt += ESC + 'a' + String.fromCharCode(0);
  receipt += LF;
  receipt += 'Test Date: ' + new Date().toLocaleString() + LF;
  receipt += 'Port: ' + portName + ' (Direct)' + LF;
  receipt += 'Method: ESC/POS Commands' + LF;
  receipt += LF;

  receipt += '='.repeat(42) + LF;
  receipt += 'TEST ITEMS:' + LF;
  receipt += '='.repeat(42) + LF;
  receipt += '1x Test Item 1               $10.00' + LF;
  receipt += '2x Test Item 2               $20.00' + LF;
  receipt += '1x Test Item 3               $15.00' + LF;
  receipt += '='.repeat(42) + LF;
  receipt += LF;

  receipt += 'Subtotal                     $45.00' + LF;
  receipt += 'Tax                           $3.60' + LF;
  receipt += '='.repeat(42) + LF;
  receipt += 'TOTAL                        $48.60' + LF;
  receipt += '='.repeat(42) + LF;
  receipt += LF;

  // Center align
  receipt += ESC + 'a' + String.fromCharCode(1);
  receipt += 'Thank you!' + LF;
  receipt += 'USB Direct Print Test' + LF;
  receipt += LF + LF;

  // Cut paper
  receipt += GS + 'V' + '\x41' + String.fromCharCode(3);

  return receipt;
}

async function testUSBPrint() {
  console.log(`🖨️  Testing ${portName} Direct Port Printing...\n`);

  const tempDir = process.env.TEMP || os.tmpdir();
  const tempFile = path.join(tempDir, `port-test-${Date.now()}.prn`);

  try {
    // Generate test receipt
    console.log('📝 Generating test receipt with ESC/POS commands...');
    const receipt = generateTestReceipt();

    // Write to temp file
    fs.writeFileSync(tempFile, Buffer.from(receipt, 'binary'));
    console.log(`✅ Created temp file: ${tempFile}`);
    console.log(`📊 Size: ${receipt.length} bytes\n`);

    // Print to specified port
    console.log(`🖨️  Sending to ${portName} port...`);
    const normalizedPort = `\\\\.\\${portName.toUpperCase()}`;

    const psScript = `
      $port = "${normalizedPort}"
      $data = [System.IO.File]::ReadAllBytes("${tempFile.replace(/\\/g, '\\\\')}")

      Write-Host "Port: $port"
      Write-Host "Data size: $($data.Length) bytes"

      try {
        $stream = New-Object System.IO.FileStream($port, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Write)
        Write-Host "Port opened successfully"

        $stream.Write($data, 0, $data.Length)
        Write-Host "Data written to port"

        $stream.Flush()
        Write-Host "Data flushed"

        $stream.Close()
        Write-Host "Port closed"

        Write-Host ""
        Write-Host "SUCCESS: Receipt sent to ${portName}"
      } catch {
        Write-Host ""
        Write-Host "ERROR: $_"
        exit 1
      }
    `.trim();

    const output = execSync(`powershell -Command "${psScript.replace(/"/g, '\\"')}"`, {
      encoding: 'utf8',
      shell: 'cmd.exe',
    });

    console.log(output);
    console.log('\n✅ Test Complete!');
    console.log('\n📋 What to check:');
    console.log('   1. Did the printer print a receipt?');
    console.log('   2. Is the text dark and readable?');
    console.log('   3. Are the headers centered?');
    console.log('   4. Did the paper cut automatically?');
    console.log('   5. Are there no extra margins?\n');

  } catch (error) {
    console.error('\n❌ Test Failed!');
    console.error('Error:', error.message);
    console.error('\n🔍 Troubleshooting:');
    console.error(`   1. Check that printer is connected to ${portName}`);
    console.error('   2. Verify printer is powered on');
    console.error('   3. Ensure cable is properly connected');
    console.error('   4. Try unplugging and reconnecting the cable');
    console.error('   5. Check Windows Device Manager for the port');
    console.error('   6. Verify port name in Device Manager matches ' + portName + '\n');
    throw error;
  } finally {
    // Clean up temp file
    setTimeout(() => {
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
          console.log(`🗑️  Cleaned up temp file\n`);
        }
      } catch (err) {
        console.warn(`Failed to delete temp file: ${tempFile}`);
      }
    }, 2000);
  }
}

// Run test
console.log('═'.repeat(50));
console.log(` ${portName} DIRECT PORT PRINTING TEST`);
console.log('═'.repeat(50));
console.log('');

testUSBPrint()
  .then(() => {
    console.log('✅ Test script completed');
    setTimeout(() => process.exit(0), 3000);
  })
  .catch((error) => {
    console.error('❌ Test script failed');
    setTimeout(() => process.exit(1), 3000);
  });
