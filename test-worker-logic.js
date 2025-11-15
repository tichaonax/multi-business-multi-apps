const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testWorkerLogic() {
  try {
    console.log('Testing worker logic...');

    // Get next pending job
    const job = await prisma.printJobs.findFirst({
      where: {
        status: 'PENDING',
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (!job) {
      console.log('No pending jobs found');
      return;
    }

    console.log('Found pending job:', job.id, job.jobType);

    // Get printer details
    const printer = await prisma.networkPrinters.findUnique({
      where: { id: job.printerId },
    });

    if (!printer) {
      console.log('Printer not found:', job.printerId);
      return;
    }

    console.log('Printer:', printer.printerName, 'Online:', printer.isOnline);

    // Extract print content
    const jobData = job.jobData;
    let printContent = '';

    if (job.jobType === 'receipt') {
      printContent = jobData.receiptText || '';
    }

    console.log('Print content length:', printContent.length);
    console.log('Has receiptText:', !!jobData.receiptText);

    if (!printContent) {
      console.log('No print content found');
      return;
    }

    console.log('Would send to printer:', printer.printerName);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testWorkerLogic();