require('dotenv').config({ path: '.env.local' });
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkPendingJobs() {
  try {
    const jobs = await prisma.barcodePrintJobs.findMany({
      where: { status: 'QUEUED' },
      include: {
        printer: {
          select: {
            printerName: true,
            printerType: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    console.log(`\n📋 Found ${jobs.length} pending print jobs:\n`);

    jobs.forEach((job, index) => {
      console.log(`${index + 1}. Job ID: ${job.id}`);
      console.log(`   Status: ${job.status}`);
      console.log(`   Type: ${job.jobType}`);
      console.log(`   Printer: ${job.printer?.printerName || 'N/A'} (${job.printer?.printerType || 'N/A'})`);
      console.log(`   Created: ${job.createdAt}`);
      console.log(`   Attempts: ${job.processingAttempts}`);
      console.log('');
    });

    console.log('✅ Done');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPendingJobs();
