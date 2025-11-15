const { PrismaClient } = require('@prisma/client');
const http = require('http');

const prisma = new PrismaClient();

async function testReceiptPrinting() {
  try {
    // Get a grocery order
    const order = await prisma.businessOrders.findFirst({
      where: { businessType: 'grocery' },
      include: {
        business_order_items: {
          include: {
            product_variants: {
              include: {
                business_products: true
              }
            }
          }
        },
        businesses: true
      }
    });

    if (!order) {
      console.log('No grocery orders found for testing');
      return;
    }

    console.log('Testing receipt printing for order:', order.orderNumber);

    // Simulate the receipt data that would be sent from the UI
    const receiptData = {
      receiptNumber: { formattedNumber: order.orderNumber },
      businessId: order.businessId,
      transactionId: order.id,
      transactionDate: order.createdAt.toISOString(),
      businessName: order.businesses?.name || 'Grocery Store',
      businessType: order.businessType,
      items: order.business_order_items.map(item => ({
        name: item.product_variants?.business_products?.name || 'Unknown Item',
        quantity: parseInt(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        totalPrice: parseFloat(item.totalPrice),
        attributes: item.attributes
      })),
      subtotal: parseFloat(order.subtotal),
      tax: parseFloat(order.taxAmount),
      discount: parseFloat(order.discountAmount),
      total: parseFloat(order.totalAmount),
      paymentMethod: order.paymentMethod,
      salespersonName: 'Test Cashier'
    };

    // Get the printer
    const printer = await prisma.networkPrinters.findFirst();
    if (!printer) {
      console.log('No printer found');
      return;
    }

    console.log('Using printer:', printer.printerName);

    // Simulate API call - create print job
    const testData = {
      businessId: order.businessId,
      businessType: order.businessType,
      printerId: printer.id,
      receiptData: receiptData
    };

    console.log('Sending print request to API...');

    const postData = JSON.stringify(testData);
    const options = {
      hostname: 'localhost',
      port: 8080,
      path: '/api/print/receipt',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      console.log('API Response Status:', res.statusCode);
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('API Response:', JSON.stringify(result, null, 2));

          if (result.success) {
            console.log('Print job created successfully. Job ID:', result.jobId);
            console.log('Waiting for worker to process...');

            // Wait and check job status
            setTimeout(() => {
              prisma.printJobs.findUnique({
                where: { id: result.jobId }
              }).then(job => {
                console.log('Final job status:', job?.status);
                if (job?.errorMessage) {
                  console.log('Error message:', job.errorMessage);
                }
                if (job?.status === 'COMPLETED') {
                  console.log('✅ Receipt printing test PASSED!');
                } else {
                  console.log('❌ Receipt printing test FAILED!');
                }
                return prisma.$disconnect();
              }).catch(e => {
                console.error('Error checking final status:', e.message);
                return prisma.$disconnect();
              });
            }, 8000);
          } else {
            console.log('❌ API call failed:', result.error);
            prisma.$disconnect();
          }
        } catch (e) {
          console.log('Raw response:', data);
          prisma.$disconnect();
        }
      });
    });

    req.on('error', (e) => {
      console.error('API request error:', e.message);
      prisma.$disconnect();
    });

    req.write(postData);
    req.end();

  } catch (error) {
    console.error('Error:', error.message);
    await prisma.$disconnect();
  }
}

testReceiptPrinting();