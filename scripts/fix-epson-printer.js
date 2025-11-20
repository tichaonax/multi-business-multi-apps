/**
 * Fix EPSON Printer Error State
 * Clears error status and restarts print spooler
 */

const { execSync } = require('child_process');

console.log('═'.repeat(60));
console.log(' FIX EPSON TM-T20III PRINTER');
console.log('═'.repeat(60));
console.log('');

const printerName = 'EPSON TM-T20III Receipt';

try {
  console.log('🔧 Step 1: Clearing pending deletion status...');

  // Clear all print jobs
  const clearJobsScript = `
    $printer = Get-Printer -Name "${printerName}"
    if ($printer) {
      Get-PrintJob -PrinterName "${printerName}" | Remove-PrintJob
      Write-Host "Cleared all print jobs"
    }
  `.trim();

  try {
    execSync(`powershell -Command "${clearJobsScript.replace(/"/g, '\\"')}"`, {
      encoding: 'utf8',
      shell: 'cmd.exe',
      timeout: 10000,
    });
    console.log('   ✅ Print jobs cleared');
  } catch (err) {
    console.log('   ⚠️  No print jobs to clear (or printer not found)');
  }

  console.log('');
  console.log('🔧 Step 2: Restarting print spooler service...');

  // Restart print spooler
  execSync('net stop spooler && net start spooler', {
    encoding: 'utf8',
    shell: 'cmd.exe',
    timeout: 30000,
  });

  console.log('   ✅ Print spooler restarted');
  console.log('');

  // Wait a moment for service to stabilize
  console.log('⏳ Waiting for print spooler to stabilize...');
  execSync('timeout /t 3 /nobreak', { shell: 'cmd.exe' });

  console.log('');
  console.log('🔧 Step 3: Checking printer status...');

  const statusScript = `
    Get-Printer -Name "${printerName}" | Select-Object Name, PrinterStatus, PortName | Format-List
  `.trim();

  const status = execSync(`powershell -Command "${statusScript.replace(/"/g, '\\"')}"`, {
    encoding: 'utf8',
    shell: 'cmd.exe',
    timeout: 10000,
  });

  console.log(status);

  console.log('');
  console.log('✅ PRINTER FIX COMPLETE');
  console.log('─'.repeat(60));
  console.log('');
  console.log('📝 NEXT STEPS:');
  console.log('   1. Check if PrinterStatus shows "Normal" above');
  console.log('   2. If still showing "Error", try:');
  console.log('      - Turn printer OFF and ON');
  console.log('      - Unplug and replug USB cable');
  console.log('      - Check Device Manager for driver issues');
  console.log('   3. Run: node scripts/test-epson-printer.js');
  console.log('─'.repeat(60));

} catch (error) {
  console.error('\n❌ Error fixing printer:');
  console.error(error.message);
  console.log('\n💡 MANUAL FIX:');
  console.log('   1. Open Control Panel > Devices and Printers');
  console.log('   2. Right-click "EPSON TM-T20III Receipt"');
  console.log('   3. Select "See what\'s printing"');
  console.log('   4. Click Printer menu > Cancel All Documents');
  console.log('   5. Turn printer OFF and ON');
  console.log('   6. Try printing a test page from printer properties');
}

console.log('');
