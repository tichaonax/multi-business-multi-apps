const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const jobId = process.argv[2] || '169280a0-35e6-45da-91ce-1204de46158f';

    const job = await prisma.printJobs.findUnique({
      where: { id: jobId },
      include: {
        network_printers: true
      }
    });

    if (!job) {
      console.log('❌ Job not found');
      process.exit(1);
    }

    console.log('=== Print Job Details ===\n');
    console.log('ID:', job.id.substring(0, 8) + '...');
    console.log('Status:', job.status);
    console.log('Created:', job.createdAt);
    console.log('Processed:', job.processedAt || 'Not yet');
    console.log('Printer:', job.network_printers.printerName);
    console.log('Retry Count:', job.retryCount);
    console.log('\nJob Data:');

    const jobData = job.jobData || {};
    console.log('  Keys:', Object.keys(jobData).join(', '));

    if (jobData.receiptText) {
      const decoded = Buffer.from(jobData.receiptText, 'base64').toString('binary');
      console.log('  Receipt text length:', decoded.length, 'bytes');
      console.log('\nFirst 200 chars of receipt:');
      console.log(decoded.substring(0, 200));
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
