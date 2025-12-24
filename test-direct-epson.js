/**
 * Direct EPSON TM-T20III Test Script
 *
 * This script tests direct printing to the EPSON TM-T20III Receipt printer
 * using multiple methods to determine which works best.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// EPSON Printer Configuration
const PRINTER_NAME = 'EPSON TM-T20III Receipt';
const USB_PORT = 'TMUSB001';

// ESC/POS Commands
const ESC = '\x1B';
const GS = '\x1D';
const LF = '\x0A';
const CUT = GS + 'V' + '\x41' + String.fromCharCode(3); // Partial cut paper

// Generate test receipt with ESC/POS commands
function generateTestReceipt() {
  let receipt = '';

  // Initialize printer (reset all settings)
  receipt += ESC + '@';

  // Center align
  receipt += ESC + 'a' + String.fromCharCode(1);

  // Print test header
  receipt += '================================' + LF;
  receipt += '      EPSON TM-T20III TEST      ' + LF;
  receipt += '================================' + LF;
  receipt += LF;

  // Left align
  receipt += ESC + 'a' + String.fromCharCode(0);

  // Test information
  receipt += `Test Date: ${new Date().toLocaleString()}` + LF;
  receipt += `Printer: ${PRINTER_NAME}` + LF;
  receipt += `Port: ${USB_PORT}` + LF;
  receipt += LF;

  // Test pattern
  receipt += 'Line 1: Regular text' + LF;
  receipt += 'Line 2: Testing 1234567890' + LF;
  receipt += 'Line 3: Special chars !@#$%^&*()' + LF;
  receipt += LF;

  // Center align
  receipt += ESC + 'a' + String.fromCharCode(1);
  receipt += '================================' + LF;
  receipt += '      TEST SUCCESSFUL!         ' + LF;
  receipt += '================================' + LF;
  receipt += LF + LF + LF;

  // Cut paper
  receipt += CUT;

  return receipt;
}

/**
 * Method 1: Print using Windows printer name via print command
 */
async function testMethod1() {
  console.log('\n========================================');
  console.log('METHOD 1: Windows Print Command');
  console.log('========================================');

  try {
    const tempDir = process.env.TEMP || os.tmpdir();
    const tempFile = path.join(tempDir, `epson-test-${Date.now()}.prn`);

    // Generate receipt content
    const content = generateTestReceipt();

    // Write binary content to temp file
    fs.writeFileSync(tempFile, Buffer.from(content, 'binary'));

    console.log(`✓ Created temp file: ${tempFile}`);
    console.log(`✓ Content size: ${content.length} bytes`);
    console.log(`✓ Sending to printer: ${PRINTER_NAME}`);

    // Use Windows PRINT command
    const printCmd = `print /D:"${PRINTER_NAME}" "${tempFile}"`;

    const result = execSync(printCmd, {
      encoding: 'utf8',
      timeout: 30000,
      shell: 'cmd.exe',
    });

    console.log('✅ SUCCESS: Print command executed');
    console.log(`   Result: ${result.trim()}`);

    // Clean up after delay
    setTimeout(() => {
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
          console.log('✓ Cleaned up temp file');
        }
      } catch (err) {
        console.warn('⚠️  Failed to delete temp file');
      }
    }, 5000);

    return true;
  } catch (error) {
    console.error('❌ FAILED:', error.message);
    return false;
  }
}

/**
 * Method 2: Print directly to USB port using PowerShell
 */
async function testMethod2() {
  console.log('\n========================================');
  console.log('METHOD 2: Direct USB Port (PowerShell)');
  console.log('========================================');

  try {
    const tempDir = process.env.TEMP || os.tmpdir();
    const tempFile = path.join(tempDir, `epson-test-${Date.now()}.prn`);

    // Generate receipt content
    const content = generateTestReceipt();

    // Write binary content to temp file
    fs.writeFileSync(tempFile, Buffer.from(content, 'binary'));

    console.log(`✓ Created temp file: ${tempFile}`);
    console.log(`✓ Content size: ${content.length} bytes`);
    console.log(`✓ Sending to USB port: ${USB_PORT}`);

    // Normalize port name
    const normalizedPort = `\\\\.\\${USB_PORT}`;

    // PowerShell script to write directly to USB port
    const psScript = `
      $port = "${normalizedPort}"
      $data = [System.IO.File]::ReadAllBytes("${tempFile.replace(/\\/g, '\\\\')}")

      Write-Host "Opening port: $port"
      Write-Host "Data size: $($data.Length) bytes"

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

    const result = execSync(`powershell -Command "${psScript.replace(/"/g, '\\"')}"`, {
      encoding: 'utf8',
      timeout: 30000,
      shell: 'cmd.exe',
    });

    console.log('✅ SUCCESS: Direct port write completed');
    console.log(`   ${result.trim()}`);

    // Clean up after delay
    setTimeout(() => {
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
          console.log('✓ Cleaned up temp file');
        }
      } catch (err) {
        console.warn('⚠️  Failed to delete temp file');
      }
    }, 5000);

    return true;
  } catch (error) {
    console.error('❌ FAILED:', error.message);
    return false;
  }
}

/**
 * Method 3: Print using 'printer' npm package (if installed)
 */
async function testMethod3() {
  console.log('\n========================================');
  console.log('METHOD 3: Printer NPM Package (RAW)');
  console.log('========================================');

  try {
    // Try to load printer package
    let printer;
    try {
      printer = require('printer');
    } catch (err) {
      console.log('⚠️  Printer package not installed');
      console.log('   Install with: npm install printer');
      return false;
    }

    // Generate receipt content
    const content = generateTestReceipt();
    const data = Buffer.from(content, 'binary');

    console.log(`✓ Content size: ${content.length} bytes`);
    console.log(`✓ Sending to printer: ${PRINTER_NAME}`);

    return new Promise((resolve, reject) => {
      printer.printDirect({
        data: data,
        printer: PRINTER_NAME,
        type: 'RAW',
        success: (jobID) => {
          console.log(`✅ SUCCESS: Print job sent (Job ID: ${jobID})`);
          resolve(true);
        },
        error: (err) => {
          console.error('❌ FAILED:', err.message);
          resolve(false);
        }
      });
    });
  } catch (error) {
    console.error('❌ FAILED:', error.message);
    return false;
  }
}

/**
 * Method 4: Copy file directly to USB port (cmd redirect)
 */
async function testMethod4() {
  console.log('\n========================================');
  console.log('METHOD 4: Direct File Copy to Port');
  console.log('========================================');

  try {
    const tempDir = process.env.TEMP || os.tmpdir();
    const tempFile = path.join(tempDir, `epson-test-${Date.now()}.prn`);

    // Generate receipt content
    const content = generateTestReceipt();

    // Write binary content to temp file
    fs.writeFileSync(tempFile, Buffer.from(content, 'binary'));

    console.log(`✓ Created temp file: ${tempFile}`);
    console.log(`✓ Content size: ${content.length} bytes`);
    console.log(`✓ Copying to port: \\\\.\\${USB_PORT}`);

    // Try to copy file directly to USB port
    const copyCmd = `copy /B "${tempFile}" \\\\.\\${USB_PORT}`;

    const result = execSync(copyCmd, {
      encoding: 'utf8',
      timeout: 30000,
      shell: 'cmd.exe',
    });

    console.log('✅ SUCCESS: File copied to port');
    console.log(`   Result: ${result.trim()}`);

    // Clean up after delay
    setTimeout(() => {
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
          console.log('✓ Cleaned up temp file');
        }
      } catch (err) {
        console.warn('⚠️  Failed to delete temp file');
      }
    }, 5000);

    return true;
  } catch (error) {
    console.error('❌ FAILED:', error.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  EPSON TM-T20III Printer Test Suite   ║');
  console.log('╚════════════════════════════════════════╝');
  console.log(`\nPrinter: ${PRINTER_NAME}`);
  console.log(`USB Port: ${USB_PORT}`);
  console.log(`Test Time: ${new Date().toLocaleString()}`);

  const results = {
    method1: await testMethod1(),
    method2: await testMethod2(),
    method3: await testMethod3(),
    method4: await testMethod4(),
  };

  console.log('\n========================================');
  console.log('TEST RESULTS SUMMARY');
  console.log('========================================');
  console.log(`Method 1 (Windows Print): ${results.method1 ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Method 2 (Direct USB PS): ${results.method2 ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Method 3 (Printer NPM):   ${results.method3 ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Method 4 (Direct Copy):   ${results.method4 ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('========================================');

  const successCount = Object.values(results).filter(r => r).length;
  console.log(`\n✓ ${successCount} out of 4 methods succeeded`);

  if (successCount === 0) {
    console.log('\n⚠️  WARNING: All methods failed!');
    console.log('   Please check:');
    console.log('   1. Printer is powered on');
    console.log('   2. Printer has paper loaded');
    console.log('   3. USB cable is connected');
    console.log('   4. Windows test print works');
  } else {
    console.log('\n✅ At least one method succeeded!');
    console.log('   Use the successful method(s) in your application.');
  }
}

// Run tests
runAllTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
