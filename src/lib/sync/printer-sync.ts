/**
 * Printer Sync Service
 * Orchestrates printer discovery and synchronization across sync nodes
 * Integrates with peer discovery to broadcast printer availability
 */

import { EventEmitter } from 'events';
import { PrismaClient } from '@prisma/client';
import { PrinterDiscoveryService, PrinterPresenceMessage } from './printer-discovery';
import type { PeerDiscoveryService } from './peer-discovery';
import type { NetworkPrinter } from '@/types/printing';

export interface PrinterSyncOptions {
  nodeId: string;
  peerDiscovery: PeerDiscoveryService;
  prisma?: PrismaClient;
  enabled?: boolean;
}

/**
 * Printer Sync Service
 * Coordinates printer discovery with peer discovery system
 */
export class PrinterSyncService extends EventEmitter {
  private options: PrinterSyncOptions;
  private printerDiscovery: PrinterDiscoveryService;
  private peerDiscovery: PeerDiscoveryService;
  private isRunning = false;
  private prisma: PrismaClient;

  constructor(options: PrinterSyncOptions) {
    super();
    this.options = options;
    this.peerDiscovery = options.peerDiscovery;
    this.prisma = options.prisma || new PrismaClient();

    // Create printer discovery service
    this.printerDiscovery = new PrinterDiscoveryService({
      nodeId: options.nodeId,
      broadcastInterval: 30000, // 30 seconds
      prisma: this.prisma,
    });

    // Set up event handlers
    this.setupEventHandlers();
  }

  /**
   * Start printer synchronization
   */
  async start(): Promise<void> {
    if (this.isRunning || !this.options.enabled) {
      return;
    }

    console.log('🖨️  Starting printer sync service...');

    try {
      // Start printer discovery
      await this.printerDiscovery.start();

      this.isRunning = true;
      this.emit('started');

      console.log('✅ Printer sync service started');
    } catch (error) {
      console.error('❌ Failed to start printer sync service:', error);
      throw error;
    }
  }

  /**
   * Stop printer synchronization
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('🖨️  Stopping printer sync service...');

    try {
      // Stop printer discovery
      await this.printerDiscovery.stop();

      this.isRunning = false;
      this.emit('stopped');

      console.log('✅ Printer sync service stopped');
    } catch (error) {
      console.error('❌ Error stopping printer sync service:', error);
    }
  }

  /**
   * Get all available printers (local + remote)
   */
  async getAllPrinters(): Promise<NetworkPrinter[]> {
    return await this.printerDiscovery.getAllAvailablePrinters();
  }

  /**
   * Get printers from a specific node
   */
  getPrintersByNode(nodeId: string): NetworkPrinter[] {
    return this.printerDiscovery.getPrintersByNode(nodeId);
  }

  /**
   * Get local printers for this node
   */
  async getLocalPrinters(): Promise<NetworkPrinter[]> {
    const printers = await this.printerDiscovery.getLocalShareablePrinters();

    // Convert to NetworkPrinter format
    return printers.map(p => ({
      id: p.printerId,
      printerId: p.printerId,
      printerName: p.printerName,
      printerType: p.printerType,
      nodeId: this.options.nodeId,
      ipAddress: p.ipAddress,
      port: p.port,
      capabilities: p.capabilities,
      isShareable: true,
      isOnline: p.isOnline,
      receiptWidth: p.receiptWidth,
      lastSeen: p.lastSeen,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }

  /**
   * Force broadcast printer information
   */
  async forceBroadcast(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    const message = await this.printerDiscovery.forceBroadcast();
    if (message) {
      // Broadcast via peer discovery multicast
      this.emit('printerBroadcast', message);
    }
  }

  /**
   * Handle incoming printer presence message from peer discovery
   */
  async handlePrinterPresence(message: PrinterPresenceMessage): Promise<void> {
    await this.printerDiscovery.handlePrinterPresenceMessage(message);
  }

  /**
   * Handle node going offline
   */
  async handleNodeOffline(nodeId: string): Promise<void> {
    await this.printerDiscovery.handleNodeGoodbye(nodeId);
  }

  /**
   * Get printer sync statistics
   */
  getStatistics(): {
    isRunning: boolean;
    localPrintersCount: number;
    remotePrintersCount: number;
    totalPrintersCount: number;
    remoteNodes: string[];
  } {
    return this.printerDiscovery.getStatistics();
  }

  /**
   * Check if printer sync is enabled
   */
  isEnabled(): boolean {
    return this.options.enabled === true;
  }

  /**
   * Get printer discovery service instance
   */
  getPrinterDiscovery(): PrinterDiscoveryService {
    return this.printerDiscovery;
  }

  /**
   * Setup event handlers for integration with peer discovery
   */
  private setupEventHandlers(): void {
    // Forward printer discovery broadcasts to peer discovery system
    this.printerDiscovery.on('broadcast', (message: PrinterPresenceMessage) => {
      // Emit for peer discovery to include in multicast
      this.emit('printerBroadcast', message);
    });

    // Handle printer discovery events
    this.printerDiscovery.on('printersDiscovered', (printers, nodeId) => {
      console.log(`🖨️  Discovered ${printers.length} printer(s) from node ${nodeId}`);
      this.emit('printersDiscovered', printers, nodeId);
    });

    this.printerDiscovery.on('nodeOffline', (nodeId, printerIds) => {
      console.log(`🖨️  Node ${nodeId} offline, ${printerIds.length} printer(s) unavailable`);
      this.emit('nodeOffline', nodeId, printerIds);
    });

    // Listen for peer discovery events
    this.peerDiscovery.on('peerDiscovered', (peer) => {
      console.log(`🖨️  Peer discovered: ${peer.nodeName} (${peer.nodeId})`);
      // Trigger printer broadcast when new peer is discovered
      this.forceBroadcast();
    });

    this.peerDiscovery.on('peerLeft', (nodeId) => {
      console.log(`🖨️  Peer left: ${nodeId}`);
      // Mark printers offline when peer leaves
      this.handleNodeOffline(nodeId);
    });
  }
}

/**
 * Create printer sync service
 */
export function createPrinterSyncService(
  nodeId: string,
  peerDiscovery: PeerDiscoveryService,
  prisma?: PrismaClient,
  enabled: boolean = true
): PrinterSyncService {
  return new PrinterSyncService({
    nodeId,
    peerDiscovery,
    prisma,
    enabled,
  });
}
