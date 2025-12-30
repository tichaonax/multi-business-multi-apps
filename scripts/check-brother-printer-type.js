require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBrotherPrinter() {
  try {
    console.log('Checking Brother MFC-7860DW Printer...\n');

    const printer = await prisma.networkPrinters.findFirst({
      where: {
        printerName: {
          contains: 'Brother',
          mode: 'insensitive',
        },
      },
    });

    if (!printer) {
      console.log('❌ Brother printer not found in database');
      return;
    }

    console.log('✅ Printer found in database:\n');
    console.log('ID:', printer.id);
    console.log('Printer Name:', printer.printerName);
    console.log('Printer ID:', printer.printerId);
    console.log('Printer Type:', printer.printerType);
    console.log('Node ID:', printer.nodeId);
    console.log('IP Address:', printer.ipAddress || 'N/A (USB/Local)');
    console.log('Port:', printer.port || 'N/A');
    console.log('Is Online:', printer.isOnline);
    console.log('Is Shareable:', printer.isShareable);
    console.log('Capabilities:', JSON.stringify(printer.capabilities, null, 2));
    console.log('Receipt Width:', printer.receiptWidth);
    console.log('Last Seen:', printer.lastSeen);
    console.log('\n---\n');

    // Check if printer type is correct
    if (printer.printerType !== 'label') {
      console.log('⚠️  WARNING: Printer type is not "label"!');
      console.log(`   Current type: "${printer.printerType}"`);
      console.log('   Expected type: "label"');
      console.log('\nThis will cause incorrect test output to be generated.');
    } else {
      console.log('✅ Printer type is correctly set to "label"');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBrotherPrinter();
