require('dotenv').config({ path: '.env.local' });
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkJobStatus() {
  try {
    const job = await prisma.barcodePrintJobs.findUnique({
      where: { id: 'cmjrts3fn00051p3gqzpg9g78' },
      include: {
        printer: {
          select: {
            printerName: true,
            printerType: true,
          }
        }
      }
    });

    if (!job) {
      console.log('❌ Job not found');
      return;
    }

    console.log('\n📋 Print Job Status:\n');
    console.log(`   ID: ${job.id}`);
    console.log(`   Status: ${job.status}`);
    console.log(`   Type: ${job.jobType}`);
    console.log(`   Printer: ${job.printer?.printerName} (${job.printer?.printerType})`);
    console.log(`   Created: ${job.createdAt}`);
    console.log(`   Processing Attempts: ${job.processingAttempts}`);
    console.log(`   Error: ${job.errorMessage || 'None'}`);
    console.log('');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkJobStatus();
