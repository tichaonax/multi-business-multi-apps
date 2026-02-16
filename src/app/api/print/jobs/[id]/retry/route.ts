/**
 * Print Job Retry API Route
 * POST: Retry a failed print job
 */

import { NextRequest, NextResponse } from 'next/server';


import { canViewPrintQueue } from '@/lib/permission-utils';
import { retryJob, getPrintJob } from '@/lib/printing/print-job-queue';
import { getServerUser } from '@/lib/get-server-user'

/**
 * POST /api/print/jobs/[id]/retry
 * Retry a failed print job
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jobId = params.id;
    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    // Get the job to check ownership and status
    const job = await getPrintJob(jobId);

    if (!job) {
      return NextResponse.json(
        { error: 'Print job not found' },
        { status: 404 }
      );
    }

    // Check permissions - admin can retry any job, users can retry their own
    const canViewAll = canViewPrintQueue(user);
    if (!canViewAll && job.userId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden - you can only retry your own print jobs' },
        { status: 403 }
      );
    }

    // Check if job is in a retryable state
    if (job.status !== 'FAILED') {
      return NextResponse.json(
        { error: `Cannot retry job with status: ${job.status}. Only FAILED jobs can be retried.` },
        { status: 400 }
      );
    }

    // Parse max retries from request body (optional)
    const body = await request.json().catch(() => ({}));
    const maxRetries = body.maxRetries || 3;

    // Retry the job
    try {
      const retriedJob = await retryJob(jobId, maxRetries);

      return NextResponse.json({
        job: retriedJob,
        message: 'Print job queued for retry',
      });
    } catch (retryError) {
      if (retryError instanceof Error && retryError.message.includes('maximum retry limit')) {
        return NextResponse.json(
          { error: retryError.message },
          { status: 400 }
        );
      }
      throw retryError;
    }
  } catch (error) {
    console.error('Error retrying print job:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
