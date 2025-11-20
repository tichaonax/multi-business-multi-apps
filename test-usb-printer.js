/**
 * Test script to send ESC/POS commands to USB printer on PORT 001
 * This will test basic printer connectivity and ESC/POS command execution
 * Using CommonJS require for compatibility
 */

const { sendToPrinter } = require('./src/lib/printing/printer-service-usb');
const { convertToESCPOS, initializePrinter, setBold, setAlignment, feedPaper, cutPaper } = require('./src/lib/printing/formats/esc-pos');

// Test receipt content
const testReceipt = `
================================
        TEST RECEIPT
================================
Date: ${new Date().toLocaleString()}
Printer: USB PORT 001
Test: ESC/POS Commands

This is a test print to verify
that the USB printer is working
correctly with ESC/POS commands.

================================
         END OF TEST
================================
`;

async function testPrinter() {
  try {
    console.log('Testing USB printer on PORT 001...');

    // Convert receipt text to ESC/POS commands
    const escPosCommands = convertToESCPOS(testReceipt, {
      encoding: 'utf8',
      width: 32 // Narrow receipt width for testing
    });

    console.log('ESC/POS commands generated successfully');
    console.log('Command buffer length:', escPosCommands.length, 'bytes');

    // Convert buffer to binary string for sendToPrinter
    const binaryContent = escPosCommands.toString('binary');

    // Print to USB port 001 using sendToPrinter
    await sendToPrinter(binaryContent, {
      printerName: '001', // Direct USB port
      copies: 1
    });

    console.log('✅ Test print sent successfully!');

  } catch (error) {
    console.error('❌ Error during printer test:', error);
  }
}

// Alternative test with manual ESC/POS commands
async function testManualCommands() {
  try {
    console.log('Testing manual ESC/POS commands...');

    // Build manual ESC/POS commands
    const commands = [
      initializePrinter(), // Initialize printer
      setBold(true),       // Enable bold
      setAlignment('center'), // Center align
      Buffer.from('MANUAL ESC/POS TEST\n', 'utf8'),
      setBold(false),      // Disable bold
      setAlignment('left'), // Left align
      Buffer.from('This is a manual test\n', 'utf8'),
      Buffer.from('of ESC/POS commands.\n', 'utf8'),
      feedPaper(2),        // Feed 2 lines
      cutPaper()           // Cut paper
    ];

    const combinedCommands = Buffer.concat(commands);
    const binaryContent = combinedCommands.toString('binary');

    console.log('Manual commands buffer length:', combinedCommands.length, 'bytes');

    // Print to USB port 001 using sendToPrinter
    await sendToPrinter(binaryContent, {
      printerName: '001', // Direct USB port
      copies: 1
    });

    console.log('✅ Manual test print sent successfully!');

  } catch (error) {
    console.error('❌ Error during manual test:', error);
  }
}

// Run both tests
async function runAllTests() {
  console.log('=== USB Printer Test Suite ===\n');

  await testPrinter();
  console.log('\n' + '='.repeat(40) + '\n');
  await testManualCommands();

  console.log('\n=== Test Suite Complete ===');
}

// Execute tests
runAllTests().catch(console.error);