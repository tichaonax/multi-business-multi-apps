/**
 * Final USB Direct Print Test
 *
 * This uses the most reliable method: PowerShell direct write to USB port
 * This bypasses Windows print spooler and writes ESC/POS data directly to the thermal printer
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Configuration
const USB_PORT = 'TMUSB001'; // Your EPSON TM-T20III USB port
const RECEIPT_WIDTH = 42; // Characters per line for 80mm paper

// ESC/POS Commands
const ESC = '\x1B';
const GS = '\x1D';
const LF = '\x0A';
const CUT = GS + 'V' + '\x41' + String.fromCharCode(3); // Partial cut
const ALIGN_LEFT = ESC + 'a' + String.fromCharCode(0);
const ALIGN_CENTER = ESC + 'a' + String.fromCharCode(1);
const ALIGN_RIGHT = ESC + 'a' + String.fromCharCode(2);

function centerText(text) {
  return text;
}

function line(char = '=') {
  return char.repeat(RECEIPT_WIDTH);
}

function formatMoney(amount) {
  return `$${amount.toFixed(2)}`;
}

function formatTotal(label, amount) {
  const amountStr = formatMoney(amount);
  const padding = RECEIPT_WIDTH - label.length - amountStr.length;
  return label + ' '.repeat(Math.max(1, padding)) + amountStr + LF;
}

// Generate a complete WiFi token receipt
function generateWiFiReceipt() {
  let receipt = '';

  // Initialize printer and reset margins
  receipt += ESC + '@';  // Reset all settings
  receipt += ESC + 'l' + String.fromCharCode(0);  // Set left margin to 0

  // Header
  receipt += ALIGN_CENTER;
  receipt += centerText('HXI EATS RESTAURANT') + LF;
  receipt += centerText('123 Main Street') + LF;
  receipt += centerText('(555) 123-4567') + LF;
  receipt += LF;

  // Receipt info
  receipt += ALIGN_LEFT;
  receipt += `Receipt: 2025-12-21-001` + LF;
  receipt += `Date: ${new Date().toLocaleString()}` + LF;
  receipt += `Cashier: Test User` + LF;
  receipt += LF;

  // Items
  receipt += `1x Burger` + LF;
  receipt += ' '.repeat(RECEIPT_WIDTH - 6) + '$12.99' + LF;
  receipt += `1x Fries` + LF;
  receipt += ' '.repeat(RECEIPT_WIDTH - 5) + '$4.99' + LF;
  receipt += `1x WiFi Token - 1 Hour` + LF;
  receipt += ' '.repeat(RECEIPT_WIDTH - 5) + '$5.00' + LF;
  receipt += LF;

  // Totals
  receipt += formatTotal('Subtotal', 22.98);
  receipt += formatTotal('Tax', 1.84);
  receipt += formatTotal('TOTAL', 24.82);
  receipt += LF;

  // Payment
  receipt += `Payment: CASH` + LF;
  receipt += formatTotal('Amount Paid', 30.00);
  receipt += formatTotal('Change', 5.18);

  // WiFi Token Section
  receipt += LF;
  receipt += line('-') + LF;
  receipt += ALIGN_CENTER;
  receipt += 'WiFi Access Purchased' + LF;
  receipt += ALIGN_LEFT;
  receipt += line('-') + LF;
  receipt += `Package: 1 Hour Package` + LF;
  receipt += `Token: ABC12345` + LF;
  receipt += `Duration: 60 minutes` + LF;
  receipt += `Data: 500 MB down / 250 MB up` + LF;
  receipt += `Network: GuestWiFi` + LF;
  receipt += LF;
  receipt += `To connect:` + LF;
  receipt += `1. Join WiFi network "GuestWiFi"` + LF;
  receipt += `2. Open browser` + LF;
  receipt += `3. Enter token: ABC12345` + LF;
  receipt += LF;

  // Footer
  receipt += ALIGN_CENTER;
  receipt += line('-') + LF;
  receipt += centerText('Support: (555) 999-0000') + LF;
  receipt += centerText('Thank you for your business!') + LF;
  receipt += centerText('Please come again!') + LF;
  receipt += LF + LF + LF;

  // Cut paper
  receipt += CUT;

  return receipt;
}

/**
 * Send data directly to USB port using PowerShell
 */
async function printToUSB(content, portName) {
  const tempDir = process.env.TEMP || os.tmpdir();
  const tempFile = path.join(tempDir, `print-${Date.now()}.prn`);

  try {
    // Write binary content to temp file
    fs.writeFileSync(tempFile, Buffer.from(content, 'binary'));

    console.log(`✓ Created temp file: ${tempFile}`);
    console.log(`✓ Content size: ${content.length} bytes`);
    console.log(`✓ USB Port: ${portName}`);
    console.log('');

    // Normalize port name
    const normalizedPort = `\\\\.\\${portName}`;

    // PowerShell script to write directly to USB port
    const psScript = `
      $ErrorActionPreference = "Stop"
      $port = "${normalizedPort}"
      $data = [System.IO.File]::ReadAllBytes("${tempFile.replace(/\\/g, '\\\\')}")

      Write-Host "Opening USB port: $port"
      Write-Host "Sending $($data.Length) bytes..."
      Write-Host ""

      try {
        $stream = New-Object System.IO.FileStream($port, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Write)
        $stream.Write($data, 0, $data.Length)
        $stream.Flush()
        $stream.Close()

        Write-Host "✅ SUCCESS: Data written to USB port"
        Write-Host ""
        Write-Host "╔════════════════════════════════════╗"
        Write-Host "║  CHECK YOUR PRINTER NOW!           ║"
        Write-Host "║  Receipt should be printing...     ║"
        Write-Host "╚════════════════════════════════════╝"
      } catch {
        Write-Host "❌ ERROR: $_"
        throw $_
      }
    `.trim();

    const result = execSync(`powershell -Command "${psScript.replace(/"/g, '\\"')}"`, {
      encoding: 'utf8',
      timeout: 30000,
      shell: 'cmd.exe',
    });

    console.log(result);

    // Clean up temp file after delay
    setTimeout(() => {
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
          console.log('\n✓ Cleaned up temp file');
        }
      } catch (err) {
        console.warn('\n⚠️  Failed to delete temp file');
      }
    }, 5000);

    return true;

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('\n❌ Print failed:', errorMsg);
    console.error('\nPossible issues:');
    console.error('  1. Printer is powered off');
    console.error('  2. USB cable is disconnected');
    console.error('  3. Printer is in error state (check LED)');
    console.error('  4. Port name is incorrect (check Device Manager)');
    throw error;
  }
}

// Main test
console.log('\n╔════════════════════════════════════════╗');
console.log('║   Final USB Direct Print Test         ║');
console.log('╚════════════════════════════════════════╝\n');

const receipt = generateWiFiReceipt();

console.log('Generated WiFi Token Receipt:');
console.log(`  ${receipt.length} bytes of ESC/POS data`);
console.log('');

printToUSB(receipt, USB_PORT)
  .then(() => {
    console.log('\n✅ Print test completed successfully!');
    console.log('\nIf the receipt printed correctly, this method works!');
    console.log('We will integrate this into your app now.');
  })
  .catch((err) => {
    console.error('\n❌ Print test failed');
    process.exit(1);
  });
