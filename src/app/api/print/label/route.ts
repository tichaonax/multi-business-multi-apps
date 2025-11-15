/**
 * Label Printing API Route
 * POST: Generate and queue a label print job (SKU labels with barcodes)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canPrintInventoryLabels } from '@/lib/permission-utils';
import { generateLabel } from '@/lib/printing/label-generator';
import { queuePrintJob } from '@/lib/printing/print-job-queue';
import { convertToZPL } from '@/lib/printing/formats/zpl';
import { convertToESCPOS } from '@/lib/printing/formats/esc-pos';
import type { LabelData, LabelFormat, BarcodeFormat } from '@/types/printing';

/**
 * POST /api/print/label
 * Generate a SKU label and queue it for printing
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!canPrintInventoryLabels(session.user)) {
      return NextResponse.json(
        { error: 'Forbidden - insufficient permissions to print labels' },
        { status: 403 }
      );
    }

    const data = await request.json();

    // Validate required fields - handle both old flat format and new LabelData format
    let labelData: LabelData;

    if (data.barcode && typeof data.barcode === 'object') {
      // New format: LabelData object with barcode as nested object
      labelData = {
        sku: data.sku,
        itemName: data.itemName,
        price: data.price,
        businessId: data.businessId,
        businessType: data.businessType as string || 'other',
        businessName: data.businessName,
        labelFormat: data.labelFormat as LabelFormat || 'with-price',
        barcode: data.barcode,
        businessSpecificData: data.businessSpecificData,
      };
    } else {
      // Legacy format: flat structure
      if (!data.barcodeData && !data.sku) {
        return NextResponse.json(
          { error: 'Missing required field: barcodeData or sku' },
          { status: 400 }
        );
      }

      // Validate label format
      const validLabelFormats: LabelFormat[] = ['standard', 'with-price', 'compact', 'business-specific'];
      const labelFormat = (data.labelFormat as LabelFormat) || 'standard';
      if (!validLabelFormats.includes(labelFormat)) {
        return NextResponse.json(
          { error: `Invalid label format. Must be one of: ${validLabelFormats.join(', ')}` },
          { status: 400 }
        );
      }

      // Validate barcode format
      const validBarcodeFormats: BarcodeFormat[] = ['code128', 'code39', 'ean13', 'upca', 'qr'];
      const barcodeFormat = (data.barcodeFormat as BarcodeFormat) || 'code128';
      if (!validBarcodeFormats.includes(barcodeFormat)) {
        return NextResponse.json(
          { error: `Invalid barcode format. Must be one of: ${validBarcodeFormats.join(', ')}` },
          { status: 400 }
        );
      }

      labelData = {
        sku: data.sku,
        itemName: data.itemName,
        price: data.price,
        businessId: data.businessId,
        businessType: data.businessType as string || 'other',
        businessName: data.businessName,
        labelFormat,
        barcode: {
          data: data.barcodeData || data.sku,
          format: barcodeFormat,
        },
        businessSpecificData: data.businessSpecificData,
      };
    }

    // Generate label text
    const labelText = generateLabel(labelData);

    // Determine printer format (ZPL for Zebra label printers, ESC/POS for thermal printers)
    const printerFormat = data.format || 'zpl'; // Default to ZPL for label printers
    let formattedLabel: string | Buffer;

    if (printerFormat === 'zpl') {
      // Convert to ZPL for Zebra printers
      formattedLabel = convertToZPL(
        { text: labelText, barcode: labelData.barcode },
        {
          labelWidth: data.labelWidth || 400,
          labelHeight: data.labelHeight || 600,
          dpi: data.dpi || 203,
        }
      );
    } else if (printerFormat === 'esc-pos') {
      // Convert to ESC/POS for thermal printers
      formattedLabel = convertToESCPOS(labelText, {
        encoding: 'utf8',
        width: data.width || 48,
      });
    } else {
      // Plain text
      formattedLabel = labelText;
    }

    // Prepare print job data
    const printJobData = {
      printerId: data.printerId,
      jobType: 'label' as const,
      jobData: labelData, // Pass LabelData directly
      copies: data.copies || 1,
    };

    // Queue the print job
    const printJob = await queuePrintJob(
      printJobData,
      data.businessId,
      data.businessType || 'other',
      session.user.id
    );

    return NextResponse.json(
      {
        printJob: {
          id: printJob.id,
          status: printJob.status,
          sku: labelData.sku,
          itemName: labelData.itemName,
        },
        message: 'Label queued for printing',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error queuing label print job:', error);

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
