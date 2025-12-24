
const { listSystemPrintersDetailed } = require('./src/lib/printing/printer-service-usb.ts');
console.log('Testing detailed printer listing...');
listSystemPrintersDetailed().then(printers => {
  console.log('Found printers:');
  printers.forEach(p => {
    console.log(`- ${p.name}: ${p.portName} (${p.driverName})`);
    const isDirect = p.portName.match(/(USB|COM|LPT|TMUSB|RongtaUSB)/i);
    console.log(`  → Direct port: ${isDirect ? 'YES' : 'NO'}`);
  });
}).catch(err => console.error('Error:', err.message));

