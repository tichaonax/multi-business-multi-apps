/**
 * Test the fixed printing functionality
 * This simulates the full print queue workflow
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestPrintJob() {
  console.log('🧪 Creating test print job...\n');

  // Get printer
  const printer = await prisma.networkPrinters.findFirst({
    where: { printerName: 'EPSON TM-T20III Receipt' }
  });

  if (!printer) {
    console.error('❌ Printer not found!');
    process.exit(1);
  }

  console.log(`✅ Found printer: ${printer.printerName}`);
  console.log(`   ID: ${printer.id}`);
  console.log(`   Port: ${printer.ipAddress || 'Local'}\n`);

  // Create simple ESC/POS receipt
  const ESC = '\x1B';
  const LF = '\x0A';
  const GS = '\x1D';

  const receiptText =
    ESC + '@' +                           // Initialize
    ESC + 'a' + String.fromCharCode(1) +  // Center align
    '='.repeat(32) + LF +
    'PRINT TEST - FIXED CODE' + LF +
    '='.repeat(32) + LF +
    ESC + 'a' + String.fromCharCode(0) +  // Left align
    LF +
    'Date: ' + new Date().toLocaleString() + LF +
    'Test: Printer Service USB Fix' + LF +
    LF +
    'If you see this printed, the fix' + LF +
    'is working correctly!' + LF +
    LF +
    '='.repeat(32) + LF +
    ESC + 'a' + String.fromCharCode(1) +  // Center align
    'SUCCESS!' + LF +
    '='.repeat(32) + LF +
    LF + LF + LF +                        // Feed
    GS + 'V' + '\x41' + '\x03';           // Partial cut

  // Base64 encode
  const receiptBase64 = Buffer.from(receiptText, 'binary').toString('base64');

  // Get a business for the test
  const business = await prisma.businesses.findFirst({
    where: { type: 'grocery' }
  });

  if (!business) {
    console.error('❌ No grocery business found!');
    process.exit(1);
  }

  console.log(`✅ Using business: ${business.name}`);

  // Get a user for the test
  const user = await prisma.users.findFirst();

  if (!user) {
    console.error('❌ No user found!');
    process.exit(1);
  }

  console.log(`✅ Using user: ${user.name || user.email}\n`);

  // Create print job
  const job = await prisma.printJobs.create({
    data: {
      printerId: printer.id,
      jobType: 'receipt',
      status: 'PENDING',
      businessId: business.id,
      businessType: business.type,
      jobData: {
        receiptText: receiptBase64,
        copies: 1,
      },
      userId: user.id,
      createdAt: new Date(),
    }
  });

  console.log(`✅ Created print job: ${job.id}`);
  console.log(`   Status: ${job.status}`);
  console.log(`   Type: ${job.jobType}`);
  console.log(`\n📊 Job queued. Worker should process it within 3 seconds...`);
  console.log(`\n🔍 Watch for:`);
  console.log(`   1. Worker log showing job processing`);
  console.log(`   2. Physical printer output`);
  console.log(`\n⏳ Waiting 15 seconds to check job status...`);

  // Wait and check status
  await new Promise(resolve => setTimeout(resolve, 15000));

  const updatedJob = await prisma.printJobs.findUnique({
    where: { id: job.id }
  });

  console.log(`\n📋 Final job status: ${updatedJob.status}`);
  if (updatedJob.errorMessage) {
    console.log(`   Error: ${updatedJob.errorMessage}`);
  }
  if (updatedJob.processedAt) {
    console.log(`   Processed: ${updatedJob.processedAt.toLocaleString()}`);
  }

  if (updatedJob.status === 'COMPLETED') {
    console.log(`\n✅ SUCCESS! Job completed.`);
    console.log(`\n❓ Did the receipt print on the physical printer?`);
  } else if (updatedJob.status === 'FAILED') {
    console.log(`\n❌ FAILED! Check error message above.`);
  } else {
    console.log(`\n⚠️  Job still ${updatedJob.status}. Worker may not be running.`);
  }

  await prisma.$disconnect();
}

createTestPrintJob().catch(async (error) => {
  console.error('Error:', error);
  await prisma.$disconnect();
  process.exit(1);
});
