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
import type { ReceiptData, BusinessType, PrintJobFormData } from '@/types/printing';

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
      businessType: data.businessType as BusinessType,
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
        notes: item.notes
      })),
      subtotal: data.subtotal,
      tax: data.tax || data.taxAmount || 0,
      discount: data.discount || data.discountAmount || 0,
      total: data.total || data.totalAmount,
      paymentMethod: data.paymentMethod || 'cash',
      amountPaid: data.amountPaid || data.cashTendered,
      changeDue: data.changeDue,
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

    // Queue the print job
    const printJob = await queuePrintJob(
      printJobData,
      data.businessId,
      data.businessType,
      session.user.id
    );

    return NextResponse.json(
      {
        success: true,
        jobId: printJob.id,
        printJob: {
          id: printJob.id,
          status: printJob.status,
          receiptNumber: receiptNumber.formattedNumber,
          globalId: receiptNumber.globalId,
          dailySequence: receiptNumber.dailySequence,
        },
        message: 'Receipt queued for printing',
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
