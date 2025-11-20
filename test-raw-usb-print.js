/**
 * Test RAW printing to USB port (bypasses Windows spooler)
 * This attempts to write directly to the printer port
 */

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🧪 Testing RAW USB Printing...\n');

// Very simple test receipt with ESC/POS commands
const testReceipt = Buffer.from([
  0x1B, 0x40,        // ESC @ - Initialize printer
  0x1B, 0x47, 0x01,  // ESC G 1 - Double strike ON
  0x1B, 0x61, 0x01,  // ESC a 1 - Center align
  ...Buffer.from('TEST RECEIPT\n'),
  0x1B, 0x61, 0x00,  // ESC a 0 - Left align
  ...Buffer.from('================\n'),
  ...Buffer.from('This is a test\n'),
  ...Buffer.from('Date: ' + new Date().toLocaleString() + '\n'),
  0x0A, 0x0A, 0x0A, 0x0A,  // Line feeds
  0x1D, 0x56, 0x41, 0x03   // GS V 41 03 - Partial cut
]);

try {
  // Method 1: Try writing to the device using type command (works for some USB printers)
  console.log('📝 Method 1: Using TYPE command to send to USB...');

  const os = require('os');
  const path = require('path');
  const tempFile = path.join(os.tmpdir(), 'test-usb-' + Date.now() + '.prn');
  fs.writeFileSync(tempFile, testReceipt);

  try {
    // First ensure temp file exists
    execSync(`dir "${tempFile}"`, { encoding: 'utf8' });
    console.log('✅ Temp file created:', tempFile);

    // Try using copy command to send to printer port
    console.log('🖨️  Sending via PRINT command...');
    execSync(`print /D:"EPSON TM-T20III Receipt" "${tempFile}"`, {
      encoding: 'utf8',
      shell: 'cmd.exe',
      timeout: 10000
    });

    console.log('✅ Print command executed');
    console.log('');
    console.log('🔍 Physical Printer Checks:');
    console.log('   1. Is the printer powered ON?');
    console.log('   2. Is the green "PAPER" light on?');
    console.log('   3. Is there paper loaded?');
    console.log('   4. Is the printer cover closed?');
    console.log('   5. Are there any blinking error lights?');
    console.log('');
    console.log('If the printer has an ERROR light blinking:');
    console.log('   - Try pressing the FEED button to clear any errors');
    console.log('   - Check for paper jams');
    console.log('   - Make sure the paper roll is correctly installed');

    // Cleanup
    setTimeout(() => {
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {}
    }, 5000);

  } catch (error) {
    console.error('❌ Print failed:', error.message);
    try {
      fs.unlinkSync(tempFile);
    } catch (e) {}
  }

} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
