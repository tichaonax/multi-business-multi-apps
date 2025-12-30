import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { printRawData } from '@/lib/printing/windows-raw-printer';
import { checkPrinterConnectivity } from '@/lib/printing/printer-service';
import { writeFileSync, unlinkSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

/**
 * POST /api/printers/[id]/test-usb
 * Direct USB/local printer test using Windows RAW printer service
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: printerId } = await params;
    if (!printerId) {
      return NextResponse.json({ error: 'Printer ID required' }, { status: 400 });
    }

    const printer = await prisma.networkPrinters.findUnique({ where: { id: printerId } });
    if (!printer) {
      return NextResponse.json({ error: 'Printer not found' }, { status: 404 });
    }

    console.log(`🖨️ USB/Local test print to: ${printer.printerName} (Type: ${printer.printerType})`);

    // Check printer connectivity first
    const isOnline = await checkPrinterConnectivity(printer.id);
    if (!isOnline) {
      return NextResponse.json(
        { error: 'Printer is offline or unreachable' },
        { status: 503 }
      );
    }

    // Generate appropriate test output based on printer type
    console.log(`DEBUG: Printer Type = "${printer.printerType}"`);
    console.log(`DEBUG: Checking if type === 'receipt': ${printer.printerType === 'receipt'}`);
    console.log(`DEBUG: Checking if type === 'label': ${printer.printerType === 'label'}`);

    let testData: string;
    let testMethod: string;

    if (printer.printerType === 'receipt') {
      // Generate ESC/POS test receipt for thermal printers
      testData = generateTestReceipt(printer.printerName, printer.receiptWidth || 48);
      testMethod = 'ESC/POS (Thermal Receipt)';
    } else if (printer.printerType === 'label') {
      // Generate label test output
      testData = generateLabelTest(printer.printerName);
      testMethod = 'Label Test (Plain Text)';

      // For label printers, use PowerShell Out-Printer instead of RAW
      await printViaSpooler(testData, printer.printerName);
    } else {
      // Generate plain document test for regular printers
      testData = generateDocumentTest(printer.printerName);
      testMethod = 'Document Test (Plain Text)';

      // For document printers, use PowerShell Out-Printer instead of RAW
      await printViaSpooler(testData, printer.printerName);
    }

    // Send directly to printer (only for receipt printers using RAW)
    if (printer.printerType === 'receipt') {
      await printRawData(testData, {
        printerName: printer.printerName,
        copies: 1,
      });
    }

    const printMethod = printer.printerType === 'receipt' ? 'Windows RAW API' : 'Windows Print Spooler';
    console.log(`✅ USB/Local test print successful (${testMethod} via ${printMethod})`);

    return NextResponse.json({
      success: true,
      message: `Test print sent to ${printer.printerName} (${testMethod} via ${printMethod})`,
    });

  } catch (error) {
    console.error('USB test print error:', error);
    return NextResponse.json(
      {
        error: 'Test print failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Print text via Windows print spooler (for non-thermal printers)
 * Uses PowerShell Out-Printer which properly formats text for laser/inkjet printers
 */
async function printViaSpooler(text: string, printerName: string): Promise<void> {
  const tempFile = join(tmpdir(), `test-print-${Date.now()}.txt`);

  try {
    console.log(`[PrintSpooler] Writing test to temp file: ${tempFile}`);
    writeFileSync(tempFile, text, 'utf-8');

    // Use PowerShell Get-Content | Out-Printer to print through Windows spooler
    const command = `powershell -Command "Get-Content '${tempFile}' | Out-Printer -Name '${printerName}'"`;

    console.log(`[PrintSpooler] Sending to printer via Windows spooler...`);
    await execAsync(command);

    console.log(`[PrintSpooler] ✅ Print job sent successfully via spooler`);
  } catch (error) {
    console.error(`[PrintSpooler] ❌ Error:`, error);
    throw new Error(`Failed to print via spooler: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    // Clean up temp file
    try {
      unlinkSync(tempFile);
      console.log(`[PrintSpooler] Cleaned up temp file`);
    } catch (cleanupError) {
      console.warn(`[PrintSpooler] Could not delete temp file:`, cleanupError);
    }
  }
}

/**
 * Generate label test output (simple ASCII format for A4/Letter printers)
 */
function generateLabelTest(printerName: string): string {
  const timestamp = new Date().toLocaleString();

  // Use simple ASCII characters that all printers can handle
  return `
================================================================
                   LABEL PRINTER TEST PAGE
================================================================

Printer: ${printerName}
Test Type: Label Printer Test (USB/Local)
Date/Time: ${timestamp}
Method: Windows RAW API (Direct USB Print)

================================================================

TEST BARCODE LABEL:

+--------------------------------------------------------------+
|                                                              |
|  Product: Test Item                                          |
|  SKU: TEST-12345                                             |
|  Price: $19.99                                               |
|                                                              |
|  |||||| |||| |||| |||||| |||| |||| |||||| ||||              |
|             *TEST-12345*                                     |
|                                                              |
+--------------------------------------------------------------+

FEATURES TESTED:
  * Printer Connectivity
  * Plain Text Rendering
  * Simple ASCII Characters
  * Label Layout Formatting
  * Multi-line Text Alignment

NOTE: This is a plain ASCII text test. For actual barcode
      printing, the system will use PDF or ZPL format based
      on your printer's capabilities.

================================================================

If this page prints clearly with proper alignment and text,
your label printer is ready for production use!

Test Status: SUCCESS
================================================================


\f`;
}

/**
 * Generate document test output (plain text for regular office printers)
 */
function generateDocumentTest(printerName: string): string {
  const timestamp = new Date().toLocaleString();

  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
               DOCUMENT PRINTER TEST PAGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Printer Information:
  Name: ${printerName}
  Test Type: Document Printer Test (USB/Local)
  Date/Time: ${timestamp}
  Method: Windows RAW API (Direct USB Print)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FEATURES TESTED:

  ✓ Printer Connectivity & Communication
  ✓ Plain Text Document Rendering
  ✓ Character Encoding (UTF-8)
  ✓ Line Breaks and Formatting
  ✓ Special Characters and Symbols
  ✓ Multiple Font Styles (if supported)

SAMPLE DOCUMENT CONTENT:

  Lorem ipsum dolor sit amet, consectetur adipiscing elit.
  This printer is configured as a standard document printer
  and will be used for printing reports, invoices, and other
  business documents.

  Common Use Cases:
    • Sales Reports
    • Invoices and Receipts
    • Purchase Orders
    • Business Documents
    • Labels (on plain paper)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALIGNMENT TEST:

Left Aligned Text
              Center Aligned Text
                                   Right Aligned Text

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If this page printed successfully with proper formatting and
alignment, your printer is ready for document printing tasks!

Test Status: SUCCESS ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
}

/**
 * Generate ESC/POS formatted test receipt with configurable width
 */
function generateTestReceipt(printerName: string, width: number = 48): string {
  // ESC/POS commands
  const ESC = '\x1B';
  const GS = '\x1D';
  const LF = '\x0A';
  const CUT = GS + 'V' + '\x41' + String.fromCharCode(3); // Partial cut

  let receipt = '';

  // Initialize printer and reset margins
  receipt += ESC + '@';  // Initialize printer (reset all settings)
  receipt += ESC + 'l' + String.fromCharCode(0);  // Set left margin to 0

  // Enable emphasized mode for darker printing
  receipt += ESC + 'G' + String.fromCharCode(1); // Double-strike ON

  // Header - center align
  receipt += ESC + 'a' + String.fromCharCode(1);
  receipt += '='.repeat(width) + LF;
  receipt += 'USB/LOCAL PRINTER TEST' + LF;
  receipt += 'ESC/POS Commands' + LF;
  receipt += '='.repeat(width) + LF;

  // Left align for content
  receipt += ESC + 'a' + String.fromCharCode(0);
  receipt += LF;
  receipt += `Printer: ${printerName}` + LF;
  receipt += `Width: ${width} characters` + LF;
  receipt += `Date: ${new Date().toLocaleString()}` + LF;
  receipt += `Method: Windows RAW API (USB)` + LF;
  receipt += LF;
  receipt += '='.repeat(width) + LF;
  receipt += 'FEATURES TESTED:' + LF;
  receipt += '='.repeat(width) + LF;
  receipt += LF;

  // Test features
  receipt += '✓ Printer Initialization' + LF;
  receipt += '✓ Margin Reset (0)' + LF;
  receipt += '✓ Emphasized Mode (Darker)' + LF;
  receipt += '✓ Text Alignment' + LF;
  receipt += '✓ Line Feeds' + LF;
  receipt += '✓ Separator Lines' + LF;
  receipt += LF;

  // Footer - center align
  receipt += ESC + 'a' + String.fromCharCode(1);
  receipt += '- - - - - - - - - - - - - - - - - - - -' + LF;
  receipt += LF;
  receipt += 'If you can read this clearly,' + LF;
  receipt += 'the USB printer is working!' + LF;
  receipt += LF;
  receipt += 'ESC/POS Test Successful' + LF;
  receipt += LF + LF;

  // Cut paper
  receipt += CUT;

  return receipt;
}
