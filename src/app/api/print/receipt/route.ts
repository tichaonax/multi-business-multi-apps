/**
 * Receipt Printing API Route
 * POST: Generate and queue a receipt print job
 */

import { NextRequest, NextResponse } from 'next/server';


import { canPrintReceipts } from '@/lib/permission-utils';
import { generateReceiptNumber } from '@/lib/printing/receipt-numbering';
import { generateReceipt } from '@/lib/printing/receipt-templates';
import { queuePrintJob } from '@/lib/printing/print-job-queue';
import type { ReceiptData, PrintJobFormData } from '@/types/printing';
import { getServerUser } from '@/lib/get-server-user'

// Track recent print requests to prevent duplicates
// Key: receiptNumber-receiptType, Value: timestamp
const recentPrintRequests = new Map<string, number>();
const DUPLICATE_WINDOW_MS = 5000; // 5 seconds window to detect duplicates

// Clean up old entries periodically
function cleanupRecentPrints() {
  const now = Date.now();
  for (const [key, timestamp] of recentPrintRequests.entries()) {
    if (now - timestamp > DUPLICATE_WINDOW_MS * 2) {
      recentPrintRequests.delete(key);
    }
  }
}

/**
 * POST /api/print/receipt
 * Generate a receipt and queue it for printing
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!canPrintReceipts(user)) {
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

    // Check for duplicate print requests
    // This prevents the same receipt from being printed multiple times in quick succession
    cleanupRecentPrints();
    const receiptKey = `${data.receiptNumber?.formattedNumber || data.transactionId || 'unknown'}-${data.receiptType || 'default'}`;
    const lastPrintTime = recentPrintRequests.get(receiptKey);
    const now = Date.now();

    if (lastPrintTime && (now - lastPrintTime) < DUPLICATE_WINDOW_MS) {
      console.warn(`⚠️ [Print API] DUPLICATE BLOCKED: ${receiptKey} (${now - lastPrintTime}ms since last print)`);
      return NextResponse.json(
        {
          success: true,
          jobId: 'duplicate-blocked',
          message: 'Duplicate print request blocked - receipt was recently printed',
          isDuplicate: true
        },
        { status: 200 }
      );
    }

    // Record this print request
    recentPrintRequests.set(receiptKey, now);
    console.log(`🖨️ [Print API] Processing print request: ${receiptKey}`);

    // Use provided receipt number OR generate a new one
    // This ensures dual receipts (business + customer copy) get the SAME receipt number
    const timezone = data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const receiptNumber = data.receiptNumber && data.receiptNumber.formattedNumber
      ? data.receiptNumber  // Use existing receipt number (for customer copy of dual receipt)
      : await generateReceiptNumber(data.businessId, timezone);  // Generate new one

    // Prepare receipt data (handle both field naming conventions)
    const receiptData: ReceiptData = {
      receiptNumber: receiptNumber, // This should be the full ReceiptNumbering object
      businessId: data.businessId,
      businessType: data.businessType as string,
      receiptType: data.receiptType, // Receipt type (business/customer) for dual receipts
      businessName: data.businessName || data.metadata?.businessName || 'Business',
      businessAddress: data.businessAddress,
      businessPhone: data.businessPhone,
      businessEmail: data.businessEmail,
      transactionId: data.transactionId || data.orderNumber || data.id || `txn_${Date.now()}`,
      transactionDate: data.transactionDate ? new Date(data.transactionDate) : new Date(data.orderDate || data.date || Date.now()),
      salespersonName: data.salespersonName || data.employeeName || data.metadata?.employeeName || user.name || 'Unknown',
      salespersonId: data.salespersonId || data.employeeId || user.id,
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
      ecocashFeeAmount: data.ecocashFeeAmount,
      ecocashTransactionCode: data.ecocashTransactionCode,
      wifiTokens: data.wifiTokens || [], // WiFi tokens for restaurant receipts
      r710Tokens: data.r710Tokens || [], // R710 tokens for restaurant receipts
      businessSpecificData: data.businessSpecificData,
      footerMessage: data.footerMessage,
      returnPolicy: data.returnPolicy,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerAddress: data.customerAddress,
      customerCity: data.customerCity,
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

    // Resolve printer before responding (fast indexed DB lookup)
    const { prisma: printerPrisma } = await import('@/lib/prisma');
    const printer = await printerPrisma.networkPrinters.findUnique({ where: { id: data.printerId } });
    if (!printer) {
      return NextResponse.json({ error: 'Printer not found' }, { status: 404 });
    }

    // Queue the print job (for audit trail)
    const printJob = await queuePrintJob(
      printJobData,
      data.businessId,
      data.businessType,
      user.id
    );

    // Decode print content once (cheap, done before returning)
    const receiptText = printJobData.jobData.receiptText as string;
    const printContent = Buffer.from(receiptText, 'base64').toString('binary');

    // Fire-and-forget: print in background, response returns immediately
    ;(async () => {
      const { printRawData } = await import('@/lib/printing/windows-raw-printer');
      const { markJobAsProcessing, markJobAsCompleted, markJobAsFailed } = await import('@/lib/printing/print-job-queue');
      try {
        await markJobAsProcessing(printJob.id);
        await printRawData(printContent, { printerName: printer.printerName, copies: printJobData.copies || 1 });
        await markJobAsCompleted(printJob.id);
        console.log('✅ Background print completed:', printJob.id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error('❌ Background print failed:', msg);
        await markJobAsFailed(printJob.id, msg).catch(() => {});
      }
    })();

    return NextResponse.json(
      {
        success: true,
        jobId: printJob.id,
        printJob: {
          id: printJob.id,
          status: 'queued',
          receiptNumber: receiptNumber.formattedNumber,
          globalId: receiptNumber.globalId,
          dailySequence: receiptNumber.dailySequence,
        },
        message: 'Receipt sent to printer',
      },
      { status: 201 }
    );
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
