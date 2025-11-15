/**
 * Print Jobs API Route
 * GET: List print jobs with filtering and pagination
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canViewPrintQueue } from '@/lib/permission-utils';
import { listPrintJobs } from '@/lib/printing/print-job-queue';
import type { PrintJobStatus } from '@/types/printing';

/**
 * GET /api/print/jobs
 * List print jobs with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions - admin can view all, users can view their own
    const canViewAll = canViewPrintQueue(session.user);

    // Parse query parameters
    const { searchParams } = new URL(request.url);

    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;

    const options = {
      printerId: searchParams.get('printerId') || undefined,
      businessId: searchParams.get('businessId') || undefined,
      userId: canViewAll
        ? searchParams.get('userId') || undefined
        : session.user.id, // Non-admins can only see their own jobs
      status: searchParams.get('status') as PrintJobStatus | undefined,
      jobType: searchParams.get('jobType') as 'receipt' | 'label' | undefined,
      limit,
      offset,
    };

    const result = await listPrintJobs(options);

    // Calculate hasMore from total
    const hasMore = offset + result.jobs.length < result.total;

    return NextResponse.json({
      jobs: result.jobs,
      total: result.total,
      hasMore,
      limit,
      offset,
      filters: {
        printerId: options.printerId,
        businessId: options.businessId,
        userId: options.userId,
        status: options.status,
        jobType: options.jobType,
      },
    });
  } catch (error) {
    console.error('Error listing print jobs:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
