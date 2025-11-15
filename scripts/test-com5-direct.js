/**
 * Test COM5 direct communication
 * Sends simple test string to verify COM port works
 */

const { execSync } = require('child_process');

console.log('🧪 Testing Direct COM5 Communication\n');

const testMessage = 'HELLO FROM NODE.JS\nThis is a test print\n\n\n';

console.log('Message to send:');
console.log(testMessage);
console.log('\nAttempting to send via COM5...\n');

try {
  // Method 1: Using PowerShell SerialPort
  const ps1 = `
    $port = new-Object System.IO.Ports.SerialPort COM5,9600,None,8,one
    $port.Open()
    Write-Host "Port opened"
    $port.WriteLine("${testMessage.replace(/\n/g, '")\\n$port.WriteLine("')}")
    Write-Host "Data written"
    Start-Sleep -Milliseconds 500
    $port.Close()
    Write-Host "Port closed"
  `.trim();

  console.log('=== Executing PowerShell ===');
  execSync(`powershell -Command "${ps1}"`, {
    stdio: 'inherit',
    timeout: 10000
  });

  console.log('\n✅ Command completed');
  console.log('\n📋 Check your printer - did anything print?');

} catch (error) {
  console.error('\n❌ Error:', error.message);
  console.error('\nThis suggests COM5 cannot be accessed or printer is not responding.');
}
