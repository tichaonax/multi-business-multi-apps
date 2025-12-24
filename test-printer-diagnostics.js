/**
 * EPSON Printer Diagnostics and Direct Print Test
 *
 * This script provides detailed diagnostics and attempts
 * multiple printing methods to find what works.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PRINTER_NAME = 'EPSON TM-T20III Receipt';
const USB_PORT = 'TMUSB001';

console.log('\n╔════════════════════════════════════════╗');
console.log('║   EPSON TM-T20III Diagnostics Tool    ║');
console.log('╚════════════════════════════════════════╝\n');

// ============================================================================
// STEP 1: Check Printer Status
// ============================================================================
console.log('STEP 1: Checking Printer Status...\n');

try {
  const statusCmd = `powershell -Command "Get-Printer -Name '${PRINTER_NAME}' | Format-List Name, PrinterStatus, JobCount, DriverName, PortName"`;
  const status = execSync(statusCmd, { encoding: 'utf8' });
  console.log(status);
} catch (err) {
  console.error('❌ Failed to get printer status:', err.message);
}

// ============================================================================
// STEP 2: Check Printer Queue
// ============================================================================
console.log('\nSTEP 2: Checking Print Queue...\n');

try {
  const queueCmd = `powershell -Command "Get-PrintJob -PrinterName '${PRINTER_NAME}' | Format-Table Id, DocumentName, JobStatus, TotalPages -AutoSize"`;
  const queue = execSync(queueCmd, { encoding: 'utf8' });
  console.log(queue || 'Queue is empty');
} catch (err) {
  console.log('Queue is empty or no jobs found');
}

// ============================================================================
// STEP 3: Test Printer Package (if available)
// ============================================================================
console.log('\nSTEP 3: Testing with Printer NPM Package...\n');

try {
  const printer = require('printer');

  console.log('✓ Printer package available\n');

  // List all printers
  const printers = printer.getPrinters();
  console.log('Available Printers:');
  printers.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.name}`);
    console.log(`     Port: ${p.attributes?.portName || 'Unknown'}`);
    console.log(`     Status: ${p.status || 'Unknown'}`);
  });

  // Find our EPSON printer
  const epson = printers.find(p => p.name === PRINTER_NAME);
  if (epson) {
    console.log('\n✓ Found EPSON printer:');
    console.log(JSON.stringify(epson, null, 2));
  } else {
    console.log('\n⚠️  EPSON printer not found in printer list');
  }

  // Generate test receipt
  const ESC = '\x1B';
  const GS = '\x1D';
  const LF = '\x0A';
  const CUT = GS + 'V' + '\x41' + String.fromCharCode(3);

  let content = '';
  content += ESC + '@'; // Initialize
  content += ESC + 'a' + String.fromCharCode(1); // Center
  content += '================================' + LF;
  content += '   PRINTER PACKAGE TEST' + LF;
  content += '================================' + LF;
  content += ESC + 'a' + String.fromCharCode(0); // Left
  content += `Time: ${new Date().toLocaleString()}` + LF;
  content += `Printer: ${PRINTER_NAME}` + LF;
  content += LF + LF + LF;
  content += CUT;

  const data = Buffer.from(content, 'binary');

  console.log(`\n✓ Generated ${data.length} bytes of ESC/POS data`);
  console.log('✓ Sending to printer via RAW method...\n');

  printer.printDirect({
    data: data,
    printer: PRINTER_NAME,
    type: 'RAW',
    success: (jobID) => {
      console.log(`✅ SUCCESS! Print job sent (Job ID: ${jobID})`);
      console.log('\n** CHECK YOUR PRINTER NOW **');
      console.log('   You should see a test receipt printing!\n');

      // Step 4: Monitor print job
      setTimeout(() => {
        try {
          const jobCmd = `powershell -Command "Get-PrintJob -PrinterName '${PRINTER_NAME}' -Id ${jobID} | Format-List Id, DocumentName, JobStatus, TotalPages"`;
          const jobStatus = execSync(jobCmd, { encoding: 'utf8' });
          console.log('Print Job Status:');
          console.log(jobStatus);
        } catch (err) {
          console.log('Print job may have completed (job not found in queue)');
        }
      }, 2000);
    },
    error: (err) => {
      console.error('❌ FAILED to send print job:', err);
    }
  });

} catch (err) {
  console.log('⚠️  Printer package not available');
  console.log('   Install with: npm install printer\n');

  // Fallback to PowerShell direct method
  console.log('FALLBACK: Using PowerShell Direct USB Method...\n');

  const ESC = '\x1B';
  const GS = '\x1D';
  const LF = '\x0A';
  const CUT = GS + 'V' + '\x41' + String.fromCharCode(3);

  let content = '';
  content += ESC + '@';
  content += ESC + 'a' + String.fromCharCode(1);
  content += '================================' + LF;
  content += '   POWERSHELL DIRECT TEST' + LF;
  content += '================================' + LF;
  content += ESC + 'a' + String.fromCharCode(0);
  content += `Time: ${new Date().toLocaleString()}` + LF;
  content += `Port: ${USB_PORT}` + LF;
  content += LF + LF + LF;
  content += CUT;

  const tempFile = path.join(os.tmpdir(), 'epson-direct-test.prn');
  fs.writeFileSync(tempFile, Buffer.from(content, 'binary'));

  console.log(`✓ Created temp file: ${tempFile}`);
  console.log(`✓ Content size: ${content.length} bytes`);
  console.log(`✓ Sending to USB port: ${USB_PORT}\n`);

  const normalizedPort = `\\\\.\\${USB_PORT}`;

  const psScript = `
    $port = "${normalizedPort}"
    $data = [System.IO.File]::ReadAllBytes("${tempFile.replace(/\\/g, '\\\\')}")

    Write-Host "Opening USB port: $port"
    Write-Host "Data size: $($data.Length) bytes"
    Write-Host ""

    try {
      $stream = New-Object System.IO.FileStream($port, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Write)
      $stream.Write($data, 0, $data.Length)
      $stream.Flush()
      $stream.Close()
      Write-Host "✅ SUCCESS: Data sent to USB port"
      Write-Host ""
      Write-Host "** CHECK YOUR PRINTER NOW **"
      Write-Host "   You should see a test receipt printing!"
    } catch {
      Write-Host "❌ ERROR: $_"
      exit 1
    }
  `.trim();

  try {
    const result = execSync(`powershell -Command "${psScript.replace(/"/g, '\\"')}"`, {
      encoding: 'utf8',
      shell: 'cmd.exe',
    });

    console.log(result);

    // Clean up
    setTimeout(() => {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }, 5000);

  } catch (err) {
    console.error('❌ PowerShell direct method failed:', err.message);
  }
}

console.log('\n════════════════════════════════════════');
console.log('If nothing printed, please check:');
console.log('  1. Printer is powered ON');
console.log('  2. Printer has paper loaded');
console.log('  3. Printer is not in error state (check LED)');
console.log('  4. Try unplugging and replugging USB cable');
console.log('  5. Try Windows test print from Devices & Printers');
console.log('════════════════════════════════════════\n');
