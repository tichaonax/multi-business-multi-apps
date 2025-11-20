/**
 * Direct USB Port Printer Test
 * Bypasses Windows print spooler completely
 */

const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

function testDirectUSB() {
  console.log('🔌 Testing direct USB port printing...\n');

  // ESC/POS commands for a simple test receipt
  const escPosData = Buffer.concat([
    Buffer.from('\x1B@'), // Initialize printer
    Buffer.from('\x1BG\x01'), // Emphasized mode ON
    Buffer.from('\x1Ba\x01'), // Center alignment
    Buffer.from('DIRECT USB TEST\n', 'ascii'),
    Buffer.from('================\n', 'ascii'),
    Buffer.from('\x1Ba\x00'), // Left alignment
    Buffer.from(`Time: ${new Date().toLocaleString()}\n`, 'ascii'),
    Buffer.from('Bypassing Windows Spooler\n', 'ascii'),
    Buffer.from('================\n', 'ascii'),
    Buffer.from('\x1B\x64\x02'), // Feed 2 lines
    Buffer.from('\x1DV\x41\x03') // Partial cut
  ]);

  console.log(`📊 ESC/POS data: ${escPosData.length} bytes`);

  // Create temp file
  const tempFile = path.join(os.tmpdir(), 'usb-direct-test.bin');
  fs.writeFileSync(tempFile, escPosData);
  console.log(`📁 Created: ${tempFile}`);

  try {
    // Try different USB port names
    const ports = ['001', 'USB001', 'TMUSB003'];

    for (const port of ports) {
      console.log(`\n🔌 Testing port: ${port}`);

      try {
        const psScript = `
          $port = "\\\\.\\${port}"
          $data = [System.IO.File]::ReadAllBytes("${tempFile.replace(/\\/g, '\\\\')}")

          try {
            $stream = New-Object System.IO.FileStream($port, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Write)
            $stream.Write($data, 0, $data.Length)
            $stream.Flush()
            $stream.Close()
            Write-Host "SUCCESS: Data sent to ${port}"
            exit 0
          } catch {
            Write-Host "ERROR on ${port}: $_"
            exit 1
          }
        `.trim();

        execSync(`powershell -Command "${psScript.replace(/"/g, '\\"')}"`, {
          encoding: 'utf8',
          timeout: 10000,
          stdio: 'pipe'
        });

        console.log(`✅ Successfully sent to port ${port}!`);
        console.log('📋 Check your physical printer for the test receipt.');
        return true;

      } catch (error) {
        console.log(`❌ Port ${port} failed: ${error.message}`);
      }
    }

    console.log('\n❌ All direct USB ports failed');

  } catch (error) {
    console.error('❌ Direct USB test failed:', error.message);
  } finally {
    // Clean up
    setTimeout(() => {
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
          console.log('🧹 Temp file cleaned up');
        }
      } catch (e) {}
    }, 3000);
  }

  return false;
}

function checkUSBPorts() {
  console.log('🔍 Checking available USB ports...\n');

  try {
    // List COM ports
    const comPorts = execSync('powershell -Command "Get-WmiObject Win32_SerialPort | Select-Object Name, DeviceID, Description"', {
      encoding: 'utf8'
    });
    console.log('COM/Serial Ports:');
    console.log(comPorts || 'None found');

    // Try to list USB devices
    try {
      const usbDevices = execSync('powershell -Command "Get-PnpDevice | Where-Object { $_.InstanceId -like \'*USB*\' } | Select-Object Name, Status, InstanceId | Format-Table -AutoSize"', {
        encoding: 'utf8'
      });
      console.log('\nUSB Devices:');
      console.log(usbDevices || 'None found');
    } catch (e) {
      console.log('\nUSB device check failed');
    }

  } catch (error) {
    console.error('❌ Failed to check USB ports:', error.message);
  }
}

function diagnosePrinter() {
  console.log('🔧 Diagnosing printer issues...\n');

  // Check printer properties
  try {
    const printerInfo = execSync('powershell -Command "Get-Printer -Name \'EPSON TM-T20III Receipt\' | Format-List Name, PrinterStatus, PortName, DriverName, IsOffline, IsDefault"', {
      encoding: 'utf8'
    });
    console.log('Printer Info:');
    console.log(printerInfo);
  } catch (error) {
    console.error('❌ Failed to get printer info:', error.message);
  }

  // Check for stuck print jobs
  try {
    const jobs = execSync('powershell -Command "Get-PrintJob -PrinterName \'EPSON TM-T20III Receipt\' | Format-Table Id, DocumentName, JobStatus"', {
      encoding: 'utf8'
    });
    console.log('\nPrint Jobs:');
    console.log(jobs || 'No jobs in queue');
  } catch (error) {
    console.log('\nNo print jobs found');
  }
}

// Run diagnostics
diagnosePrinter();
console.log('\n' + '='.repeat(50) + '\n');

checkUSBPorts();
console.log('\n' + '='.repeat(50) + '\n');

testDirectUSB();