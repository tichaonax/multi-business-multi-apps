const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestJob() {
  try {
    const printer = await prisma.networkPrinters.findFirst();
    if (!printer) {
      console.log('No printer found');
      return;
    }

    const job = await prisma.printJobs.create({
      data: {
        printerId: printer.id,
        businessId: 'grocery-demo-business',
        businessType: 'grocery',
        userId: '2cd606cd-f91a-49e3-9053-04214343c472',
        jobType: 'receipt',
        jobData: {
          receiptNumber: { formattedNumber: 'TEST-001' },
          businessId: 'grocery-demo-business',
          transactionId: 'test-transaction',
          transactionDate: new Date().toISOString(),
          businessName: 'Test Grocery',
          businessType: 'grocery',
          items: [{ name: 'Test Item', quantity: 1, unitPrice: 1.00, totalPrice: 1.00 }],
          subtotal: 1.00,
          tax: 0,
          discount: 0,
          total: 1.00,
          paymentMethod: 'CASH',
          salespersonName: 'Test',
          receiptText: 'Test receipt content for printing'
        },
        status: 'PENDING'
      }
    });

    console.log('Created test job with receiptText:', job.id);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTestJob();