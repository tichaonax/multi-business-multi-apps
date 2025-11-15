const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listPrinters() {
  try {
    const printers = await prisma.networkPrinters.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log('\n📋 Configured Printers:\n');

    if (printers.length === 0) {
      console.log('❌ No printers configured yet.\n');
      return;
    }

    printers.forEach((printer, index) => {
      console.log(`${index + 1}. ${printer.printerName}`);
      console.log(`   ID: ${printer.id}`);
      console.log(`   Printer ID: ${printer.printerId}`);
      console.log(`   Type: ${printer.printerType}`);
      console.log(`   Node ID: ${printer.nodeId}`);
      console.log(`   IP Address: ${printer.ipAddress || 'N/A'}:${printer.port || 'N/A'}`);
      console.log(`   Capabilities: ${printer.capabilities?.join(', ') || 'None'}`);
      console.log(`   Shareable: ${printer.isShareable ? 'Yes' : 'No'}`);
      console.log(`   Online: ${printer.isOnline ? '✅ Yes' : '❌ No'}`);
      console.log(`   Last Seen: ${printer.lastSeen}`);
      console.log(`   Created: ${printer.createdAt}`);
      console.log('');
    });

    console.log(`Total: ${printers.length} printer(s) configured\n`);
  } catch (error) {
    console.error('❌ Error listing printers:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listPrinters();
