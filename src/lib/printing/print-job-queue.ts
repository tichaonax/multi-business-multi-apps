/**
 * Print Job Queue Service
 * Manages print job queue with FIFO processing, retry logic, and error handling
 */

import { PrismaClient } from '@prisma/client';
import type {
  PrintJob,
  PrintJobFormData,
  PrintJobQueueOptions,
  PrintJobStatus,
  PrintQueueStats,
  ReceiptData,
  LabelData
} from '@/types/printing';

const prisma = new PrismaClient();

// Retry configuration
const DEFAULT_RETRY_LIMIT = 3;
const DEFAULT_RETRY_DELAY = 5000; // 5 seconds
const EXPONENTIAL_BACKOFF_MULTIPLIER = 2;

/**
 * Queue a new print job
 */
export async function queuePrintJob(
  data: PrintJobFormData,
  businessId: string,
  businessType: string,
  userId: string,
  options: PrintJobQueueOptions = {}
): Promise<PrintJob> {
  const { priority = 5, retryLimit = DEFAULT_RETRY_LIMIT } = options;

  const job = await prisma.printJobs.create({
    data: {
      printerId: data.printerId,
      businessId,
      businessType,
      userId,
      jobType: data.jobType,
      jobData: data.jobData as any,
      status: 'PENDING',
      retryCount: 0,
    },
  });

  // Ensure worker is running when a job is queued
  try {
    const { ensureWorkerRunning } = await import('./print-queue-worker');
    ensureWorkerRunning();
  } catch (error) {
    console.error('Failed to ensure worker is running:', error);
  }

  return transformJobRecord(job);
}

/**
 * Get next pending job for processing (FIFO)
 */
export async function getNextPendingJob(): Promise<PrintJob | null> {
  const job = await prisma.printJobs.findFirst({
    where: {
      status: 'PENDING',
    },
    orderBy: {
      createdAt: 'asc', // FIFO order
    },
  });

  return job ? transformJobRecord(job) : null;
}

/**
 * Mark job as processing
 */
export async function markJobAsProcessing(jobId: string): Promise<PrintJob> {
  const job = await prisma.printJobs.update({
    where: { id: jobId },
    data: {
      status: 'PROCESSING',
    },
  });

  return transformJobRecord(job);
}

/**
 * Mark job as completed
 */
export async function markJobAsCompleted(jobId: string): Promise<PrintJob> {
  const job = await prisma.printJobs.update({
    where: { id: jobId },
    data: {
      status: 'COMPLETED',
      processedAt: new Date(),
    },
  });

  return transformJobRecord(job);
}

/**
 * Mark job as failed with error message
 */
export async function markJobAsFailed(
  jobId: string,
  errorMessage: string
): Promise<PrintJob> {
  const job = await prisma.printJobs.update({
    where: { id: jobId },
    data: {
      status: 'FAILED',
      errorMessage,
      processedAt: new Date(),
    },
  });

  return transformJobRecord(job);
}

/**
 * Retry a failed job
 * Increments retry count and resets status to PENDING
 */
export async function retryJob(
  jobId: string,
  maxRetries: number = DEFAULT_RETRY_LIMIT
): Promise<PrintJob> {
  const job = await prisma.printJobs.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }

  if (job.retryCount >= maxRetries) {
    throw new Error(`Job ${jobId} has reached maximum retry limit (${maxRetries})`);
  }

  const updated = await prisma.printJobs.update({
    where: { id: jobId },
    data: {
      status: 'PENDING',
      retryCount: {
        increment: 1,
      },
      errorMessage: null,
    },
  });

  return transformJobRecord(updated);
}

/**
 * Process print job with automatic retry on failure
 */
export async function processPrintJob(
  jobId: string,
  processFn: (job: PrintJob) => Promise<void>,
  maxRetries: number = DEFAULT_RETRY_LIMIT
): Promise<void> {
  try {
    // Mark as processing
    const job = await markJobAsProcessing(jobId);

    // Execute the actual print operation
    await processFn(job);

    // Mark as completed
    await markJobAsCompleted(jobId);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Get current job state
    const job = await prisma.printJobs.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    // Check if we can retry
    if (job.retryCount < maxRetries) {
      // Schedule retry with exponential backoff
      const retryDelay = DEFAULT_RETRY_DELAY * Math.pow(EXPONENTIAL_BACKOFF_MULTIPLIER, job.retryCount);

      console.log(
        `[Print Job Queue] Job ${jobId} failed, scheduling retry ${job.retryCount + 1}/${maxRetries} in ${retryDelay}ms`,
        errorMessage
      );

      // Retry after delay
      setTimeout(async () => {
        try {
          await retryJob(jobId, maxRetries);
        } catch (retryError) {
          console.error(`[Print Job Queue] Failed to retry job ${jobId}:`, retryError);
        }
      }, retryDelay);
    } else {
      // Max retries reached, mark as failed
      await markJobAsFailed(jobId, errorMessage);
      console.error(`[Print Job Queue] Job ${jobId} failed after ${maxRetries} retries:`, errorMessage);
    }
  }
}

/**
 * Process all pending jobs in the queue
 */
export async function processQueue(
  processFn: (job: PrintJob) => Promise<void>,
  maxConcurrent: number = 1
): Promise<void> {
  const pendingJobs = await prisma.printJobs.findMany({
    where: {
      status: 'PENDING',
    },
    orderBy: {
      createdAt: 'asc',
    },
    take: maxConcurrent,
  });

  if (pendingJobs.length === 0) {
    return;
  }

  console.log(`[Print Job Queue] Processing ${pendingJobs.length} pending job(s)`);

  // Process jobs concurrently up to maxConcurrent
  await Promise.allSettled(
    pendingJobs.map(job => processPrintJob(job.id, processFn))
  );
}

/**
 * Get print job by ID
 */
export async function getPrintJob(jobId: string): Promise<PrintJob | null> {
  const job = await prisma.printJobs.findUnique({
    where: { id: jobId },
  });

  return job ? transformJobRecord(job) : null;
}

/**
 * List print jobs with filtering
 */
export async function listPrintJobs(filters: {
  printerId?: string;
  businessId?: string;
  userId?: string;
  status?: PrintJobStatus;
  jobType?: 'receipt' | 'label';
  limit?: number;
  offset?: number;
}): Promise<{
  jobs: PrintJob[];
  total: number;
}> {
  const { printerId, businessId, userId, status, jobType, limit = 50, offset = 0 } = filters;

  const where: any = {};
  if (printerId) where.printerId = printerId;
  if (businessId) where.businessId = businessId;
  if (userId) where.userId = userId;
  if (status) where.status = status;
  if (jobType) where.jobType = jobType;

  const [jobs, total] = await Promise.all([
    prisma.printJobs.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.printJobs.count({ where }),
  ]);

  return {
    jobs: jobs.map(transformJobRecord),
    total,
  };
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<PrintQueueStats> {
  const [pending, processing, completed, failed] = await Promise.all([
    prisma.printJobs.count({ where: { status: 'PENDING' } }),
    prisma.printJobs.count({ where: { status: 'PROCESSING' } }),
    prisma.printJobs.count({ where: { status: 'COMPLETED' } }),
    prisma.printJobs.count({ where: { status: 'FAILED' } }),
  ]);

  // Get oldest pending job
  const oldestPending = await prisma.printJobs.findFirst({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    select: { createdAt: true },
  });

  return {
    pendingJobs: pending,
    processingJobs: processing,
    completedJobs: completed,
    failedJobs: failed,
    oldestPendingJob: oldestPending?.createdAt,
  };
}

/**
 * Delete old completed/failed jobs (cleanup)
 */
export async function cleanupOldJobs(daysToKeep: number = 30): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const result = await prisma.printJobs.deleteMany({
    where: {
      status: {
        in: ['COMPLETED', 'FAILED'],
      },
      createdAt: {
        lt: cutoffDate,
      },
    },
  });

  return result.count;
}

/**
 * Cancel a pending job
 */
export async function cancelJob(jobId: string): Promise<void> {
  const job = await prisma.printJobs.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }

  if (job.status !== 'PENDING') {
    throw new Error(`Cannot cancel job ${jobId} with status ${job.status}`);
  }

  await prisma.printJobs.delete({
    where: { id: jobId },
  });
}

/**
 * Retry all failed jobs for a specific printer
 */
export async function retryAllFailedJobs(printerId: string): Promise<number> {
  const failedJobs = await prisma.printJobs.findMany({
    where: {
      printerId,
      status: 'FAILED',
    },
  });

  let retried = 0;
  for (const job of failedJobs) {
    try {
      await retryJob(job.id);
      retried++;
    } catch (error) {
      console.error(`Failed to retry job ${job.id}:`, error);
    }
  }

  return retried;
}

/**
 * Get jobs by business
 */
export async function getJobsByBusiness(
  businessId: string,
  limit: number = 50
): Promise<PrintJob[]> {
  const jobs = await prisma.printJobs.findMany({
    where: { businessId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return jobs.map(transformJobRecord);
}

/**
 * Get jobs by user
 */
export async function getJobsByUser(
  userId: string,
  limit: number = 50
): Promise<PrintJob[]> {
  const jobs = await prisma.printJobs.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return jobs.map(transformJobRecord);
}

/**
 * Transform Prisma job record to PrintJob type
 */
function transformJobRecord(record: any): PrintJob {
  return {
    id: record.id,
    printerId: record.printerId,
    businessId: record.businessId,
    businessType: record.businessType,
    userId: record.userId,
    jobType: record.jobType,
    jobData: record.jobData as ReceiptData | LabelData,
    status: record.status as PrintJobStatus,
    retryCount: record.retryCount,
    errorMessage: record.errorMessage,
    createdAt: new Date(record.createdAt),
    processedAt: record.processedAt ? new Date(record.processedAt) : null,
  };
}

/**
 * Disconnect Prisma client
 */
export async function disconnectPrintJobQueue(): Promise<void> {
  await prisma.$disconnect();
}
