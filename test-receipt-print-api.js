/**
 * Test Receipt Print API
 * This tests the /api/print/receipt endpoint to verify it can print receipts
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testReceiptPrintAPI() {
  try {
    console.log('🧪 Testing Receipt Print API...\n');

    // Get the printer
    const printer = await prisma.networkPrinters.findFirst({
      where: {
        printerType: 'receipt',
        isOnline: true
      }
    });

    if (!printer) {
      console.error('❌ No online receipt printer found');
      process.exit(1);
    }

    console.log(`✅ Found printer: ${printer.printerName} (${printer.id})\n`);

    // Test receipt data
    const testReceiptData = {
      printerId: printer.id,
      businessId: 'restaurant-demo',
      businessType: 'restaurant',
      businessName: 'Test Restaurant',
      transactionId: 'TEST-' + Date.now(),
      orderNumber: 'TEST-' + Date.now(),
      items: [
        {
          name: 'Test Item 1',
          quantity: 2,
          unitPrice: 10.00,
          totalPrice: 20.00
        },
        {
          name: 'Test Item 2',
          quantity: 1,
          unitPrice: 15.00,
          totalPrice: 15.00
        }
      ],
      subtotal: 35.00,
      tax: 0,
      total: 35.00,
      paymentMethod: 'cash',
      amountPaid: 40.00,
      changeDue: 5.00
    };

    console.log('📋 Test receipt data:', JSON.stringify(testReceiptData, null, 2));
    console.log('');

    // Make API request (simulating what the POS would do)
    console.log('🔄 Sending to /api/print/receipt...\n');

    const response = await fetch('http://localhost:8080/api/print/receipt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: In production, this would need authentication
      },
      body: JSON.stringify(testReceiptData)
    });

    console.log(`📡 Response status: ${response.status} ${response.statusText}`);

    const result = await response.json();
    console.log('📄 Response body:', JSON.stringify(result, null, 2));
    console.log('');

    if (response.ok) {
      console.log('✅ Receipt API call successful!');
      console.log(`   Job ID: ${result.jobId}`);
      console.log(`   Status: ${result.printJob?.status}`);
      console.log(`   Receipt #: ${result.printJob?.receiptNumber}`);
      console.log('');
      console.log('🔍 Check if the receipt printed on the physical printer.');
    } else {
      console.error('❌ Receipt API call failed!');
      console.error(`   Error: ${result.error || 'Unknown error'}`);
      console.error(`   Details: ${result.details || 'N/A'}`);
    }

    await prisma.$disconnect();

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('');
    console.error('Stack trace:', error.stack);
    await prisma.$disconnect();
    process.exit(1);
  }
}

testReceiptPrintAPI();
