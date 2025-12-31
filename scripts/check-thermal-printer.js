require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkThermalPrinter() {
  try {
    const printers = await prisma.networkPrinters.findMany({
      where: {
        printerName: {
          contains: 'EPSON'
        }
      }
    });

    console.log('EPSON Printers:');
    printers.forEach(printer => {
      console.log(`  ID: ${printer.id}`);
      console.log(`  Name: ${printer.printerName}`);
      console.log(`  Type: ${printer.printerType}`);
      console.log(`  Online: ${printer.isOnline}`);
      console.log(`  IP Address: ${printer.ipAddress || 'NULL (USB/Local)'}`);
      console.log(`  Last Seen: ${printer.lastSeen}`);
      console.log('  ---');
    });

    if (printers.length === 0) {
      console.log('  No EPSON printers found!');
    }

    // Check if any are offline
    const offlinePrinters = printers.filter(p => !p.isOnline);
    if (offlinePrinters.length > 0) {
      console.log('\nOffline EPSON printers detected!');
      console.log('Bringing them back online...');

      for (const printer of offlinePrinters) {
        await prisma.networkPrinters.update({
          where: { id: printer.id },
          data: {
            isOnline: true,
            lastSeen: new Date()
          }
        });
        console.log(`  ✓ Set ${printer.printerName} to ONLINE`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkThermalPrinter();
