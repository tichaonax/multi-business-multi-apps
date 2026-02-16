/**
 * Printers API Route
 * POST: Register a new network printer
 * GET: List printers with filtering and pagination
 */

import { NextRequest, NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';
import {
  registerPrinter,
  listPrinters,
  type PrinterFormData,
  type PrinterListOptions,
} from '@/lib/printing/printer-service';
import { canManageNetworkPrinters, canPrint } from '@/lib/permission-utils';
import type { PrinterType } from '@/types/printing';
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/printers
 * List printers with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions - either manage or use printers
    if (!canManageNetworkPrinters(user) && !canPrint(user)) {
      return NextResponse.json(
        { error: 'Forbidden - insufficient permissions' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);

    const options: PrinterListOptions = {
      nodeId: searchParams.get('nodeId') || undefined,
      printerType: searchParams.get('printerType') as PrinterType | undefined,
      isShareable: searchParams.get('isShareable') === 'true' ? true :
                   searchParams.get('isShareable') === 'false' ? false : undefined,
      isOnline: searchParams.get('isOnline') === 'true' ? true :
                searchParams.get('isOnline') === 'false' ? false : undefined,
      search: searchParams.get('search') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
      sortBy: searchParams.get('sortBy') as 'printerName' | 'printerType' | 'lastSeen' | 'createdAt' || 'printerName',
      sortOrder: searchParams.get('sortOrder') as 'asc' | 'desc' || 'asc',
    };

    const result = await listPrinters(options);

    return NextResponse.json({
      printers: result.printers,
      total: result.total,
      hasMore: result.hasMore,
      limit: options.limit,
      offset: options.offset,
    });
  } catch (error) {
    console.error('Error listing printers:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/printers
 * Register a new network printer
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions - must be admin to register printers
    if (!canManageNetworkPrinters(user)) {
      return NextResponse.json(
        { error: 'Forbidden - only admins can register printers' },
        { status: 403 }
      );
    }

    const data = await request.json();

    // Validate required fields
    if (!data.printerId || !data.printerName || !data.printerType) {
      return NextResponse.json(
        { error: 'Missing required fields: printerId, printerName, printerType' },
        { status: 400 }
      );
    }

    // Validate printer type
    const validPrinterTypes = ['label', 'receipt', 'document'];
    if (!validPrinterTypes.includes(data.printerType)) {
      return NextResponse.json(
        { error: `Invalid printer type. Must be one of: ${validPrinterTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Get or create sync node for this printer
    let nodeId = data.nodeId || process.env.NODE_ID || 'local-node';

    // Ensure sync node exists before registering printer
    const existingNode = await prisma.syncNodes.findUnique({
      where: { nodeId: nodeId },
    });

    if (!existingNode) {
      // Create default sync node if it doesn't exist
      await prisma.syncNodes.create({
        data: {
          nodeId: nodeId,
          nodeName: 'Local Node',
          capabilities: { printing: true },
        },
      });
      console.log(`✅ Created sync node: ${nodeId}`);
    }

    // Prepare printer data
    const printerData: PrinterFormData = {
      printerId: data.printerId,
      printerName: data.printerName,
      printerType: data.printerType,
      ipAddress: data.ipAddress || null,
      port: data.port ? parseInt(data.port) : null,
      capabilities: data.capabilities || [],
      isShareable: data.isShareable ?? true,
    };

    // Validate capabilities
    if (printerData.capabilities && Array.isArray(printerData.capabilities)) {
      const validCapabilities = ['esc-pos', 'zebra-zpl', 'pdf', 'image'];
      const invalidCapabilities = printerData.capabilities.filter(
        (cap: string) => !validCapabilities.includes(cap)
      );
      if (invalidCapabilities.length > 0) {
        return NextResponse.json(
          { error: `Invalid capabilities: ${invalidCapabilities.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Register the printer
    const printer = await registerPrinter(printerData, nodeId);

    return NextResponse.json(
      { printer, message: 'Printer registered successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error registering printer:', error);

    // Check for unique constraint violation (duplicate printerId)
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Printer with this ID already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
