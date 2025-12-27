/**
 * R710 Token Sync Service
 *
 * Background service that periodically syncs token status with R710 devices
 *
 * CRITICAL: Only syncs with accessible devices
 */

import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { getR710SessionManager } from '@/lib/r710-session-manager';

interface TokenSyncResult {
  success: boolean;
  businessesProcessed: number;
  tokensProcessed: number;
  tokensUpdated: number;
  errors: string[];
  timestamp: Date;
  syncDetails: {
    businessId: string;
    businessName: string;
    deviceIp: string;
    tokensChecked: number;
    tokensUpdated: number;
    status: 'SUCCESS' | 'DEVICE_UNREACHABLE' | 'ERROR';
    errorMessage?: string;
  }[];
}

interface TokenStatusUpdate {
  tokenId: string;
  oldStatus: string;
  newStatus: string;
  connectedMac?: string | null;
  firstUsedAt?: Date | null;
}

/**
 * Run periodic token sync for all businesses
 *
 * This should be called every 5 minutes by a background job
 */
export async function runTokenSync(): Promise<TokenSyncResult> {
  const startTime = Date.now();
  const result: TokenSyncResult = {
    success: true,
    businessesProcessed: 0,
    tokensProcessed: 0,
    tokensUpdated: 0,
    errors: [],
    timestamp: new Date(),
    syncDetails: []
  };

  console.log('[R710 Token Sync] Starting periodic token sync...');

  try {
    // Get all active R710 integrations
    const integrations = await prisma.r710BusinessIntegrations.findMany({
      where: { isActive: true },
      include: {
        device_registry: true,
        businesses: {
          select: {
            id: true,
            businessName: true
          }
        }
      }
    });

    console.log(`[R710 Token Sync] Found ${integrations.length} active integration(s)`);

    // Process each business
    for (const integration of integrations) {
      try {
        const syncDetail = await syncBusinessTokens(integration);
        result.syncDetails.push(syncDetail);

        if (syncDetail.status === 'SUCCESS') {
          result.businessesProcessed++;
          result.tokensProcessed += syncDetail.tokensChecked;
          result.tokensUpdated += syncDetail.tokensUpdated;
        } else if (syncDetail.status === 'ERROR') {
          result.errors.push(`${integration.businesses.businessName}: ${syncDetail.errorMessage}`);
        }
      } catch (error) {
        const errorMsg = `Business ${integration.businesses.businessName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(`[R710 Token Sync] ${errorMsg}`);
        result.errors.push(errorMsg);

        // Log error to database
        await prisma.r710SyncLogs.create({
          data: {
            businessId: integration.businessId,
            deviceRegistryId: integration.deviceRegistryId,
            syncType: 'TOKEN_SYNC',
            status: 'ERROR',
            tokensChecked: 0,
            tokensUpdated: 0,
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          }
        }).catch(logError => {
          console.error('[R710 Token Sync] Failed to log error:', logError);
        });

        result.syncDetails.push({
          businessId: integration.businessId,
          businessName: integration.businesses.businessName,
          deviceIp: integration.device_registry.ipAddress,
          tokensChecked: 0,
          tokensUpdated: 0,
          status: 'ERROR',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const duration = Date.now() - startTime;
    console.log(
      `[R710 Token Sync] Sync complete in ${duration}ms: ` +
      `processed=${result.businessesProcessed}, ` +
      `tokensChecked=${result.tokensProcessed}, ` +
      `tokensUpdated=${result.tokensUpdated}, ` +
      `errors=${result.errors.length}`
    );

    result.success = result.errors.length === 0;

  } catch (error) {
    console.error('[R710 Token Sync] Fatal error:', error);
    result.success = false;
    result.errors.push(`Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}

/**
 * Sync tokens for a single business
 */
async function syncBusinessTokens(integration: any): Promise<TokenSyncResult['syncDetails'][0]> {
  const businessId = integration.businessId;
  const businessName = integration.businesses.businessName;
  const device = integration.device_registry;
  const syncStartTime = Date.now();

  // CRITICAL: Check if device is accessible
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const isAccessible =
    device.connectionStatus === 'CONNECTED' &&
    device.lastHealthCheck &&
    device.lastHealthCheck >= fiveMinutesAgo;

  if (!isAccessible) {
    console.log(
      `[R710 Token Sync] Skipping ${businessName} - Device ${device.ipAddress} not accessible ` +
      `(status: ${device.connectionStatus}, last check: ${device.lastHealthCheck})`
    );

    // Log sync attempt as DEVICE_UNREACHABLE
    await prisma.r710SyncLogs.create({
      data: {
        businessId,
        deviceRegistryId: integration.deviceRegistryId,
        syncType: 'TOKEN_SYNC',
        status: 'DEVICE_UNREACHABLE',
        tokensChecked: 0,
        tokensUpdated: 0,
        syncDurationMs: Date.now() - syncStartTime
      }
    });

    return {
      businessId,
      businessName,
      deviceIp: device.ipAddress,
      tokensChecked: 0,
      tokensUpdated: 0,
      status: 'DEVICE_UNREACHABLE'
    };
  }

  // Get session for R710 device
  const sessionManager = getR710SessionManager();
  const adminPassword = decrypt(device.encryptedAdminPassword);

  const r710Service = await sessionManager.getSession({
    ipAddress: device.ipAddress,
    adminUsername: device.adminUsername,
    adminPassword
  });

  // Query all tokens from R710 device
  const r710Tokens = await r710Service.queryAllTokens();
  const r710TokenMap = new Map(r710Tokens.map(token => [token.username, token]));

  // Get all tokens for this business from database
  const dbTokens = await prisma.r710Tokens.findMany({
    where: {
      businessId,
      deviceRegistryId: integration.deviceRegistryId,
      status: {
        in: ['AVAILABLE', 'SOLD', 'ACTIVE']
      }
    }
  });

  const updates: TokenStatusUpdate[] = [];
  const now = new Date();

  // Process each database token
  for (const dbToken of dbTokens) {
    const r710Token = r710TokenMap.get(dbToken.username);

    if (!r710Token) {
      // Token not found on R710 - mark as INVALIDATED
      if (dbToken.status !== 'INVALIDATED') {
        updates.push({
          tokenId: dbToken.id,
          oldStatus: dbToken.status,
          newStatus: 'INVALIDATED'
        });
      }
      continue;
    }

    // Determine new status based on R710 data
    const isExpired = r710Token.timeLeft <= 0;
    const isActive = r710Token.status === 1 && r710Token.deviceMac;

    let newStatus = dbToken.status;
    let connectedMac = dbToken.connectedMac;
    let firstUsedAt = dbToken.firstUsedAt;

    if (isExpired) {
      newStatus = 'EXPIRED';
      connectedMac = null;
    } else if (isActive) {
      newStatus = 'ACTIVE';
      connectedMac = r710Token.deviceMac || null;
      firstUsedAt = firstUsedAt || now;
    } else if (dbToken.status === 'ACTIVE' && !isActive) {
      // Was active but no longer connected
      newStatus = 'SOLD';
      connectedMac = null;
    }

    // Record update if status changed
    if (newStatus !== dbToken.status || connectedMac !== dbToken.connectedMac) {
      updates.push({
        tokenId: dbToken.id,
        oldStatus: dbToken.status,
        newStatus,
        connectedMac,
        firstUsedAt
      });
    }
  }

  // Apply updates in batch
  if (updates.length > 0) {
    await applyTokenUpdates(updates, now);

    console.log(
      `[R710 Token Sync] ${businessName} - Updated ${updates.length} token(s): ` +
      updates.map(u => `${u.oldStatus}→${u.newStatus}`).join(', ')
    );
  }

  // Log successful sync
  const syncDuration = Date.now() - syncStartTime;
  await prisma.r710SyncLogs.create({
    data: {
      businessId,
      deviceRegistryId: integration.deviceRegistryId,
      syncType: 'TOKEN_SYNC',
      status: 'SUCCESS',
      tokensChecked: dbTokens.length,
      tokensUpdated: updates.length,
      syncDurationMs: syncDuration
    }
  });

  return {
    businessId,
    businessName,
    deviceIp: device.ipAddress,
    tokensChecked: dbTokens.length,
    tokensUpdated: updates.length,
    status: 'SUCCESS'
  };
}

/**
 * Apply token status updates in batches
 */
async function applyTokenUpdates(
  updates: TokenStatusUpdate[],
  syncTime: Date
): Promise<void> {
  const BATCH_SIZE = 100;

  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);

    await prisma.$transaction(
      batch.map(update =>
        prisma.r710Tokens.update({
          where: { id: update.tokenId },
          data: {
            status: update.newStatus,
            connectedMac: update.connectedMac,
            firstUsedAt: update.firstUsedAt,
            lastSyncedAt: syncTime
          }
        })
      )
    );
  }
}

/**
 * Get sync statistics for monitoring
 */
export async function getTokenSyncStats() {
  // Get last sync results from logs or a dedicated sync_logs table
  // For now, return current token status distribution

  const integrations = await prisma.r710BusinessIntegrations.findMany({
    where: { isActive: true },
    select: {
      businessId: true,
      businesses: {
        select: {
          businessName: true
        }
      },
      device_registry: {
        select: {
          ipAddress: true,
          connectionStatus: true,
          lastHealthCheck: true
        }
      }
    }
  });

  const stats = [];

  for (const integration of integrations) {
    const tokenCounts = await prisma.r710Tokens.groupBy({
      by: ['status'],
      where: {
        businessId: integration.businessId
      },
      _count: {
        id: true
      }
    });

    const statusMap = new Map(tokenCounts.map(item => [item.status, item._count.id]));

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const isAccessible =
      integration.device_registry.connectionStatus === 'CONNECTED' &&
      integration.device_registry.lastHealthCheck &&
      integration.device_registry.lastHealthCheck >= fiveMinutesAgo;

    stats.push({
      businessId: integration.businessId,
      businessName: integration.businesses.businessName,
      deviceIp: integration.device_registry.ipAddress,
      deviceAccessible: isAccessible,
      tokenCounts: {
        available: statusMap.get('AVAILABLE') || 0,
        sold: statusMap.get('SOLD') || 0,
        active: statusMap.get('ACTIVE') || 0,
        expired: statusMap.get('EXPIRED') || 0,
        invalidated: statusMap.get('INVALIDATED') || 0
      }
    });
  }

  return {
    totalBusinesses: integrations.length,
    businesses: stats
  };
}
