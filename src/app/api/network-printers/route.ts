import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/network-printers
 * Fetch available network printers, optionally filtered by type
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // e.g., 'LABEL', 'RECEIPT', 'THERMAL'
    const onlineOnly = searchParams.get('onlineOnly') === 'true';

    // Build where clause
    const where: any = {};

    if (type) {
      // Filter by printer type (case-insensitive match)
      where.printerType = {
        contains: type,
        mode: 'insensitive',
      };
    }

    if (onlineOnly) {
      where.isOnline = true;
    }

    // Fetch printers
    const printers = await prisma.networkPrinters.findMany({
      where,
      select: {
        id: true,
        printerId: true,
        printerName: true,
        printerType: true,
        nodeId: true,
        ipAddress: true,
        port: true,
        isOnline: true,
        isShareable: true,
        receiptWidth: true,
        capabilities: true,
        lastSeen: true,
      },
      orderBy: [
        { isOnline: 'desc' }, // Online printers first
        { printerName: 'asc' },
      ],
    });

    // Transform to match expected format
    const formattedPrinters = printers.map((printer) => ({
      id: printer.id,
      printerId: printer.printerId,
      name: printer.printerName,
      type: printer.printerType,
      status: printer.isOnline ? 'ONLINE' : 'OFFLINE',
      location: printer.ipAddress || `Node: ${printer.nodeId}`,
      ipAddress: printer.ipAddress,
      port: printer.port,
      isShareable: printer.isShareable,
      receiptWidth: printer.receiptWidth,
      capabilities: printer.capabilities,
      lastSeen: printer.lastSeen,
    }));

    return NextResponse.json({
      printers: formattedPrinters,
      total: formattedPrinters.length,
    });
  } catch (error) {
    console.error('Error fetching network printers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
