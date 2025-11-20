/**
 * Test EPSON Printer Real-Time Status
 * The EPSON TM series has real-time status checking
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🔍 Testing EPSON TM Printer Status Commands...\n');

// EPSON Real-Time Status Commands
const commands = {
  // DLE EOT n - Real time status transmission
  status: Buffer.from([0x10, 0x04, 0x01]),  // DLE EOT 1 - Printer status
  rollPaperSensor: Buffer.from([0x10, 0x04, 0x04]),  // DLE EOT 4 - Paper sensor

  // ESC/POS Initialize and simple print
  simplePrint: Buffer.from([
    0x1B, 0x40,  // ESC @ - Initialize
    0x1B, 0x21, 0x30,  // ESC ! 0x30 - Double height and width
    ...Buffer.from('EPSON TEST\n'),
    0x1B, 0x21, 0x00,  // ESC ! 0 - Normal size
    ...Buffer.from('Printer is working!\n'),
    0x1B, 0x64, 0x03,  // ESC d 3 - Feed 3 lines
    0x1B, 0x69,  // ESC i - Partial cut
  ])
};

try {
  // Create a test file with the simple print command
  const tempFile = path.join(os.tmpdir(), `epson-test-${Date.now()}.prn`);

  console.log('📝 Creating test print job...');
  fs.writeFileSync(tempFile, commands.simplePrint);

  console.log(`📄 Temp file: ${tempFile}`);
  console.log(`📊 Size: ${commands.simplePrint.length} bytes`);
  console.log('');

  // Show hex dump
  console.log('🔍 Command hex dump:');
  console.log(commands.simplePrint.toString('hex').match(/.{1,32}/g).join('\n'));
  console.log('');

  // Send to printer using Windows PRINT command
  console.log('🖨️  Sending to EPSON TM-T20III Receipt...');

  const result = execSync(`print /D:"EPSON TM-T20III Receipt" "${tempFile}"`, {
    encoding: 'utf8',
    shell: 'cmd.exe',
    timeout: 10000
  });

  console.log('✅ Print command completed');
  console.log('');

  // Check print spooler
  console.log('🔍 Checking Windows print spooler...');
  try {
    const spoolerStatus = execSync('sc query spooler', { encoding: 'utf8' });
    if (spoolerStatus.includes('RUNNING')) {
      console.log('✅ Print Spooler service is running');
    } else {
      console.log('⚠️  Print Spooler service status:', spoolerStatus);
    }
  } catch (e) {
    console.log('⚠️  Could not check spooler status');
  }

  console.log('');
  console.log('📋 Troubleshooting steps:');
  console.log('');
  console.log('1. Check the printer:');
  console.log('   - Press the FEED button on the printer');
  console.log('   - Does paper advance? If YES, printer hardware is OK');
  console.log('   - If NO, check power and paper');
  console.log('');
  console.log('2. Check for error lights:');
  console.log('   - Is the ERROR light blinking red?');
  console.log('   - Is the PAPER light off (meaning no paper)?');
  console.log('');
  console.log('3. Try the EPSON TM Utility:');
  console.log('   - Open "TM Utility" from Start menu');
  console.log('   - Send a test print from the utility');
  console.log('   - Check printer settings (DIP switches)');
  console.log('');
  console.log('4. Check Windows Event Viewer:');
  console.log('   - Open Event Viewer → Windows Logs → System');
  console.log('   - Look for USB or Print Spooler errors');

  // Cleanup
  setTimeout(() => {
    try {
      fs.unlinkSync(tempFile);
      console.log('\n🗑️  Cleaned up temp file');
    } catch (e) {}
  }, 5000);

} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('');
  console.error('This suggests a problem with:');
  console.error('  - Printer driver installation');
  console.error('  - Windows print spooler');
  console.error('  - Printer communication');
  process.exit(1);
}
