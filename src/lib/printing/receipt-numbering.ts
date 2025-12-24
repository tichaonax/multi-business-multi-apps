/**
 * Receipt Numbering Service
 * Handles dual numbering system: Global UUID + Daily sequence
 * Daily sequence resets at midnight (timezone-aware)
 */

import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import type { ReceiptNumbering } from '@/types/printing';

const prisma = new PrismaClient();

/**
 * Generate receipt number with dual numbering system
 * @param businessId - Business ID for the receipt
 * @param timezone - Timezone for daily sequence reset (default: system timezone)
 * @returns ReceiptNumbering object with globalId, dailySequence, and formatted number
 */
export async function generateReceiptNumber(
  businessId: string,
  timezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone
): Promise<ReceiptNumbering> {
  // Generate global UUID
  const globalId = uuidv4();

  // Get current business day (considering 5AM cutoff)
  const today = getTodayInTimezone(timezone);

  // Get or create daily sequence for this business and date
  const sequence = await getNextDailySequence(businessId, today);

  // Format the daily sequence as 0001, 0002, 0003, etc. (4 digits)
  const dailySequence = sequence.toString().padStart(4, '0');

  // Create formatted number: YYYYMMDD-0001 (e.g., 20251102-0010)
  // Remove dashes from date
  const dateWithoutDashes = today.replace(/-/g, '');
  const formattedNumber = `${dateWithoutDashes}-${dailySequence}`;

  return {
    globalId,
    dailySequence,
    formattedNumber,
  };
}

/**
 * Get the next daily sequence number for a business
 * Uses database transaction to ensure no duplicates under concurrent load
 */
async function getNextDailySequence(businessId: string, date: string): Promise<number> {
  // Use upsert with transaction to handle concurrency
  const result = await prisma.$transaction(async (tx) => {
    // Try to find existing sequence for today
    const existing = await tx.receiptSequences.findUnique({
      where: {
        businessId_date: {
          businessId,
          date,
        },
      },
    });

    if (existing) {
      // Increment existing sequence
      const updated = await tx.receiptSequences.update({
        where: {
          businessId_date: {
            businessId: businessId,
            date: date,
          },
        },
        data: {
          lastSequence: {
            increment: 1,
          },
        },
      });
      return updated.lastSequence;
    } else {
      // Create new sequence starting at 1
      const created = await tx.receiptSequences.create({
        data: {
          businessId,
          date,
          lastSequence: 1,
        },
      });
      return created.lastSequence;
    }
  });

  return result;
}

/**
 * Get current business day in specified timezone as YYYY-MM-DD string
 * Business day resets at 5AM instead of midnight
 * - Before 5AM: uses previous calendar date
 * - 5AM and after: uses current calendar date
 */
function getTodayInTimezone(timezone: string): string {
  const now = new Date();

  // Get current hour in the specified timezone
  const hourFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    hour12: false,
  });
  const hourStr = hourFormatter.format(now);
  const currentHour = parseInt(hourStr, 10);

  // If before 5AM, use previous day's date
  let dateToUse = now;
  if (currentHour < 5) {
    // Subtract one day
    dateToUse = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }

  // Use Intl.DateTimeFormat to get date in specified timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  // en-CA format is YYYY-MM-DD
  return formatter.format(dateToUse);
}

/**
 * Get current sequence number for a business (without incrementing)
 * Useful for checking what the next number will be
 */
export async function getCurrentSequence(
  businessId: string,
  timezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone
): Promise<number> {
  const today = getTodayInTimezone(timezone);

  const sequence = await prisma.receiptSequences.findUnique({
    where: {
      businessId_date: {
        businessId,
        date,
      },
    },
  });

  return sequence ? sequence.lastSequence : 0;
}

/**
 * Reset daily sequence manually (admin function)
 * Should typically only be used for testing or error correction
 */
export async function resetDailySequence(
  businessId: string,
  date: string,
  newValue: number = 0
): Promise<void> {
  await prisma.receiptSequences.upsert({
    where: {
      businessId_date: {
        businessId,
        date,
      },
    },
    update: {
      lastSequence: newValue,
    },
    create: {
      businessId,
      date,
      lastSequence: newValue,
    },
  });
}

/**
 * Get receipt sequence history for a business
 * Useful for analytics and debugging
 */
export async function getReceiptSequenceHistory(
  businessId: string,
  options: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  } = {}
): Promise<Array<{ date: string; lastSequence: number }>> {
  const { startDate, endDate, limit = 30 } = options;

  const where: any = { businessId };

  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = startDate;
    if (endDate) where.date.lte = endDate;
  }

  const sequences = await prisma.receiptSequences.findMany({
    where,
    select: {
      date: true,
      lastSequence: true,
    },
    orderBy: {
      date: 'desc',
    },
    take: limit,
  });

  return sequences;
}

/**
 * Cleanup old receipt sequences (optional maintenance)
 * Remove sequences older than specified days
 */
export async function cleanupOldSequences(daysToKeep: number = 365): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  const cutoffDateString = cutoffDate.toISOString().split('T')[0];

  const result = await prisma.receiptSequences.deleteMany({
    where: {
      date: {
        lt: cutoffDateString,
      },
    },
  });

  return result.count;
}

/**
 * Get total receipts printed for a business on a specific date
 */
export async function getTotalReceiptsForDate(
  businessId: string,
  date: string
): Promise<number> {
  const sequence = await prisma.receiptSequences.findUnique({
    where: {
      businessId_date: {
        businessId,
        date,
      },
    },
  });

  return sequence ? sequence.lastSequence : 0;
}

/**
 * Get receipts printed today for a business
 */
export async function getReceiptsPrintedToday(
  businessId: string,
  timezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone
): Promise<number> {
  const today = getTodayInTimezone(timezone);
  return getTotalReceiptsForDate(businessId, today);
}

/**
 * Validate receipt number format
 */
export function validateReceiptNumberFormat(formattedNumber: string): boolean {
  // Format: YYYYMMDD-0001 (e.g., 20251102-0010)
  const pattern = /^\d{8}-\d{4}$/;
  return pattern.test(formattedNumber);
}

/**
 * Parse formatted receipt number back into components
 */
export function parseReceiptNumber(formattedNumber: string): {
  date: string;
  sequence: string;
} | null {
  if (!validateReceiptNumberFormat(formattedNumber)) {
    return null;
  }

  const parts = formattedNumber.split('-');
  const dateStr = parts[0]; // YYYYMMDD

  return {
    date: `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`, // Convert to YYYY-MM-DD
    sequence: parts[1], // 0001
  };
}

/**
 * Schedule daily sequence reset job
 * This function should be called by a cron job or scheduler
 * Note: Sequences reset automatically when a new date is encountered,
 * but this can be used for cleanup or verification
 */
export async function scheduledDailyReset(): Promise<void> {
  // This is more of a verification/cleanup function
  // The actual reset happens automatically in getNextDailySequence
  // when it detects a new date

  console.log('[Receipt Numbering] Daily reset check completed at', new Date().toISOString());

  // Optional: Log statistics for today
  const today = getTodayInTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  console.log(`[Receipt Numbering] Current date: ${today}`);
}

/**
 * Disconnect Prisma client
 */
export async function disconnectReceiptNumbering(): Promise<void> {
  await prisma.$disconnect();
}
