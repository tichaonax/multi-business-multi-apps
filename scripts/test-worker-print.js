/**
 * Test Worker Print Path
 * Simulates exactly what the worker does when processing a job
 */

const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const prisma = new PrismaClient();

async function testWorkerPrint() {
  console.log('\n🧪 Testing Worker Print Path\n');

  try {
    // Get the most recent COMPLETED job
    const job = await prisma.printJobs.findFirst({
      where: { status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
    });

    if (!job) {
      console.error('❌ No completed jobs found');
      return;
    }

    console.log(`📋 Testing with job: ${job.id}`);
    console.log(`   Created: ${job.createdAt}`);
    console.log(`   Type: ${job.jobType}`);

    // Get printer
    const printer = await prisma.networkPrinters.findUnique({
      where: { id: job.printerId },
    });

    if (!printer) {
      console.error('❌ Printer not found');
      return;
    }

    console.log(`\n🖨️  Printer: ${printer.printerName}`);

    // Extract content
    const jobData = job.jobData;
    const printContent = jobData.receiptText || '';

    console.log(`   Content length: ${printContent.length} characters`);
    console.log(`   First 100 chars: ${printContent.substring(0, 100)}`);

    // Get printer port
    console.log('\n🔍 Checking printer port...');
    const printerInfoCmd = `Get-Printer -Name '${printer.printerName}' | Select-Object -ExpandProperty PortName`;
    let portName = execSync(`powershell -Command "${printerInfoCmd}"`, {
      encoding: 'utf8',
      timeout: 5000
    }).trim();

    // Remove trailing colon from COM port names (e.g., COM5: -> COM5)
    if (portName.endsWith(':')) {
      portName = portName.slice(0, -1);
    }

    console.log(`   Port: ${portName}`);

    if (!portName.startsWith('COM')) {
      console.error('❌ Not a COM port printer');
      return;
    }

    // Create temp file
    const tempDir = process.env.TEMP || os.tmpdir();
    const tempFile = path.join(tempDir, `worker-test-print-${Date.now()}.txt`);
    fs.writeFileSync(tempFile, printContent, 'utf8');
    console.log(`   Temp file: ${tempFile}`);

    // Send to COM port (exactly as the worker does)
    console.log('\n📡 Sending to COM port...');

    const comPortPrint = `
      $port = new-Object System.IO.Ports.SerialPort ${portName},9600,None,8,one
      $port.Open()
      $content = Get-Content '${tempFile.replace(/\\/g, '\\\\')}'
      foreach ($line in $content) {
        $port.WriteLine($line)
      }
      # Send form feed to advance/cut paper
      $port.Write([char]0x0C)
      $port.Close()
    `.trim();

    console.log('   PowerShell command:');
    console.log('   ' + comPortPrint.split('\n').join('\n   '));

    console.log('\n⏳ Executing...\n');

    execSync(`powershell -Command "${comPortPrint}"`, {
      stdio: 'inherit',
      timeout: 30000,
    });

    console.log('\n✅ Command executed successfully!');
    console.log('📋 Check your printer - it should have printed.');

    // Cleanup
    setTimeout(() => {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
        console.log('🧹 Cleaned up temp file');
      }
    }, 2000);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stdout) console.log('STDOUT:', error.stdout);
    if (error.stderr) console.log('STDERR:', error.stderr);
  } finally {
    await prisma.$disconnect();
  }
}

testWorkerPrint();
