/**
 * Simple COM3 Direct Print Test
 * No ESC/POS, no Windows driver - just raw text to COM3
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Configuration
const COM_PORT = 'COM3';

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
 * Print directly to COM port using PowerShell
 */
async function printToCOMPort(portName, content) {
  const tempDir = process.env.TEMP || os.tmpdir();
  const tempFile = path.join(tempDir, `test-print-${Date.now()}.txt`);

  try {
    console.log('\n🖨️  Testing Direct COM Port Printing (No ESC/POS)\n');
    console.log(`COM Port: ${portName}`);
    console.log(`Temp file: ${tempFile}`);
    console.log(`Content length: ${content.length} characters\n`);

    // Write content to temp file
    fs.writeFileSync(tempFile, content, 'utf8');

    console.log('📄 Receipt preview:');
    console.log('─'.repeat(50));
    console.log(content);
    console.log('─'.repeat(50));
    console.log('\n📤 Sending to COM port...\n');

    // Normalize port name
    const normalizedPort = portName.toUpperCase();
    const devicePath = `\\\\.\\${normalizedPort}`;

    console.log(`📡 Opening port: ${devicePath}\n`);

    // Use PowerShell to write directly to COM port
    const psScript = `
      $port = "${devicePath}"
      $data = Get-Content "${tempFile.replace(/\\/g, '\\\\')}" -Raw
      $bytes = [System.Text.Encoding]::UTF8.GetBytes($data)

      try {
        $stream = New-Object System.IO.FileStream($port, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Write)
        $stream.Write($bytes, 0, $bytes.Length)
        $stream.Flush()
        $stream.Close()
        Write-Host "✅ SUCCESS: Sent $($bytes.Length) bytes to $port"
      } catch {
        Write-Host "❌ ERROR: $_"
        exit 1
      }
    `.trim();

    const result = execSync(`powershell -Command "${psScript.replace(/"/g, '\\"')}"`, {
      encoding: 'utf8',
      timeout: 30000,
      shell: 'cmd.exe',
    });

    console.log(result);
    console.log('\n✨ Test completed!\n');
    console.log('Please check your printer for output.\n');

  } catch (error) {
    console.error('\n❌ COM port print failed:');
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }

    console.log('\n💡 Troubleshooting tips:');
    console.log('1. Verify printer is connected to COM3');
    console.log('2. Check printer is powered on');
    console.log('3. Verify no other application is using COM3');
    console.log('4. Check COM port settings (baud rate, etc.) in Device Manager');

    console.log('\n📝 Alternative: Install Windows Driver');
    console.log('For simpler printing, install the RONGTA Windows driver:');
    console.log('1. Visit RONGTA website to download driver');
    console.log('2. Install the driver');
    console.log('3. Add printer in Windows Settings');
    console.log('4. Then use standard Windows printing');

  } finally {
    // Clean up temp file
    setTimeout(() => {
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
          console.log(`🧹 Cleaned up temp file\n`);
        }
      } catch (err) {
        console.warn(`⚠️  Failed to delete temp file`);
      }
    }, 5000);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('  DIRECT COM PORT TEST (No Driver, No ESC/POS)');
  console.log('='.repeat(60));

  console.log(`\n🎯 Target Port: ${COM_PORT}\n`);

  // Generate test receipt
  const testReceipt = generateSimpleReceipt();

  // Print test receipt
  await printToCOMPort(COM_PORT, testReceipt);
}

// Run the test
main().catch(console.error);
