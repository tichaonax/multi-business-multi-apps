/**
 * USB ESC/POS Print Service
 * Communicates directly with USB thermal printers bypassing Windows spooler
 * Based on recommended approach from epson-print-with-esc-pos.md
 */

const express = require('express');
const { Printer } = require('@node-escpos/core');
const USB = require('@node-escpos/usb-adapter');

const app = express();
app.use(express.json({ limit: '10mb' }));

// EPSON TM-T20III USB IDs (check Device Manager if these don't work)
const EPSON_VENDOR_ID = 0x04b8;  // EPSON
const EPSON_PRODUCT_ID = 0x0e28; // TM-T20III (might vary, check Device Manager)

/**
 * Get USB device for EPSON printer
 */
function getUSBDevice() {
  try {
    // Try specific EPSON TM-T20III first
    const device = new USB(EPSON_VENDOR_ID, EPSON_PRODUCT_ID);
    console.log(`📌 Using EPSON TM-T20III (${EPSON_VENDOR_ID.toString(16)}:${EPSON_PRODUCT_ID.toString(16)})`);
    return device;
  } catch (error) {
    console.log('⚠️  Specific device not found, trying auto-detect...');
    // Fallback to auto-detect first USB printer
    return new USB();
  }
}

/**
 * List available USB printers
 */
app.get('/list-printers', (req, res) => {
  try {
    const devices = USB.findPrinter();
    console.log('🔍 Found USB printers:', devices);

    res.json({
      success: true,
      printers: devices.map(d => ({
        vendorId: d.deviceDescriptor.idVendor,
        productId: d.deviceDescriptor.idProduct,
        manufacturer: d.deviceDescriptor.iManufacturer,
        product: d.deviceDescriptor.iProduct
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Print ESC/POS data directly to USB printer
 */
app.post('/print', async (req, res) => {
  const { escposData, copies = 1 } = req.body;

  if (!escposData) {
    return res.status(400).json({
      success: false,
      error: 'escposData is required'
    });
  }

  console.log(`\n🖨️  Print request received`);
  console.log(`   Data size: ${escposData.length} bytes`);
  console.log(`   Copies: ${copies}`);

  try {
    const device = getUSBDevice();

    // Open USB device
    device.open(async (err) => {
      if (err) {
        console.error('❌ Failed to open USB printer:', err.message);
        return res.status(500).json({
          success: false,
          error: 'Failed to open USB printer: ' + err.message,
          details: 'Make sure printer is powered on and connected via USB'
        });
      }

      try {
        const printer = new Printer(device);

        // Send raw ESC/POS data (repeat for copies)
        for (let i = 0; i < copies; i++) {
          printer.raw(Buffer.from(escposData, 'binary'));

          if (i < copies - 1) {
            // Small delay between copies
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        // Close device
        printer.close();

        console.log(`✅ Print completed successfully (${copies} ${copies === 1 ? 'copy' : 'copies'})`);

        res.json({
          success: true,
          message: `Printed successfully (${copies} ${copies === 1 ? 'copy' : 'copies'})`,
          timestamp: new Date().toISOString()
        });

      } catch (printError) {
        console.error('❌ Print error:', printError.message);
        device.close();
        res.status(500).json({
          success: false,
          error: 'Print failed: ' + printError.message
        });
      }
    });

  } catch (error) {
    console.error('❌ USB device error:', error.message);
    res.status(500).json({
      success: false,
      error: 'USB device error: ' + error.message,
      details: 'Check if printer is connected and drivers are installed'
    });
  }
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'USB ESC/POS Print Service',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

/**
 * Test print endpoint
 */
app.post('/test-print', (req, res) => {
  console.log('\n🧪 Test print requested');

  // Simple test receipt
  const testReceipt = Buffer.from([
    0x1B, 0x40,        // ESC @ - Initialize
    0x1B, 0x61, 0x01,  // ESC a 1 - Center align
    0x1B, 0x21, 0x30,  // ESC ! 48 - Double size
    ...Buffer.from('TEST RECEIPT\n'),
    0x1B, 0x21, 0x00,  // ESC ! 0 - Normal size
    0x1B, 0x61, 0x00,  // ESC a 0 - Left align
    ...Buffer.from('='.repeat(42) + '\n'),
    ...Buffer.from('USB Print Service Working!\n'),
    ...Buffer.from('Date: ' + new Date().toLocaleString() + '\n'),
    ...Buffer.from('='.repeat(42) + '\n'),
    0x0A, 0x0A, 0x0A,  // Line feeds
    0x1D, 0x56, 0x41, 0x03  // GS V 41 03 - Partial cut
  ]);

  const escposDataString = testReceipt.toString('binary');

  // Reuse the /print endpoint
  req.body = { escposData: escposDataString, copies: 1 };

  // Forward to print handler
  app._router.handle({
    ...req,
    method: 'POST',
    url: '/print',
    body: req.body
  }, res);
});

// Start server
const PORT = process.env.USB_PRINT_SERVICE_PORT || 3001;

const server = app.listen(PORT, () => {
  console.log('\n='.repeat(60));
  console.log('🚀 USB ESC/POS Print Service Started');
  console.log('='.repeat(60));
  console.log(`📡 Listening on: http://localhost:${PORT}`);
  console.log(`🖨️  Printer: EPSON TM-T20III (USB)`);
  console.log('');
  console.log('Endpoints:');
  console.log(`  GET  /health          - Health check`);
  console.log(`  GET  /list-printers   - List USB printers`);
  console.log(`  POST /print           - Print ESC/POS data`);
  console.log(`  POST /test-print      - Send test print`);
  console.log('');
  console.log('💡 Tip: Test with: curl http://localhost:3001/health');
  console.log('='.repeat(60) + '\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
