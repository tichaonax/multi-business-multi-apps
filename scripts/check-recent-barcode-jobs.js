/**
 * Check recent barcode print jobs
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkRecentJobs() {
  console.log('🔍 Checking recent barcode print jobs...\n');

  try {
    const jobs = await prisma.barcodePrintJobs.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        template: true,
        business: true,
        printer: true
      }
    });

    console.log(`Found ${jobs.length} recent jobs:\n`);

    for (const job of jobs) {
      console.log(`📄 Job ID: ${job.id}`);
      console.log(`   Status: ${job.status}`);
      console.log(`   Item: ${job.itemName || 'Unknown'}`);
      console.log(`   Template: ${job.template?.name || 'Unknown'}`);
      console.log(`   Business: ${job.business?.name || 'Unknown'}`);
      console.log(`   Printer: ${job.printer?.printerName || 'Not assigned'}`);
      console.log(`   Quantity: ${job.printedQuantity} / ${job.requestedQuantity}`);
      console.log(`   Created: ${job.createdAt}`);
      if (job.errorMessage) {
        console.log(`   Error: ${job.errorMessage}`);
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRecentJobs();
