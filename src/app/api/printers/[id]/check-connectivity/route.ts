/**
 * Printer Connectivity Check API
 * POST /api/printers/[id]/check-connectivity
 * Checks if a printer is online and reachable
 */

import { NextRequest, NextResponse } from 'next/server';


import { checkPrinterConnectivity } from '@/lib/printing/printer-service';
import { getServerUser } from '@/lib/get-server-user'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: printerId } = await params;

    if (!printerId) {
      return NextResponse.json(
        { error: 'Printer ID is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Checking connectivity for printer: ${printerId}`);

    const isOnline = await checkPrinterConnectivity(printerId);

    console.log(`📡 Printer ${printerId} connectivity check: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);

    return NextResponse.json({
      isOnline,
      checkedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Connectivity check error:', error);
    return NextResponse.json(
      {
        error: 'Connectivity check failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}