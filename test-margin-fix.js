/**
 * Test margin fixes - verify no excessive left/right margins
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testMarginFix() {
  console.log('🧪 Testing margin fixes...\n');

  const printer = await prisma.networkPrinters.findFirst({
    where: { printerName: 'EPSON TM-T20III Receipt' }
  });

  const business = await prisma.businesses.findFirst({
    where: { type: 'grocery' }
  });

  const user = await prisma.users.findFirst();

  console.log(`✅ Printer: ${printer.printerName}`);
  console.log(`✅ Business: ${business.name}`);
  console.log(`✅ User: ${user.name || user.email}\n`);

  // Create test receipt with clear margin indicators
  const ESC = '\x1B';
  const LF = '\x0A';
  const GS = '\x1D';

  const receiptText =
    ESC + '@' +                           // Initialize printer
    ESC + 'l' + String.fromCharCode(0) +  // Set left margin to 0
    ESC + 'a' + String.fromCharCode(1) +  // Center align
    '='.repeat(42) + LF +
    'MARGIN TEST' + LF +
    '='.repeat(42) + LF +
    ESC + 'a' + String.fromCharCode(0) +  // Left align
    LF +
    'This text should start at left edge' + LF +
    'No wide margins on left or right' + LF +
    'Full 42 character width:' + LF +
    '123456789012345678901234567890123456789012' + LF +
    LF +
    'Item Name' + ' '.repeat(42 - 'Item Name'.length - '$99.99'.length) + '$99.99' + LF +
    'Long Item Name Here' + ' '.repeat(42 - 'Long Item Name Here'.length - '$12.34'.length) + '$12.34' + LF +
    LF +
    ESC + 'a' + String.fromCharCode(1) +  // Center
    'This should be centered' + LF +
    ESC + 'a' + String.fromCharCode(0) +  // Left
    'Back to left aligned' + LF +
    LF +
    '='.repeat(42) + LF +
    'Total' + ' '.repeat(42 - 'Total'.length - '$112.33'.length) + '$112.33' + LF +
    '='.repeat(42) + LF +
    LF + LF + LF +
    GS + 'V' + '\x41' + '\x03';           // Cut

  const receiptBase64 = Buffer.from(receiptText, 'binary').toString('base64');

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

  console.log(`✅ Created test job: ${job.id}`);
  console.log(`\n⏳ Waiting 10 seconds for print...`);
  console.log(`\n🔍 Check the printed receipt:`);
  console.log(`   1. Does text start at the LEFT EDGE of paper?`);
  console.log(`   2. Does the 42-character line span most of the width?`);
  console.log(`   3. Are prices aligned on the RIGHT without extra space?`);
  console.log(`   4. Is "This should be centered" actually centered?`);
  console.log(`   5. No wide blank margins on left/right sides?`);

  await new Promise(resolve => setTimeout(resolve, 10000));

  const updatedJob = await prisma.printJobs.findUnique({
    where: { id: job.id }
  });

  console.log(`\n📋 Job status: ${updatedJob.status}`);
  if (updatedJob.status === 'COMPLETED') {
    console.log(`✅ Job completed successfully`);
  } else if (updatedJob.errorMessage) {
    console.log(`❌ Error: ${updatedJob.errorMessage}`);
  }

  console.log(`\n==================================================`);
  console.log(`Did the margins look correct on the printed receipt?`);
  console.log(`==================================================`);

  await prisma.$disconnect();
}

testMarginFix().catch(async (error) => {
  console.error('Error:', error);
  await prisma.$disconnect();
  process.exit(1);
});
