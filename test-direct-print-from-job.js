/**
 * Test direct printing from a completed job
 * This will re-send an existing job to the printer
 */

const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const prisma = new PrismaClient();

(async () => {
  try {
    const jobId = process.argv[2] || '169280a0-35e6-45da-91ce-1204de46158f';

    console.log('🔍 Fetching print job:', jobId.substring(0, 8) + '...\n');

    const job = await prisma.printJobs.findUnique({
      where: { id: jobId },
      include: {
        network_printers: true
      }
    });

    if (!job) {
      console.error('❌ Job not found');
      process.exit(1);
    }

    console.log('📋 Job Details:');
    console.log('   Status:', job.status);
    console.log('   Printer:', job.network_printers.printerName);
    console.log('');

    // Extract and decode receipt text
    const jobData = job.jobData;
    const receiptTextBase64 = jobData.receiptText;

    console.log('📄 Receipt text (base64):', receiptTextBase64.substring(0, 50) + '...');
    console.log('');

    // Decode from base64 to binary
    const printContent = Buffer.from(receiptTextBase64, 'base64').toString('binary');

    console.log('📊 Decoded content length:', printContent.length, 'bytes');
    console.log('');

    console.log('🔍 First 100 bytes (as hex):');
    const hex = Buffer.from(printContent, 'binary').toString('hex');
    console.log(hex.substring(0, 200));
    console.log('');

    console.log('🔍 First 200 chars (as text):');
    console.log(printContent.substring(0, 200));
    console.log('');

    // Create temp file
    const tempFile = path.join(os.tmpdir(), `reprint-${Date.now()}.prn`);
    fs.writeFileSync(tempFile, Buffer.from(printContent, 'binary'));

    console.log(`📁 Temp file created: ${tempFile}`);
    console.log('');

    // Send to printer
    console.log(`🖨️  Sending to printer: ${job.network_printers.printerName}...`);
    const printCmd = `print /D:"${job.network_printers.printerName}" "${tempFile}"`;

    execSync(printCmd, {
      encoding: 'utf8',
      timeout: 30000,
      shell: 'cmd.exe'
    });

    console.log('✅ Print command executed successfully!');
    console.log('');
    console.log('🔍 Check if the receipt printed on the physical printer.');

    // Cleanup
    setTimeout(() => {
      try {
        fs.unlinkSync(tempFile);
        console.log('🗑️  Cleaned up temp file');
      } catch (err) {
        // Ignore cleanup errors
      }
      prisma.$disconnect();
    }, 5000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('');
    console.error('Stack trace:', error.stack);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
