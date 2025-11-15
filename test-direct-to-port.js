/**
 * Test sending data directly to the printer port
 * Bypass the print command and write directly to \\.\COM5
 */

const fs = require('fs');

// Simple test content with ESC/POS commands
const ESC = '\x1B';
const LF = '\x0A';
const GS = '\x1D';

const testContent =
  ESC + '@' +                           // Initialize
  'DIRECT PORT TEST' + LF +
  'Testing direct write to COM5' + LF +
  'Date: ' + new Date().toLocaleString() + LF +
  LF + LF + LF +                        // Feed
  GS + 'V' + '\x41' + '\x03';           // Partial cut

console.log('Test content length:', testContent.length);
console.log('Test content (hex):', Buffer.from(testContent, 'binary').toString('hex').substring(0, 100));

// Try writing directly to COM5 device
try {
  console.log('\n=== Method 1: Direct write to \\\\.\\COM5 ===');
  const portPath = '\\\\.\\COM5';

  // This may require admin privileges
  fs.writeFileSync(portPath, Buffer.from(testContent, 'binary'));
  console.log('✅ Direct write succeeded');
} catch (error) {
  console.error('❌ Direct write failed:', error.message);
}

// Try node SerialPort if available
try {
  console.log('\n=== Method 2: Check if serialport module available ===');
  const SerialPort = require('serialport');
  console.log('✅ SerialPort module is available');

  const port = new SerialPort.SerialPort({
    path: 'COM5',
    baudRate: 9600,
    dataBits: 8,
    parity: 'none',
    stopBits: 1,
  });

  port.on('open', () => {
    console.log('✅ Port opened');
    port.write(Buffer.from(testContent, 'binary'), (err) => {
      if (err) {
        console.error('❌ Write error:', err.message);
      } else {
        console.log('✅ Data sent via SerialPort');
      }
      port.close();
    });
  });

  port.on('error', (err) => {
    console.error('❌ Port error:', err.message);
  });

} catch (error) {
  console.log('ℹ️  SerialPort module not available:', error.message);
  console.log('   (This is okay - we have other methods)');
}

console.log('\n==================================================');
console.log('Did anything print?');
console.log('==================================================');
