const { execSync } = require('child_process');

async function listSystemPrinters() {
  try {
    const output = execSync('powershell -Command "Get-Printer | Select-Object -ExpandProperty Name"', {
      encoding: 'utf8',
    });
    return output.trim().split('\n').map(name => name.trim()).filter(Boolean);
  } catch (error) {
    console.error('Failed to list system printers:', error);
    return [];
  }
}

listSystemPrinters().then(printers => {
  console.log('Available system printers:');
  printers.forEach(p => console.log('  -', p));
}).catch(console.error);