/**
 * Register EPSON TM-T20III Printer in Database
 * Uses Windows printer driver name (not direct USB port)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const printerName = 'EPSON TM-T20III Receipt';
const printerId = 'epson_tm_t20iii_receipt';
const nodeId = process.env.NODE_ID || 'default-node';

async function registerPrinter() {
  console.log('═'.repeat(60));
  console.log(' REGISTER EPSON TM-T20III PRINTER');
  console.log('═'.repeat(60));
  console.log('');

  try {
    // Check if printer already exists
    console.log('🔍 Checking if printer already registered...');

    const existing = await prisma.networkPrinters.findFirst({
      where: {
        OR: [
          { printerId: printerId },
          { printerName: printerName }
        ]
      }
    });

    if (existing) {
      console.log(`   ⚠️  Printer already exists (ID: ${existing.id})`);
      console.log('');
      console.log('🔧 Updating existing printer...');

      await prisma.networkPrinters.update({
        where: { id: existing.id },
        data: {
          printerId: printerId,
          printerName: printerName,
          printerType: 'receipt',
          ipAddress: null,  // Not a network printer
          port: null,       // Uses Windows driver
          capabilities: ['esc-pos'],
          isOnline: true,
          isShareable: true,
          lastSeen: new Date(),
          updatedAt: new Date(),
        }
      });

      console.log('   ✅ Printer updated successfully');
      console.log('');
      console.log('📋 PRINTER DETAILS:');
      console.log(`   ID: ${existing.id}`);
      console.log(`   Printer ID: ${printerId}`);
      console.log(`   Name: ${printerName}`);
      console.log(`   Type: receipt`);
      console.log(`   Connection: Windows Driver (not direct port)`);
      console.log(`   Capabilities: ESC/POS`);

    } else {
      console.log('   ℹ️  Printer not found, creating new entry...');
      console.log('');

      const printer = await prisma.networkPrinters.create({
        data: {
          printerId: printerId,
          printerName: printerName,
          nodeId: nodeId,
          printerType: 'receipt',
          ipAddress: null,  // Not a network printer
          port: null,       // Uses Windows driver
          capabilities: ['esc-pos'],
          isOnline: true,
          isShareable: true,
          lastSeen: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });

      console.log('✅ Printer registered successfully!');
      console.log('');
      console.log('📋 PRINTER DETAILS:');
      console.log(`   ID: ${printer.id}`);
      console.log(`   Printer ID: ${printerId}`);
      console.log(`   Name: ${printerName}`);
      console.log(`   Type: receipt`);
      console.log(`   Node: ${nodeId}`);
      console.log(`   Connection: Windows Driver (not direct port)`);
      console.log(`   Capabilities: ESC/POS`);
    }

    console.log('');
    console.log('─'.repeat(60));
    console.log('');
    console.log('📝 NEXT STEPS:');
    console.log('   1. Go to: http://localhost:8080/admin/printers');
    console.log('   2. You should see "EPSON TM-T20III Receipt" in the list');
    console.log('   3. Click "Direct Test" to test printing');
    console.log('   4. If test fails, run: node scripts/fix-epson-printer.js');
    console.log('');
    console.log('💡 HOW IT WORKS:');
    console.log('   - Uses Windows printer driver (not direct USB port)');
    console.log('   - Sends ESC/POS commands via Windows print spooler');
    console.log('   - More reliable than direct port access');
    console.log('   - Compatible with printer test utility');
    console.log('─'.repeat(60));

  } catch (error) {
    console.error('\n❌ Error registering printer:');
    console.error(error);

    if (error.code === 'P2002') {
      console.log('\n💡 Duplicate printer found. Try:');
      console.log('   - Delete the existing printer from http://localhost:8080/admin/printers');
      console.log('   - Or run this script again to update it');
    }
  } finally {
    await prisma.$disconnect();
  }
}

registerPrinter()
  .then(() => {
    console.log('');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script error:', error);
    process.exit(1);
  });
