import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isSystemAdmin } from '@/lib/permission-utils';
import type { SessionUser } from '@/types/auth';

/**
 * POST /api/universal/barcode-management/print-jobs/[id]/cancel
 * Cancel a print job
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
    const user = session.user as SessionUser;

    // System admins bypass permission checks
    if (!isSystemAdmin(user)) {
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
    }

    // Fetch print job to verify access
    const printJob = await prisma.barcodePrintJobs.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        businessId: true,
      },
    });

    if (!printJob) {
      return NextResponse.json(
        { error: 'Print job not found' },
        { status: 404 }
      );
    }

    // System admins bypass business access check
    if (!isSystemAdmin(user)) {
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
    }

    // Validate job can be cancelled
    if (!['QUEUED', 'PRINTING'].includes(printJob.status)) {
      return NextResponse.json(
        {
          error: `Cannot cancel print job with status ${printJob.status}`,
          currentStatus: printJob.status,
          cancellableStatuses: ['QUEUED', 'PRINTING'],
        },
        { status: 400 }
      );
    }

    // Cancel the print job
    const cancelledJob = await prisma.barcodePrintJobs.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        errorMessage: 'Cancelled by user',
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

    return NextResponse.json({
      message: 'Print job cancelled successfully',
      printJob: cancelledJob,
    });
  } catch (error) {
    console.error('Error cancelling print job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
