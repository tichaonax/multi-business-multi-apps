/**
 * R710 Token Sync API
 *
 * Manually trigger synchronization between database and R710 device
 * Updates token statuses based on current state on device
 *
 * CRITICAL: Only syncs with accessible devices
 */

import { NextRequest, NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { getR710SessionManager } from '@/lib/r710-session-manager';
import { isSystemAdmin, hasPermission } from '@/lib/permission-utils';
import { getServerUser } from '@/lib/get-server-user'

/**
 * POST /api/r710/tokens/sync
 *
 * Sync tokens with R710 device
 *
 * Request Body:
 * - businessId: (required) Business to sync tokens for
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { businessId } = body;

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId parameter required' },
        { status: 400 }
      );
    }


    // Check permission: admin OR has canSellWifiTokens permission
    if (!isSystemAdmin(user) && !hasPermission(user, 'canSellWifiTokens', businessId)) {
      return NextResponse.json(
        { error: 'Access denied. You need WiFi token sales permission for this business.' },
        { status: 403 }
      );
    }

    // Get business integration
    const integration = await prisma.r710BusinessIntegrations.findFirst({
      where: { businessId },
      include: {
        device_registry: true
      }
    });

    if (!integration) {
      return NextResponse.json(
        { error: 'R710 integration not found for this business' },
        { status: 404 }
      );
    }

    // Get device
    const device = integration.device_registry;

    console.log(`[R710 Token Sync] Syncing tokens for business ${businessId} with device ${device.ipAddress}...`);

    // Get session for R710 device
    const sessionManager = getR710SessionManager();
    const adminPassword = decrypt(device.encryptedAdminPassword);

    let r710Service;
    try {
      r710Service = await sessionManager.getSession({
        ipAddress: device.ipAddress,
        adminUsername: device.adminUsername,
        adminPassword
      });
    } catch (error) {
      console.error('[R710 Token Sync] Failed to connect to device:', error);

      // Update device status to DISCONNECTED
      await prisma.r710DeviceRegistry.update({
        where: { id: device.id },
        data: {
          connectionStatus: 'DISCONNECTED',
          lastHealthCheck: new Date(),
          lastError: error instanceof Error ? error.message : 'Connection failed'
        }
      });

      return NextResponse.json(
        {
          error: 'R710 device unreachable',
          message: `Failed to connect to device at ${device.ipAddress}`,
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 503 }
      );
    }

    // Query all tokens from R710 device
    let r710Tokens;
    try {
      r710Tokens = await r710Service.queryAllTokens();

      // Update device health check timestamp after successful connection
      await prisma.r710DeviceRegistry.update({
        where: { id: device.id },
        data: {
          connectionStatus: 'CONNECTED',
          lastHealthCheck: new Date(),
          lastConnectedAt: new Date(),
          lastError: null
        }
      });
    } catch (error) {
      console.error('[R710 Token Sync] Failed to query tokens from device:', error);

      // Update device status
      await prisma.r710DeviceRegistry.update({
        where: { id: device.id },
        data: {
          lastHealthCheck: new Date(),
          lastError: error instanceof Error ? error.message : 'Failed to query tokens'
        }
      });

      return NextResponse.json(
        {
          error: 'Failed to query tokens from R710 device',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

    console.log(`[R710 Token Sync] Retrieved ${r710Tokens.length} tokens from R710 device`);

    // DEBUG: Log first few R710 tokens to see their structure
    if (r710Tokens.length > 0) {
      console.log('[R710 Token Sync] Sample R710 tokens:', r710Tokens.slice(0, 3).map(t => ({
        username: t.username,
        password: t.password?.substring(0, 5) + '***',
        wlan: t.wlan,
        status: t.status
      })));
    }

    // Get all tokens for this business from database
    const dbTokens = await prisma.r710Tokens.findMany({
      where: { businessId }
    });

    console.log(`[R710 Token Sync] Found ${dbTokens.length} tokens in database`);

    // DEBUG: Log first few DB tokens
    if (dbTokens.length > 0) {
      console.log('[R710 Token Sync] Sample DB tokens:', dbTokens.slice(0, 3).map(t => ({
        username: t.username,
        password: t.password?.substring(0, 5) + '***',
        status: t.status
      })));
    }

    // Create lookup map for R710 tokens
    const r710TokenMap = new Map(
      r710Tokens.map(token => [token.username, token])
    );

    console.log('[R710 Token Sync] R710 token usernames:', Array.from(r710TokenMap.keys()).slice(0, 5));

    // Sync statistics
    const stats = {
      checked: 0,
      updated: 0,
      markedExpired: 0,
      markedActive: 0,
      markedInvalidated: 0,
      restored: 0,
      errors: 0
    };

    const now = new Date();

    // Process each database token
    for (const dbToken of dbTokens) {
      stats.checked++;

      const r710Token = r710TokenMap.get(dbToken.username);

      if (!r710Token) {
        // Token not found on R710 device - mark as INVALIDATED
        console.log(`[R710 Token Sync] DB token NOT found in R710 map:`);
        console.log(`  DB Username: "${dbToken.username}" (length: ${dbToken.username.length})`);
        console.log(`  DB Password: "${dbToken.password?.substring(0, 5)}***"`);
        console.log(`[R710 Token Sync] Available R710 usernames (${r710TokenMap.size} total):`);
        Array.from(r710TokenMap.entries()).slice(0, 10).forEach(([username, token]) => {
          console.log(`  - "${username}" (length: ${username.length}) → password: "${token.password?.substring(0, 5)}***"`);
        });

        if (dbToken.status !== 'INVALIDATED') {
          await prisma.r710Tokens.update({
            where: { id: dbToken.id },
            data: {
              status: 'INVALIDATED',
              lastSyncedAt: now
            }
          });
          stats.updated++;
          stats.markedInvalidated++;
          console.log(`[R710 Token Sync] Marked token ${dbToken.username} as INVALIDATED (not found on device)`);
        }
        continue;
      }

      // Token found on R710 - update status based on R710 data
      const updateData: any = {
        lastSyncedAt: now
      };

      // Check if token is expired
      const isExpired = r710Token.expired || (r710Token.expireTime && r710Token.expireTime < new Date());

      // Check if token is active (connected/used)
      const isActive = r710Token.active || r710Token.used;

      if (isExpired && dbToken.status !== 'EXPIRED') {
        updateData.status = 'EXPIRED';
        stats.markedExpired++;
      } else if (isActive && dbToken.status !== 'ACTIVE' && dbToken.status !== 'EXPIRED') {
        updateData.status = 'ACTIVE';
        updateData.connectedMac = r710Token.connectedMac;
        if (!dbToken.firstUsedAt && r710Token.startTime) {
          updateData.firstUsedAt = r710Token.startTime;
        }
        stats.markedActive++;
      } else if (!isExpired && !isActive && dbToken.status === 'INVALIDATED') {
        // Token was incorrectly marked as INVALIDATED - restore to AVAILABLE
        updateData.status = 'AVAILABLE';
        stats.restored++;
        console.log(`[R710 Token Sync] Restored token ${dbToken.username} from INVALIDATED to AVAILABLE`);
      }

      // Update connected MAC if available
      if (r710Token.deviceMac && r710Token.deviceMac !== dbToken.connectedMac) {
        updateData.connectedMac = r710Token.deviceMac;
      }

      // Apply updates if any changes detected
      if (Object.keys(updateData).length > 1) { // More than just lastSyncedAt
        try {
          await prisma.r710Tokens.update({
            where: { id: dbToken.id },
            data: updateData
          });
          stats.updated++;
        } catch (error) {
          console.error(`[R710 Token Sync] Failed to update token ${dbToken.username}:`, error);
          stats.errors++;
        }
      } else {
        // Just update lastSyncedAt
        await prisma.r710Tokens.update({
          where: { id: dbToken.id },
          data: { lastSyncedAt: now }
        });
      }
    }

    console.log(
      `[R710 Token Sync] Sync complete: checked=${stats.checked}, updated=${stats.updated}, ` +
      `expired=${stats.markedExpired}, active=${stats.markedActive}, invalidated=${stats.markedInvalidated}, ` +
      `restored=${stats.restored}, errors=${stats.errors}`
    );

    return NextResponse.json({
      success: true,
      message: 'Token sync completed successfully',
      stats: {
        tokensChecked: stats.checked,
        tokensUpdated: stats.updated,
        markedExpired: stats.markedExpired,
        markedActive: stats.markedActive,
        markedInvalidated: stats.markedInvalidated,
        tokensRestored: stats.restored,
        errors: stats.errors
      },
      syncedAt: now
    });

  } catch (error) {
    console.error('[R710 Token Sync] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to sync tokens', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
