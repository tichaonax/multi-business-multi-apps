/**
 * Test script for receipt generation with ESC/POS commands
 */

import { generateReceipt } from './src/lib/printing/receipt-templates.ts';

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

  // Show readable text (escape sequences will show as control chars)
  console.log('Text representation (first 500 chars):');
  console.log(receiptContent.substring(0, 500));
  console.log('');

  console.log(`Total length: ${receiptContent.length} bytes`);

  // Check for ESC/POS commands
  const escIndex = receiptContent.indexOf('\x1B');
  const gsIndex = receiptContent.indexOf('\x1D');
  const lfIndex = receiptContent.indexOf('\x0A');

  console.log(`ESC command at position: ${escIndex}`);
  console.log(`GS command at position: ${gsIndex}`);
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