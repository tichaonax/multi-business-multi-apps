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
import { listWindowsPrinters } from '@/lib/printing/windows-raw-printer';
import type { PrinterCapability } from '@/types/printing';

interface DiscoveredPrinter {
  printerId: string;
  printerName: string;
  printerType: 'label' | 'receipt' | 'document';
  ipAddress: string;
  port: number;
  portName?: string; // Add port name for display
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
    const systemPrinters = await listWindowsPrinters();

    return systemPrinters.map(printer => ({
      printerId: `local-${printer.name.toLowerCase().replace(/\s+/g, '-')}`,
      printerName: printer.name,
      printerType: detectPrinterType(printer.name),
      ipAddress: printer.portName.match(/(USB|COM|LPT|TMUSB|RongtaUSB)/i)
        ? '' // Direct ports (USB/COM/LPT/TMUSB/RongtaUSB)
        : 'localhost', // Network printers on localhost
      port: printer.portName.match(/(USB|COM|LPT|TMUSB|RongtaUSB)/i)
        ? 0 // Not applicable for direct ports
        : 9100, // Default network port
      portName: printer.portName, // Include actual port name
      capabilities: detectCapabilities(printer.name),
      manufacturer: extractManufacturer(printer.name),
      model: extractModel(printer.name, printer.name),
      status: printer.status === 'Normal' || printer.status === 'Idle' ? 'available' as const : 'offline' as const,
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

/**
 * Extract manufacturer from driver name
 */
function extractManufacturer(driverName: string): string | undefined {
  if (!driverName) return undefined;

  const lower = driverName.toLowerCase();

  if (lower.includes("epson")) return "Epson";
  if (lower.includes("hp") || lower.includes("hewlett")) return "HP";
  if (lower.includes("canon")) return "Canon";
  if (lower.includes("brother")) return "Brother";
  if (lower.includes("samsung")) return "Samsung";
  if (lower.includes("lexmark")) return "Lexmark";
  if (lower.includes("zebra")) return "Zebra";
  if (lower.includes("dymo")) return "Dymo";
  if (lower.includes("star")) return "Star Micronics";
  if (lower.includes("rongta")) return "Rongta";

  return "Generic";
}

/**
 * Extract model from printer name or driver
 */
function extractModel(printerName: string, driverName: string): string | undefined {
  // Try to extract model from printer name first
  const nameMatches = printerName.match(/(TM-[A-Z]\d+|TM\d+|TSP\d+|QL-\d+|LP\d+|MZ\d+|GK\d+)/i);
  if (nameMatches) return nameMatches[1];

  // Try to extract from driver name
  const driverMatches = driverName.match(/(TM-[A-Z]\d+|TM\d+|TSP\d+|QL-\d+|LP\d+|MZ\d+|GK\d+)/i);
  if (driverMatches) return driverMatches[1];

  return undefined;
}
