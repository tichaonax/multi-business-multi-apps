/**
 * Print Worker Health Check API
 * Returns the current status of the print queue background worker
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWorkerHealth, ensureWorkerRunning } from '@/lib/printing/print-queue-worker';

/**
 * GET /api/health/print-worker
 * Check print worker health and optionally restart if not running
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const autoRestart = searchParams.get('autoRestart') === 'true';

    // Get current health status
    const health = getWorkerHealth();

    // Auto-restart if requested and worker is not running
    let wasRestarted = false;
    if (autoRestart && !health.isRunning) {
      wasRestarted = ensureWorkerRunning();
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      worker: {
        ...health,
        wasRestarted,
      },
      platform: process.platform,
      nodeVersion: process.version,
    });
  } catch (error) {
    console.error('Print worker health check error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Health check failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/health/print-worker/restart
 * Manually restart the print worker
 */
export async function POST(request: NextRequest) {
  try {
    const wasRestarted = ensureWorkerRunning();

    return NextResponse.json({
      success: true,
      message: wasRestarted
        ? 'Print worker was restarted successfully'
        : 'Print worker was already running',
      wasRestarted,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Print worker restart error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to restart print worker',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
