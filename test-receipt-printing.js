const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testReceiptPrinting() {
  try {
    // Get a grocery order
    const order = await prisma.businessOrders.findFirst({
      where: {
        businessType: 'grocery'
      },
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
      console.log('No grocery orders found');
      return;
    }

    console.log('Testing receipt printing for order:', order.orderNumber);

    // Build receipt data using the receipt-builder utility
    const receiptData = {
      receiptNumber: order.orderNumber,
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
      taxAmount: parseFloat(order.taxAmount),
      discountAmount: parseFloat(order.discountAmount),
      totalAmount: parseFloat(order.totalAmount),
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      customerInfo: order.attributes?.customerInfo || null,
      notes: order.notes
    };

    console.log('Receipt data built successfully');
    console.log('Items count:', receiptData.items.length);
    console.log('Total amount:', receiptData.totalAmount);

    // Test the API call
    const response = await fetch('http://localhost:8080/api/print/receipt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(receiptData)
    });

    const result = await response.json();
    console.log('API Response status:', response.status);
    console.log('API Response:', JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testReceiptPrinting();