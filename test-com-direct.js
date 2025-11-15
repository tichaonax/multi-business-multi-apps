/**
 * Direct COM port test - send simple text to printer
 */

const { execSync } = require('child_process');

// Simple test content with ESC/POS commands
const ESC = '\x1B';
const LF = '\x0A';
const GS = '\x1D';

// Initialize printer + simple text + cut
const testContent =
  ESC + '@' +                           // Initialize
  ESC + 'a' + String.fromCharCode(1) +  // Center align
  'TEST PRINT' + LF +
  'This is a test' + LF +
  LF + LF + LF +                        // Feed
  GS + 'V' + '\x41' + '\x03';           // Partial cut

console.log('Test content length:', testContent.length);
console.log('Test content (hex):', Buffer.from(testContent, 'binary').toString('hex'));

// Convert to base64
const base64Content = Buffer.from(testContent, 'binary').toString('base64');
console.log('Base64:', base64Content);

const portName = 'COM5';

const comPortPrint = `
  $port = new-Object System.IO.Ports.SerialPort ${portName},9600,None,8,one
  $port.Open()
  $bytes = [Convert]::FromBase64String('${base64Content}')
  Write-Host "Sending $($bytes.Length) bytes to ${portName}"
  $port.Write($bytes, 0, $bytes.Length)
  Start-Sleep -Milliseconds 500
  $port.Close()
  Write-Host "Done"
`.trim();

try {
  console.log('\nSending to COM5...');
  execSync(`powershell -Command "${comPortPrint}"`, {
    stdio: 'inherit',
    timeout: 10000,
  });
  console.log('✅ Test print sent successfully!');
} catch (error) {
  console.error('❌ Error:', error.message);
}
