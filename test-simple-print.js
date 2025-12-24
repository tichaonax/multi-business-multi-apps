/**
 * Simple EPSON Print Test
 *
 * Ultra-simple test to verify basic printing works
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PRINTER_NAME = 'EPSON TM-T20III Receipt';

console.log('\n=== Simple EPSON Print Test ===\n');

// Create simple test content (plain text with ESC/POS commands)
const ESC = '\x1B';
const LF = '\x0A';
const GS = '\x1D';
const CUT = GS + 'V' + '\x41' + String.fromCharCode(3);

let content = '';
content += ESC + '@'; // Initialize printer
content += ESC + 'a' + String.fromCharCode(1); // Center align
content += 'SIMPLE TEST' + LF;
content += ESC + 'a' + String.fromCharCode(0); // Left align
content += 'Line 1' + LF;
content += 'Line 2' + LF;
content += 'Line 3' + LF;
content += LF + LF + LF;
content += CUT; // Cut paper

// Create temp file
const tempFile = path.join(os.tmpdir(), 'simple-test.prn');
fs.writeFileSync(tempFile, Buffer.from(content, 'binary'));

console.log(`Temp file: ${tempFile}`);
console.log(`Content size: ${content.length} bytes`);
console.log(`Printer: ${PRINTER_NAME}\n`);

try {
  // Send to printer using Windows print command
  console.log('Sending to printer...');
  const result = execSync(`print /D:"${PRINTER_NAME}" "${tempFile}"`, {
    encoding: 'utf8',
    shell: 'cmd.exe',
  });

  console.log('✅ SUCCESS!');
  console.log(result);

  // Wait a bit then clean up
  setTimeout(() => {
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
      console.log('Cleaned up temp file');
    }
  }, 3000);

} catch (error) {
  console.error('❌ FAILED:', error.message);
  console.error(error.stdout?.toString());
  console.error(error.stderr?.toString());
}
