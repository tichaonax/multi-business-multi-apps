/**
 * Print Queue Background Worker
 * Automatically processes pending print jobs every few seconds
 */

import { PrismaClient } from '@prisma/client';
import { sendToPrinter, isPrinterAvailable } from './printer-service-usb';
import {
  getNextPendingJob,
  markJobAsProcessing,
  markJobAsCompleted,
  markJobAsFailed,
} from './print-job-queue';
import type { LabelData } from '@/types/printing';

const prisma = new PrismaClient();

// Worker configuration
const POLL_INTERVAL = 3000; // Check queue every 3 seconds
const MAX_CONCURRENT_JOBS = 1; // Process one job at a time
const ENABLE_LOGGING = true; // Set to false to reduce console noise

// Use global to prevent hot-reload from resetting state in dev mode
const globalForWorker = global as typeof globalThis & {
  printQueueWorker?: {
    interval: NodeJS.Timeout;
    isProcessing: boolean;
    isRunning: boolean;
    startTime: Date;
  };
};

/**
 * Get worker state (preserves across hot reloads)
 */
function getWorkerState() {
  if (!globalForWorker.printQueueWorker) {
    globalForWorker.printQueueWorker = {
      interval: null as any,
      isProcessing: false,
      isRunning: false,
      startTime: new Date(),
    };
  }
  return globalForWorker.printQueueWorker;
}

/**
 * Start the background worker
 */
export function startPrintQueueWorker(): void {
  const state = getWorkerState();

  if (state.interval && state.isRunning) {
    console.warn('⚠️  Print queue worker already running');
    return;
  }

  console.log('🚀 Starting print queue worker...');
  console.log(`   Polling interval: ${POLL_INTERVAL}ms`);
  console.log(`   Platform: ${process.platform}`);

  // Process queue immediately on start
  processQueue().catch(console.error);

  // Then poll at regular intervals
  state.interval = setInterval(() => {
    processQueue().catch(console.error);
  }, POLL_INTERVAL);

  state.isRunning = true;
  state.startTime = new Date();

  console.log('✅ Print queue worker started successfully\n');
}

/**
 * Stop the background worker
 */
export function stopPrintQueueWorker(): void {
  const state = getWorkerState();
  if (state.interval) {
    clearInterval(state.interval);
    state.interval = null as any;
    state.isRunning = false;
    console.log('🛑 Print queue worker stopped');
  }
}

/**
 * Check if worker is running
 */
export function isWorkerActive(): boolean {
  const state = getWorkerState();
  return state.isRunning && !!state.interval;
}

/**
 * Get worker health status
 */
export function getWorkerHealth(): {
  isRunning: boolean;
  isProcessing: boolean;
  pollInterval: number;
  uptime: number | null;
} {
  const state = getWorkerState();
  const uptime = state.isRunning && state.startTime
    ? Math.floor((Date.now() - state.startTime.getTime()) / 1000)
    : null;

  return {
    isRunning: state.isRunning && !!state.interval,
    isProcessing: state.isProcessing,
    pollInterval: POLL_INTERVAL,
    uptime,
  };
}

/**
 * Restart worker if it stopped unexpectedly
 */
export function ensureWorkerRunning(): boolean {
  const state = getWorkerState();
  if (!state.isRunning || !state.interval) {
    console.warn('⚠️  Print queue worker not running, restarting...');
    startPrintQueueWorker();
    return true; // Worker was restarted
  }
  return false; // Worker was already running
}

/**
 * Process the print queue (called by interval)
 */
async function processQueue(): Promise<void> {
  const state = getWorkerState();

  // Prevent concurrent processing
  if (state.isProcessing) {
    return;
  }

  try {
    state.isProcessing = true;

    // Get next pending job
    const job = await getNextPendingJob();

    if (!job) {
      // No jobs to process
      return;
    }

    if (ENABLE_LOGGING) {
      console.log(`\n🖨️  Processing print job: ${job.id}`);
      console.log(`   Type: ${job.jobType}`);
      console.log(`   Business: ${job.businessId}`);
      console.log(`   Created: ${new Date(job.createdAt).toLocaleTimeString()}`);
    }

    // Mark as processing
    await markJobAsProcessing(job.id);

    // Get printer details
    const printer = await prisma.networkPrinters.findUnique({
      where: { id: job.printerId },
    });

    if (!printer) {
      throw new Error(`Printer not found: ${job.printerId}`);
    }

    if (ENABLE_LOGGING) {
      console.log(`   Printer: ${printer.printerName}`);
    }

    // Extract print content
    let printContent = '';
    const jobData = job.jobData as any;

    if (job.jobType === 'receipt') {
      const receiptText = jobData.receiptText || '';
      // Decode from base64 if it's encoded
      printContent = receiptText.startsWith('data:') || receiptText.length > 100
        ? Buffer.from(receiptText, 'base64').toString('binary')
        : receiptText;
    } else if (job.jobType === 'label') {
      // For label jobs, check if we have pre-formatted content or need to generate it
      if (jobData.labelText || jobData.formattedLabel) {
        // Legacy format with pre-formatted content
        printContent = jobData.labelText || jobData.formattedLabel || '';
      } else {
        // New format: generate label text from LabelData
        const { generateLabel } = await import('./label-generator');
        const labelData = jobData as LabelData;
        printContent = generateLabel(labelData);
      }
    }

    if (!printContent) {
      throw new Error('No print content found in job data');
    }

    if (ENABLE_LOGGING) {
      console.log(`   Content length: ${printContent.length} characters`);
    }

    // Check if printer is available
    const available = await isPrinterAvailable(printer.printerName);
    if (!available) {
      throw new Error(`Printer "${printer.printerName}" not found in system`);
    }

    // Send to printer
    await sendToPrinter(printContent, {
      printerName: printer.printerName,
      copies: jobData.copies || 1,
    });

    // Mark as completed
    await markJobAsCompleted(job.id);

    if (ENABLE_LOGGING) {
      console.log(`   ✅ Job completed successfully`);
    }

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`   ❌ Print job failed: ${errorMsg}`);

    // Try to mark job as failed if we have the job object
    try {
      const job = await getNextPendingJob();
      if (job) {
        await markJobAsFailed(job.id, errorMsg);
      }
    } catch (markError) {
      console.error('   Failed to mark job as failed:', markError);
    }

  } finally {
    state.isProcessing = false;
  }
}

/**
 * Get worker status
 */
export function getWorkerStatus(): {
  running: boolean;
  processing: boolean;
  pollInterval: number;
} {
  const state = getWorkerState();
  return {
    running: state.isRunning && !!state.interval,
    processing: state.isProcessing,
    pollInterval: POLL_INTERVAL,
  };
}

/**
 * Manually trigger queue processing (for testing)
 */
export async function triggerQueueProcessing(): Promise<void> {
  await processQueue();
}

/**
 * Cleanup on shutdown
 */
export async function cleanup(): Promise<void> {
  stopPrintQueueWorker();
  await prisma.$disconnect();
}

// Handle process termination
if (typeof process !== 'undefined') {
  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);
  process.on('beforeExit', cleanup);
}
