/**
 * Print Worker Status API
 * GET: Check if print queue worker is running
 */

import { NextResponse } from 'next/server';
import { getWorkerStatus } from '@/lib/printing/print-queue-worker';

export async function GET() {
  try {
    const status = getWorkerStatus();

    return NextResponse.json({
      ...status,
      message: status.running
        ? '✅ Print queue worker is running'
        : '❌ Print queue worker is NOT running',
    });
  } catch (error) {
    console.error('Error getting worker status:', error);
    return NextResponse.json(
      {
        error: 'Failed to get worker status',
        running: false,
        processing: false,
      },
      { status: 500 }
    );
  }
}
