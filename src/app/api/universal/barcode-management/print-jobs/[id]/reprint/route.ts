import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/universal/barcode-management/print-jobs/[id]/reprint
 * Create a new print job with the same settings as an existing job (reprint)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get quantity from request body (optional)
    const body = await request.json().catch(() => ({}));
    const customQuantity = body.quantity;

    // Get the original print job
    const originalJob = await prisma.barcodePrintJobs.findUnique({
      where: { id },
      include: {
        template: true,
        business: true,
      },
    });

    if (!originalJob) {
      return NextResponse.json({ error: 'Print job not found' }, { status: 404 });
    }

    // Use custom quantity if provided, otherwise use original quantity
    const quantity = customQuantity && customQuantity > 0 ? customQuantity : originalJob.requestedQuantity;

    // Create a new job with the same settings
    const newJob = await prisma.barcodePrintJobs.create({
      data: {
        templateId: originalJob.templateId,
        itemId: originalJob.itemId,
        itemType: originalJob.itemType,
        barcodeData: originalJob.barcodeData,
        itemName: originalJob.itemName,
        customData: originalJob.customData,
        requestedQuantity: quantity,
        printedQuantity: 0,
        status: 'QUEUED',
        printerId: originalJob.printerId,
        printSettings: originalJob.printSettings,
        userNotes: originalJob.userNotes ? `Reprint of job ${id} (${quantity}x). ${originalJob.userNotes}` : `Reprint of job ${id} (${quantity}x)`,
        businessId: originalJob.businessId,
        createdById: session.user.id,
      },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            symbology: true,
          },
        },
        business: {
          select: {
            id: true,
            name: true,
            shortName: true,
          },
        },
        printer: {
          select: {
            id: true,
            printerName: true,
            printerType: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'New print job created for reprint',
      job: newJob,
    });
  } catch (error) {
    console.error('Error reprinting job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
