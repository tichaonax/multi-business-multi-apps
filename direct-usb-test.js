/**
 * Direct USB Printer Test
 * Sends ESC/POS commands directly to USB PORT 001 using PowerShell
 * Bypasses all Node.js modules for a pure test
 */

const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

// ESC/POS command constants
const ESC = '\x1B';
const GS = '\x1D';
const LF = '\x0A';
const CR = '\x0D';

/**
 * Create ESC/POS test receipt
 */
function createTestReceipt() {
  let commands = [];

  // Initialize printer
  commands.push(ESC + '@');

  // Enable emphasized mode for darker printing
  commands.push(ESC + 'G' + '\x01');

  // Center align and print header
  commands.push(ESC + 'a' + '\x01'); // Center alignment
  commands.push('================================\n');
  commands.push('     TEST RECEIPT     \n');
  commands.push('================================\n');

  // Left align for content
  commands.push(ESC + 'a' + '\x00'); // Left alignment
  commands.push(`Date: ${new Date().toLocaleString()}\n`);
  commands.push('Printer: USB PORT 001\n');
  commands.push('Test: Direct ESC/POS Commands\n\n');

  commands.push('This is a direct test to verify\n');
  commands.push('that the USB printer is working\n');
  commands.push('with ESC/POS commands.\n\n');

  // Bold text for separator
  commands.push(ESC + 'E' + '\x01'); // Bold ON
  commands.push('================================\n');
  commands.push('      END OF TEST      \n');
  commands.push('================================\n');
  commands.push(ESC + 'E' + '\x00'); // Bold OFF

  // Feed paper and cut
  commands.push(LF + LF + LF);
  commands.push(GS + 'V' + '\x41' + '\x03'); // Partial cut

  return commands.join('');
}

/**
 * Send data directly to USB port using PowerShell
 */
async function sendToUSBPort(data, portName = '001') {
  // Create temp file for the data
  const tempDir = os.tmpdir();
  const tempFile = path.join(tempDir, `usb-test-${Date.now()}.bin`);

  try {
    // Write binary data to temp file
    fs.writeFileSync(tempFile, data, 'binary');

    // Normalize port name
    let normalizedPort = portName.toUpperCase();
    if (!normalizedPort.startsWith('\\\\.\\')) {
      normalizedPort = `\\\\.\\${normalizedPort}`;
    }

    console.log(`🖨️  Sending to USB Port: ${portName} (${normalizedPort})`);
    console.log(`📄  Temp file: ${tempFile}`);
    console.log(`📊  Data size: ${data.length} bytes`);

    // PowerShell script to write to USB port
    const psScript = `
      $port = "${normalizedPort}"
      $data = [System.IO.File]::ReadAllBytes("${tempFile.replace(/\\/g, '\\\\')}")

      try {
        $stream = New-Object System.IO.FileStream($port, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Write)
        $stream.Write($data, 0, $data.Length)
        $stream.Flush()
        $stream.Close()
        Write-Host "SUCCESS: Data sent to port"
        exit 0
      } catch {
        Write-Host "ERROR: $_"
        exit 1
      }
    `.trim();

    // Execute PowerShell command
    execSync(`powershell -Command "${psScript.replace(/"/g, '\\"')}"`, {
      encoding: 'utf8',
      timeout: 30000,
      shell: 'cmd.exe',
      stdio: 'inherit'
    });

    console.log('✅ Data sent successfully to USB port!');

  } catch (error) {
    console.error('❌ Failed to send data to USB port:', error.message);
    throw error;
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
 * Test different port names
 */
async function testMultiplePorts() {
  const portsToTest = ['001', 'USB001', 'COM1', 'LPT1'];

  for (const port of portsToTest) {
    try {
      console.log(`\n=== Testing Port: ${port} ===`);
      const testData = createTestReceipt();
      await sendToUSBPort(testData, port);
      console.log(`✅ Port ${port} test completed successfully!`);
      break; // Stop at first successful port
    } catch (error) {
      console.log(`❌ Port ${port} failed, trying next...`);
    }
  }
}

/**
 * Main test function
 */
async function runTest() {
  console.log('=== Direct USB Printer Test ===\n');

  try {
    console.log('Generating ESC/POS test receipt...');
    const testData = createTestReceipt();
    console.log(`Generated ${testData.length} bytes of ESC/POS data\n`);

    // Test the port
    await sendToUSBPort(testData, '001');

  } catch (error) {
    console.log('\n❌ Direct test failed, trying multiple ports...');
    await testMultiplePorts();
  }

  console.log('\n=== Test Complete ===');
}

// Run the test
runTest().catch(console.error);