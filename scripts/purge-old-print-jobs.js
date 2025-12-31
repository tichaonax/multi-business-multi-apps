require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function purgeOldPrintJobs() {
  try {
    console.log('Starting purge of old print jobs...');

    // Calculate date 4 months ago
    const fourMonthsAgo = new Date();
    fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);

    console.log(`Purging print jobs created before: ${fourMonthsAgo.toISOString()}`);

    // Find jobs to be deleted
    const jobsToDelete = await prisma.printJobs.findMany({
      where: {
        createdAt: {
          lt: fourMonthsAgo
        }
      },
      select: {
        id: true,
        createdAt: true,
        itemName: true,
        status: true,
        business: {
          select: {
            name: true
          }
        }
      }
    });

    console.log(`Found ${jobsToDelete.length} jobs to purge`);

    if (jobsToDelete.length === 0) {
      console.log('No jobs to purge. Exiting.');
      return;
    }

    // Show some details
    console.log('\nSample of jobs to be deleted:');
    jobsToDelete.slice(0, 5).forEach(job => {
      console.log(`  - ${job.itemName} (${job.business.name}) - Created: ${job.createdAt.toLocaleDateString()} - Status: ${job.status}`);
    });

    // Delete the jobs
    const deleteResult = await prisma.printJobs.deleteMany({
      where: {
        createdAt: {
          lt: fourMonthsAgo
        }
      }
    });

    console.log(`\n✅ Successfully purged ${deleteResult.count} print jobs older than 4 months`);

  } catch (error) {
    console.error('Error purging old print jobs:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  purgeOldPrintJobs()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { purgeOldPrintJobs };
