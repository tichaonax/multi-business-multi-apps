require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPrintJobCreation() {
  try {
    console.log('Testing print job creation...\n');

    // Get a template
    const template = await prisma.barcodeTemplates.findFirst({
      where: { id: 'cmjqs4pue00011p6wo2hsmaek' },
    });

    if (!template) {
      console.log('❌ Template not found');
      return;
    }

    console.log('✅ Template found:', template.name);

    // Check if user exists
    const user = await prisma.users.findUnique({
      where: { id: 'admin-system-user-default' },
    });

    console.log('✅ User found:', user.name);

    // Try to create a print job without the Prisma extension
    // (using raw Prisma client)
    const rawPrisma = new PrismaClient();

    console.log('\nAttempting to create print job...');
    const printJob = await rawPrisma.barcodePrintJobs.create({
      data: {
        templateId: template.id,
        itemType: 'CUSTOM',
        barcodeData: 'TEST123',
        itemName: 'Test Item',
        requestedQuantity: 1,
        printedQuantity: 0,
        status: 'QUEUED',
        printSettings: {
          symbology: template.symbology,
          width: template.width,
          height: template.height,
        },
        businessId: template.businessId,
        createdById: 'admin-system-user-default',
      },
    });

    console.log('✅ Print job created successfully!');
    console.log('Print job ID:', printJob.id);

    // Clean up
    await rawPrisma.barcodePrintJobs.delete({
      where: { id: printJob.id },
    });
    console.log('✅ Test print job deleted');

    await rawPrisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.meta) {
      console.error('Meta:', error.meta);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testPrintJobCreation();
