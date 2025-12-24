/**
 * End-to-End Test of Complete Printing Solution
 *
 * Tests the full stack:
 * 1. Receipt formatting with configurable width (48 characters)
 * 2. Windows RAW printer service
 * 3. Actual printing to EPSON TM-T20III
 */

import { formatReceipt } from './src/lib/printing/receipt-formatter';
import { printRawData } from './src/lib/printing/windows-raw-printer';
import type { ReceiptData, WifiTokenInfo } from './src/types/printing';

async function testCompleteSolution() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  Complete Printing Solution Test      ║');
  console.log('╚════════════════════════════════════════╝\n');

  // Create sample receipt data
  const receiptData: ReceiptData = {
    // Receipt numbering
    receiptNumber: {
      globalId: 'test-receipt-001',
      dailySequence: '001',
      formattedNumber: '2025-12-21-001',
    },

    // Business info
    businessId: 'test-business',
    businessType: 'restaurant',
    businessName: 'HXI EATS RESTAURANT',
    businessAddress: '123 Main Street, Suite 100',
    businessPhone: '(555) 123-4567',
    umbrellaPhone: '(555) 999-0000',

    // Transaction info
    transactionId: 'txn-12345',
    transactionDate: new Date(),
    salespersonName: 'John Doe',
    salespersonId: 'emp-001',

    // Items
    items: [
      {
        name: 'Classic Burger with Cheese',
        quantity: 1,
        unitPrice: 12.99,
        totalPrice: 12.99,
        sku: 'BURG-001',
      },
      {
        name: 'French Fries (Large)',
        quantity: 1,
        unitPrice: 4.99,
        totalPrice: 4.99,
        sku: 'FRIES-LG',
      },
      {
        name: 'WiFi Token - 1 Hour Package',
        quantity: 1,
        unitPrice: 5.00,
        totalPrice: 5.00,
        sku: 'WIFI-1HR',
      },
    ],

    // Totals
    subtotal: 22.98,
    tax: 1.84,
    total: 24.82,

    // Payment
    paymentMethod: 'cash',
    amountPaid: 30.00,
    changeDue: 5.18,

    // WiFi tokens
    wifiTokens: [
      {
        itemName: 'WiFi Token - 1 Hour Package',
        tokenCode: 'ABC12345',
        packageName: '1 Hour Package',
        duration: 60,
        ssid: 'GuestWiFi',
        success: true,
      },
    ],

    // Footer
    footerMessage: 'Enjoy your meal!',
  };

  console.log('Step 1: Formatting receipt with 48-character width...\n');

  // Format receipt with 48-character width (optimal for EPSON TM-T20III)
  const formattedReceipt = formatReceipt(receiptData, { width: 48 });

  console.log(`✓ Receipt formatted: ${formattedReceipt.length} bytes\n`);

  console.log('Step 2: Sending to EPSON TM-T20III via Windows API...\n');

  // Print using Windows RAW printer service
  await printRawData(formattedReceipt, {
    printerName: 'EPSON TM-T20III Receipt',
    copies: 1,
  });

  console.log('\n✅ SUCCESS: Complete solution test completed!\n');
  console.log('** CHECK YOUR PRINTER **\n');
  console.log('You should see a complete receipt with:');
  console.log('  ✓ Full-width formatting (48 characters)');
  console.log('  ✓ Business header (centered)');
  console.log('  ✓ Receipt number and date');
  console.log('  ✓ 3 items with prices aligned');
  console.log('  ✓ Subtotal, tax, and total');
  console.log('  ✓ Payment info with change');
  console.log('  ✓ WiFi token section');
  console.log('  ✓ Footer with support number');
  console.log('  ✓ Paper cut at the end\n');
}

// Run the test
testCompleteSolution()
  .then(() => {
    console.log('Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  });
