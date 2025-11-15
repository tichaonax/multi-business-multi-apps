/**
 * Test Direct Print to Physical Printer
 * Bypasses the queue completely - sends directly to Windows printer
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

async function testDirectPrint() {
  console.log('\n🖨️  Testing Direct Print to Physical Printer\n');

  // Test receipt content
  const testReceipt = `
================================
        GROCERY STORE
    123 Main Street
    Tel: (555) 123-4567
================================

Order #: TEST-001
Date: ${new Date().toLocaleString()}
Type: SALE
Customer: Test Customer
Cashier: System Test
--------------------------------

Item                 Qty  Price
--------------------------------
Test Item 1            1  $5.00
Test Item 2            2  $3.00
--------------------------------

Subtotal:             $11.00
Tax:                   $0.88
--------------------------------
TOTAL:                $11.88
================================

Payment: CASH

Thank you for shopping!
Please come again

================================
  `.trim();

  const printerName = 'EPSON TM-T20III Receipt'; // Your configured printer

  console.log(`Printer: ${printerName}`);
  console.log(`Content length: ${testReceipt.length} characters\n`);
  console.log('--- RECEIPT PREVIEW ---');
  console.log(testReceipt);
  console.log('--- END PREVIEW ---\n');

  try {
    // Create temp file
    const tempDir = process.env.TEMP || os.tmpdir();
    const tempFile = path.join(tempDir, `test-print-${Date.now()}.txt`);

    // Write receipt content
    fs.writeFileSync(tempFile, testReceipt, 'utf8');
    console.log(`✅ Created temp file: ${tempFile}\n`);

    // Check if printer exists
    console.log('🔍 Checking available printers...');
    const printersOutput = execSync('powershell -Command "Get-Printer | Select-Object -ExpandProperty Name"', {
      encoding: 'utf8'
    });
    const availablePrinters = printersOutput.trim().split('\n').map(p => p.trim());

    console.log('Available printers:');
    availablePrinters.forEach(p => console.log(`  - ${p}`));
    console.log('');

    const printerExists = availablePrinters.some(p => p === printerName);

    if (!printerExists) {
      console.error(`❌ Printer "${printerName}" not found in available printers`);
      console.error('\nPlease update the printerName variable in the script to match one of the available printers.');
      return;
    }

    console.log(`✅ Found printer: ${printerName}\n`);

    // Get printer port info
    console.log('📤 Sending to printer...\n');

    const printerInfoCmd = `Get-Printer -Name '${printerName}' | Select-Object -ExpandProperty PortName`;
    let portName = execSync(`powershell -Command "${printerInfoCmd}"`, {
      encoding: 'utf8'
    }).trim();

    // Remove trailing colon from COM port names (e.g., COM5: -> COM5)
    if (portName.endsWith(':')) {
      portName = portName.slice(0, -1);
    }

    console.log(`Port: ${portName}\n`);

    if (portName.startsWith('COM')) {
      // COM port printer - write raw data to port
      console.log('📡 Detected COM port printer - using direct port communication...\n');

      const comPortPrint = `
        $port = new-Object System.IO.Ports.SerialPort ${portName},9600,None,8,one
        $port.Open()
        $content = Get-Content '${tempFile.replace(/\\/g, '\\\\')}'
        foreach ($line in $content) {
          $port.WriteLine($line)
        }
        # Send form feed to cut paper
        $port.Write([char]0x0C)
        $port.Close()
      `.trim();

      execSync(`powershell -Command "${comPortPrint}"`, {
        stdio: 'inherit',
        timeout: 30000,
      });
    } else {
      // Network or USB printer - use print spooler
      console.log('🖨️  Using Windows print spooler...\n');

      const psCommand = `Get-Content '${tempFile.replace(/\\/g, '\\\\')}' | Out-Printer -Name '${printerName}'`;

      execSync(`powershell -Command "${psCommand}"`, {
        stdio: 'inherit',
        timeout: 30000,
      });
    }

    console.log('\n✅ Sent to print spooler!');
    console.log('📋 Check your printer - it should print now.\n');

    // Clean up after delay
    setTimeout(() => {
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
          console.log('🧹 Cleaned up temp file');
        }
      } catch (err) {
        console.warn('⚠️  Could not delete temp file:', err.message);
      }
    }, 5000);

  } catch (error) {
    console.error('❌ Print failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Is the printer powered on?');
    console.error('2. Is it connected via USB?');
    console.error('3. Is the printer driver installed?');
    console.error('4. Does it have paper loaded?');
    console.error('5. Check printer status in Windows Settings');
  }
}

testDirectPrint();
