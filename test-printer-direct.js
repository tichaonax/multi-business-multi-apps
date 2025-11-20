const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Simple test receipt
const testReceipt = '\x1B\x40' + // Initialize
  '\x1B\x47\x01' + // Double strike ON
  '\x1B\x61\x01' + // Center align
  'TEST RECEIPT\n' +
  '================\n' +
  '\x1B\x61\x00' + // Left align
  'This is a test\n' +
  'Date: ' + new Date().toLocaleString() + '\n' +
  '\n\n\n\n' +
  '\x1D\x56\x41\x03'; // Cut

console.log('🧪 Testing direct printer communication...\n');

// Check if printer exists
try {
  const output = execSync('powershell -Command "Get-Printer | Select-Object -ExpandProperty Name"', {
    encoding: 'utf8'
  });

  const printers = output.trim().split('\n').map(p => p.trim());
  console.log('📋 Available printers:');
  printers.forEach((p, i) => console.log(`   ${i + 1}. ${p}`));
  console.log('');

  const epsonPrinter = printers.find(p => p.includes('EPSON') || p.includes('TM-T20'));

  if (!epsonPrinter) {
    console.error('❌ EPSON printer not found!');
    console.log('   Please check:');
    console.log('   1. Is the printer powered on?');
    console.log('   2. Is it connected via USB or network?');
    console.log('   3. Is the printer driver installed?');
    process.exit(1);
  }

  console.log(`✅ Found EPSON printer: ${epsonPrinter}`);
  console.log('');

  // Create temp file
  const tempFile = path.join(os.tmpdir(), `test-print-${Date.now()}.prn`);
  fs.writeFileSync(tempFile, Buffer.from(testReceipt, 'binary'));

  console.log(`📄 Created temp file: ${tempFile}`);
  console.log(`📊 Content size: ${testReceipt.length} bytes`);
  console.log('');

  // Send to printer
  console.log(`🖨️  Sending to printer: ${epsonPrinter}...`);
  const printCmd = `print /D:"${epsonPrinter}" "${tempFile}"`;

  execSync(printCmd, {
    encoding: 'utf8',
    timeout: 30000,
    shell: 'cmd.exe'
  });

  console.log('✅ Print command executed successfully!');
  console.log('');
  console.log('🔍 Check if the receipt printed on the physical printer.');
  console.log('   If nothing printed, check:');
  console.log('   1. Printer power and paper');
  console.log('   2. Windows print spooler service status');
  console.log('   3. Printer driver configuration');

  // Cleanup
  setTimeout(() => {
    try {
      fs.unlinkSync(tempFile);
      console.log('🗑️  Cleaned up temp file');
    } catch (err) {
      // Ignore cleanup errors
    }
  }, 5000);

} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('');
  console.error('Stack trace:', error.stack);
  process.exit(1);
}
