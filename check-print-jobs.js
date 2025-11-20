const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const jobs = await prisma.printJobs.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        status: true,
        createdAt: true,
        processedAt: true,
        jobType: true,
        printerId: true
      }
    });

    console.log('=== Recent Print Jobs ===\n');
    jobs.forEach(job => {
      console.log(`Job ${job.id.substring(0, 8)}:`);
      console.log(`  Type: ${job.jobType}`);
      console.log(`  Status: ${job.status}`);
      console.log(`  Created: ${job.createdAt}`);
      console.log(`  Processed: ${job.processedAt || 'Not yet'}`);
      console.log('');
    });

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
