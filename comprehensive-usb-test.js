/**
 * Comprehensive USB Printer Test
 * Tests various ESC/POS commands and printer functionality
 */

const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

// ESC/POS command constants
const ESC = '\x1B';
const GS = '\x1D';
const LF = '\x0A';

/**
 * Send data directly to USB port
 */
async function sendToUSBPort(data, portName = '001') {
  const tempDir = os.tmpdir();
  const tempFile = path.join(tempDir, `usb-test-${Date.now()}.bin`);

  try {
    fs.writeFileSync(tempFile, data, 'binary');

    let normalizedPort = portName.toUpperCase();
    if (!normalizedPort.startsWith('\\\\.\\')) {
      normalizedPort = `\\\\.\\${normalizedPort}`;
    }

    console.log(`🖨️  Port: ${portName} (${normalizedPort})`);
    console.log(`📊  Data: ${data.length} bytes`);

    const psScript = `
      $port = "${normalizedPort}"
      $data = [System.IO.File]::ReadAllBytes("${tempFile.replace(/\\/g, '\\\\')}")

      try {
        $stream = New-Object System.IO.FileStream($port, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Write)
        $stream.Write($data, 0, $data.Length)
        $stream.Flush()
        $stream.Close()
        Write-Host "SUCCESS"
        exit 0
      } catch {
        Write-Host "ERROR: $_"
        exit 1
      }
    `.trim();

    execSync(`powershell -Command "${psScript.replace(/"/g, '\\"')}"`, {
      encoding: 'utf8',
      timeout: 30000,
      shell: 'cmd.exe',
      stdio: 'pipe'
    });

    console.log('✅ Sent successfully!');

  } catch (error) {
    console.error('❌ Send failed:', error.message);
    throw error;
  } finally {
    setTimeout(() => {
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      } catch (err) {
        // Ignore cleanup errors
      }
    }, 5000);
  }
}

/**
 * Test 1: Basic text printing
 */
async function testBasicText() {
  console.log('\n=== Test 1: Basic Text ===');

  let commands = [];
  commands.push(ESC + '@'); // Initialize
  commands.push('Hello World!\n');
  commands.push('This is a basic text test.\n');
  commands.push(LF + LF);
  commands.push(GS + 'V' + '\x41' + '\x03'); // Cut

  await sendToUSBPort(commands.join(''));
}

/**
 * Test 2: Formatted text (bold, alignment)
 */
async function testFormattedText() {
  console.log('\n=== Test 2: Formatted Text ===');

  let commands = [];
  commands.push(ESC + '@'); // Initialize

  // Center alignment
  commands.push(ESC + 'a' + '\x01');
  commands.push(ESC + 'E' + '\x01'); // Bold
  commands.push('CENTERED BOLD TEXT\n');
  commands.push(ESC + 'E' + '\x00'); // Normal

  // Left alignment
  commands.push(ESC + 'a' + '\x00');
  commands.push('Left aligned text\n');
  commands.push('Normal formatting\n');

  // Right alignment
  commands.push(ESC + 'a' + '\x02');
  commands.push('Right aligned\n');

  commands.push(LF + LF);
  commands.push(GS + 'V' + '\x41' + '\x03'); // Cut

  await sendToUSBPort(commands.join(''));
}

/**
 * Test 3: Receipt format
 */
async function testReceipt() {
  console.log('\n=== Test 3: Receipt Format ===');

  let commands = [];
  commands.push(ESC + '@'); // Initialize
  commands.push(ESC + 'G' + '\x01'); // Emphasized mode

  // Header
  commands.push(ESC + 'a' + '\x01'); // Center
  commands.push('='.repeat(32) + '\n');
  commands.push('     TEST RECEIPT     \n');
  commands.push('='.repeat(32) + '\n');

  // Content
  commands.push(ESC + 'a' + '\x00'); // Left
  commands.push(`Date: ${new Date().toLocaleString()}\n`);
  commands.push('Item 1.....................$10.00\n');
  commands.push('Item 2.....................$15.50\n');
  commands.push('Tax........................$2.50\n');
  commands.push('-'.repeat(32) + '\n');

  // Total (bold)
  commands.push(ESC + 'E' + '\x01'); // Bold
  commands.push('TOTAL....................$28.00\n');
  commands.push(ESC + 'E' + '\x00'); // Normal

  commands.push(LF + LF + LF);
  commands.push(GS + 'V' + '\x41' + '\x03'); // Cut

  await sendToUSBPort(commands.join(''));
}

/**
 * Test 4: Special characters and encoding
 */
async function testSpecialChars() {
  console.log('\n=== Test 4: Special Characters ===');

  let commands = [];
  commands.push(ESC + '@'); // Initialize

  commands.push('ASCII: ABCDEFGHIJKLMNOPQRSTUVWXYZ\n');
  commands.push('Numbers: 0123456789\n');
  commands.push('Symbols: !@#$%^&*()_+-=[]{}|;:,.<>?\n');
  commands.push('Unicode: Café résumé naïve\n');

  commands.push(LF + LF);
  commands.push(GS + 'V' + '\x41' + '\x03'); // Cut

  await sendToUSBPort(commands.join(''));
}

/**
 * Test 5: Paper cutting and feeding
 */
async function testPaperControl() {
  console.log('\n=== Test 5: Paper Control ===');

  let commands = [];
  commands.push(ESC + '@'); // Initialize

  commands.push('Testing paper feed...\n');
  commands.push(LF); // Feed 1 line
  commands.push('Line after feed\n');
  commands.push(LF + LF); // Feed 2 more lines

  commands.push('Testing cut command...\n');
  commands.push(GS + 'V' + '\x41' + '\x03'); // Partial cut

  await sendToUSBPort(commands.join(''));
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Starting Comprehensive USB Printer Tests');
  console.log('Target: USB PORT 001');

  try {
    await testBasicText();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait between tests

    await testFormattedText();
    await new Promise(resolve => setTimeout(resolve, 2000));

    await testReceipt();
    await new Promise(resolve => setTimeout(resolve, 2000));

    await testSpecialChars();
    await new Promise(resolve => setTimeout(resolve, 2000));

    await testPaperControl();

    console.log('\n🎉 All tests completed successfully!');
    console.log('Check your printer for the test outputs.');

  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
  }
}

// Run tests
runAllTests().catch(console.error);