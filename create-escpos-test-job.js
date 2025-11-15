const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestJob() {
  try {
    const printer = await prisma.networkPrinters.findFirst({
      where: { printerName: 'EPSON TM-T20III Receipt' }
    });

    if (!printer) {
      console.log('Printer not found');
      return;
    }

    // Create proper ESC/POS data for testing
    const escPosData = Buffer.from([
      0x1B, 0x40,  // Initialize printer
      0x1B, 0x61, 0x01,  // Center alignment
      ...Buffer.from('TEST RECEIPT FROM WORKER\n'),
      0x1B, 0x61, 0x00,  // Left alignment
      ...Buffer.from('This should print!\n\n\n\n'),
      0x1D, 0x56, 0x42, 0x00  // Cut paper
    ]);

    const base64Data = escPosData.toString('base64');

    const job = await prisma.printJobs.create({
      data: {
        jobType: 'receipt',
        businessId: 'grocery-demo-business',
        businessType: 'grocery',
        printerId: printer.id,
        userId: '2cd606cd-f91a-49e3-9053-04214343c472',
        status: 'PENDING',
        jobData: {
          receiptText: base64Data,
          copies: 1
        }
      }
    });

    console.log('Created test job:', job.id);
    console.log('ESC/POS data length:', escPosData.length);
    console.log('Base64 length:', base64Data.length);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTestJob();