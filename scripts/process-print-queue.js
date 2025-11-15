/**
 * Manual Print Queue Processor
 * Processes pending print jobs and sends to printer
 * This is a temporary solution until background worker is implemented
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const prisma = new PrismaClient();

async function processPrintQueue() {
  console.log('\n🖨️  Processing Print Queue...\n');

  try {
    // Get all pending jobs
    const pendingJobs = await prisma.printJobs.findMany({
      where: {
        status: 'PENDING',
      },
      orderBy: {
        createdAt: 'asc', // FIFO
      },
      include: {
        network_printers: true,
      },
    });

    if (pendingJobs.length === 0) {
      console.log('✅ No pending jobs in queue.\n');
      return;
    }

    console.log(`📋 Found ${pendingJobs.length} pending job(s)\n`);

    for (const job of pendingJobs) {
      console.log(`\n🔄 Processing Job: ${job.id}`);
      console.log(`   Type: ${job.jobType}`);
      console.log(`   Printer: ${job.network_printers.printerName}`);

      try {
        // Mark as processing
        await prisma.printJobs.update({
          where: { id: job.id },
          data: { status: 'PROCESSING' },
        });

        // Extract print data
        const jobData = job.jobData;
        let printText = '';

        if (job.jobType === 'receipt') {
          printText = jobData.receiptText || '';
        } else if (job.jobType === 'label') {
          printText = jobData.labelText || '';
        }

        if (!printText) {
          throw new Error('No print text found in job data');
        }

        console.log(`   Print data length: ${printText.length} characters`);
        console.log('\n   --- RECEIPT PREVIEW ---');
        console.log(printText);
        console.log('   --- END PREVIEW ---\n');

        // For USB printers on Windows, we need to send to printer
        // Method 1: Save to temp file and print via Windows
        if (process.platform === 'win32') {
          const tempFile = path.join(process.env.TEMP || 'C:\\temp', `print-${job.id}.txt`);
          fs.writeFileSync(tempFile, printText, 'utf8');

          console.log(`   Saved to: ${tempFile}`);
          console.log(`   Attempting to print to USB printer: ${job.network_printers.printerName}`);

          // Try to print using Windows print command
          try {
            // Note: This requires the printer to be set up in Windows with the exact name
            await execPromise(`notepad /p "${tempFile}"`);
            console.log('   ✅ Sent to Windows print spooler');
          } catch (printError) {
            console.log(`   ⚠️  Windows print failed: ${printError.message}`);
            console.log(`   💡 Manual action: Print the file manually from ${tempFile}`);
          }

          // Don't delete temp file immediately - let user verify
          // fs.unlinkSync(tempFile);
        } else {
          console.log('   ℹ️  Non-Windows platform - printing not implemented yet');
        }

        // Mark as completed
        await prisma.printJobs.update({
          where: { id: job.id },
          data: {
            status: 'COMPLETED',
            processedAt: new Date(),
          },
        });

        console.log(`   ✅ Job completed`);

      } catch (error) {
        console.error(`   ❌ Job failed: ${error.message}`);

        // Mark as failed
        await prisma.printJobs.update({
          where: { id: job.id },
          data: {
            status: 'FAILED',
            errorMessage: error.message,
            processedAt: new Date(),
          },
        });
      }
    }

    console.log(`\n✅ Queue processing complete!\n`);

  } catch (error) {
    console.error('❌ Error processing queue:', error);
  } finally {
    await prisma.$disconnect();
  }
}

processPrintQueue();
