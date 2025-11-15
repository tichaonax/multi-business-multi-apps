const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPrintJobs() {
  try {
    const jobs = await prisma.printJobs.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    console.log('\n📋 Recent Print Jobs (last 10):\n');

    if (jobs.length === 0) {
      console.log('❌ No print jobs found.\n');
      return;
    }

    jobs.forEach((job, index) => {
      console.log(`${index + 1}. Job ID: ${job.id}`);
      console.log(`   Status: ${job.status}`);
      console.log(`   Type: ${job.jobType}`);
      console.log(`   Printer ID: ${job.printerId}`);
      console.log(`   Business ID: ${job.businessId}`);
      console.log(`   Business Type: ${job.businessType}`);
      console.log(`   Retry Count: ${job.retryCount}`);
      console.log(`   Error: ${job.errorMessage || 'None'}`);
      console.log(`   Created: ${job.createdAt}`);
      console.log(`   Processed: ${job.processedAt || 'Not yet'}`);
      console.log('');
    });

    // Count by status
    const pending = jobs.filter(j => j.status === 'PENDING').length;
    const processing = jobs.filter(j => j.status === 'PROCESSING').length;
    const completed = jobs.filter(j => j.status === 'COMPLETED').length;
    const failed = jobs.filter(j => j.status === 'FAILED').length;

    console.log(`\n📊 Status Summary:`);
    console.log(`   PENDING: ${pending}`);
    console.log(`   PROCESSING: ${processing}`);
    console.log(`   COMPLETED: ${completed}`);
    console.log(`   FAILED: ${failed}`);
    console.log('');

  } catch (error) {
    console.error('❌ Error checking print jobs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPrintJobs();
