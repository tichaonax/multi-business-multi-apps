/**
 * Receipt Printing API Route
 * POST: Generate and queue a receipt print job
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canPrintReceipts } from '@/lib/permission-utils';
import { generateReceiptNumber } from '@/lib/printing/receipt-numbering';
import { generateReceipt } from '@/lib/printing/receipt-templates';
import { queuePrintJob } from '@/lib/printing/print-job-queue';
import type { ReceiptData, PrintJobFormData } from '@/types/printing';

/**
 * POST /api/print/receipt
 * Generate a receipt and queue it for printing
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!canPrintReceipts(session.user)) {
      return NextResponse.json(
        { error: 'Forbidden - insufficient permissions to print receipts' },
        { status: 403 }
      );
    }

    const data = await request.json();

    // Validate required fields
    if (!data.printerId) {
      return NextResponse.json(
        { error: 'Missing required field: printerId' },
        { status: 400 }
      );
    }

    if (!data.businessId) {
      return NextResponse.json(
        { error: 'Missing required field: businessId' },
        { status: 400 }
      );
    }

    if (!data.businessType) {
      return NextResponse.json(
        { error: 'Missing required field: businessType' },
        { status: 400 }
      );
    }

    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: items (must be non-empty array)' },
        { status: 400 }
      );
    }

    // Validate business type
    const validBusinessTypes = [
      'restaurant',
      'clothing',
      'grocery',
      'hardware',
      'construction',
      'vehicles',
      'consulting',
      'retail',
      'services',
      'other',
    ];
    if (!validBusinessTypes.includes(data.businessType)) {
      return NextResponse.json(
        { error: `Invalid business type. Must be one of: ${validBusinessTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Generate receipt number (dual numbering system)
    const timezone = data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const receiptNumber = await generateReceiptNumber(data.businessId, timezone);

    // Prepare receipt data (handle both field naming conventions)
    const receiptData: ReceiptData = {
      receiptNumber: receiptNumber, // This should be the full ReceiptNumbering object
      businessId: data.businessId,
      businessType: data.businessType as string,
      businessName: data.businessName || data.metadata?.businessName || 'Business',
      businessAddress: data.businessAddress,
      businessPhone: data.businessPhone,
      businessEmail: data.businessEmail,
      transactionId: data.transactionId || data.orderNumber || data.id || `txn_${Date.now()}`,
      transactionDate: data.transactionDate ? new Date(data.transactionDate) : new Date(data.orderDate || data.date || Date.now()),
      salespersonName: data.salespersonName || data.employeeName || data.metadata?.employeeName || session.user.name || 'Unknown',
      salespersonId: data.salespersonId || data.employeeId || session.user.id,
      items: (data.items || []).map((item: any) => ({
        name: item.name,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice || item.price || 0,
        totalPrice: item.totalPrice || (item.quantity * (item.unitPrice || item.price || 0)),
        notes: item.notes,
        barcode: item.barcode ? {
          type: item.barcode.type,
          code: item.barcode.code
        } : undefined
      })),
      subtotal: data.subtotal,
      tax: data.tax || data.taxAmount || 0,
      discount: data.discount || data.discountAmount || 0,
      total: data.total || data.totalAmount,
      paymentMethod: data.paymentMethod || 'cash',
      amountPaid: data.amountPaid || data.cashTendered,
      changeDue: data.changeDue,
      wifiTokens: data.wifiTokens || [], // WiFi tokens for restaurant receipts
      businessSpecificData: data.businessSpecificData,
      footerMessage: data.footerMessage,
      returnPolicy: data.returnPolicy
    };

    // Calculate totals if not provided
    if (receiptData.subtotal === undefined) {
      receiptData.subtotal = receiptData.items.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0
      );
    }

    if (receiptData.total === undefined) {
      const taxAmount = receiptData.tax || 0;
      const discountAmount = receiptData.discount || 0;
      receiptData.total = receiptData.subtotal + taxAmount - discountAmount;
    }

    // Generate receipt text using business-specific template
    const receiptText = generateReceipt(receiptData);

    // Prepare print job data
    const printJobData: PrintJobFormData = {
      printerId: data.printerId,
      jobType: 'receipt',
      jobData: {
        ...receiptData,
        receiptText: Buffer.from(receiptText).toString('base64'), // Base64 encode to avoid null character issues
      } as any,
      copies: data.copies || 1,
    };

    // Queue the print job (for audit trail)
    const printJob = await queuePrintJob(
      printJobData,
      data.businessId,
      data.businessType,
      session.user.id
    );

    // IMMEDIATELY print the receipt (don't wait for queue worker)
    try {
      const { printRawData } = await import('@/lib/printing/windows-raw-printer');
      const { checkPrinterConnectivity } = await import('@/lib/printing/printer-service');
      const { markJobAsProcessing, markJobAsCompleted, markJobAsFailed } = await import('@/lib/printing/print-job-queue');
      const { prisma } = await import('@/lib/prisma');

      console.log('🖨️ Attempting immediate print for job:', printJob.id);

      // Get printer details
      const printer = await prisma.networkPrinters.findUnique({
        where: { id: data.printerId },
      });

      if (!printer) {
        console.error('❌ Printer not found:', data.printerId);
        throw new Error(`Printer not found: ${data.printerId}`);
      }

      console.log(`📄 Printing to: ${printer.printerName}`);

      // Check printer connectivity
      const isOnline = await checkPrinterConnectivity(printer.id);
      if (!isOnline) {
        console.error(`❌ Printer offline: ${printer.printerName}`);
        throw new Error(`Printer "${printer.printerName}" is offline or unreachable`);
      }

      // Mark job as processing
      await markJobAsProcessing(printJob.id);

      // Decode receipt text from base64
      const receiptText = printJobData.jobData.receiptText as string;
      const printContent = Buffer.from(receiptText, 'base64').toString('binary');

      console.log(`📊 Print content size: ${printContent.length} bytes`);

      // Send to printer using Windows RAW printer service
      await printRawData(printContent, {
        printerName: printer.printerName,
        copies: printJobData.copies || 1,
      });

      // Mark job as completed
      await markJobAsCompleted(printJob.id);

      console.log('✅ Print job completed successfully');

      return NextResponse.json(
        {
          success: true,
          jobId: printJob.id,
          printJob: {
            id: printJob.id,
            status: 'completed',
            receiptNumber: receiptNumber.formattedNumber,
            globalId: receiptNumber.globalId,
            dailySequence: receiptNumber.dailySequence,
          },
          message: 'Receipt printed successfully',
        },
        { status: 201 }
      );

    } catch (printError) {
      // If immediate printing fails, let the queue worker handle it
      const errorMsg = printError instanceof Error ? printError.message : 'Unknown error';
      console.error('Immediate printing failed, will be retried by queue worker:', errorMsg);

      // Update job with error details
      const { markJobAsFailed } = await import('@/lib/printing/print-job-queue');
      await markJobAsFailed(printJob.id, `Immediate print failed: ${errorMsg}. Will retry via queue.`);

      return NextResponse.json(
        {
          success: true,
          jobId: printJob.id,
          printJob: {
            id: printJob.id,
            status: 'failed',
            receiptNumber: receiptNumber.formattedNumber,
            globalId: receiptNumber.globalId,
            dailySequence: receiptNumber.dailySequence,
          },
          message: 'Receipt queued (printer temporarily unavailable)',
          warning: errorMsg,
        },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error('Error queuing receipt print job:', error);

    // Check for specific errors
    if (error instanceof Error) {
      if (error.message.includes('Printer not found')) {
        return NextResponse.json(
          { error: 'Printer not found or offline' },
          { status: 404 }
        );
      }

      if (error.message.includes('Business not found')) {
        return NextResponse.json(
          { error: 'Business not found' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
