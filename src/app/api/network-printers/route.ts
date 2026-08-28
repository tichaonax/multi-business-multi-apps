import { NextRequest, NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/network-printers
 * Fetch available network printers, optionally filtered by type
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
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
        connectionMode: true,
        workstationAgentId: true,
        remoteEnabled: true,
      },
      orderBy: [
        { isOnline: 'desc' }, // Online printers first
        { printerName: 'asc' },
      ],
    });

    // MBM-283 Phase 5: cross-reference against QZ Tray's own saved printer
    // names on the same workstation(s) — purely to flag an avoidable
    // double-configuration (the same physical printer targeted by both QZ
    // and an AGENT relay) for the admin UI. Informational only; QZ and
    // AGENT printing already coexist safely (both go through the real OS
    // print spooler, see MBM-283's plan finding #5) — this doesn't gate
    // anything, it just makes an easy-to-avoid mix-up visible.
    const agentWorkstationIds = Array.from(new Set(
      printers.filter(p => p.connectionMode === 'AGENT' && p.workstationAgentId).map(p => p.workstationAgentId!)
    ));
    const qzConfigs = agentWorkstationIds.length > 0
      ? await prisma.qzPrinterConfigs.findMany({
          where: { workstationAgentId: { in: agentWorkstationIds } },
          select: { workstationAgentId: true, printerName: true },
        })
      : [];
    const normalize = (s: string) => s.trim().toLowerCase();

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
      connectionMode: printer.connectionMode,
      workstationAgentId: printer.workstationAgentId,
      remoteEnabled: printer.remoteEnabled,
      qzOverlap: printer.connectionMode === 'AGENT' && printer.workstationAgentId
        ? qzConfigs.some(qz => qz.workstationAgentId === printer.workstationAgentId && normalize(qz.printerName) === normalize(printer.printerName))
        : false,
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
