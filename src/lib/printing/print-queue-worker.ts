/**
 * Print Queue Background Worker
 * Automatically processes pending print jobs every few seconds
 */

import { PrismaClient } from '@prisma/client';
import { printRawData } from './windows-raw-printer';
import { checkPrinterConnectivity } from './printer-service';
import {
  getNextPendingJob,
  markJobAsProcessing,
  markJobAsCompleted,
  markJobAsFailed,
  getNextPendingBarcodeJob,
  markBarcodeJobAsPrinting,
  markBarcodeJobAsCompleted,
  markBarcodeJobAsFailed,
} from './print-job-queue';
import type { LabelData } from '@/types/printing';

const prisma = new PrismaClient();

// Worker configuration
const POLL_INTERVAL = 3000; // Check queue every 3 seconds
const MAX_CONCURRENT_JOBS = 1; // Process one job at a time
const ENABLE_LOGGING = true; // Set to false to reduce console noise
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // Run cleanup once per day (24 hours)

// Use global to prevent hot-reload from resetting state in dev mode
const globalForWorker = global as typeof globalThis & {
  printQueueWorker?: {
    interval: NodeJS.Timeout;
    isProcessing: boolean;
    isRunning: boolean;
    startTime: Date;
    lastCleanup: Date | null;
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
      lastCleanup: null,
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
 * Purge print jobs older than 4 months
 */
async function purgeOldPrintJobs(): Promise<void> {
  try {
    // Calculate date 4 months ago
    const fourMonthsAgo = new Date();
    fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);

    // Delete old jobs
    const deleteResult = await prisma.printJobs.deleteMany({
      where: {
        createdAt: {
          lt: fourMonthsAgo,
        },
      },
    });

    if (deleteResult.count > 0) {
      console.log(`🗑️  Purged ${deleteResult.count} print jobs older than 4 months`);
    }

    // Update last cleanup time
    const state = getWorkerState();
    state.lastCleanup = new Date();
  } catch (error) {
    console.error('Error purging old print jobs:', error);
  }
}

/**
 * Check if cleanup should run and execute if needed
 */
async function checkAndRunCleanup(): Promise<void> {
  const state = getWorkerState();
  const now = new Date();

  // Run cleanup if:
  // 1. Never run before, OR
  // 2. Last cleanup was more than CLEANUP_INTERVAL ago
  const shouldRunCleanup = !state.lastCleanup ||
    (now.getTime() - state.lastCleanup.getTime()) >= CLEANUP_INTERVAL;

  if (shouldRunCleanup) {
    await purgeOldPrintJobs();
  }
}

/**
 * Process a barcode print job
 */
async function processBarcodeJob(job: any): Promise<void> {
  try {
    if (ENABLE_LOGGING) {
      console.log(`\n🏷️  Processing barcode job: ${job.id}`);
      console.log(`   Item: ${job.itemName || 'Unknown'}`);
      console.log(`   Template: ${job.template?.name || 'Unknown'}`);
      console.log(`   Quantity: ${job.requestedQuantity}`);
      console.log(`   Business: ${job.business?.name || 'Unknown'}`);
    }

    // Mark as printing
    await markBarcodeJobAsPrinting(job.id);

    // Get printer details
    if (!job.printer) {
      throw new Error('No printer assigned to this job');
    }

    const printer = job.printer;

    if (ENABLE_LOGGING) {
      console.log(`   Printer: ${printer.printerName} (${printer.printerType})`);
    }

    // Extract barcode parameters from print settings
    const printSettings = job.printSettings as any;
    const barcodeParams = printSettings?.barcodeParams;

    if (!barcodeParams) {
      throw new Error('No barcode parameters found in print settings');
    }

    // Check printer connectivity (but don't fail - try to print anyway)
    const isOnline = await checkPrinterConnectivity(printer.id);
    if (!isOnline) {
      console.warn(`   ⚠️  Printer "${printer.printerName}" appears offline, but will attempt to print anyway`);
    }

    // Print based on printer type
    const copies = job.requestedQuantity || 1;

    if (printer.printerType === 'label' || printer.printerType === 'document') {
      // For laser/inkjet/document printers, generate multi-label page
      const { generateMultiLabelPage } = await import('../barcode-image-generator');

      // Use template's batchId if defined, otherwise generate from job ID (last 3 characters)
      const batchNumber = job.template?.batchId || job.id.slice(-3).toUpperCase();

      if (ENABLE_LOGGING) {
        console.log(`   Generating multi-label page for ${printer.printerType} printer...`);
        console.log(`   Batch number: ${batchNumber}`);
      }

      const imagePath = await generateMultiLabelPage({
        ...barcodeParams,
        batchNumber,
        quantity: copies, // Pass quantity for batch formatting (e.g., "50-A01")
      }, copies);

      if (ENABLE_LOGGING) {
        console.log(`   Multi-label page generated: ${imagePath}`);
        console.log(`   Labels per page: ${Math.min(copies, 18)}`);
      }

      // Print the image file using Windows default image printing
      const { printImageFile } = await import('./print-spooler');

      // Calculate how many pages we need
      const labelsPerPage = 18; // Updated to match new layout (3x6 instead of 3x8)
      const pagesNeeded = Math.ceil(copies / labelsPerPage);

      await printImageFile(imagePath, printer.printerName, pagesNeeded);

      // Clean up temp file
      const { unlinkSync } = await import('fs');
      try {
        unlinkSync(imagePath);
      } catch (error) {
        console.warn(`   Could not delete temp image file: ${error}`);
      }

      if (ENABLE_LOGGING) {
        console.log(`   Print method: Multi-label page via Windows Print Spooler`);
        console.log(`   Pages printed: ${pagesNeeded}`);
      }
    } else if (printer.printerType === 'receipt') {
      // For thermal receipt printers, use ESC/POS commands
      const { generateBarcodeLabel } = await import('../barcode-label-generator');

      // Use template's batchId if defined, otherwise generate from job ID (last 3 characters)
      const batchNumber = job.template?.batchId || job.id.slice(-3).toUpperCase();

      const labelText = generateBarcodeLabel({
        ...barcodeParams,
        batchNumber,
        quantity: copies, // Pass quantity for batch formatting (e.g., "50-A01")
      });

      await printRawData(labelText, {
        printerName: printer.printerName,
        copies,
      });

      if (ENABLE_LOGGING) {
        console.log(`   Print method: ESC/POS via RAW API (thermal printer)`);
        console.log(`   Batch number: ${batchNumber}`);
      }
    } else {
      // Fallback: generate image for unknown printer types
      const { generateBarcodeImage } = await import('../barcode-image-generator');
      const imagePath = await generateBarcodeImage(barcodeParams);

      const { printImageFile } = await import('./print-spooler');
      await printImageFile(imagePath, printer.printerName, copies);

      const { unlinkSync } = await import('fs');
      try {
        unlinkSync(imagePath);
      } catch (error) {
        console.warn(`   Could not delete temp image file: ${error}`);
      }

      if (ENABLE_LOGGING) {
        console.log(`   Print method: Image file (fallback)`);
      }
    }

    // Mark as completed
    await markBarcodeJobAsCompleted(job.id, copies);

    if (ENABLE_LOGGING) {
      console.log(`   ✅ Barcode job completed successfully`);
    }

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`   ❌ Barcode job failed: ${errorMsg}`);

    // Mark job as failed
    try {
      await markBarcodeJobAsFailed(job.id, errorMsg);
    } catch (markError) {
      console.error('   Failed to mark barcode job as failed:', markError);
    }
  }
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

    // Check if we need to run cleanup (once per day)
    await checkAndRunCleanup();

    // Check for barcode jobs first (priority)
    const barcodeJob = await getNextPendingBarcodeJob();

    if (barcodeJob) {
      await processBarcodeJob(barcodeJob);
      return;
    }

    // Get next pending receipt job
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
    const printSettings = job.printSettings as any;
    const jobType = printSettings?.jobType || 'label'; // Default to label for barcode jobs

    if (jobType === 'receipt') {
      const receiptText = printSettings?.receiptText || '';
      // Decode from base64 if it's encoded
      printContent = receiptText.startsWith('data:') || receiptText.length > 100
        ? Buffer.from(receiptText, 'base64').toString('binary')
        : receiptText;
    } else if (jobType === 'label') {
      // For label jobs, check if we have pre-formatted content or need to generate it
      if (printSettings?.labelText) {
        // Use the labelText from printSettings
        printContent = printSettings.labelText;
      } else if (printSettings?.formattedLabel) {
        // Legacy format with pre-formatted content
        printContent = printSettings.formattedLabel;
      } else {
        // New format: generate label text from LabelData
        const { generateLabel } = await import('./label-generator');
        const labelData = printSettings as LabelData;
        printContent = generateLabel(labelData);
      }
    }

    if (!printContent) {
      throw new Error('No print content found in print settings');
    }

    if (ENABLE_LOGGING) {
      console.log(`   Content length: ${printContent.length} characters`);
    }

    // Check printer connectivity
    const isOnline = await checkPrinterConnectivity(printer.id);
    if (!isOnline) {
      throw new Error(`Printer "${printer.printerName}" is offline or unreachable`);
    }

    // Send to printer using appropriate method based on printer type
    const copies = job.requestedQuantity || 1; // Use requestedQuantity from the job

    if (printer.printerType === 'receipt') {
      // Receipt printers use RAW printing (ESC/POS)
      await printRawData(printContent, {
        printerName: printer.printerName,
        copies,
      });
      if (ENABLE_LOGGING) {
        console.log(`   Print method: Windows RAW API (ESC/POS)`);
      }
    } else {
      // Label and document printers use Windows Print Spooler
      const { printViaSpooler } = await import('./print-spooler');
      await printViaSpooler(printContent, printer.printerName, copies);
      if (ENABLE_LOGGING) {
        console.log(`   Print method: Windows Print Spooler (${printer.printerType})`);
      }
    }

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
 * Manually trigger cleanup of old print jobs
 */
export async function triggerCleanup(): Promise<void> {
  await purgeOldPrintJobs();
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
