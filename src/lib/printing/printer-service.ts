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

  if (search) {
    where.OR = [
      { printerName: { contains: search, mode: 'insensitive' } },
      { ipAddress: { contains: search } },
    ];
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
    isOnline: record.isOnline,
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
