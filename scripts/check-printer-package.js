/**
 * Check if printer package is working
 */

console.log('═'.repeat(60));
console.log(' PRINTER PACKAGE DIAGNOSTIC');
console.log('═'.repeat(60));
console.log('');

console.log('🔍 Step 1: Loading printer package...');

let printerPackage = null;
try {
  printerPackage = require('printer');
  console.log('   ✅ printer package loaded successfully');
} catch (error) {
  console.error('   ❌ Failed to load printer package');
  console.error('   Error:', error.message);
  console.log('');
  console.log('💡 FIX:');
  console.log('   The printer package has a native module issue.');
  console.log('   This is a known issue with the printer package.');
  console.log('');
  console.log('   The app will fall back to Windows print command.');
  console.log('   Printing should still work via Windows driver.');
  console.log('');
  process.exit(1);
}

console.log('');
console.log('🔍 Step 2: Listing available printers...');

try {
  const printers = printerPackage.getPrinters();
  console.log('   ✅ Found', printers.length, 'printer(s)');
  console.log('');
  console.log('📋 Available Printers:');
  console.log('─'.repeat(60));
  printers.forEach((p, index) => {
    console.log(`   ${index + 1}. ${p.name}`);
    console.log(`      Status: ${p.status || 'Unknown'}`);
    console.log(`      Driver: ${p.driver || 'Unknown'}`);
    console.log('');
  });
  console.log('─'.repeat(60));
  console.log('');
  console.log('✅ PRINTER PACKAGE IS WORKING!');
  console.log('');
  console.log('📝 The app will use printer package for RAW printing.');
  console.log('   This is the most reliable method.');
  console.log('');
} catch (error) {
  console.error('   ❌ Failed to list printers');
  console.error('   Error:', error.message);
  console.log('');
  console.log('💡 FIX:');
  console.log('   The printer package may not be compatible.');
  console.log('   The app will fall back to Windows print command.');
  console.log('');
  process.exit(1);
}
