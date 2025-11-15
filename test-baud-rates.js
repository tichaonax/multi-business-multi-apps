/**
 * Test different baud rates to find the correct one for the printer
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
  'BAUD RATE TEST' + LF +
  'If you see this, the baud rate is correct' + LF +
  LF + LF + LF +                        // Feed
  GS + 'V' + '\x41' + '\x03';           // Partial cut

// Convert to base64
const base64Content = Buffer.from(testContent, 'binary').toString('base64');

const portName = 'COM5';

// Common baud rates for EPSON thermal printers
const baudRates = [9600, 19200, 38400, 57600, 115200];

async function testBaudRate(baud) {
  const comPortPrint = `
    try {
      $$port = new-Object System.IO.Ports.SerialPort ${portName},${baud},None,8,one
      $$port.ReadTimeout = 1000
      $$port.WriteTimeout = 1000
      $$port.Open()
      $$bytes = [Convert]::FromBase64String('${base64Content}')
      Write-Host "Testing ${baud} baud - Sending $$($($bytes.Length)) bytes..."
      $$port.Write($$bytes, 0, $$bytes.Length)
      Start-Sleep -Milliseconds 1000
      $$port.Close()
      Write-Host "SUCCESS: ${baud} baud"
    } catch {
      Write-Host "FAILED: ${baud} baud - $$($_.Exception.Message)"
    }
  `.trim();

  try {
    console.log(`\n--- Testing ${baud} baud ---`);
    execSync(`powershell -Command "${comPortPrint}"`, {
      stdio: 'inherit',
      timeout: 15000,
    });
    console.log(`Wait 3 seconds before next test...`);
    await new Promise(resolve => setTimeout(resolve, 3000));
  } catch (error) {
    console.error(`Error at ${baud} baud:`, error.message);
  }
}

async function runTests() {
  console.log('==================================================');
  console.log('Testing different baud rates on COM5');
  console.log('==================================================');
  console.log('Watch the printer - it should print when the correct baud rate is found');
  console.log('');

  for (const baud of baudRates) {
    await testBaudRate(baud);
  }

  console.log('\n==================================================');
  console.log('Testing complete!');
  console.log('Did the printer print anything?');
  console.log('If yes, note which baud rate worked');
  console.log('==================================================');
}

runTests().catch(console.error);
