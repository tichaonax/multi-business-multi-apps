/**
 * Final test - verify receipt margins and printing
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFinalPrint() {
  console.log('🧪 Testing final receipt print with corrected margins...\n');

  // Get printer
  const printer = await prisma.networkPrinters.findFirst({
    where: { printerName: 'EPSON TM-T20III Receipt' }
  });

  if (!printer) {
    console.error('❌ Printer not found!');
    process.exit(1);
  }

  console.log(`✅ Found printer: ${printer.printerName}`);
  console.log(`   Port: ${printer.ipAddress || 'USB'}\n`);

  // Get business
  const business = await prisma.businesses.findFirst({
    where: { type: 'grocery' }
  });

  // Get user
  const user = await prisma.users.findFirst();

  console.log(`✅ Using business: ${business.name}`);
  console.log(`✅ Using user: ${user.name || user.email}\n`);

  // Create realistic grocery receipt with longer item names
  const ESC = '\x1B';
  const LF = '\x0A';
  const GS = '\x1D';

  const receiptText =
    ESC + '@' +                           // Initialize
    ESC + 'a' + String.fromCharCode(1) +  // Center align
    '='.repeat(42) + LF +
    'Grocery Store Demo' + LF +
    '123 Main Street, City, State 12345' + LF +
    'Phone: (555) 123-4567' + LF +
    '='.repeat(42) + LF +
    'CUSTOMER RECEIPT' + LF +
    '='.repeat(42) + LF +
    ESC + 'a' + String.fromCharCode(0) +  // Left align
    LF +
    'Receipt: 2025-11-14-TEST' + LF +
    'Date: ' + new Date().toLocaleString() + LF +
    'Cashier: ' + (user.name || 'Test User') + LF +
    '='.repeat(42) + LF +
    LF +
    // Test items with varying name lengths
    '1x Organic Bananas' + ' '.repeat(42 - '1x Organic Bananas'.length - '$2.99'.length) + '$2.99' + LF +
    '2x Fresh Milk (1 Gallon)' + ' '.repeat(42 - '2x Fresh Milk (1 Gallon)'.length - '$7.98'.length) + '$7.98' + LF +
    '1x Whole Wheat Bread' + ' '.repeat(42 - '1x Whole Wheat Bread'.length - '$3.49'.length) + '$3.49' + LF +
    '3x Large Eggs (Dozen)' + ' '.repeat(42 - '3x Large Eggs (Dozen)'.length - '$8.97'.length) + '$8.97' + LF +
    LF +
    '='.repeat(42) + LF +
    'Subtotal' + ' '.repeat(42 - 'Subtotal'.length - '$23.43'.length) + '$23.43' + LF +
    'Tax' + ' '.repeat(42 - 'Tax'.length - '$1.41'.length) + '$1.41' + LF +
    '='.repeat(42) + LF +
    'TOTAL' + ' '.repeat(42 - 'TOTAL'.length - '$24.84'.length) + '$24.84' + LF +
    '='.repeat(42) + LF +
    LF +
    'Payment: CASH' + LF +
    'Paid' + ' '.repeat(42 - 'Paid'.length - '$30.00'.length) + '$30.00' + LF +
    'Change' + ' '.repeat(42 - 'Change'.length - '$5.16'.length) + '$5.16' + LF +
    LF +
    ESC + 'a' + String.fromCharCode(1) +  // Center align
    'Thank you for shopping!' + LF +
    'Fresh savings every day!' + LF +
    LF + LF + LF +                        // Feed
    GS + 'V' + '\x41' + '\x03';           // Partial cut

  // Base64 encode
  const receiptBase64 = Buffer.from(receiptText, 'binary').toString('base64');

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
  console.log(`   Status: ${job.status}\n`);
  console.log(`📊 Job queued. Worker should process it within 3 seconds...`);
  console.log(`\n🔍 Check the printed receipt for:`);
  console.log(`   1. Proper line width (42 characters)`);
  console.log(`   2. No unnecessary text wrapping`);
  console.log(`   3. Aligned prices on the right`);
  console.log(`   4. Clean, readable format`);
  console.log(`\n⏳ Waiting 10 seconds to check job status...`);

  await new Promise(resolve => setTimeout(resolve, 10000));

  const updatedJob = await prisma.printJobs.findUnique({
    where: { id: job.id }
  });

  console.log(`\n📋 Final job status: ${updatedJob.status}`);
  if (updatedJob.errorMessage) {
    console.log(`   ❌ Error: ${updatedJob.errorMessage}`);
  }
  if (updatedJob.processedAt) {
    console.log(`   ✅ Processed: ${updatedJob.processedAt.toLocaleString()}`);
  }

  console.log(`\n==================================================`);
  console.log(`Does the receipt look better now?`);
  console.log(`- Is the text more readable?`);
  console.log(`- Are prices properly aligned?`);
  console.log(`- Is there less unnecessary wrapping?`);
  console.log(`==================================================`);

  await prisma.$disconnect();
}

testFinalPrint().catch(async (error) => {
  console.error('Error:', error);
  await prisma.$disconnect();
  process.exit(1);
});
