/**
 * Test script to send ESC/POS receipt to printer
 */

import { sendToPrinter } from './src/lib/printing/printer-service-usb.ts';

// Test data for receipt
const testData = {
  businessName: 'Test Restaurant',
  businessAddress: '123 Main St, City, ST 12345',
  businessPhone: '(555) 123-4567',
  orderNumber: 'ORD-001',
  orderDate: new Date().toISOString(),
  orderType: 'Dine-in',
  customerName: 'John Doe',
  employeeName: 'Jane Smith',
  items: [
    {
      name: 'Burger',
      quantity: 2,
      unitPrice: 12.50,
      totalPrice: 25.00
    },
    {
      name: 'Fries',
      quantity: 1,
      unitPrice: 5.99,
      totalPrice: 5.99
    },
    {
      name: 'Soda',
      quantity: 1,
      unitPrice: 2.50,
      totalPrice: 2.50
    }
  ],
  subtotal: 33.49,
  discountAmount: 0,
  taxAmount: 2.69,
  totalAmount: 36.18,
  paymentMethod: 'Cash',
  notes: 'Extra ketchup please'
};

// Generate ESC/POS content
function generateReceiptContent(data) {
  const ESC = '\x1B';
  const LF = '\x0A';
  const CUT = ESC + 'd' + String.fromCharCode(3);

  let content = '';

  content += ESC + '@';
  content += ESC + 'a' + String.fromCharCode(1);

  content += '='.repeat(32) + LF;
  content += centerText((data.businessName || 'BUSINESS').toUpperCase()) + LF;
  if (data.businessAddress) {
    content += centerText(data.businessAddress) + LF;
  }
  if (data.businessPhone) {
    content += centerText(`Tel: ${data.businessPhone}`) + LF;
  }
  content += '='.repeat(32) + LF + LF;

  content += ESC + 'a' + String.fromCharCode(0);

  content += `Order #: ${data.orderNumber}` + LF;
  content += `Date: ${new Date(data.orderDate).toLocaleString()}` + LF;
  content += `Type: ${data.orderType}` + LF;
  if (data.customerName) {
    content += `Customer: ${data.customerName}` + LF;
  }
  if (data.employeeName) {
    content += `Cashier: ${data.employeeName}` + LF;
  }
  content += '-'.repeat(32) + LF + LF;

  content += 'Item                 Qty  Price' + LF;
  content += '-'.repeat(32) + LF;
  const safeItems = Array.isArray(data.items) ? data.items : [];
  safeItems.forEach(item => {
    const itemName = truncate(item.name, 20);
    const qty = item.quantity.toString().padStart(3);
    const price = `$${item.totalPrice.toFixed(2)}`.padStart(7);
    content += `${itemName.padEnd(20)} ${qty} ${price}` + LF;
    if (item.quantity > 1) {
      content += `  @ $${item.unitPrice.toFixed(2)} each` + LF;
    }
  });
  content += '-'.repeat(32) + LF + LF;

  content += `Subtotal:${`$${data.subtotal.toFixed(2)}`.padStart(24)}` + LF;
  if (data.discountAmount && data.discountAmount > 0) {
    content += `Discount:${`-$${data.discountAmount.toFixed(2)}`.padStart(23)}` + LF;
  }
  content += `Tax:${`$${data.taxAmount.toFixed(2)}`.padStart(28)}` + LF;
  content += '-'.repeat(32) + LF;
  content += `TOTAL:${`$${data.totalAmount.toFixed(2)}`.padStart(26)}` + LF;
  content += '='.repeat(32) + LF + LF;

  content += `Payment: ${data.paymentMethod}` + LF + LF;

  if (data.notes) {
    content += 'Notes:' + LF;
    content += data.notes + LF + LF;
  }

  content += ESC + 'a' + String.fromCharCode(1);
  content += centerText('Thank you for your business!') + LF;
  content += centerText('Please come again') + LF + LF + LF;

  content += CUT;

  return content;
}

function centerText(text, width = 32) {
  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(padding) + text;
}

function truncate(text, maxLength) {
  return text.length > maxLength ? text.substring(0, maxLength) : text;
}

try {
  const receiptContent = generateReceiptContent(testData);
  console.log(`Generated receipt content: ${receiptContent.length} bytes`);

  // Send to printer
  await sendToPrinter(receiptContent, {
    printerName: 'EPSON TM-T20III Receipt',
    copies: 1
  });

  console.log('✅ Receipt sent to printer successfully!');

} catch (error) {
  console.error('❌ Error sending receipt to printer:', error);
}