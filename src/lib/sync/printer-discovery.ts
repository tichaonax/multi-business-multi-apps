/**
 * Printer Discovery Service
 * Integrates with mDNS peer discovery to broadcast printer availability across sync nodes
 * Allows printers to be shared and discovered on the network
 */

import { EventEmitter } from 'events';
import { PrismaClient } from '@prisma/client';
import type { NetworkPrinter, PrinterCapability } from '@/types/printing';
import { getShareablePrinters, markPrinterOnline, markPrinterOffline } from '@/lib/printing/printer-service';

export interface PrinterPresenceMessage {
  type: 'printer_presence';
  nodeId: string;
  printers: PrinterBroadcastInfo[];
  timestamp: string;
}

export interface PrinterBroadcastInfo {
  printerId: string;
  printerName: string;
  printerType: 'label' | 'receipt' | 'document';
  ipAddress: string | null;
  port: number | null;
  capabilities: PrinterCapability[];
  isOnline: boolean;
  lastSeen: Date;
}

export interface PrinterDiscoveryOptions {
  nodeId: string;
  broadcastInterval: number; // milliseconds
  prisma?: PrismaClient;
}

/**
 * Printer Discovery Service
 * Broadcasts printer availability via mDNS and manages remote printer discovery
 */
export class PrinterDiscoveryService extends EventEmitter {
  private options: PrinterDiscoveryOptions;
  private prisma: PrismaClient;
  private broadcastTimer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private discoveredRemotePrinters = new Map<string, NetworkPrinter>();

  constructor(options: PrinterDiscoveryOptions) {
    super();
    this.options = options;
    this.prisma = options.prisma || new PrismaClient();
  }

  /**
   * Start printer discovery broadcasting
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    console.log('🖨️  Starting printer discovery service...');

    // Start periodic broadcasting
    this.startBroadcasting();

    this.isRunning = true;
    this.emit('started');

    console.log(`✅ Printer discovery started, broadcasting every ${this.options.broadcastInterval}ms`);
  }

  /**
   * Stop printer discovery
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    if (this.broadcastTimer) {
      clearInterval(this.broadcastTimer);
      this.broadcastTimer = null;
    }

    this.discoveredRemotePrinters.clear();
    this.isRunning = false;
    this.emit('stopped');

    console.log('✅ Printer discovery stopped');
  }

  /**
   * Get all printers (local + discovered remote)
   */
  async getAllAvailablePrinters(): Promise<NetworkPrinter[]> {
    // Get local printers from database
    const localPrinters = await getShareablePrinters();

    // Get remote printers from discovery cache
    const remotePrinters = Array.from(this.discoveredRemotePrinters.values());

    return [...localPrinters, ...remotePrinters];
  }

  /**
   * Get printers from a specific node
   */
  getPrintersByNode(nodeId: string): NetworkPrinter[] {
    return Array.from(this.discoveredRemotePrinters.values())
      .filter(printer => printer.nodeId === nodeId);
  }

  /**
   * Get local shareable printers for this node
   */
  async getLocalShareablePrinters(): Promise<PrinterBroadcastInfo[]> {
    try {
      const printers = await getShareablePrinters();

      return printers.map(printer => ({
        printerId: printer.printerId,
        printerName: printer.printerName,
        printerType: printer.printerType,
        ipAddress: printer.ipAddress,
        port: printer.port,
        capabilities: printer.capabilities,
        isOnline: printer.isOnline,
        lastSeen: printer.lastSeen,
      }));
    } catch (error) {
      console.error('Error getting local shareable printers:', error);
      return [];
    }
  }

  /**
   * Create printer presence message for broadcasting
   */
  async createPrinterPresenceMessage(): Promise<PrinterPresenceMessage> {
    const printers = await this.getLocalShareablePrinters();

    return {
      type: 'printer_presence',
      nodeId: this.options.nodeId,
      printers,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Handle incoming printer presence message from remote node
   */
  async handlePrinterPresenceMessage(message: PrinterPresenceMessage): Promise<void> {
    try {
      // Ignore our own messages
      if (message.nodeId === this.options.nodeId) {
        return;
      }

      console.log(`🖨️  Received printer presence from node ${message.nodeId}: ${message.printers.length} printer(s)`);

      // Process each printer
      for (const printerInfo of message.printers) {
        // Check if this printer already exists in our database
        const existingPrinter = await this.prisma.networkPrinters.findUnique({
          where: { printerId: printerInfo.printerId },
        });

        if (existingPrinter) {
          // Update existing printer from remote node
          await this.prisma.networkPrinters.update({
            where: { printerId: printerInfo.printerId },
            data: {
              isOnline: printerInfo.isOnline,
              lastSeen: new Date(),
            },
          });

          console.log(`   ✅ Updated remote printer: ${printerInfo.printerName} (${printerInfo.printerId})`);
        } else {
          // Register new remote printer
          const newPrinter = await this.prisma.networkPrinters.create({
            data: {
              printerId: printerInfo.printerId,
              printerName: printerInfo.printerName,
              printerType: printerInfo.printerType,
              nodeId: message.nodeId, // Track which node owns this printer
              ipAddress: printerInfo.ipAddress,
              port: printerInfo.port,
              capabilities: printerInfo.capabilities as any,
              isShareable: true, // Remote printers are shareable by definition
              isOnline: printerInfo.isOnline,
              lastSeen: new Date(),
            },
          });

          console.log(`   ➕ Registered new remote printer: ${printerInfo.printerName} (${printerInfo.printerId})`);
        }

        // Cache in memory for fast access
        const networkPrinter: NetworkPrinter = {
          id: printerInfo.printerId, // Use printerId as id for remote printers
          printerId: printerInfo.printerId,
          printerName: printerInfo.printerName,
          printerType: printerInfo.printerType,
          nodeId: message.nodeId,
          ipAddress: printerInfo.ipAddress,
          port: printerInfo.port,
          capabilities: printerInfo.capabilities,
          isShareable: true,
          isOnline: printerInfo.isOnline,
          lastSeen: new Date(printerInfo.lastSeen),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        this.discoveredRemotePrinters.set(printerInfo.printerId, networkPrinter);
      }

      this.emit('printersDiscovered', message.printers, message.nodeId);
    } catch (error) {
      console.error('Error handling printer presence message:', error);
    }
  }

  /**
   * Handle node goodbye - mark all printers from that node as offline
   */
  async handleNodeGoodbye(nodeId: string): Promise<void> {
    try {
      console.log(`🖨️  Node ${nodeId} went offline, marking its printers as offline...`);

      // Mark all printers from this node as offline in database
      await this.prisma.networkPrinters.updateMany({
        where: { nodeId },
        data: {
          isOnline: false,
          lastSeen: new Date(),
        },
      });

      // Remove from memory cache
      const printersToRemove = Array.from(this.discoveredRemotePrinters.values())
        .filter(printer => printer.nodeId === nodeId)
        .map(printer => printer.printerId);

      for (const printerId of printersToRemove) {
        this.discoveredRemotePrinters.delete(printerId);
      }

      console.log(`   ✅ Marked ${printersToRemove.length} printer(s) offline`);
      this.emit('nodeOffline', nodeId, printersToRemove);
    } catch (error) {
      console.error('Error handling node goodbye:', error);
    }
  }

  /**
   * Cleanup stale remote printers (haven't been seen in timeout period)
   */
  async cleanupStalePrinters(timeoutMinutes: number = 5): Promise<void> {
    try {
      const cutoffTime = new Date();
      cutoffTime.setMinutes(cutoffTime.getMinutes() - timeoutMinutes);

      // Mark stale remote printers offline in database
      const result = await this.prisma.networkPrinters.updateMany({
        where: {
          nodeId: { not: this.options.nodeId }, // Only remote printers
          lastSeen: { lt: cutoffTime },
          isOnline: true,
        },
        data: {
          isOnline: false,
        },
      });

      // Remove from memory cache
      for (const [printerId, printer] of this.discoveredRemotePrinters.entries()) {
        if (printer.lastSeen < cutoffTime) {
          this.discoveredRemotePrinters.delete(printerId);
        }
      }

      if (result.count > 0) {
        console.log(`🧹 Cleaned up ${result.count} stale remote printer(s)`);
      }
    } catch (error) {
      console.error('Error cleaning up stale printers:', error);
    }
  }

  /**
   * Force broadcast printer presence
   */
  async forceBroadcast(): Promise<PrinterPresenceMessage | null> {
    if (!this.isRunning) {
      return null;
    }
    return await this.broadcastPrinters();
  }

  /**
   * Start periodic printer broadcasting
   */
  private startBroadcasting(): void {
    // Send immediate broadcast
    this.broadcastPrinters();

    // Set up periodic broadcasts
    this.broadcastTimer = setInterval(() => {
      this.broadcastPrinters();
      this.cleanupStalePrinters(); // Also cleanup stale printers
    }, this.options.broadcastInterval);
  }

  /**
   * Broadcast available printers
   */
  private async broadcastPrinters(): Promise<PrinterPresenceMessage | null> {
    try {
      const message = await this.createPrinterPresenceMessage();

      if (message.printers.length > 0) {
        console.log(`📡 Broadcasting ${message.printers.length} printer(s) from node ${this.options.nodeId}`);
        this.emit('broadcast', message);
      }

      return message;
    } catch (error) {
      console.error('Error broadcasting printers:', error);
      return null;
    }
  }

  /**
   * Get statistics about printer discovery
   */
  getStatistics(): {
    isRunning: boolean;
    localPrintersCount: number;
    remotePrintersCount: number;
    totalPrintersCount: number;
    remoteNodes: string[];
  } {
    const remotePrinters = Array.from(this.discoveredRemotePrinters.values());
    const remoteNodes = [...new Set(remotePrinters.map(p => p.nodeId))];

    return {
      isRunning: this.isRunning,
      localPrintersCount: 0, // Will be fetched from database when needed
      remotePrintersCount: remotePrinters.length,
      totalPrintersCount: remotePrinters.length,
      remoteNodes,
    };
  }
}

/**
 * Create and configure printer discovery service
 */
export function createPrinterDiscoveryService(
  nodeId: string,
  prisma?: PrismaClient
): PrinterDiscoveryService {
  return new PrinterDiscoveryService({
    nodeId,
    broadcastInterval: 30000, // 30 seconds
    prisma,
  });
}
