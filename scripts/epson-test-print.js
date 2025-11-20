const ThermalPrinter = require('node-thermal-printer').printer;
const PrinterTypes = require('node-thermal-printer').types;

async function testPrint() {
  let printer = new ThermalPrinter({
    type: PrinterTypes.EPSON,  // Use 'EPSON' for Epson printers
    interface: 'usb',          // Use 'usb' for USB printer
    options: {
      // You can specify your printer VID/PID here, or leave blank for auto
      vid: 0x04B8,             // Epson example Vendor ID - replace as needed
      pid: 0E28              // Epson example Product ID - replace as needed
    },
    width: 48,                 // Number of characters per line
    characterSet: 'SLOVENIA',  // Optional character set, change to your needs
    removeSpecialCharacters: false,
    lineCharacter: '-'
  });

  try {
    let isConnected = await printer.isPrinterConnected();
    console.log('Printer connected: ', isConnected);
    if (!isConnected) {
      console.error('Printer not connected or detected');
      return;
    }

    printer.alignCenter();
    printer.bold(true);
    printer.println('EPSON TM-T20III TEST');
    printer.bold(false);
    printer.drawLine();

    printer.println(`Test Date: ${new Date().toLocaleString()}`);
    printer.println('Method: node-thermal-printer USB');
    printer.drawLine();

    printer.leftRight('2x Test Item 1', '$20.00');
    printer.leftRight('1x Test Item 2', '$15.50');
    printer.leftRight('3x Test Item 3', '$15.00');
    printer.drawLine();

    printer.leftRight('Subtotal', '$50.50');
    printer.leftRight('Tax', '$4.04');
    printer.drawLine();

    printer.bold(true);
    printer.leftRight('TOTAL', '$54.54');
    printer.bold(false);
    printer.drawLine();

    printer.println();
    printer.println('Thank you!');
    printer.println('If the print is readable, printer is working!');
    printer.cut();

    await printer.execute();  // Send print commands to printer

    console.log('Print job sent successfully!');
  } catch (error) {
    console.error('Print failed:', error);
  }
}

testPrint();
