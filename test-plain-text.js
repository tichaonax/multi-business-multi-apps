/**
 * Test Plain Text Printing (No ESC/POS)
 *
 * First verify we can print plain text through Windows
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PRINTER_NAME = 'EPSON TM-T20III Receipt';

console.log('\n=== Plain Text Print Test ===\n');

// Create simple plain text (no ESC/POS commands)
const content = `
PLAIN TEXT TEST
===============

Time: ${new Date().toLocaleString()}
Printer: ${PRINTER_NAME}

Line 1: Testing plain text
Line 2: Testing plain text
Line 3: Testing plain text

If this prints, Windows communication works!


`;

// Create temp file
const tempFile = path.join(os.tmpdir(), 'plain-test.txt');
fs.writeFileSync(tempFile, content, 'utf8'); // UTF-8 text, not binary

console.log(`Temp file: ${tempFile}`);
console.log(`Content:\n${content}`);
console.log(`\nSending to printer: ${PRINTER_NAME}\n`);

try {
  // Use Windows notepad print command
  // This should definitely work if Windows printing works
  const result = execSync(`notepad.exe /p "${tempFile}"`, {
    encoding: 'utf8',
    timeout: 10000,
    shell: 'cmd.exe',
  });

  console.log('✅ Notepad print command sent');
  console.log('\n** CHECK PRINTER - Should print within a few seconds **\n');

  setTimeout(() => {
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
      console.log('Cleaned up temp file');
    }
  }, 10000);

} catch (error) {
  console.error('❌ Failed:', error.message);

  // Try alternative method - direct print command
  console.log('\nTrying alternative method (print command)...\n');

  try {
    const result2 = execSync(`print /D:"${PRINTER_NAME}" "${tempFile}"`, {
      encoding: 'utf8',
      shell: 'cmd.exe',
    });

    console.log('✅ Print command sent:', result2);
    console.log('\n** CHECK PRINTER **\n');

    setTimeout(() => {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }, 5000);

  } catch (err2) {
    console.error('❌ Also failed:', err2.message);
  }
}
