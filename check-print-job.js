const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLatestPrintJob() {
  try {
    const job = await prisma.printJobs.findFirst({
      orderBy: { createdAt: 'desc' },
      take: 1
    });

    if (!job) {
      console.log('No print jobs found');
      return;
    }

    console.log('Latest print job:');
    console.log('ID:', job.id);
    console.log('Status:', job.status);
    console.log('Job Type:', job.jobType);
    console.log('Created:', job.createdAt);

    console.log('\nJob Data keys:', Object.keys(job.jobData));
    console.log('Has receiptText:', 'receiptText' in job.jobData);

    if (job.jobData.receiptText) {
      console.log('Receipt text length:', job.jobData.receiptText.length);
      console.log('Receipt text preview:');
      console.log(job.jobData.receiptText.substring(0, 200) + '...');
    } else {
      console.log('No receiptText found in job data');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkLatestPrintJob();