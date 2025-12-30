/**
 * Check detailed job information including printSettings
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkJobDetails() {
  const jobId = process.argv[2];

  if (!jobId) {
    console.log('Usage: node scripts/check-job-details.js <jobId>');
    process.exit(1);
  }

  console.log(`🔍 Checking job details for: ${jobId}\n`);

  try {
    const job = await prisma.barcodePrintJobs.findUnique({
      where: { id: jobId },
      include: {
        template: true,
        business: true,
        printer: true
      }
    });

    if (!job) {
      console.log('❌ Job not found');
      return;
    }

    console.log('📄 Job Details:');
    console.log(`   ID: ${job.id}`);
    console.log(`   Status: ${job.status}`);
    console.log(`   Item: ${job.itemName || 'Unknown'}`);
    console.log(`   Barcode Data: ${job.barcodeData}`);
    console.log(`   Template: ${job.template?.name || 'Unknown'}`);
    console.log(`   Symbology: ${job.template?.symbology || 'Unknown'}`);
    console.log(`   Business: ${job.business?.name || 'Unknown'}`);
    console.log(`   Printer: ${job.printer?.printerName || 'Not assigned'}`);
    console.log(`   Printer Type: ${job.printer?.printerType || 'Unknown'}`);
    console.log(`   Quantity: ${job.printedQuantity} / ${job.requestedQuantity}`);
    console.log(`   Created: ${job.createdAt}`);
    if (job.printedAt) {
      console.log(`   Printed: ${job.printedAt}`);
    }
    if (job.errorMessage) {
      console.log(`   Error: ${job.errorMessage}`);
    }

    console.log('\n📋 Print Settings:');
    console.log(JSON.stringify(job.printSettings, null, 2));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkJobDetails();
