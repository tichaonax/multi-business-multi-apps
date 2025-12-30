/**
 * Direct Printer Test API
 * Bypasses print queue - sends ESC/POS commands directly to printer
 * POST /api/printers/test-direct
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeFileSync, unlinkSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { printerId } = await request.json();

    if (!printerId) {
      return NextResponse.json(
        { error: 'Missing printerId' },
        { status: 400 }
      );
    }

    // Get printer details
    const printer = await prisma.networkPrinters.findUnique({
      where: { id: printerId },
    });

    if (!printer) {
      return NextResponse.json(
        { error: 'Printer not found' },
        { status: 404 }
      );
    }

    console.log(`🖨️ Direct test print to: ${printer.printerName} (Type: ${printer.printerType})`);

    // Check printer connectivity first
    const { checkPrinterConnectivity } = await import('@/lib/printing/printer-service');
    const isOnline = await checkPrinterConnectivity(printer.id);

    if (!isOnline) {
      return NextResponse.json(
        { error: 'Printer is offline or unreachable' },
        { status: 503 }
      );
    }

    // Generate appropriate test output based on printer type
    let testData: string;
    let testMethod: string;

    if (printer.printerType === 'receipt') {
      // Generate ESC/POS test receipt for thermal printers
      testData = generateTestReceipt(printer.printerName, printer.receiptWidth || 48);
      testMethod = 'ESC/POS (Thermal Receipt)';

      // Send to thermal printer using RAW
      const { printRawData } = await import('@/lib/printing/windows-raw-printer');
      await printRawData(testData, {
        printerName: printer.printerName,
        copies: 1,
      });
    } else if (printer.printerType === 'label') {
      // Generate label test output
      testData = generateLabelTest(printer.printerName);
      testMethod = 'Label Test (Plain Text)';

      // Send to label printer via Windows spooler
      await printViaSpooler(testData, printer.printerName);
    } else {
      // Generate plain document test for regular printers
      testData = generateDocumentTest(printer.printerName);
      testMethod = 'Document Test (Plain Text)';

      // Send to document printer via Windows spooler
      await printViaSpooler(testData, printer.printerName);
    }

    const printMethod = printer.printerType === 'receipt' ? 'Windows RAW API' : 'Windows Print Spooler';
    console.log(`✅ Direct test print successful (${testMethod} via ${printMethod})`);

    return NextResponse.json({
      success: true,
      message: `Test print sent to ${printer.printerName} (${testMethod} via ${printMethod})`,
    });

  } catch (error) {
    console.error('Direct test print error:', error);
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
 * Generate label test output (plain text format for A4/Letter printers)
 */
function generateLabelTest(printerName: string): string {
  const timestamp = new Date().toLocaleString();

  return `
╔══════════════════════════════════════════════════════════════╗
║                   LABEL PRINTER TEST PAGE                    ║
╚══════════════════════════════════════════════════════════════╝

Printer: ${printerName}
Test Type: Label Printer Test
Date/Time: ${timestamp}
Method: Windows RAW API (Direct Print)

═══════════════════════════════════════════════════════════════

TEST BARCODE LABEL:

┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  Product: Test Item                                          │
│  SKU: TEST-12345                                             │
│  Price: $19.99                                               │
│                                                              │
│  |||||| |||| |||| |||||| |||| |||| |||||| ||||              │
│             *TEST-12345*                                     │
│                                                              │
└──────────────────────────────────────────────────────────────┘

FEATURES TESTED:
  ✓ Printer Connectivity
  ✓ Plain Text Rendering
  ✓ Border/Box Characters
  ✓ Label Layout Formatting
  ✓ Multi-line Text Alignment

NOTE: This is a plain text test. For actual barcode printing,
      the system will use PDF or ZPL format depending on the
      printer's capabilities.

═══════════════════════════════════════════════════════════════

If this page prints clearly with proper alignment,
your label printer is ready for production use!

Test Status: SUCCESS
═══════════════════════════════════════════════════════════════
`;
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
  Test Type: Document Printer Test
  Date/Time: ${timestamp}
  Method: Windows RAW API (Direct Print)

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
  receipt += 'DIRECT PRINTER TEST' + LF;
  receipt += 'ESC/POS Commands' + LF;
  receipt += '='.repeat(width) + LF;

  // Left align for content
  receipt += ESC + 'a' + String.fromCharCode(0);
  receipt += LF;
  receipt += `Printer: ${printerName}` + LF;
  receipt += `Width: ${width} characters` + LF;
  receipt += `Date: ${new Date().toLocaleString()}` + LF;
  receipt += `Method: Windows RAW API (Direct)` + LF;
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

  // Test items with dynamic width
  receipt += '='.repeat(width) + LF;
  receipt += 'TEST ITEMS:' + LF;
  receipt += '='.repeat(width) + LF;
  receipt += LF;

  // Format items with prices aligned to right
  const formatLine = (label: string, price: string) => {
    const padding = width - label.length - price.length;
    return label + ' '.repeat(Math.max(1, padding)) + price + LF;
  };

  receipt += formatLine('2x Test Item 1', '$20.00');
  receipt += formatLine('1x Test Item 2', '$15.50');
  receipt += formatLine('3x Test Item 3', '$15.00');
  receipt += LF;
  receipt += '='.repeat(width) + LF;
  receipt += formatLine('Subtotal', '$50.50');
  receipt += formatLine('Tax', '$4.04');
  receipt += '='.repeat(width) + LF;

  // Bold total
  receipt += ESC + 'E' + String.fromCharCode(1); // Bold ON
  receipt += formatLine('TOTAL', '$54.54');
  receipt += ESC + 'E' + String.fromCharCode(0); // Bold OFF

  receipt += '='.repeat(width) + LF;
  receipt += LF;

  // Payment info
  receipt += 'Payment Method: CASH' + LF;
  receipt += 'Amount Paid:    $60.00' + LF;
  receipt += 'Change Due:      $5.46' + LF;
  receipt += LF;

  // Footer - center align
  receipt += ESC + 'a' + String.fromCharCode(1);
  receipt += '- - - - - - - - - - - - - - - - - - - -' + LF;
  receipt += LF;
  receipt += 'If you can read this clearly,' + LF;
  receipt += 'the printer is working!' + LF;
  receipt += LF;
  receipt += 'ESC/POS Test Successful' + LF;
  receipt += LF + LF;

  // Cut paper
  receipt += CUT;

  return receipt;
}
