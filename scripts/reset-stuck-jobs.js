/**
 * Reset stuck print jobs
 * Finds jobs stuck in PROCESSING and resets them to PENDING
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetStuckJobs() {
  console.log('\n🔧 Resetting Stuck Print Jobs...\n');

  try {
    // Find all PROCESSING jobs
    const stuckJobs = await prisma.printJobs.findMany({
      where: {
        status: 'PROCESSING',
      },
    });

    if (stuckJobs.length === 0) {
      console.log('✅ No stuck jobs found.\n');
      return;
    }

    console.log(`Found ${stuckJobs.length} stuck job(s):\n`);

    for (const job of stuckJobs) {
      console.log(`  - Job ${job.id} (${job.jobType})`);
      console.log(`    Created: ${job.createdAt}`);
      console.log(`    Stuck for: ${Math.round((Date.now() - new Date(job.createdAt).getTime()) / 1000 / 60)} minutes`);
    }

    // Reset to PENDING
    const result = await prisma.printJobs.updateMany({
      where: {
        status: 'PROCESSING',
      },
      data: {
        status: 'PENDING',
        processedAt: null,
      },
    });

    console.log(`\n✅ Reset ${result.count} job(s) to PENDING\n`);
    console.log('These jobs will be processed when the background worker starts.\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetStuckJobs();
