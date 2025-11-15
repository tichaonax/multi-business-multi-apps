const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

const prisma = new PrismaClient();

async function manualProcessQueue() {
  console.log('Manually processing print queue...');

  try {
    // Get next pending job
    const job = await prisma.printJobs.findFirst({
      where: {
        status: 'PENDING',
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (!job) {
      console.log('No jobs to process');
      return;
    }

    console.log(`Processing print job: ${job.id}`);
    console.log(`Type: ${job.jobType}`);
    console.log(`Created: ${new Date(job.createdAt).toLocaleTimeString()}`);

    // Mark as processing
    await prisma.printJobs.update({
      where: { id: job.id },
      data: { status: 'PROCESSING' },
    });

    // Get printer details
    const printer = await prisma.networkPrinters.findUnique({
      where: { id: job.printerId },
    });

    if (!printer) {
      throw new Error(`Printer not found: ${job.printerId}`);
    }

    console.log(`Printer: ${printer.printerName}`);

    // Extract print content
    const jobData = job.jobData;
    let printContent = '';

    if (job.jobType === 'receipt') {
      printContent = jobData.receiptText || '';
    }

    if (!printContent) {
      throw new Error('No print content found in job data');
    }

    console.log(`Content length: ${printContent.length} characters`);

    // Check if printer is available
    const printers = execSync('powershell -Command "Get-Printer | Select-Object -ExpandProperty Name"', {
      encoding: 'utf8',
    }).trim().split('\n').map(name => name.trim()).filter(Boolean);

    const available = printers.includes(printer.printerName);
    if (!available) {
      throw new Error(`Printer "${printer.printerName}" not found in system`);
    }

    console.log('Printer is available, sending content...');

    // Get printer port to determine print method
    const portNameCmd = `Get-Printer -Name '${printer.printerName}' | Select-Object -ExpandProperty PortName`;
    let portName = execSync(`powershell -Command "${portNameCmd}"`, {
      encoding: 'utf8',
      timeout: 5000
    }).trim();

    // Remove trailing colon from COM port names
    if (portName.endsWith(':')) {
      portName = portName.slice(0, -1);
    }

    console.log(`Printer port: ${portName}`);

    if (portName.startsWith('COM')) {
      // COM port printer - use direct serial communication
      console.log('Using direct COM port communication...');

      // Convert content to base64 for PowerShell binary handling
      const base64Content = Buffer.from(printContent, 'binary').toString('base64');

      const comPortPrint = `
        $port = new-Object System.IO.Ports.SerialPort ${portName},9600,None,8,one
        $port.Open()
        $bytes = [Convert]::FromBase64String('${base64Content}')
        $port.Write($bytes, 0, $bytes.Length)
        $port.Close()
      `.trim();

      execSync(`powershell -Command "${comPortPrint}"`, {
        stdio: 'inherit',
        timeout: 30000,
      });

    } else {
      // Network or USB printer - use Windows print spooler
      console.log('Using Windows print spooler...');

      const tempDir = process.env.TEMP || 'C:\\Temp';
      const tempFile = `${tempDir}\\print-${Date.now()}.txt`;

      require('fs').writeFileSync(tempFile, printContent, 'utf8');

      const spoolerPrint = `Get-Content '${tempFile.replace(/\\/g, '\\\\')}' | Out-Printer -Name '${printer.printerName}'`;

      execSync(`powershell -Command "${spoolerPrint}"`, {
        stdio: 'inherit',
        timeout: 30000,
      });
    }

    console.log('Print job completed successfully');

    // Mark as completed
    await prisma.printJobs.update({
      where: { id: job.id },
      data: {
        status: 'COMPLETED',
        processedAt: new Date(),
      },
    });

  } catch (error) {
    console.error('Print job failed:', error.message);

    // Try to mark job as failed
    try {
      const job = await prisma.printJobs.findFirst({
        where: { status: 'PROCESSING' },
      });
      if (job) {
        await prisma.printJobs.update({
          where: { id: job.id },
          data: {
            status: 'FAILED',
            errorMessage: error.message,
            processedAt: new Date(),
          },
        });
      }
    } catch (markError) {
      console.error('Failed to mark job as failed:', markError);
    }
  } finally {
    await prisma.$disconnect();
  }
}

manualProcessQueue();