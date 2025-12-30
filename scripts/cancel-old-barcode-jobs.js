/**
 * Cancel all old queued barcode print jobs
 * This is useful after updating the barcode generation to actual ESC/POS commands
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cancelOldJobs() {
  console.log('🔍 Finding queued barcode print jobs...\n');

  try {
    // Get all queued jobs
    const queuedJobs = await prisma.barcodePrintJobs.findMany({
      where: {
        status: 'QUEUED'
      },
      include: {
        template: true,
        business: true
      }
    });

    console.log(`Found ${queuedJobs.length} queued jobs\n`);

    if (queuedJobs.length === 0) {
      console.log('✅ No queued jobs to cancel');
      return;
    }

    for (const job of queuedJobs) {
      console.log(`📄 Job ID: ${job.id}`);
      console.log(`   Item: ${job.itemName || 'Unknown'}`);
      console.log(`   Template: ${job.template?.name || 'Unknown'}`);
      console.log(`   Business: ${job.business?.name || 'Unknown'}`);
    }

    console.log('\n🗑️  Cancelling all queued jobs...\n');

    // Update all to CANCELLED status
    const result = await prisma.barcodePrintJobs.updateMany({
      where: {
        status: 'QUEUED'
      },
      data: {
        status: 'CANCELLED',
        errorMessage: 'Cancelled - System updated to use actual barcode printing'
      }
    });

    console.log(`✅ Cancelled ${result.count} jobs`);
    console.log('\nYou can now create new print jobs that will use actual barcode printing!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cancelOldJobs();
