require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixPrinterNodeIds() {
  try {
    console.log('Checking printer nodeIds...\n');

    // Get all printers
    const printers = await prisma.networkPrinters.findMany({
      select: {
        id: true,
        printerName: true,
        nodeId: true,
      },
    });

    console.log(`Found ${printers.length} printers:\n`);
    printers.forEach(p => {
      console.log(`  - ${p.printerName}: nodeId="${p.nodeId}"`);
    });

    // Update all printers to default-node
    const result = await prisma.networkPrinters.updateMany({
      where: {
        nodeId: {
          not: 'default-node',
        },
      },
      data: {
        nodeId: 'default-node',
      },
    });

    console.log(`\n✅ Updated ${result.count} printer(s) to nodeId="default-node"`);

    // Verify
    const updated = await prisma.networkPrinters.findMany({
      select: {
        id: true,
        printerName: true,
        nodeId: true,
      },
    });

    console.log('\nFinal printer nodeIds:');
    updated.forEach(p => {
      console.log(`  - ${p.printerName}: nodeId="${p.nodeId}"`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPrinterNodeIds();
