/**
 * Direct Epson Printer Test
 * Uses the exact same method that worked before
 */

const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

function testPrinter() {
  console.log('🖨️  Testing Epson TM-T20III Printer...\n');

  // Simple test content
  const testContent = `
TEST PRINT
==========
Date: ${new Date().toLocaleString()}
Printer: EPSON TM-T20III
Status: Testing Windows Spooler
==========
`;

  console.log('📄 Test content:');
  console.log(testContent);

  // Create temp file
  const tempFile = path.join(os.tmpdir(), 'epson-test.txt');
  fs.writeFileSync(tempFile, testContent, 'utf8');
  console.log(`📁 Created: ${tempFile}`);

  try {
    // Use the exact command that worked before
    console.log('🖨️  Sending to printer...');
    const command = `print /D:"EPSON TM-T20III Receipt" "${tempFile}"`;

    console.log(`Command: ${command}`);

    const result = execSync(command, {
      encoding: 'utf8',
      timeout: 10000,
      stdio: 'pipe'
    });

    console.log('✅ Command executed successfully!');
    console.log('📋 Check your physical printer for the test output.');

  } catch (error) {
    console.error('❌ Print command failed:', error.message);

    // Try alternative method
    console.log('\n🔄 Trying alternative method...');
    try {
      const altCommand = `powershell -Command "Get-Content '${tempFile.replace(/\\/g, '\\\\')}' | Out-Printer -Name 'EPSON TM-T20III Receipt'"`;
      execSync(altCommand, {
        encoding: 'utf8',
        timeout: 10000,
        stdio: 'pipe'
      });
      console.log('✅ Alternative method succeeded!');
      console.log('📋 Check your physical printer.');
    } catch (altError) {
      console.error('❌ Alternative method also failed:', altError.message);
    }
  } finally {
    // Clean up
    setTimeout(() => {
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
          console.log('🧹 Temp file cleaned up');
        }
      } catch (e) {
        console.warn('⚠️  Cleanup failed:', e.message);
      }
    }, 3000);
  }
}

// Also check printer status
function checkPrinterStatus() {
  console.log('📊 Checking printer status...\n');

  try {
    const statusCommand = `powershell -Command "Get-Printer -Name 'EPSON TM-T20III Receipt' | Format-List Name, PrinterStatus, IsDefault, PortName, DriverName"`;
    const status = execSync(statusCommand, { encoding: 'utf8' });
    console.log('Printer Status:');
    console.log(status);
  } catch (error) {
    console.error('❌ Failed to check printer status:', error.message);
  }
}

checkPrinterStatus();
testPrinter();