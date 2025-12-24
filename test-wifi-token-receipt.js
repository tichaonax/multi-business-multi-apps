/**
 * WiFi Token Receipt Print Test
 *
 * Tests printing a realistic WiFi token receipt
 * Matches the format used in the app
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PRINTER_NAME = 'EPSON TM-T20III Receipt';
const RECEIPT_WIDTH = 42;

// ESC/POS Commands
const ESC = '\x1B';
const GS = '\x1D';
const LF = '\x0A';
const CUT = GS + 'V' + '\x41' + String.fromCharCode(3);
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

function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} minutes`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} hours`;
  return `${Math.floor(minutes / 1440)} days`;
}

function formatDataAmount(mb) {
  if (mb < 1024) return `${mb} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

// Generate WiFi Token Receipt
function generateWiFiTokenReceipt() {
  let receipt = '';

  // Initialize printer
  receipt += ESC + '@'; // Reset all settings
  receipt += ESC + 'l' + String.fromCharCode(0); // Set left margin to 0

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
  receipt += `Salesperson: John Doe` + LF;
  receipt += LF;

  // Items
  receipt += `1x WiFi Token - 1 Hour Package` + LF;
  const itemPadding = RECEIPT_WIDTH - '1x WiFi Token - 1 Hour Package'.length - '$5.00'.length;
  receipt += ' '.repeat(itemPadding) + '$5.00' + LF;
  receipt += LF;

  // Totals
  receipt += formatTotal('Subtotal', 5.00);
  receipt += formatTotal('Tax', 0.40);
  receipt += formatTotal('TOTAL', 5.40);
  receipt += LF;

  // Payment
  receipt += `Payment: CASH` + LF;
  receipt += formatTotal('Amount Paid', 10.00);
  receipt += formatTotal('Change', 4.60);

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
  receipt += `To connect: Join WiFi network and` + LF;
  receipt += `enter this token when prompted.` + LF;
  receipt += LF;

  // Footer
  receipt += ALIGN_CENTER;
  receipt += centerText('Support: (555) 999-0000') + LF;
  receipt += centerText('Thank you for your business!') + LF;
  receipt += centerText('Please come again!') + LF;
  receipt += LF + LF + LF;

  // Cut paper
  receipt += CUT;

  return receipt;
}

console.log('\n=== WiFi Token Receipt Print Test ===\n');

const content = generateWiFiTokenReceipt();

// Create temp file
const tempFile = path.join(os.tmpdir(), 'wifi-token-test.prn');
fs.writeFileSync(tempFile, Buffer.from(content, 'binary'));

console.log(`Temp file: ${tempFile}`);
console.log(`Content size: ${content.length} bytes`);
console.log(`Printer: ${PRINTER_NAME}\n`);

try {
  console.log('Sending WiFi token receipt to printer...');
  const result = execSync(`print /D:"${PRINTER_NAME}" "${tempFile}"`, {
    encoding: 'utf8',
    shell: 'cmd.exe',
  });

  console.log('✅ SUCCESS!');
  console.log(result);

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
