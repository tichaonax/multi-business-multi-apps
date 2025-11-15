/**
 * Test script for receipt generation with ESC/POS commands
 */

// Simulate the generateReceipt function with ESC/POS
function generateReceipt(data) {
  // ESC/POS commands
  const ESC = '\x1B'; // ESC
  const LF = '\x0A'; // Line feed
  const CUT = ESC + 'd' + String.fromCharCode(3); // Cut paper

  let receipt = '';

  // Initialize printer
  receipt += ESC + '@';

  // Header - center align
  receipt += ESC + 'a' + String.fromCharCode(1);
  receipt += '='.repeat(32) + LF;
  receipt += centerText(data.businessName) + LF;
  if (data.businessAddress) receipt += centerText(data.businessAddress) + LF;
  if (data.businessPhone) receipt += centerText(data.businessPhone) + LF;
  receipt += '='.repeat(32) + LF;

  // Left align for content
  receipt += ESC + 'a' + String.fromCharCode(0);

  // Receipt info
  receipt += `Receipt: ${data.receiptNumber.formattedNumber}` + LF;
  receipt += `Date: ${new Date(data.transactionDate).toLocaleString()}` + LF;
  receipt += `Transaction: ${data.transactionId}` + LF;
  receipt += `Salesperson: ${data.salespersonName}` + LF;
  receipt += '='.repeat(32) + LF;

  // Items
  data.items.forEach(item => {
    receipt += formatLineItem(item.name, item.quantity, item.unitPrice, item.totalPrice);
    if (item.notes) {
      receipt += `  ${item.notes}` + LF;
    }
  });

  receipt += '='.repeat(32) + LF;

  // Totals
  receipt += formatTotal('Subtotal', data.subtotal);
  receipt += formatTotal('Tax', data.tax);
  if (data.discount) {
    receipt += formatTotal('Discount', -data.discount);
  }
  receipt += '='.repeat(32) + LF;
  receipt += formatTotal('TOTAL', data.total, true);
  receipt += '='.repeat(32) + LF;

  // Payment
  receipt += `Payment: ${data.paymentMethod.toUpperCase()}` + LF;

  // Footer - center align
  receipt += ESC + 'a' + String.fromCharCode(1);
  receipt += LF;
  receipt += centerText(data.footerMessage || 'Thank you!') + LF + LF;

  // Cut paper
  receipt += CUT;

  return receipt;
}

function centerText(text) {
  const ESC = '\x1B';
  const RECEIPT_WIDTH = 48;
  const padding = Math.max(0, Math.floor((RECEIPT_WIDTH - text.length) / 2));
  return ESC + 'a' + String.fromCharCode(1) + ' '.repeat(padding) + text + ESC + 'a' + String.fromCharCode(0);
}

function formatLineItem(name, qty, unitPrice, total) {
  const RECEIPT_WIDTH = 48;
  const qtyStr = qty > 1 ? `${qty}x ` : '';
  const nameWithQty = `${qtyStr}${name}`;
  const totalStr = `$${total.toFixed(2)}`;

  // Try to fit on one line
  if (nameWithQty.length + totalStr.length + 1 <= RECEIPT_WIDTH) {
    const padding = RECEIPT_WIDTH - nameWithQty.length - totalStr.length;
    return nameWithQty + ' '.repeat(padding) + totalStr + '\n';
  } else {
    // Multi-line if name is too long
    return nameWithQty + '\n' + ' '.repeat(RECEIPT_WIDTH - totalStr.length) + totalStr + '\n';
  }
}

function formatTotal(label, amount, bold = false) {
  const RECEIPT_WIDTH = 48;
  const amountStr = `$${typeof amount === 'number' ? amount.toFixed(2) : '0.00'}`;
  const padding = RECEIPT_WIDTH - label.length - amountStr.length;
  return label + ' '.repeat(Math.max(1, padding)) + amountStr + '\n';
}

const testData = {
  businessName: 'Test Restaurant',
  businessAddress: '123 Main St, City, ST 12345',
  businessPhone: '(555) 123-4567',
  receiptNumber: { formattedNumber: 'RCP-001' },
  transactionDate: new Date().toISOString(),
  transactionId: 'TXN-12345',
  salespersonName: 'Jane Smith',
  businessType: 'restaurant',
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
  tax: 2.69,
  discount: 0,
  total: 36.18,
  paymentMethod: 'Cash',
  footerMessage: 'Thank you for your business!'
};

try {
  const receiptContent = generateReceipt(testData);
  console.log('Generated ESC/POS receipt content:');
  console.log('=====================================');

  // Show hex representation for debugging
  const buffer = Buffer.from(receiptContent, 'binary');
  console.log('Hex dump (first 200 bytes):');
  console.log(buffer.subarray(0, 200).toString('hex'));
  console.log('');

  // Show readable text (first 500 chars)
  console.log('Text representation (first 500 chars):');
  console.log(receiptContent.substring(0, 500));
  console.log('');

  console.log(`Total length: ${receiptContent.length} bytes`);

  // Check for ESC/POS commands
  const escIndex = receiptContent.indexOf('\x1B');
  const lfIndex = receiptContent.indexOf('\x0A');

  console.log(`ESC command at position: ${escIndex}`);
  console.log(`LF command at position: ${lfIndex}`);

  // Check for specific ESC/POS sequences
  const initSequence = '\x1B@'; // ESC @
  const centerAlign = '\x1Ba\x01'; // ESC a 1
  const leftAlign = '\x1Ba\x00'; // ESC a 0
  const cutPaper = '\x1Bd\x03'; // ESC d 3

  console.log(`Printer init (ESC @) found: ${receiptContent.includes(initSequence)}`);
  console.log(`Center align (ESC a 1) found: ${receiptContent.includes(centerAlign)}`);
  console.log(`Left align (ESC a 0) found: ${receiptContent.includes(leftAlign)}`);
  console.log(`Cut paper (ESC d 3) found: ${receiptContent.includes(cutPaper)}`);

} catch (error) {
  console.error('Error generating receipt:', error);
}