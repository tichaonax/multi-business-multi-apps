/**
 * Printer Discovery API Route
 * GET: Discover network printers via mDNS
 *
 * Note: This endpoint provides a placeholder for mDNS printer discovery.
 * Full mDNS implementation will be integrated in Phase 4 (Sync Service Integration).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canManageNetworkPrinters } from '@/lib/permission-utils';
import { listSystemPrinters } from '@/lib/printing/printer-service-usb';
import type { PrinterCapability } from '@/types/printing';

interface DiscoveredPrinter {
  printerId: string;
  printerName: string;
  printerType: 'label' | 'receipt' | 'document';
  ipAddress: string;
  port: number;
  capabilities: PrinterCapability[];
  manufacturer?: string;
  model?: string;
  status: 'available' | 'busy' | 'offline';
}

/**
 * GET /api/printers/discover
 * Discover network printers via mDNS/network scanning
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions - must be admin to discover printers
    if (!canManageNetworkPrinters(session.user)) {
      return NextResponse.json(
        { error: 'Forbidden - only admins can discover printers' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const timeout = searchParams.get('timeout') ? parseInt(searchParams.get('timeout')!) : 5000; // 5 second default
    const printerType = searchParams.get('printerType') || undefined; // Filter by type
    const source = searchParams.get('source') || 'all'; // 'local', 'network', or 'all'

    let discoveredPrinters: DiscoveredPrinter[] = [];

    // Discover local USB/system printers
    if (source === 'local' || source === 'all') {
      const localPrinters = await discoverLocalPrinters();
      discoveredPrinters = [...discoveredPrinters, ...localPrinters];
    }

    // Discover network printers via mDNS
    if (source === 'network' || source === 'all') {
      const networkPrinters = await discoverPrinters(timeout, printerType);
      discoveredPrinters = [...discoveredPrinters, ...networkPrinters];
    }

    // Filter by type if specified
    if (printerType) {
      discoveredPrinters = discoveredPrinters.filter(p => p.printerType === printerType);
    }

    return NextResponse.json({
      printers: discoveredPrinters,
      count: discoveredPrinters.length,
      timeout,
      source,
      message: discoveredPrinters.length === 0
        ? 'No printers discovered'
        : `Found ${discoveredPrinters.length} printer(s)`,
    });
  } catch (error) {
    console.error('Error discovering printers:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Discover local USB/system printers
 */
async function discoverLocalPrinters(): Promise<DiscoveredPrinter[]> {
  try {
    const systemPrinters = await listSystemPrinters();

    return systemPrinters.map(name => ({
      printerId: `local-${name.toLowerCase().replace(/\s+/g, '-')}`,
      printerName: name,
      printerType: detectPrinterType(name),
      ipAddress: 'localhost', // Local USB printer
      port: 0, // Not applicable for USB
      capabilities: detectCapabilities(name),
      status: 'available' as const,
    }));
  } catch (error) {
    console.error('Failed to discover local printers:', error);
    return [];
  }
}

/**
 * Detect printer type based on name
 */
function detectPrinterType(name: string): 'receipt' | 'label' | 'document' {
  const lower = name.toLowerCase();

  if (
    lower.includes('receipt') ||
    lower.includes('thermal') ||
    lower.includes('pos') ||
    lower.includes('80mm') ||
    lower.includes('58mm') ||
    lower.includes('rongta') ||
    lower.includes('epson tm') ||
    lower.includes('star tsp')
  ) {
    return 'receipt';
  }

  if (
    lower.includes('label') ||
    lower.includes('zebra') ||
    lower.includes('zpl') ||
    lower.includes('dymo') ||
    lower.includes('brother ql')
  ) {
    return 'label';
  }

  return 'document';
}

/**
 * Detect capabilities based on printer name/model
 */
function detectCapabilities(name: string): PrinterCapability[] {
  const lower = name.toLowerCase();
  const capabilities: PrinterCapability[] = [];

  if (lower.includes('zebra') || lower.includes('zpl')) {
    capabilities.push('zebra-zpl');
  }

  if (
    lower.includes('epson') ||
    lower.includes('star') ||
    lower.includes('rongta') ||
    lower.includes('thermal') ||
    lower.includes('receipt')
  ) {
    capabilities.push('esc-pos');
  }

  if (lower.includes('pdf')) {
    capabilities.push('pdf');
  }

  // Default to raw if no specific capability detected
  if (capabilities.length === 0) {
    capabilities.push('raw');
  }

  return capabilities;
}

/**
 * Discover network printers
 * This is a placeholder function that will be replaced with actual mDNS discovery in Phase 4
 */
async function discoverPrinters(
  timeout: number,
  printerType?: string
): Promise<DiscoveredPrinter[]> {
  // TODO: Phase 4 - Implement actual mDNS discovery
  // This will use the multicast-dns library to discover printers advertising:
  // - _ipp._tcp (Internet Printing Protocol)
  // - _printer._tcp (Generic printer service)
  // - _pdl-datastream._tcp (Zebra ZPL printers)

  // For now, return empty array (no printers discovered)
  // In development, you could return mock data for testing:

  const mockDiscovery = process.env.NODE_ENV === 'development';

  if (mockDiscovery) {
    // Mock printers for development testing
    const mockPrinters: DiscoveredPrinter[] = [
      {
        printerId: 'zebra-zpl-001',
        printerName: 'Zebra ZT230 Label Printer',
        printerType: 'label',
        ipAddress: '192.168.1.100',
        port: 9100,
        capabilities: ['zebra-zpl'],
        manufacturer: 'Zebra',
        model: 'ZT230',
        status: 'available',
      },
      {
        printerId: 'epson-tm-t88',
        printerName: 'Epson TM-T88V Receipt Printer',
        printerType: 'receipt',
        ipAddress: '192.168.1.101',
        port: 9100,
        capabilities: ['esc-pos'],
        manufacturer: 'Epson',
        model: 'TM-T88V',
        status: 'available',
      },
    ];

    // Filter by type if specified
    if (printerType) {
      return mockPrinters.filter(p => p.printerType === printerType);
    }

    return mockPrinters;
  }

  // Production: return empty until mDNS is implemented
  return [];
}

/**
 * POST /api/printers/discover
 * Alternative endpoint to trigger discovery with custom parameters
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!canManageNetworkPrinters(session.user)) {
      return NextResponse.json(
        { error: 'Forbidden - only admins can discover printers' },
        { status: 403 }
      );
    }

    const data = await request.json();
    const timeout = data.timeout || 5000;
    const printerType = data.printerType || undefined;
    const subnet = data.subnet || undefined; // For targeted discovery

    // Discover printers
    const discoveredPrinters = await discoverPrinters(timeout, printerType);

    return NextResponse.json({
      printers: discoveredPrinters,
      count: discoveredPrinters.length,
      timeout,
      subnet,
      message: discoveredPrinters.length === 0
        ? 'No printers discovered on the network'
        : `Found ${discoveredPrinters.length} printer(s)`,
    });
  } catch (error) {
    console.error('Error discovering printers:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
