/**
 * Add USB/COM Direct Port Printer to Database
 * Usage: node scripts/add-usb-printer.js [PORT_NAME] [PRINTER_MODEL]
 * Example: node scripts/add-usb-printer.js USB001 "EPSON TM-T20III"
 * Example: node scripts/add-usb-printer.js COM5 "Star TSP143III"
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get port name from command line argument or default to USB001
const portName = process.argv[2] || 'USB001';
const printerModel = process.argv[3] || 'Thermal Receipt Printer';

// Validate port name format
if (!/^(USB\d{3}|COM\d+|LPT\d+)$/i.test(portName)) {
  console.error('❌ Invalid port name format!');
  console.error('   Valid formats: USB001, USB002, COM1, COM5, LPT1, etc.\n');
  console.error('Usage: node scripts/add-usb-printer.js [PORT_NAME] [PRINTER_MODEL]');
  console.error('Example: node scripts/add-usb-printer.js USB001 "EPSON TM-T20III"');
  process.exit(1);
}

async function addUSBPrinter() {
  try {
    console.log(`🖨️  Adding ${portName} Direct Port Printer...\n`);

    // Check if printer already exists
    const existing = await prisma.networkPrinters.findFirst({
      where: {
        printerName: portName
      }
    });

    if (existing) {
      console.log(`⚠️  ${portName} printer already exists:`);
      console.log(`   ID: ${existing.id}`);
      console.log(`   Printer ID: ${existing.printerId}`);
      console.log(`   Port: ${existing.printerName}`);
      console.log(`   Type: ${existing.printerType}`);
      console.log(`   Status: ${existing.isOnline ? 'Online' : 'Offline'}\n`);

      const answer = await new Promise((resolve) => {
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout
        });
        readline.question('Update this printer? (y/n): ', (ans) => {
          readline.close();
          resolve(ans.toLowerCase() === 'y');
        });
      });

      if (!answer) {
        console.log('❌ Cancelled');
        return;
      }

      // Update existing printer
      const nodeId = process.env.NODE_ID || 'default-node';
      const updated = await prisma.networkPrinters.update({
        where: { id: existing.id },
        data: {
          printerId: existing.printerId, // Keep existing printerId
          printerName: portName,
          nodeId: nodeId,
          ipAddress: null,
          port: null,
          printerType: 'receipt',
          isOnline: true,
          isShareable: true,
          lastSeen: new Date(),
          updatedAt: new Date()
        }
      });

      console.log('\n✅ Printer Updated Successfully!');
      console.log(`   ID: ${updated.id}`);
      console.log(`   Printer ID: ${updated.printerId}`);
      console.log(`   Port: ${updated.printerName}`);
      console.log(`   Type: ${updated.printerType}`);
      console.log(`   Status: ${updated.isOnline ? 'Online' : 'Offline'}\n`);

    } else {
      // Create new printer
      const printerId = `printer_${portName.toLowerCase()}_${Date.now()}`;
      const nodeId = process.env.NODE_ID || 'default-node';
      const printer = await prisma.networkPrinters.create({
        data: {
          printerId: printerId,
          printerName: portName,
          nodeId: nodeId,
          ipAddress: null,
          port: null,
          printerType: 'receipt',
          isOnline: true,
          isShareable: true,
          lastSeen: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      console.log('✅ Printer Added Successfully!');
      console.log(`   ID: ${printer.id}`);
      console.log(`   Printer ID: ${printer.printerId}`);
      console.log(`   Port: ${printer.printerName}`);
      console.log(`   Model: ${printerModel}`);
      console.log(`   Type: ${printer.printerType}`);
      console.log(`   Status: ${printer.isOnline ? 'Online' : 'Offline'}\n`);
    }

    console.log('📝 Usage Instructions:');
    console.log('   1. The printer is now available in all POS systems');
    console.log(`   2. Select "${portName}" when printing receipts`);
    console.log(`   3. Data will be sent directly to ${portName} port`);
    console.log('   4. ESC/POS commands will be used for formatting\n');

    console.log('🔧 Technical Details:');
    console.log(`   - Printer Port: \\\\.\\${portName}`);
    console.log('   - Print Method: Direct port access (bypasses Windows spooler)');
    console.log('   - Format: ESC/POS thermal printer commands');
    console.log('   - Paper Width: 80mm (42 characters)\n');

    console.log('💡 Tips:');
    console.log('   - To find your printer port, check Windows Device Manager');
    console.log('   - Look under "Ports (COM & LPT)" or "USB Serial Port"');
    console.log('   - Test the printer with: node scripts/test-usb-printer.js ' + portName + '\n');

  } catch (error) {
    console.error('❌ Error adding USB printer:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
addUSBPrinter()
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
