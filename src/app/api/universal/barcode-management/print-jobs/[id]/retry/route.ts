import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/universal/barcode-management/print-jobs/[id]/retry
 * Retry a failed print job
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

    // Get the print job
    const job = await prisma.barcodePrintJobs.findUnique({
      where: { id },
    });

    if (!job) {
      return NextResponse.json({ error: 'Print job not found' }, { status: 404 });
    }

    // Only allow retrying failed or cancelled jobs
    if (job.status !== 'FAILED' && job.status !== 'CANCELLED') {
      return NextResponse.json(
        { error: 'Can only retry failed or cancelled jobs' },
        { status: 400 }
      );
    }

    // Reset the job to QUEUED status
    const updatedJob = await prisma.barcodePrintJobs.update({
      where: { id },
      data: {
        status: 'QUEUED',
        errorMessage: null,
        printedQuantity: 0,
        printedAt: null,
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
      message: 'Print job queued for retry',
      job: updatedJob,
    });
  } catch (error) {
    console.error('Error retrying print job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
