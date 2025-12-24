/**
 * RAW Printer Test using 'printer' npm package
 * Tests if the printer package can communicate with EPSON
 */

const printer = require('printer');

console.log('\n=== RAW Printer Test ===\n');

// List all printers
console.log('Available Printers:');
const printers = printer.getPrinters();
printers.forEach((p, i) => {
  console.log(`${i + 1}. ${p.name}`);
  console.log(`   Status: ${p.status || 'Unknown'}`);
  console.log(`   Attributes:`, p.attributes || {});
  console.log('');
});

const PRINTER_NAME = 'EPSON TM-T20III Receipt';

// Check if EPSON is available
const epson = printers.find(p => p.name === PRINTER_NAME);
if (!epson) {
  console.error(`❌ Printer "${PRINTER_NAME}" not found!`);
  process.exit(1);
}

console.log(`✓ Found: ${PRINTER_NAME}\n`);

// Generate simple test receipt
const ESC = '\x1B';
const GS = '\x1D';
const LF = '\x0A';
const CUT = GS + 'V' + '\x41' + String.fromCharCode(3);

let content = '';
content += ESC + '@'; // Initialize printer
content += ESC + 'a' + String.fromCharCode(1); // Center align
content += '================================' + LF;
content += '      RAW PRINT TEST           ' + LF;
content += '================================' + LF;
content += ESC + 'a' + String.fromCharCode(0); // Left align
content += `Time: ${new Date().toLocaleString()}` + LF;
content += `Method: Printer NPM Package (RAW)` + LF;
content += LF;
content += 'Line 1: Testing...' + LF;
content += 'Line 2: Testing...' + LF;
content += 'Line 3: Testing...' + LF;
content += LF + LF + LF;
content += CUT;

const data = Buffer.from(content, 'binary');

console.log(`Content size: ${data.length} bytes`);
console.log(`Sending to: ${PRINTER_NAME}`);
console.log(`Method: RAW\n`);

printer.printDirect({
  data: data,
  printer: PRINTER_NAME,
  type: 'RAW',
  success: function(jobID) {
    console.log(`✅ SUCCESS! Job ID: ${jobID}`);
    console.log('\n** CHECK YOUR PRINTER **');
    console.log('   A test receipt should be printing now!\n');
  },
  error: function(err) {
    console.error('❌ FAILED:', err);
  }
});
