import { NextRequest, NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';
import { readFileSync, unlinkSync } from 'fs';
import { getServerUser } from '@/lib/get-server-user'

/**
 * POST /api/universal/barcode-management/print-jobs/generate-pdf
 * Generate a PNG file with barcode labels for download (dev/testing mode)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { templateId, quantity, customData, printerType } = body;

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    if (!quantity || quantity < 1 || quantity > 1000) {
      return NextResponse.json({ error: 'Quantity must be between 1 and 1000' }, { status: 400 });
    }

    // Get template details
    const template = await prisma.barcodeTemplates.findUnique({
      where: { id: templateId },
      include: {
        business: true,
      },
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Generate batch number (timestamp-based for PDF downloads)
    const batchNumber = Date.now().toString(36).slice(-3).toUpperCase();

    // Prepare barcode parameters
    const barcodeParams = {
      barcodeData: customData?.barcodeValue || template.barcodeValue,
      symbology: template.symbology,
      itemName: customData?.name || template.name,
      businessName: template.business?.name || '',
      templateName: template.name,
      displayValue: true,
      batchNumber, // Add batch number
      quantity, // Add quantity for batch formatting (e.g., "50-A01")
      customData: {
        productName: customData?.productName,
        price: customData?.price,
        size: customData?.size,
        color: customData?.color,
        description: customData?.description,
      },
    };

    // Generate PNG based on printer type
    let imagePath: string;

    if (printerType === 'receipt') {
      // For receipt printers: Generate vertical strip of labels (single column)
      const { generateReceiptLabelStrip } = await import('@/lib/barcode-image-generator');
      imagePath = await generateReceiptLabelStrip(barcodeParams, quantity);
    } else {
      // For document/laser/label printers: Generate multi-label page (grid layout)
      const { generateMultiLabelPage } = await import('@/lib/barcode-image-generator');
      imagePath = await generateMultiLabelPage(barcodeParams, quantity);
    }

    // Read the file
    const imageBuffer = readFileSync(imagePath);

    // Clean up temp file
    try {
      unlinkSync(imagePath);
    } catch (error) {
      console.warn('Could not delete temp image file:', error);
    }

    // Return as downloadable PNG
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="barcode-labels-${Date.now()}.png"`,
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
