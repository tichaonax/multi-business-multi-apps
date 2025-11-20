/**
 * Simple Print Service for Epson TM-T20III
 * Uses Windows print spooler for compatibility
 */

const express = require('express');
const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(express.json());

// Get list of available printers
app.get('/printers', (req, res) => {
  try {
    const output = execSync('powershell -Command "Get-Printer | Select-Object -ExpandProperty Name"', {
      encoding: 'utf8',
    });
    const printers = output.trim().split('\n').map(name => name.trim()).filter(Boolean);
    res.json({ printers });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list printers: ' + error.message });
  }
});

// Print endpoint using Windows spooler
app.post('/print', async (req, res) => {
  const { escposData, printerName } = req.body;

  if (!escposData) {
    return res.status(400).json({ error: 'escposData is required.' });
  }

  // Use default printer if none specified
  const targetPrinter = printerName || 'EPSON TM-T20III Receipt';

  try {
    console.log(`🖨️  Printing to: ${targetPrinter}`);
    console.log(`📊 Data size: ${escposData.length} bytes`);

    // Create temp file
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `print-${Date.now()}.bin`);

    // Write ESC/POS data as binary
    fs.writeFileSync(tempFile, Buffer.from(escposData, 'binary'));

    // Use Windows PRINT command
    const printCmd = `print /D:"${targetPrinter}" "${tempFile}"`;
    execSync(printCmd, {
      encoding: 'utf8',
      timeout: 30000,
      shell: 'cmd.exe',
    });

    console.log('✅ Print job sent to spooler');
    res.json({ status: 'Print job sent successfully' });

    // Clean up temp file after delay
    setTimeout(() => {
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      } catch (err) {
        console.warn(`Failed to delete temp file: ${tempFile}`);
      }
    }, 10000);

  } catch (error) {
    console.error('❌ Print error:', error.message);
    res.status(500).json({ error: 'Print failed: ' + error.message });
  }
});

// Test endpoint
app.post('/test', async (req, res) => {
  console.log('🧪 Running printer test...');

  // Simple test receipt
  const testData = Buffer.concat([
    Buffer.from('\x1B@'), // Initialize
    Buffer.from('TEST PRINT\n'),
    Buffer.from('================\n'),
    Buffer.from(`Time: ${new Date().toLocaleString()}\n`),
    Buffer.from('This is a test from the print service\n'),
    Buffer.from('\n\n'),
    Buffer.from('\x1DV\x41\x03') // Cut
  ]);

  try {
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `test-${Date.now()}.bin`);

    fs.writeFileSync(tempFile, testData);

    // Try to print to default Epson printer
    const printCmd = `print /D:"EPSON TM-T20III Receipt" "${tempFile}"`;
    execSync(printCmd, {
      encoding: 'utf8',
      timeout: 30000,
      shell: 'cmd.exe',
    });

    console.log('✅ Test print sent');
    res.json({ status: 'Test print sent successfully' });

    // Clean up
    setTimeout(() => {
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      } catch (err) {
        console.warn(`Failed to delete temp file: ${tempFile}`);
      }
    }, 5000);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    res.status(500).json({ error: 'Test failed: ' + error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Windows Print Spooler Service',
    port: PORT
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Windows Print Service listening on port ${PORT}`);
  console.log(`📡 Health: http://localhost:${PORT}/health`);
  console.log(`🖨️  Test: POST http://localhost:${PORT}/test`);
  console.log(`📋 Printers: GET http://localhost:${PORT}/printers`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down print service...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down print service...');
  process.exit(0);
});