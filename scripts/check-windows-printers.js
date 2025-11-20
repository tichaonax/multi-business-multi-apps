/**
 * Check Windows Printers
 * Lists all printers registered with Windows
 */

const { execSync } = require('child_process');

console.log('═'.repeat(60));
console.log(' WINDOWS PRINTER DETECTION');
console.log('═'.repeat(60));
console.log('');

try {
  console.log('🔍 Checking for Windows-registered printers...\n');

  // Method 1: Get all printers using PowerShell
  const psScript = `
    Get-Printer | Select-Object Name, DriverName, PortName, PrinterStatus | Format-List
  `.trim();

  const output = execSync(`powershell -Command "${psScript.replace(/"/g, '\\"')}"`, {
    encoding: 'utf8',
    shell: 'cmd.exe',
    timeout: 10000,
  });

  console.log('📋 REGISTERED PRINTERS:');
  console.log('─'.repeat(60));
  console.log(output);
  console.log('─'.repeat(60));
  console.log('');

  // Method 2: Get printer names only
  const namesScript = `Get-Printer | Select-Object -ExpandProperty Name`;
  const names = execSync(`powershell -Command "${namesScript.replace(/"/g, '\\"')}"`, {
    encoding: 'utf8',
    shell: 'cmd.exe',
    timeout: 10000,
  });

  const printerList = names.trim().split('\n').map(n => n.trim()).filter(Boolean);

  console.log('🖨️  AVAILABLE PRINTER NAMES:');
  console.log('─'.repeat(60));
  printerList.forEach((name, index) => {
    console.log(`   ${index + 1}. ${name}`);
  });
  console.log('─'.repeat(60));
  console.log('');

  // Check for EPSON printers specifically
  const epsonPrinters = printerList.filter(name =>
    name.toLowerCase().includes('epson') ||
    name.toLowerCase().includes('tm-t') ||
    name.toLowerCase().includes('receipt')
  );

  if (epsonPrinters.length > 0) {
    console.log('✅ FOUND EPSON/RECEIPT PRINTERS:');
    console.log('─'.repeat(60));
    epsonPrinters.forEach((name, index) => {
      console.log(`   ${index + 1}. "${name}"`);
    });
    console.log('─'.repeat(60));
    console.log('');
    console.log('💡 USE ONE OF THESE NAMES when registering the printer in the app');
  } else {
    console.log('⚠️  No EPSON or receipt printers found');
    console.log('   But you can use any of the printer names listed above');
  }

  console.log('');
  console.log('📝 INSTRUCTIONS:');
  console.log('─'.repeat(60));
  console.log('1. Copy the EXACT printer name from above (including spaces)');
  console.log('2. In the app, select "Network Printer (IP Address)"');
  console.log('3. Paste the printer name');
  console.log('4. Leave IP Address and Port BLANK');
  console.log('5. This will use the Windows printer driver');
  console.log('─'.repeat(60));

} catch (error) {
  console.error('\n❌ Error checking printers:');
  console.error(error.message);
  console.log('\n🔍 TROUBLESHOOTING:');
  console.log('   1. Make sure the printer driver is installed');
  console.log('   2. Check Device Manager for the printer');
  console.log('   3. Try printing from Notepad to verify driver works');
}

console.log('');
