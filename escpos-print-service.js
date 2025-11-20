/**
 * ESC/POS USB Print Service for Epson TM-T20III
 * Direct USB communication using @node-escpos libraries
 */

const express = require('express');
const { Printer } = require('@node-escpos/core');
const USB = require('@node-escpos/usb-adapter');

const app = express();
const PORT = 3001;

app.use(express.json());

// Utility: Returns USB device for Epson TM-T20III
function getUSBDevice() {
  try {
    console.log('🔍 Searching for USB printer...');
    // Epson TM-T20III USB VendorID: 0x04b8, ProductID: 0x0202
    // Try specific device first
    const device = new USB(0x04b8, 0x0202);
    console.log('✅ Found Epson TM-T20III device');
    return device;
  } catch (error) {
    console.log('⚠️  Specific device not found, trying auto-detection...');
    try {
      // Fallback to auto-detection
      const device = new USB();
      console.log('✅ Found USB device via auto-detection');
      return device;
    } catch (fallbackError) {
      console.error('❌ No USB printer found:', fallbackError.message);
      throw new Error('USB printer not found. Make sure the Epson TM-T20III is connected and powered on.');
    }
  }
}

// Print endpoint
app.post('/print', async (req, res) => {
  const { escposData } = req.body;

  if (!escposData) {
    return res.status(400).json({ error: 'escposData is required.' });
  }

  try {
    console.log(`🖨️  Received print job: ${escposData.length} bytes`);

    const device = getUSBDevice();

    // Open USB device
    device.open(async (err) => {
      if (err) {
        console.error('❌ Failed to open USB printer:', err.message);
        return res.status(500).json({
          error: 'Failed to open USB printer: ' + err.message
        });
      }

      const printer = new Printer(device);

      try {
        // Send raw ESC/POS buffer
        await printer.raw(Buffer.from(escposData, 'binary'));

        // Cut paper after print
        await printer.cut();

        console.log('✅ Print job completed successfully');
        res.json({ status: 'Printed successfully.' });

      } catch (printError) {
        console.error('❌ Print error:', printError.message);
        res.status(500).json({ error: 'Print failed: ' + printError.message });
      } finally {
        // Always close the device
        printer.close();
      }
    });

  } catch (e) {
    console.error('❌ Service error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'ESC/POS USB Print Service',
    printer: 'Epson TM-T20III',
    port: PORT
  });
});

// Test endpoint
app.post('/test', async (req, res) => {
  console.log('🧪 Running printer test...');

  // Create test ESC/POS data
  const testData = Buffer.concat([
    Buffer.from('\x1B@'), // Initialize printer
    Buffer.from('\x1BG\x01'), // Emphasized mode ON
    Buffer.from('\x1Ba\x01'), // Center alignment
    Buffer.from('================================\n', 'ascii'),
    Buffer.from('     PRINTER TEST     \n', 'ascii'),
    Buffer.from('================================\n', 'ascii'),
    Buffer.from('\x1Ba\x00'), // Left alignment
    Buffer.from(`Date: ${new Date().toLocaleString()}\n`, 'ascii'),
    Buffer.from('This is a test print from\n', 'ascii'),
    Buffer.from('the ESC/POS USB service.\n', 'ascii'),
    Buffer.from('\x1B\x64\x03'), // Feed 3 lines
    Buffer.from('\x1DV\x41\x03') // Partial cut
  ]);

  console.log(`📊 Test data prepared: ${testData.length} bytes`);

  try {
    console.log('🔌 Opening USB device...');
    const device = getUSBDevice();

    device.open(async (err) => {
      if (err) {
        console.error('❌ Test failed - USB open error:', err.message);
        return res.status(500).json({
          error: 'Test failed - USB open error: ' + err.message
        });
      }

      console.log('✅ USB device opened successfully');
      const printer = new Printer(device);

      try {
        console.log('🖨️  Sending test data to printer...');
        await printer.raw(testData);
        console.log('✅ Test data sent, cutting paper...');
        await printer.cut();
        console.log('✅ Paper cut completed');

        console.log('✅ Printer test completed successfully');
        res.json({
          status: 'Test print sent successfully',
          dataLength: testData.length
        });

      } catch (printError) {
        console.error('❌ Test print error:', printError.message);
        console.error('❌ Error details:', printError);
        res.status(500).json({
          error: 'Test print failed: ' + printError.message,
          details: printError.toString()
        });
      } finally {
        console.log('🔌 Closing printer connection...');
        printer.close();
      }
    });

  } catch (e) {
    console.error('❌ Test service error:', e.message);
    console.error('❌ Error details:', e);
    res.status(500).json({
      error: e.message,
      details: e.toString()
    });
  }
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 ESC/POS USB Print Service listening on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`🧪 Test endpoint: POST http://localhost:${PORT}/test`);
  console.log(`🖨️  Print endpoint: POST http://localhost:${PORT}/print`);
  console.log(`\n⚠️  Note: USB device detection happens on first print request`);
});

// Handle server errors
server.on('error', (error) => {
  console.error('❌ Server error:', error);
});

server.on('close', () => {
  console.log('🛑 Server closed');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down ESC/POS print service...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down ESC/POS print service...');
  process.exit(0);
});