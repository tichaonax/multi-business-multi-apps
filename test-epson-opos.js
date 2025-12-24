/**
 * Test EPSON Printer with Plain Text First
 *
 * Since Windows test print works, let's try sending plain text
 * through our code to see if the communication path works
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PRINTER_NAME = 'EPSON TM-T20III Receipt';

console.log('\n=== Plain Text Communication Test ===\n');

// Create PLAIN TEXT (no ESC/POS commands at all)
const content = `
TEST PRINT FROM NODE.JS

This is a plain text test.
If this prints, then communication works.

Line 1
Line 2
Line 3

Time: ${new Date().toLocaleString()}




`;

const tempFile = path.join(os.tmpdir(), 'plain-text-test.txt');
fs.writeFileSync(tempFile, content, 'utf8');

console.log(`Created: ${tempFile}`);
console.log(`Size: ${content.length} bytes`);
console.log(`Printer: ${PRINTER_NAME}\n`);

console.log('Method 1: Windows PRINT command\n');

try {
  const result = execSync(`print /D:"${PRINTER_NAME}" "${tempFile}"`, {
    encoding: 'utf8',
    shell: 'cmd.exe',
    timeout: 10000,
  });

  console.log('✅ Command executed:', result.trim());
  console.log('\n** CHECK PRINTER (wait 10 seconds) **\n');

  setTimeout(() => {
    console.log('\nMethod 2: PowerShell Out-Printer\n');

    try {
      const ps = `Out-Printer -Name "${PRINTER_NAME}" -InputObject (Get-Content "${tempFile.replace(/\\/g, '\\\\')}" -Raw)`;
      const result2 = execSync(`powershell -Command "${ps}"`, {
        encoding: 'utf8',
        shell: 'cmd.exe',
        timeout: 10000,
      });

      console.log('✅ PowerShell print executed');
      console.log('\n** CHECK PRINTER AGAIN **\n');

    } catch (err) {
      console.log('⚠️  PowerShell method failed:', err.message);
    }

    // Cleanup
    setTimeout(() => {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
        console.log('Cleaned up temp file\n');
      }
    }, 5000);

  }, 3000);

} catch (error) {
  console.error('❌ Failed:', error.message);
  if (fs.existsSync(tempFile)) {
    fs.unlinkSync(tempFile);
  }
}
