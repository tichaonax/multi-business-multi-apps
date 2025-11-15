/**
 * Test Windows RAW printing (bypassing COM port direct access)
 * This uses the Windows print spooler which handles the COM port communication
 */

const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Simple test content with ESC/POS commands
const ESC = '\x1B';
const LF = '\x0A';
const GS = '\x1D';

// Initialize printer + simple text + cut
const testContent =
  ESC + '@' +                           // Initialize
  ESC + 'a' + String.fromCharCode(1) +  // Center align
  'WINDOWS SPOOLER TEST' + LF +
  'Testing RAW data type printing' + LF +
  'Date: ' + new Date().toLocaleString() + LF +
  LF + LF + LF +                        // Feed
  GS + 'V' + '\x41' + '\x03';           // Partial cut

const printerName = 'EPSON TM-T20III Receipt';

console.log('Test content length:', testContent.length);
console.log('Test content (first 50 bytes hex):', Buffer.from(testContent, 'binary').slice(0, 50).toString('hex'));

// Create temp file with binary content
const tempDir = process.env.TEMP || os.tmpdir();
const tempFile = path.join(tempDir, `raw-print-test-${Date.now()}.prn`);

console.log('\nWriting to temp file:', tempFile);
fs.writeFileSync(tempFile, Buffer.from(testContent, 'binary'));

// Method 1: PowerShell Out-Printer with -FilePath
console.log('\n=== Method 1: PowerShell Out-Printer ===');
try {
  const cmd1 = `Out-Printer -Name '${printerName}' -FilePath '${tempFile.replace(/\\/g, '\\\\')}'`;
  console.log('Command:', cmd1);
  execSync(`powershell -Command "${cmd1}"`, {
    stdio: 'inherit',
    timeout: 10000,
  });
  console.log('✅ Method 1 completed');
} catch (error) {
  console.error('❌ Method 1 failed:', error.message);
}

console.log('\nWaiting 3 seconds...\n');
setTimeout(() => {
  // Method 2: Copy command (for RAW data)
  console.log('=== Method 2: COPY command to printer port ===');
  try {
    // Use copy /b for binary data
    const cmd2 = `copy /b "${tempFile}" "\\\\localhost\\${printerName}"`;
    console.log('Command:', cmd2);
    execSync(cmd2, {
      stdio: 'inherit',
      timeout: 10000,
      shell: 'cmd.exe'
    });
    console.log('✅ Method 2 completed');
  } catch (error) {
    console.error('❌ Method 2 failed:', error.message);
  }

  console.log('\nWaiting 3 seconds...\n');
  setTimeout(() => {
    // Method 3: Print command
    console.log('=== Method 3: Windows PRINT command ===');
    try {
      const cmd3 = `print /D:"${printerName}" "${tempFile}"`;
      console.log('Command:', cmd3);
      execSync(cmd3, {
        stdio: 'inherit',
        timeout: 10000,
        shell: 'cmd.exe'
      });
      console.log('✅ Method 3 completed');
    } catch (error) {
      console.error('❌ Method 3 failed:', error.message);
    }

    // Clean up
    setTimeout(() => {
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
          console.log('\n✅ Cleaned up temp file');
        }
      } catch (err) {
        console.warn('Failed to delete temp file:', err.message);
      }

      console.log('\n==================================================');
      console.log('Testing complete!');
      console.log('Did the printer print anything?');
      console.log('If yes, note which method worked');
      console.log('==================================================');
    }, 2000);
  }, 3000);
}, 3000);
