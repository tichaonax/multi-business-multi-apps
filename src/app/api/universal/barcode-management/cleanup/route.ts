import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * POST /api/universal/barcode-management/cleanup
 * Manually trigger cleanup of print jobs older than 4 months
 * Admin only
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { isAdmin: true },
    });

    if (!user?.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Calculate date 4 months ago
    const fourMonthsAgo = new Date();
    fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);

    // Get count of jobs to be deleted
    const jobsToDelete = await prisma.printJobs.count({
      where: {
        createdAt: {
          lt: fourMonthsAgo,
        },
      },
    });

    // Delete old jobs
    const deleteResult = await prisma.printJobs.deleteMany({
      where: {
        createdAt: {
          lt: fourMonthsAgo,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully purged ${deleteResult.count} print jobs older than 4 months`,
      deletedCount: deleteResult.count,
      cutoffDate: fourMonthsAgo.toISOString(),
    });
  } catch (error) {
    console.error('Error purging print jobs:', error);
    return NextResponse.json(
      {
        error: 'Failed to purge print jobs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
