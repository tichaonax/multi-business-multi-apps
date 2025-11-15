/**
 * Printer Sync Integration Module
 * Provides integration points for printer synchronization with the main sync service
 *
 * INTEGRATION INSTRUCTIONS:
 * ========================
 *
 * To integrate printer sync with the main sync service, follow these steps:
 *
 * 1. Add import to sync-service.ts:
 *    import { PrinterSyncService, createPrinterSyncService } from './printer-sync'
 *
 * 2. Add property to SyncService class (around line 85):
 *    private printerSync: PrinterSyncService | null = null
 *
 * 3. Add to SyncServiceConfig interface (around line 35):
 *    enablePrinterSync?: boolean // Default: true
 *
 * 4. Add initialization method after initializeCompatibilityGuard() (around line 300):
 *
 *    private async initializePrinterSync(): Promise<void> {
 *      try {
 *        if (this.config.enablePrinterSync === false) {
 *          this.log('info', 'Printer sync disabled by configuration')
 *          return
 *        }
 *
 *        if (!this.peerDiscovery) {
 *          this.log('warn', 'Cannot initialize printer sync without peer discovery')
 *          return
 *        }
 *
 *        this.log('info', 'Initializing printer sync service...')
 *
 *        this.printerSync = createPrinterSyncService(
 *          this.nodeId,
 *          this.peerDiscovery,
 *          this.prisma,
 *          true
 *        )
 *
 *        // Start printer sync
 *        await this.printerSync.start()
 *
 *        this.log('info', '✅ Printer sync service initialized')
 *      } catch (error) {
 *        this.log('error', 'Failed to initialize printer sync:', error)
 *      }
 *    }
 *
 * 5. Call initialization in start() method (after line 186):
 *    // Initialize printer sync
 *    await this.initializePrinterSync()
 *
 * 6. Add to stop() method cleanup (around line 270):
 *    if (this.printerSync) {
 *      await this.printerSync.stop()
 *    }
 *
 * 7. Add getter method to access printer sync (around line 800):
 *    public getPrinterSync(): PrinterSyncService | null {
 *      return this.printerSync
 *    }
 */

import { PrinterSyncService, createPrinterSyncService } from './printer-sync';
import type { PeerDiscoveryService } from './peer-discovery';
import type { PrismaClient } from '@prisma/client';

/**
 * Initialize printer sync service
 * This is a standalone function that can be called from sync-service.ts
 */
export async function initializePrinterSyncService(
  nodeId: string,
  peerDiscovery: PeerDiscoveryService,
  prisma: PrismaClient,
  enabled: boolean = true,
  logger?: (level: string, message: string, ...args: any[]) => void
): Promise<PrinterSyncService | null> {
  try {
    if (!enabled) {
      logger?.('info', 'Printer sync disabled by configuration');
      return null;
    }

    if (!peerDiscovery) {
      logger?.('warn', 'Cannot initialize printer sync without peer discovery');
      return null;
    }

    logger?.('info', 'Initializing printer sync service...');

    const printerSync = createPrinterSyncService(
      nodeId,
      peerDiscovery,
      prisma,
      enabled
    );

    // Start printer sync
    await printerSync.start();

    logger?.('info', '✅ Printer sync service initialized');

    return printerSync;
  } catch (error) {
    logger?.('error', 'Failed to initialize printer sync:', error);
    return null;
  }
}

/**
 * Stop printer sync service
 */
export async function stopPrinterSyncService(
  printerSync: PrinterSyncService | null,
  logger?: (level: string, message: string, ...args: any[]) => void
): Promise<void> {
  if (printerSync) {
    try {
      await printerSync.stop();
      logger?.('info', 'Printer sync service stopped');
    } catch (error) {
      logger?.('error', 'Error stopping printer sync:', error);
    }
  }
}

/**
 * Get printer sync statistics
 */
export function getPrinterSyncStatistics(printerSync: PrinterSyncService | null): {
  enabled: boolean;
  isRunning: boolean;
  localPrintersCount: number;
  remotePrintersCount: number;
  totalPrintersCount: number;
  remoteNodes: string[];
} {
  if (!printerSync) {
    return {
      enabled: false,
      isRunning: false,
      localPrintersCount: 0,
      remotePrintersCount: 0,
      totalPrintersCount: 0,
      remoteNodes: [],
    };
  }

  const stats = printerSync.getStatistics();

  return {
    enabled: printerSync.isEnabled(),
    ...stats,
  };
}

/**
 * Export all printer sync related functions and types
 */
export { PrinterSyncService, createPrinterSyncService } from './printer-sync';
export { PrinterDiscoveryService } from './printer-discovery';
export type { PrinterPresenceMessage } from './printer-discovery';
