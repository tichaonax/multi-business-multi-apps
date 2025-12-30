/**
 * Manually trigger print queue processing
 * This will process any pending print jobs immediately
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function triggerQueue() {
  console.log('🔍 Checking for pending print jobs...\n');

  try {
    // Get pending barcode print jobs
    const pendingJobs = await prisma.barcodePrintJobs.findMany({
      where: {
        status: {
          in: ['QUEUED', 'PRINTING']
        }
      },
      include: {
        printer: true,
        business: true,
        template: true,
        createdBy: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    console.log(`Found ${pendingJobs.length} pending jobs\n`);

    if (pendingJobs.length === 0) {
      console.log('✅ No pending jobs to process');
      return;
    }

    for (const job of pendingJobs) {
      console.log(`📄 Job ID: ${job.id}`);
      console.log(`   Status: ${job.status}`);
      console.log(`   Printer: ${job.printer?.printerName || 'Not assigned'}`);
      console.log(`   Business: ${job.business?.name || 'Unknown'}`);
      console.log(`   Created: ${job.createdAt}`);
      console.log(`   Print Settings: ${JSON.stringify(job.printSettings, null, 2)}`);
      console.log('');
    }

    // Import and run the worker function
    console.log('🚀 Triggering queue processing...\n');
    const { triggerQueueProcessing } = await import('../src/lib/printing/print-queue-worker.js');
    await triggerQueueProcessing();

    console.log('\n✅ Queue processing triggered');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

triggerQueue();
