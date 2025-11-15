/**
 * Fix Printer Name to Match Windows System
 * Updates database printer name to match actual Windows printer
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixPrinterName() {
  console.log('\n🔧 Fixing Printer Name...\n');

  try {
    // Get all printers from database
    const printers = await prisma.networkPrinters.findMany();

    if (printers.length === 0) {
      console.log('❌ No printers in database\n');
      return;
    }

    console.log('Current printers in database:');
    printers.forEach((p, idx) => {
      console.log(`  ${idx + 1}. "${p.printerName}" (ID: ${p.id})`);
    });

    // Update the printer name to match Windows
    const printerToUpdate = printers[printers.length - 1]; // Get most recent

    console.log(`\n🔄 Updating printer: ${printerToUpdate.id}`);
    console.log(`   Old name: "${printerToUpdate.printerName}"`);

    // Update to actual Windows printer name
    const newName = 'RONGTA 80mm Series Printer'; // The USB thermal printer

    await prisma.networkPrinters.update({
      where: { id: printerToUpdate.id },
      data: {
        printerName: newName,
      },
    });

    console.log(`   New name: "${newName}"`);
    console.log('\n✅ Printer name updated successfully!\n');
    console.log('⚠️  Note: RONGTA printer shows "Error" status in Windows.');
    console.log('   Check:');
    console.log('   1. Printer is powered on');
    console.log('   2. USB cable is connected');
    console.log('   3. Driver is installed correctly');
    console.log('   4. Paper is loaded\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPrinterName();
