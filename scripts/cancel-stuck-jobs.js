require('dotenv').config({ path: '.env.local' });
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cancelStuckJobs() {
  try {
    // Cancel the 2 stuck jobs
    const jobIds = [
      'cmjrs6m5300011pno66biiwr6',
      'cmjrhmg6q00051p8cpyf0n8a7'
    ];

    console.log(`\n🚫 Cancelling ${jobIds.length} stuck print jobs...\n`);

    for (const jobId of jobIds) {
      const updated = await prisma.barcodePrintJobs.update({
        where: { id: jobId },
        data: {
          status: 'CANCELLED',
          errorMessage: 'Cancelled: Invalid job data structure from before server update',
        }
      });

      console.log(`✅ Cancelled job: ${jobId}`);
    }

    console.log(`\n✅ All stuck jobs cancelled successfully`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cancelStuckJobs();
