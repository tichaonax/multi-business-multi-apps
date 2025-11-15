// Test script for printing module database schema
// Validates that NetworkPrinters, PrintJobs, and ReceiptSequences tables work correctly

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPrintingSchema() {
  console.log('🧪 Testing Printing Module Database Schema...\n');

  try {
    // Find a test business or create one
    let testBusiness = await prisma.businesses.findFirst({
      where: { isDemo: true }
    });

    if (!testBusiness) {
      console.log('❌ No demo business found. Please create a demo business first.');
      return;
    }

    console.log(`✅ Using test business: ${testBusiness.name} (${testBusiness.id})`);

    // Find a test user or create one
    let testUser = await prisma.users.findFirst({
      where: { role: 'admin' }
    });

    if (!testUser) {
      console.log('❌ No admin user found. Please create an admin user first.');
      return;
    }

    console.log(`✅ Using test user: ${testUser.name} (${testUser.email})\n`);

    // Test 1: Create NetworkPrinter
    console.log('📌 Test 1: Creating NetworkPrinter...');
    const testPrinter = await prisma.networkPrinters.create({
      data: {
        printerId: `printer-test-${Date.now()}`,
        printerName: 'Test Thermal Printer',
        printerType: 'receipt',
        nodeId: 'test-node-1',
        ipAddress: '192.168.1.100',
        port: 9100,
        capabilities: ['esc-pos'],
        isShareable: true,
        isOnline: true,
      },
    });
    console.log(`✅ Created printer: ${testPrinter.printerName} (${testPrinter.id})`);

    // Test 2: Create Print Job
    console.log('\n📌 Test 2: Creating PrintJob...');
    const testPrintJob = await prisma.printJobs.create({
      data: {
        printerId: testPrinter.id,
        businessId: testBusiness.id,
        businessType: testBusiness.type,
        userId: testUser.id,
        jobType: 'receipt',
        jobData: {
          receiptNumber: {
            globalId: `receipt-${Date.now()}`,
            dailySequence: '001',
            formattedNumber: `2025-11-13-001`,
          },
          businessName: testBusiness.name,
          transactionId: `txn-${Date.now()}`,
          items: [
            {
              name: 'Test Item',
              quantity: 1,
              unitPrice: 10.00,
              totalPrice: 10.00,
            },
          ],
          subtotal: 10.00,
          tax: 0.80,
          total: 10.80,
          paymentMethod: 'cash',
        },
        status: 'PENDING',
        retryCount: 0,
      },
    });
    console.log(`✅ Created print job: ${testPrintJob.id} (Status: ${testPrintJob.status})`);

    // Test 3: Create ReceiptSequence
    console.log('\n📌 Test 3: Creating ReceiptSequence...');
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const testSequence = await prisma.receiptSequences.upsert({
      where: {
        businessId_date: {
          businessId: testBusiness.id,
          date: today,
        },
      },
      update: {
        lastSequence: {
          increment: 1,
        },
      },
      create: {
        businessId: testBusiness.id,
        date: today,
        lastSequence: 1,
      },
    });
    console.log(`✅ Receipt sequence for ${today}: ${testSequence.lastSequence}`);

    // Test 4: Query relationships
    console.log('\n📌 Test 4: Testing relationships...');
    const printerWithJobs = await prisma.networkPrinters.findUnique({
      where: { id: testPrinter.id },
      include: {
        print_jobs: true,
      },
    });
    console.log(`✅ Printer has ${printerWithJobs.print_jobs.length} print job(s)`);

    const businessWithData = await prisma.businesses.findUnique({
      where: { id: testBusiness.id },
      include: {
        print_jobs: true,
        receipt_sequences: true,
      },
    });
    console.log(`✅ Business has ${businessWithData.print_jobs.length} print job(s)`);
    console.log(`✅ Business has ${businessWithData.receipt_sequences.length} receipt sequence(s)`);

    // Test 5: Update print job status
    console.log('\n📌 Test 5: Updating print job status...');
    const updatedJob = await prisma.printJobs.update({
      where: { id: testPrintJob.id },
      data: {
        status: 'COMPLETED',
        processedAt: new Date(),
      },
    });
    console.log(`✅ Print job status updated: ${updatedJob.status}`);

    // Test 6: Cleanup
    console.log('\n📌 Test 6: Cleaning up test data...');
    await prisma.printJobs.delete({ where: { id: testPrintJob.id } });
    console.log('✅ Deleted test print job');

    await prisma.networkPrinters.delete({ where: { id: testPrinter.id } });
    console.log('✅ Deleted test printer');

    await prisma.receiptSequences.delete({ where: { id: testSequence.id } });
    console.log('✅ Deleted test receipt sequence');

    console.log('\n🎉 All tests passed! Printing module schema is working correctly.');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testPrintingSchema();
