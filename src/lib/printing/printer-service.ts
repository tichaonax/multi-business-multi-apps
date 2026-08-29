/**
 * Printer Service
 * Core service for managing network printers (register, update, delete, list)
 */

import { PrismaClient } from '@prisma/client';
import type {
  NetworkPrinter,
  PrinterFormData,
  PrinterType,
  PrinterCapability,
  PrinterStatistics
} from '@/types/printing';
import {
  auditPrinterRegistered,
  auditPrinterUpdated,
  auditPrinterDeleted,
  auditPrinterShared,
  auditPrinterStatusChanged
} from './audit-logger';

const prisma = new PrismaClient();

export interface PrinterFilters {
  nodeId?: string;
  printerType?: PrinterType;
  isShareable?: boolean;
  isOnline?: boolean;
  search?: string; // Search by printer name or IP
  // MBM-283 Phase 1: when provided, an AGENT-mode printer is only included
  // if its owning workstation agent belongs to this business — closes a
  // gap where any business could see (and previously, successfully dispatch
  // to) another business's agent-relayed printer. DIRECT-mode printers are
  // unaffected (no business field exists for them yet — a separate,
  // pre-existing gap, out of this project's scope). Optional so admin
  // management screens that intentionally want the full unscoped list
  // (printer-list.tsx etc.) keep working exactly as before.
  businessId?: string;
  // MBM-283 follow-up: lets a paired workstation discover its OWN AGENT
  // printer even when "share this printer" (remoteEnabled) is off — a
  // workstation must be able to auto-select/print to its own declared
  // printer regardless of whether it's shared with anyone else. Only ever
  // widens the result to include that ONE printer (matched by
  // workstationAgentId, still requiring remotePrintingEnabled) — never a
  // bypass for any other printer.
  ownWorkstationAgentId?: string;
}

export interface PrinterListOptions extends PrinterFilters {
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'type' | 'createdAt' | 'lastSeen';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Register a new network printer
 */
export async function registerPrinter(
  data: PrinterFormData,
  nodeId: string
): Promise<NetworkPrinter> {
  // Generate unique printer ID
  const printerId = `printer-${nodeId}-${Date.now()}`;

  const printer = await prisma.networkPrinters.create({
    data: {
      printerId,
      printerName: data.printerName,
      printerType: data.printerType,
      nodeId,
      ipAddress: data.ipAddress || null,
      port: data.port || null,
      capabilities: data.capabilities,
      isShareable: data.isShareable,
      isOnline: true,
      receiptWidth: data.receiptWidth || 48, // Default to 48 characters
      lastSeen: new Date(),
    },
  });

  return transformPrinterRecord(printer);
}

/**
 * Update printer configuration
 */
export async function updatePrinter(
  printerId: string,
  data: Partial<PrinterFormData>
): Promise<NetworkPrinter> {
  const printer = await prisma.networkPrinters.update({
    where: { id: printerId },
    data: {
      printerName: data.printerName,
      printerType: data.printerType,
      ipAddress: data.ipAddress || null,
      port: data.port || null,
      capabilities: data.capabilities,
      isShareable: data.isShareable,
      receiptWidth: data.receiptWidth,
      updatedAt: new Date(),
    },
  });

  return transformPrinterRecord(printer);
}

/**
 * Delete printer
 * Note: This will cascade delete all associated print jobs
 */
export async function deletePrinter(printerId: string): Promise<void> {
  await prisma.networkPrinters.delete({
    where: { id: printerId },
  });
}

/**
 * Get printer by ID
 */
export async function getPrinterById(printerId: string): Promise<NetworkPrinter | null> {
  const printer = await prisma.networkPrinters.findUnique({
    where: { id: printerId },
  });

  return printer ? transformPrinterRecord(printer) : null;
}

/**
 * Get printer by printerId (unique identifier)
 */
export async function getPrinterByPrinterId(printerId: string): Promise<NetworkPrinter | null> {
  const printer = await prisma.networkPrinters.findUnique({
    where: { printerId },
  });

  return printer ? transformPrinterRecord(printer) : null;
}

/**
 * List printers with filtering and pagination
 */
export async function listPrinters(options: PrinterListOptions = {}): Promise<{
  printers: NetworkPrinter[];
  total: number;
  hasMore: boolean;
}> {
  const {
    nodeId,
    printerType,
    isShareable,
    isOnline,
    search,
    businessId,
    ownWorkstationAgentId,
    limit = 50,
    offset = 0,
    sortBy = 'name',
    sortOrder = 'asc',
  } = options;

  // Build where clause
  const where: any = {};

  if (nodeId) {
    where.nodeId = nodeId;
  }

  if (printerType) {
    where.printerType = printerType;
  }

  if (typeof isShareable === 'boolean') {
    where.isShareable = isShareable;
  }

  if (typeof isOnline === 'boolean') {
    where.isOnline = isOnline;
  }

  // search and businessId each need their own OR clause — combined via AND
  // so they narrow independently instead of one silently overwriting the
  // other's where.OR.
  const andConditions: any[] = [];

  if (search) {
    andConditions.push({
      OR: [
        { printerName: { contains: search, mode: 'insensitive' } },
        { ipAddress: { contains: search } },
      ],
    });
  }

  if (businessId) {
    andConditions.push({
      OR: [
        { connectionMode: { not: 'AGENT' } },
        // MBM-283 Phase 2: same-business alone isn't enough — an AGENT
        // printer must also be explicitly opted in for remote use to
        // appear in this business-scoped (i.e. print-time picker) listing.
        // MBM-283 follow-up: also requires remotePrintingEnabled — a
        // "paused" printer (remote printing off) is unreachable for
        // everyone, share flag notwithstanding.
        { connectionMode: 'AGENT', remotePrintingEnabled: true, workstation_agent: { businessId }, remoteEnabled: true },
        // MBM-283 follow-up: a workstation can always discover its OWN
        // printer, share flag aside — it just can't be discovered by
        // anyone else while unshared. Still gated by remotePrintingEnabled
        // — paused means unreachable even for its own workstation.
        ...(ownWorkstationAgentId
          ? [{ connectionMode: 'AGENT', remotePrintingEnabled: true, workstationAgentId: ownWorkstationAgentId }]
          : []),
      ],
    });
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  // Count total
  const total = await prisma.networkPrinters.count({ where });

  // Fetch printers
  const printers = await prisma.networkPrinters.findMany({
    where,
    skip: offset,
    take: limit,
    orderBy: {
      [sortBy === 'name' ? 'printerName' : sortBy]: sortOrder,
    },
    // MBM-283: AGENT-mode "online" is really the paired workstation's live
    // socket status, not the printer's own static isOnline column — that
    // column is only ever kept accurate for DIRECT printers (see
    // checkPrinterConnectivity, which explicitly skips AGENT mode). Needed
    // so transformPrinterRecord below can report real connectivity instead
    // of a stale/meaningless flag. `label` is surfaced too so the print-time
    // picker can distinguish two AGENT printers that happen to share a
    // printer name (e.g. the same "EPSON TM-T" model at two different
    // workstations) — without it, a manual "pick a different one, this
    // workstation is busy" override is impossible to make correctly.
    // `hostname` too: `label` is free text an admin typed with no
    // uniqueness enforced, so two workstations can share one — hostname is
    // what actually disambiguates them once a picker lists several.
    include: { workstation_agent: { select: { connectionStatus: true, label: true, hostname: true } } },
  });

  return {
    printers: printers.map(transformPrinterRecord),
    total,
    hasMore: offset + printers.length < total,
  };
}

/**
 * Get all shareable printers across all nodes
 */
export async function getShareablePrinters(): Promise<NetworkPrinter[]> {
  const printers = await prisma.networkPrinters.findMany({
    where: {
      isShareable: true,
      isOnline: true,
    },
    orderBy: {
      printerName: 'asc',
    },
  });

  return printers.map(transformPrinterRecord);
}

/**
 * Get printers for a specific node
 */
export async function getPrintersByNode(nodeId: string): Promise<NetworkPrinter[]> {
  const printers = await prisma.networkPrinters.findMany({
    where: { nodeId },
    orderBy: {
      printerName: 'asc',
    },
  });

  return printers.map(transformPrinterRecord);
}

/**
 * Mark printer as online
 */
export async function markPrinterOnline(printerId: string): Promise<NetworkPrinter> {
  const printer = await prisma.networkPrinters.update({
    where: { id: printerId },
    data: {
      isOnline: true,
      lastSeen: new Date(),
    },
  });

  return transformPrinterRecord(printer);
}

/**
 * Mark printer as offline
 */
export async function markPrinterOffline(printerId: string): Promise<NetworkPrinter> {
  const printer = await prisma.networkPrinters.update({
    where: { id: printerId },
    data: {
      isOnline: false,
    },
  });

  return transformPrinterRecord(printer);
}

/**
 * Update printer last seen timestamp (heartbeat)
 */
export async function updatePrinterHeartbeat(printerId: string): Promise<void> {
  await prisma.networkPrinters.update({
    where: { id: printerId },
    data: {
      lastSeen: new Date(),
    },
  });
}

/**
 * Mark printers as offline if not seen recently
 * @param timeoutMinutes - Minutes since last seen before marking offline
 *
 * NOTE: Only applies to network printers with IP addresses.
 * Local USB/LPT printers stay online unless explicitly checked and fail.
 */
export async function markStalePrintersOffline(timeoutMinutes: number = 5): Promise<number> {
  const cutoffTime = new Date(Date.now() - timeoutMinutes * 60 * 1000);

  // Only mark network printers as stale (those with IP addresses)
  // Local printers (USB, LPT) don't need periodic pinging - they stay online
  const result = await prisma.networkPrinters.updateMany({
    where: {
      isOnline: true,
      lastSeen: {
        lt: cutoffTime,
      },
      ipAddress: {
        not: null,
      },
    },
    data: {
      isOnline: false,
    },
  });

  return result.count;
}

/**
 * Check printer connectivity and update online status
 * @param printerId - ID of printer to check
 * @returns Promise<boolean> - true if printer is online
 */
export async function checkPrinterConnectivity(printerId: string): Promise<boolean> {
  try {
    const printer = await prisma.networkPrinters.findUnique({
      where: { id: printerId },
    });

    if (!printer) {
      return false;
    }

    // AGENT-mode printers live on a paired workstation, not the central
    // server — neither branch below applies to them (no ipAddress/port,
    // and checkLocalPrinterConnectivity checks for a printer installed on
    // whatever machine runs THIS server process, which is never where an
    // AGENT printer actually is). Missing this case meant "Bring Online"
    // always reported false for every AGENT printer regardless of its
    // real connection state — it was checking the wrong machine entirely.
    // The live workstationAgentHub state (same source the admin page's
    // own agent list already uses) is the real answer here, and — unlike
    // the branches below — deliberately does NOT get written back to this
    // printer's isOnline column: that column means nothing for AGENT mode
    // (transformPrinterRecord ignores it, deriving isOnline from the
    // paired workstation's live state instead), so writing to it here
    // would just be a second, unread, possibly-misleading copy of the
    // same fact.
    if (printer.connectionMode === 'AGENT') {
      if (!printer.workstationAgentId) return false;
      const { workstationAgentHub } = await import('@/lib/workstation-agents/agent-hub');
      return workstationAgentHub.isAgentConnected(printer.workstationAgentId);
    }

    // For network printers, try to connect to the IP/port
    if (printer.ipAddress && printer.port) {
      const isOnline = await checkNetworkPrinterConnectivity(printer.ipAddress, printer.port);
      await updatePrinterStatus(printerId, isOnline);
      return isOnline;
    }

    // For local printers, check if they exist in the system
    const isOnline = await checkLocalPrinterConnectivity(printer.printerName);
    await updatePrinterStatus(printerId, isOnline);
    return isOnline;

  } catch (error) {
    console.error(`Error checking connectivity for printer ${printerId}:`, error);
    await updatePrinterStatus(printerId, false);
    return false;
  }
}

/**
 * Check network printer connectivity
 */
async function checkNetworkPrinterConnectivity(ipAddress: string, port: number): Promise<boolean> {
  try {
    // Use a simple TCP connection test
    const net = require('net');
    return new Promise((resolve) => {
      const socket = net.createConnection(port, ipAddress);
      socket.setTimeout(5000); // 5 second timeout

      socket.on('connect', () => {
        socket.end();
        resolve(true);
      });

      socket.on('error', () => {
        resolve(false);
      });

      socket.on('timeout', () => {
        socket.end();
        resolve(false);
      });
    });
  } catch (error) {
    return false;
  }
}

/**
 * Check local printer connectivity (Windows)
 */
async function checkLocalPrinterConnectivity(printerName: string): Promise<boolean> {
  try {
    // Use the Windows RAW printer service's connectivity check
    const { checkPrinterAvailable } = await import('./windows-raw-printer');
    return await checkPrinterAvailable(printerName);
  } catch (error) {
    console.error(`Error checking local printer ${printerName}:`, error);
    return false;
  }
}

/**
 * Update printer online status
 */
async function updatePrinterStatus(printerId: string, isOnline: boolean): Promise<void> {
  // Get current printer status before update
  const printer = await prisma.networkPrinters.findUnique({
    where: { id: printerId },
    select: { printerName: true, isOnline: true, nodeId: true }
  });

  if (!printer) {
    console.warn(`Cannot update status for printer ${printerId}: printer not found`);
    return;
  }

  const oldStatus = printer.isOnline ? 'online' : 'offline';
  const newStatus = isOnline ? 'online' : 'offline';

  await prisma.networkPrinters.update({
    where: { id: printerId },
    data: {
      isOnline,
      lastSeen: new Date(),
    },
  });

  // Audit the status change only if status actually changed
  if (oldStatus !== newStatus) {
    await auditPrinterStatusChanged(printerId, printer.printerName, oldStatus, newStatus, printer.nodeId);
  }
}

/**
 * Get printer statistics (job counts, processing times, etc.)
 */
export async function getPrinterStatistics(printerId: string): Promise<PrinterStatistics> {
  const jobs = await prisma.printJobs.findMany({
    where: { printerId },
    select: {
      status: true,
      createdAt: true,
      processedAt: true,
    },
  });

  const totalJobs = jobs.length;
  const completedJobs = jobs.filter(j => j.status === 'COMPLETED').length;
  const failedJobs = jobs.filter(j => j.status === 'FAILED').length;

  // Calculate average processing time for completed jobs
  const processingTimes = jobs
    .filter(j => j.status === 'COMPLETED' && j.processedAt)
    .map(j => j.processedAt!.getTime() - j.createdAt.getTime());

  const averageProcessingTime = processingTimes.length > 0
    ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
    : 0;

  const lastJob = jobs.length > 0
    ? jobs.reduce((latest, job) => job.createdAt > latest.createdAt ? job : latest)
    : null;

  return {
    totalJobs,
    completedJobs,
    failedJobs,
    averageProcessingTime,
    lastJobTime: lastJob?.createdAt,
  };
}

/**
 * Check if a printer exists
 */
export async function printerExists(printerId: string): Promise<boolean> {
  const count = await prisma.networkPrinters.count({
    where: { id: printerId },
  });

  return count > 0;
}

/**
 * Validate printer capabilities
 */
export function validatePrinterCapabilities(capabilities: string[]): boolean {
  const validCapabilities: PrinterCapability[] = ['esc-pos', 'zebra-zpl', 'pdf', 'raw'];
  return capabilities.every(cap => validCapabilities.includes(cap as PrinterCapability));
}

/**
 * Transform Prisma printer record to NetworkPrinter type
 */
function transformPrinterRecord(record: any): NetworkPrinter {
  return {
    id: record.id,
    printerId: record.printerId,
    printerName: record.printerName,
    printerType: record.printerType as PrinterType,
    nodeId: record.nodeId,
    ipAddress: record.ipAddress,
    port: record.port,
    capabilities: (record.capabilities || []) as PrinterCapability[],
    isShareable: record.isShareable,
    // MBM-283: for AGENT-mode printers, "online" means the paired
    // workstation's live socket connection — record.isOnline is a static
    // DB column never kept accurate for AGENT mode (checkPrinterConnectivity
    // explicitly skips it). Only overridden when the caller actually joined
    // workstation_agent (listPrinters() does; other callers of this shared
    // transform, e.g. registerPrinter/updatePrinter, didn't and don't need
    // to — they fall back to the raw column exactly as before).
    isOnline: record.connectionMode === 'AGENT' && record.workstation_agent
      ? record.workstation_agent.connectionStatus === 'ONLINE'
      : record.isOnline,
    // MBM-283: which workstation this AGENT-relayed printer is physically
    // attached to — null for DIRECT printers or when the caller didn't
    // join workstation_agent. Lets the print-time picker show "EPSON TM-T
    // — Kitchen Till" instead of an ambiguous bare name that's identical
    // across every workstation using the same printer model.
    workstationLabel: record.connectionMode === 'AGENT' ? (record.workstation_agent?.label ?? null) : null,
    // MBM-283 follow-up: the workstation's actual machine hostname —
    // `workstationLabel` above is free text an admin typed with no
    // uniqueness enforced, so two workstations can share a label; hostname
    // is what a picker listing several workstations actually disambiguates
    // them by.
    workstationHostname: record.connectionMode === 'AGENT' ? (record.workstation_agent?.hostname ?? null) : null,
    // MBM-283 follow-up: lets a paired workstation recognize "this AGENT
    // printer is MY OWN attached printer" client-side (unified-receipt-
    // preview-modal.tsx matches this against its own local /probe result)
    // so it defaults to printing to itself rather than to the business-wide
    // default, which may point at a different workstation entirely.
    workstationAgentId: record.connectionMode === 'AGENT' ? (record.workstationAgentId ?? null) : null,
    receiptWidth: record.receiptWidth,
    lastSeen: new Date(record.lastSeen),
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
  };
}

/**
 * Cleanup - disconnect Prisma client
 */
export async function disconnectPrinterService(): Promise<void> {
  await prisma.$disconnect();
}
