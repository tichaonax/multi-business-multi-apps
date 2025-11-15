/**
 * Printer Sync API Route
 * GET: Get list of shareable printers from all nodes
 * POST: Update printer availability status from remote node
 *
 * Note: This provides the API endpoints for printer synchronization.
 * Full integration with the sync service will be completed in Phase 4.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canManageNetworkPrinters } from '@/lib/permission-utils';
import {
  getShareablePrinters,
  markPrinterOnline,
  markPrinterOffline,
  markStalePrintersOffline,
} from '@/lib/printing/printer-service';
import type { NetworkPrinter } from '@/types/printing';

/**
 * GET /api/sync/printers
 * Get list of shareable printers for network broadcast
 * This endpoint is called by the sync service to get printers available for sharing
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: Phase 4 - Add sync service authentication token validation
    // For now, use regular session auth
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Mark stale printers offline (haven't been seen in 5 minutes)
    await markStalePrintersOffline(5);

    // Get all shareable printers
    const printers = await getShareablePrinters();

    // Get current node ID from environment or session
    const nodeId = process.env.NODE_ID || 'default-node';

    return NextResponse.json({
      nodeId,
      printers: printers.map(printer => ({
        id: printer.id,
        printerId: printer.printerId,
        printerName: printer.printerName,
        printerType: printer.printerType,
        nodeId: printer.nodeId,
        ipAddress: printer.ipAddress,
        port: printer.port,
        capabilities: printer.capabilities,
        isOnline: printer.isOnline,
        lastSeen: printer.lastSeen,
      })),
      count: printers.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting shareable printers:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sync/printers
 * Receive printer status updates from remote nodes
 * This endpoint is called by the sync service when it discovers printers on other nodes
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: Phase 4 - Add sync service authentication token validation
    // For now, use regular session auth
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can update printer status via sync
    if (!canManageNetworkPrinters(session.user)) {
      return NextResponse.json(
        { error: 'Forbidden - only admins can sync printer status' },
        { status: 403 }
      );
    }

    const data = await request.json();

    // Validate required fields
    if (!data.printerId) {
      return NextResponse.json(
        { error: 'Missing required field: printerId' },
        { status: 400 }
      );
    }

    if (!data.status) {
      return NextResponse.json(
        { error: 'Missing required field: status (online|offline)' },
        { status: 400 }
      );
    }

    // Update printer status
    let updatedPrinter: NetworkPrinter;

    if (data.status === 'online') {
      updatedPrinter = await markPrinterOnline(data.printerId);
    } else if (data.status === 'offline') {
      updatedPrinter = await markPrinterOffline(data.printerId);
    } else {
      return NextResponse.json(
        { error: 'Invalid status. Must be "online" or "offline"' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      printer: updatedPrinter,
      message: `Printer marked ${data.status}`,
    });
  } catch (error) {
    console.error('Error syncing printer status:', error);

    // Check for not found error
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Printer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
