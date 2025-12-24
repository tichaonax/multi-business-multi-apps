/**
 * Test Windows Printer with RAW data type
 *
 * Instead of bypassing the spooler, we'll use it but with RAW datatype
 * This is often more reliable for thermal printers on Windows
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PRINTER_NAME = 'EPSON TM-T20III Receipt';

console.log('\n╔════════════════════════════════════════╗');
console.log('║  Windows RAW Print Test                ║');
console.log('╚════════════════════════════════════════╝\n');

// Very simple ESC/POS test - just initialize and print a few lines
const ESC = '\x1B';
const LF = '\x0A';
const GS = '\x1D';

let content = '';
content += ESC + '@'; // Initialize printer
content += 'TEST PRINT' + LF;
content += 'Line 1' + LF;
content += 'Line 2' + LF;
content += 'Line 3' + LF;
content += LF + LF + LF + LF + LF; // Feed paper
content += GS + 'V' + '\x41' + '\x00'; // Cut paper (full cut)

console.log('Generated simple test:');
console.log(`  ${content.length} bytes`);
console.log('');

// Create temp file
const tempFile = path.join(os.tmpdir(), 'raw-test.prn');
fs.writeFileSync(tempFile, Buffer.from(content, 'binary'));

console.log(`Temp file: ${tempFile}`);
console.log(`Printer: ${PRINTER_NAME}`);
console.log('');

// Try using PowerShell Out-Printer with RAW
const psScript = `
  $ErrorActionPreference = "Stop"

  Write-Host "Reading print data..."
  $data = [System.IO.File]::ReadAllBytes("${tempFile.replace(/\\/g, '\\\\')}")
  Write-Host "Data size: $($data.Length) bytes"
  Write-Host ""

  Write-Host "Sending to printer via Windows spooler (RAW)..."

  try {
    # Method 1: Try using .NET PrintDocument
    Add-Type -AssemblyName System.Drawing
    Add-Type -AssemblyName System.Windows.Forms

    $printDoc = New-Object System.Drawing.Printing.PrintDocument
    $printDoc.PrinterSettings.PrinterName = "${PRINTER_NAME}"

    # Check if printer exists
    if (-not $printDoc.PrinterSettings.IsValid) {
      Write-Host "❌ ERROR: Printer '${PRINTER_NAME}' is not valid or not found"
      exit 1
    }

    Write-Host "✓ Printer is valid"
    Write-Host "✓ Printer status: $($printDoc.PrinterSettings.PrinterName)"
    Write-Host ""

    # Create a simple print page handler
    $printPage = {
      param($sender, $ev)

      # This is where we would normally draw, but for RAW data
      # we need a different approach
      $ev.HasMorePages = $false
    }

    # Actually, for RAW data we need to use a different method
    # Let's use the print command instead
    Write-Host "Using Windows print command..."

    $result = & cmd.exe /c "print /D:\`"${PRINTER_NAME}\`" \`"${tempFile.replace(/\\/g, '\\\\')}\`""

    Write-Host "✅ Print command completed"
    Write-Host $result

  } catch {
    Write-Host "❌ ERROR: $_"
    Write-Host $_.Exception.Message
    exit 1
  }
`.trim();

try {
  const result = execSync(`powershell -Command "${psScript.replace(/"/g, '\\"')}"`, {
    encoding: 'utf8',
    timeout: 30000,
    shell: 'cmd.exe',
  });

  console.log(result);
  console.log('\n✅ Command executed');
  console.log('\n** CHECK PRINTER NOW **');

  // Check print queue
  setTimeout(() => {
    console.log('\nChecking print queue...');
    try {
      const queue = execSync(`powershell -Command "Get-PrintJob -PrinterName '${PRINTER_NAME}' | Format-Table -AutoSize"`, {
        encoding: 'utf8'
      });
      console.log(queue || 'Queue is empty');
    } catch (err) {
      console.log('No jobs in queue');
    }

    // Cleanup
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
      console.log('\nCleaned up temp file');
    }
  }, 3000);

} catch (error) {
  console.error('\n❌ Failed:', error.message);
  if (fs.existsSync(tempFile)) {
    fs.unlinkSync(tempFile);
  }
}
