const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

const prisma = new PrismaClient();

// Worker configuration
const POLL_INTERVAL = 3000; // Check queue every 3 seconds

async function getNextPendingJob() {
  return await prisma.printJobs.findFirst({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' }
  });
}

async function markJobAsProcessing(jobId) {
  await prisma.printJobs.update({
    where: { id: jobId },
    data: { status: 'PROCESSING' }
  });
}

async function markJobAsCompleted(jobId) {
  await prisma.printJobs.update({
    where: { id: jobId },
    data: {
      status: 'COMPLETED',
      processedAt: new Date()
    }
  });
}

async function markJobAsFailed(jobId, errorMessage) {
  await prisma.printJobs.update({
    where: { id: jobId },
    data: {
      status: 'FAILED',
      errorMessage,
      processedAt: new Date()
    }
  });
}

async function sendToPrinter(content, options) {
  const { printerName, copies = 1 } = options;
  const fs = require('fs');
  const path = require('path');
  const os = require('os');

  // Create temp file for print job
  const tempDir = process.env.TEMP || os.tmpdir();
  const tempFile = path.join(tempDir, `print-${Date.now()}.prn`);

  try {
    // Write binary content to temp file
    // ESC/POS commands must be written as binary data, not UTF-8 text
    fs.writeFileSync(tempFile, Buffer.from(content, 'binary'));

    console.log(`🖨️  Printer: ${printerName}`);
    console.log(`📄  Temp file: ${tempFile}`);
    console.log(`📊  Content size: ${content.length} bytes`);

    // Use Windows PRINT command which properly handles RAW data through the spooler
    // This works for all printer types: USB, COM port, and Network printers
    for (let i = 0; i < copies; i++) {
      const printCmd = `print /D:"${printerName}" "${tempFile}"`;

      execSync(printCmd, {
        encoding: 'utf8',
        timeout: 30000,
        shell: 'cmd.exe', // Use cmd.exe for Windows PRINT command
      });

      if (copies > 1) {
        console.log(`   📄 Copy ${i + 1} of ${copies} sent to spooler`);
      }

      // Small delay between copies to prevent spooler issues
      if (i < copies - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`✅ Sent ${content.length} bytes to printer: ${printerName}`);

    // Clean up temp file after a delay to ensure print spooler has read it
    setTimeout(() => {
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      } catch (err) {
        console.warn(`Failed to delete temp file: ${tempFile}`);
      }
    }, 10000); // 10 second delay to ensure spooler has processed the file

  } catch (error) {
    const errorMsg = error.message || String(error);
    console.error(`\n❌ Windows print error:`, error);
    throw new Error(`Windows print failed: ${errorMsg}`);
  }
}

async function processQueue() {
  try {
    // Get next pending job
    const job = await getNextPendingJob();

    if (!job) {
      return;
    }

    console.log(`\n🖨️  Processing print job: ${job.id}`);
    console.log(`   Type: ${job.jobType}`);
    console.log(`   Created: ${new Date(job.createdAt).toLocaleTimeString()}`);

    // Mark as processing
    await markJobAsProcessing(job.id);

    // Get printer details
    const printer = await prisma.networkPrinters.findUnique({
      where: { id: job.printerId },
    });

    if (!printer) {
      throw new Error(`Printer not found: ${job.printerId}`);
    }

    console.log(`   Printer: ${printer.printerName}`);

    // Extract print content
    let printContent = '';
    const jobData = job.jobData;

    if (job.jobType === 'receipt') {
      const receiptText = jobData.receiptText || '';
      // Decode from base64 if it's encoded
      printContent = receiptText.startsWith('data:') || receiptText.length > 100
        ? Buffer.from(receiptText, 'base64').toString('binary')
        : receiptText;
    } else if (job.jobType === 'label') {
      printContent = jobData.labelText || jobData.formattedLabel || '';
    }

    if (!printContent) {
      throw new Error('No print content found in job data');
    }

    console.log(`   Content length: ${printContent.length} characters`);

    // Check if printer is available
    const printers = execSync('powershell -Command "Get-Printer | Select-Object -ExpandProperty Name"', {
      encoding: 'utf8',
    }).trim().split('\n').map(name => name.trim()).filter(Boolean);

    const available = printers.includes(printer.printerName);
    if (!available) {
      throw new Error(`Printer "${printer.printerName}" not found in system`);
    }

    // Send to printer
    await sendToPrinter(printContent, {
      printerName: printer.printerName,
      copies: jobData.copies || 1,
    });

    // Mark as completed
    await markJobAsCompleted(job.id);

    console.log(`   ✅ Job completed successfully`);

  } catch (error) {
    console.error(`   ❌ Print job failed: ${error.message}`);

    // Try to mark job as failed
    try {
      const job = await getNextPendingJob();
      if (job) {
        await markJobAsFailed(job.id, error.message);
      }
    } catch (markError) {
      console.error('   Failed to mark job as failed:', markError);
    }
  }
}

async function startWorker() {
  console.log('🚀 Starting print queue worker...');
  console.log(`   Polling interval: ${POLL_INTERVAL}ms`);
  console.log(`   Platform: ${process.platform}`);

  // Process queue immediately on start
  await processQueue();

  // Then poll at regular intervals
  setInterval(async () => {
    await processQueue();
  }, POLL_INTERVAL);

  console.log('✅ Print queue worker started successfully\n');
}

// Handle shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down print queue worker...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down print queue worker...');
  await prisma.$disconnect();
  process.exit(0);
});

// Start the worker
startWorker().catch(console.error);