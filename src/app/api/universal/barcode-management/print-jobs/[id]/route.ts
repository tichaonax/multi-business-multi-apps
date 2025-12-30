import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema for updating print jobs
const updatePrintJobSchema = z.object({
  status: z.enum(['QUEUED', 'PRINTING', 'COMPLETED', 'FAILED', 'CANCELLED']).optional(),
  printedQuantity: z.number().min(0).max(1000).optional(),
  errorMessage: z.string().max(1000).optional(),
  userNotes: z.string().max(500).optional(),
});

/**
 * GET /api/universal/barcode-management/print-jobs/[id]
 * Get a single print job by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check permissions
    const hasPermission = await prisma.userPermissions.findFirst({
      where: {
        userId: session.user.id,
        granted: true,
        permission: {
          name: {
            in: ['BARCODE_PRINT', 'BARCODE_MANAGE_TEMPLATES'],
          },
        },
      },
    });

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Fetch print job
    const printJob = await prisma.barcodePrintJobs.findUnique({
      where: { id },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            symbology: true,
            width: true,
            height: true,
            displayValue: true,
            businessId: true,
          },
        },
        business: {
          select: {
            id: true,
            name: true,
            shortName: true,
            type: true,
          },
        },
        printer: {
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            location: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        inventoryItem: {
          select: {
            id: true,
            templateId: true,
            inventoryItemId: true,
            customLabel: true,
            batchNumber: true,
            expiryDate: true,
            isActive: true,
          },
        },
      },
    });

    if (!printJob) {
      return NextResponse.json(
        { error: 'Print job not found' },
        { status: 404 }
      );
    }

    // Verify user has access to this print job's business
    const userBusinessRole = await prisma.userBusinessRole.findFirst({
      where: {
        userId: session.user.id,
        businessId: printJob.businessId,
      },
    });

    if (!userBusinessRole) {
      return NextResponse.json(
        { error: 'Access denied to this print job' },
        { status: 403 }
      );
    }

    return NextResponse.json(printJob);
  } catch (error) {
    console.error('Error fetching print job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/universal/barcode-management/print-jobs/[id]
 * Update a print job (mainly for status updates)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updatePrintJobSchema.parse(body);

    // Check permissions
    const hasPermission = await prisma.userPermissions.findFirst({
      where: {
        userId: session.user.id,
        granted: true,
        permission: {
          name: 'BARCODE_PRINT',
        },
      },
    });

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions. You need BARCODE_PRINT permission.' },
        { status: 403 }
      );
    }

    // Fetch existing print job
    const existingJob = await prisma.barcodePrintJobs.findUnique({
      where: { id },
    });

    if (!existingJob) {
      return NextResponse.json(
        { error: 'Print job not found' },
        { status: 404 }
      );
    }

    // Verify user has access to this print job's business
    const userBusinessRole = await prisma.userBusinessRole.findFirst({
      where: {
        userId: session.user.id,
        businessId: existingJob.businessId,
      },
    });

    if (!userBusinessRole) {
      return NextResponse.json(
        { error: 'Access denied to this print job' },
        { status: 403 }
      );
    }

    // Validate status transitions
    if (validatedData.status) {
      const validTransitions: Record<string, string[]> = {
        QUEUED: ['PRINTING', 'CANCELLED'],
        PRINTING: ['COMPLETED', 'FAILED', 'CANCELLED'],
        COMPLETED: [], // Cannot change from completed
        FAILED: ['QUEUED'], // Can retry failed jobs
        CANCELLED: [], // Cannot change from cancelled
      };

      const allowedStatuses = validTransitions[existingJob.status];
      if (!allowedStatuses.includes(validatedData.status)) {
        return NextResponse.json(
          {
            error: `Cannot transition from ${existingJob.status} to ${validatedData.status}`,
            currentStatus: existingJob.status,
            allowedTransitions: allowedStatuses,
          },
          { status: 400 }
        );
      }
    }

    // Update the print job
    const printJob = await prisma.barcodePrintJobs.update({
      where: { id },
      data: {
        ...validatedData,
        completedAt: validatedData.status === 'COMPLETED' ? new Date() : existingJob.completedAt,
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
            name: true,
            type: true,
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

    return NextResponse.json(printJob);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    console.error('Error updating print job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
