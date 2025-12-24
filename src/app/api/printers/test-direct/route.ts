/**
 * Direct Printer Test API
 * Bypasses print queue - sends ESC/POS commands directly to printer
 * POST /api/printers/test-direct
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    console.log(`🖨️ Direct test print to: ${printer.printerName}`);

    // Check printer connectivity first
    const { checkPrinterConnectivity } = await import('@/lib/printing/printer-service');
    const isOnline = await checkPrinterConnectivity(printer.id);

    if (!isOnline) {
      return NextResponse.json(
        { error: 'Printer is offline or unreachable' },
        { status: 503 }
      );
    }

    // Generate ESC/POS test receipt with printer's configured width
    const testReceipt = generateTestReceipt(printer.printerName, printer.receiptWidth || 48);

    // Send directly to printer using Windows RAW printer service (the method that works!)
    const { printRawData } = await import('@/lib/printing/windows-raw-printer');

    await printRawData(testReceipt, {
      printerName: printer.printerName,
      copies: 1,
    });

    console.log('✅ Direct test print successful (Windows RAW API)');

    return NextResponse.json({
      success: true,
      message: `Test print sent directly to ${printer.printerName}`,
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
