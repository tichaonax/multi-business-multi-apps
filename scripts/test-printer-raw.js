/**
 * EPSON TM-T20III Receipt Printer Test (Node.js, Windows 11)
 * Prints sample ESC/POS receipt using RAW output to printer driver.
 *
 * Usage: node scripts/test-printer-raw.js
 */

const printer = require('printer');
const printerName = 'EPSON TM-T20III Receipt'; // Change to your installed printer's exact name!

function generateTestReceipt() {
  const ESC = '\x1B';
  const GS = '\x1D';
  const LF = '\x0A';
  const CUT = GS + 'V' + '\x41' + String.fromCharCode(3);
  let receipt = '';

  receipt += ESC + '@';
  receipt += ESC + 'l' + String.fromCharCode(0);
  receipt += ESC + 'G' + String.fromCharCode(1);

  receipt += ESC + 'a' + String.fromCharCode(1);
  receipt += '='.repeat(42) + LF;
  receipt += 'EPSON TM-T20III TEST' + LF;
  receipt += 'ESC/POS COMMANDS' + LF;
  receipt += '='.repeat(42) + LF;

  receipt += ESC + 'a' + String.fromCharCode(0);
  receipt += LF;
  receipt += 'Test Date: ' + new Date().toLocaleString() + LF;
  receipt += 'Printer: ' + printerName + LF;
  receipt += 'Method: Windows Driver + ESC/POS' + LF + LF;

  receipt += '='.repeat(42) + LF;
  receipt += 'TEST ITEMS:' + LF;
  receipt += '='.repeat(42) + LF;
  receipt += '2x Test Item 1               $20.00' + LF;
  receipt += '1x Test Item 2               $15.50' + LF;
  receipt += '3x Test Item 3               $15.00' + LF;
  receipt += '='.repeat(42) + LF + LF;
  receipt += 'Subtotal                     $50.50' + LF;
  receipt += 'Tax                           $4.04' + LF;
  receipt += '='.repeat(42) + LF;
  receipt += ESC + 'E' + String.fromCharCode(1);
  receipt += 'TOTAL                        $54.54' + LF;
  receipt += ESC + 'E' + String.fromCharCode(0);
  receipt += '='.repeat(42) + LF + LF;
  receipt += ESC + 'a' + String.fromCharCode(1);
  receipt += '- - - - - - - - - - - - - - - - - - - -' + LF;
  receipt += 'Thank you!' + LF;
  receipt += 'If text is dark and aligned,' + LF;
  receipt += 'the printer is working!' + LF + LF + LF;
  receipt += CUT;
  return Buffer.from(receipt, 'binary');
}

function main() {
  console.log('═'.repeat(60));
  console.log(' EPSON TM-T20III RAW PRINT TEST');
  console.log('═'.repeat(60));
  console.log('');

  const testData = generateTestReceipt();

  // List available printers
  console.log('🔍 Scanning for available printers...');
  const available = printer.getPrinters();
  console.log('\n📋 Available printers:');
  available.forEach(p => console.log(`  - ${p.name}`));

  // Check if printer is available
  const driverFound = available.find(p => p.name.toLowerCase() === printerName.toLowerCase());
  if (!driverFound) {
    console.error('\n❌ ERROR: Printer not found!');
    console.error(`   Looking for: "${printerName}"`);
    console.error('   Check the printer name exactly in Windows!');
    console.error('\n💡 Run: node scripts/check-windows-printers.js');
    process.exit(1);
  }

  console.log('\n✅ Printer found:', printerName);
  console.log('📊 Data size:', testData.length, 'bytes');
  console.log('\n🖨️  Sending print job...');

  printer.printDirect({
    data: testData,
    printer: printerName,
    type: 'RAW',
    success: jobID => {
      console.log('\n✅ SUCCESS: Print job sent!');
      console.log('   Job ID:', jobID);
      console.log('\n─'.repeat(60));
      console.log('📋 WHAT TO CHECK:');
      console.log('   1. Did the printer print a receipt?');
      console.log('   2. Is the text dark and readable?');
      console.log('   3. Are the headers centered?');
      console.log('   4. Did the paper cut automatically?');
      console.log('   5. Are there no extra margins?');
      console.log('─'.repeat(60));
      console.log('');
    },
    error: err => {
      console.error('\n❌ ERROR: Printing failed!');
      console.error('   Error:', err.message);
      console.error('\n🔍 TROUBLESHOOTING:');
      console.error('   1. Check printer is powered ON');
      console.error('   2. Check paper is loaded');
      console.error('   3. Check USB cable is connected');
      console.error('   4. Run: node scripts/fix-epson-printer.js');
      console.error('   5. Try test page from printer properties');
      console.error('');
    }
  });
}

main();
