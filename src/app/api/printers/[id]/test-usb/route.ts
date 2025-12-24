import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { printRawData } from '@/lib/printing/windows-raw-printer';
import { checkPrinterConnectivity } from '@/lib/printing/printer-service';

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

    console.log(`🖨️ USB/Local test print to: ${printer.printerName}`);

    // Check printer connectivity first
    const isOnline = await checkPrinterConnectivity(printer.id);
    if (!isOnline) {
      return NextResponse.json(
        { error: 'Printer is offline or unreachable' },
        { status: 503 }
      );
    }

    // Generate ESC/POS test receipt with printer's configured width
    const testReceipt = generateTestReceipt(printer.printerName, printer.receiptWidth || 48);

    // Send directly to printer using Windows RAW printer service
    await printRawData(testReceipt, {
      printerName: printer.printerName,
      copies: 1,
    });

    console.log('✅ USB/Local test print successful (Windows RAW API)');

    return NextResponse.json({
      success: true,
      message: `Test print sent to ${printer.printerName}`,
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
