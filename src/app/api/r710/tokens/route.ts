/**
 * R710 Token Generation & Inventory API
 *
 * Generate and manage WiFi access tokens for R710 WLANs
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { getR710SessionManager } from '@/lib/r710-session-manager';
import { isSystemAdmin, SessionUser, hasPermission } from '@/lib/permission-utils';

/**
 * GET /api/r710/tokens
 *
 * List tokens with filtering options and statistics
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const tokenConfigId = searchParams.get('tokenConfigId');
    const wlanId = searchParams.get('wlanId');
    const status = searchParams.get('status');

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId parameter required' },
        { status: 400 }
      );
    }

    const user = session.user as SessionUser;

    // Check permission: admin OR has canSellWifiTokens permission
    if (!isSystemAdmin(user) && !hasPermission(user, 'canSellWifiTokens', businessId)) {
      return NextResponse.json(
        { error: 'Access denied. You need WiFi token sales permission for this business.' },
        { status: 403 }
      );
    }

    // Build where clause
    const where: any = { businessId };

    if (tokenConfigId && tokenConfigId !== 'all') {
      where.tokenConfigId = tokenConfigId;
    }

    if (wlanId && wlanId !== 'all') {
      where.wlanId = wlanId;
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    // Get tokens
    const tokens = await prisma.r710Tokens.findMany({
      where,
      include: {
        r710_token_configs: {
          select: {
            id: true,
            name: true,
            durationValue: true,
            durationUnit: true,
            deviceLimit: true,
            basePrice: true
          }
        },
        r710_wlans: {
          select: {
            id: true,
            ssid: true,
            device_registry: {
              select: {
                ipAddress: true
              }
            }
          }
        }
      },
      orderBy: [
        { status: 'asc' },
        { createdAt: 'desc' }
      ],
      take: 500 // Limit to 500 tokens
    });

    // Calculate statistics
    const statsData = await prisma.r710Tokens.groupBy({
      by: ['status'],
      where: {
        businessId: businessId
      },
      _count: {
        id: true
      }
    });

    const stats = {
      total: 0,
      available: 0,
      sold: 0,
      active: 0,
      expired: 0,
      invalidated: 0
    };

    statsData.forEach((stat) => {
      const count = stat._count.id;
      stats.total += count;

      switch (stat.status) {
        case 'AVAILABLE':
          stats.available = count;
          break;
        case 'SOLD':
          stats.sold = count;
          break;
        case 'ACTIVE':
          stats.active = count;
          break;
        case 'EXPIRED':
          stats.expired = count;
          break;
        case 'INVALIDATED':
          stats.invalidated = count;
          break;
      }
    });

    // Format response
    const formattedTokens = tokens.map(token => ({
      id: token.id,
      username: token.username,
      password: token.password,
      status: token.status,
      createdAt: token.createdAt,
      expiresAt: token.expiresAtR710,
      activatedAt: token.firstUsedAt,
      tokenConfig: token.r710_token_configs,
      wlan: token.r710_wlans
    }));

    return NextResponse.json({
      tokens: formattedTokens,
      stats: stats,
      count: tokens.length
    });

  } catch (error) {
    console.error('[R710 Tokens] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tokens', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/r710/tokens
 *
 * Generate new tokens from a token configuration
 *
 * CRITICAL: Only generates tokens if device is accessible
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      businessId,
      tokenConfigId,
      quantity = 20
    } = body;

    // Validate required fields
    if (!businessId || !tokenConfigId) {
      return NextResponse.json(
        { error: 'Missing required fields: businessId, tokenConfigId' },
        { status: 400 }
      );
    }

    // Validate quantity
    if (quantity < 1 || quantity > 50) {
      return NextResponse.json(
        { error: 'Quantity must be between 1 and 50' },
        { status: 400 }
      );
    }

    const user = session.user as SessionUser;

    // Check permission: admin OR has canSellWifiTokens permission
    if (!isSystemAdmin(user) && !hasPermission(user, 'canSellWifiTokens', businessId)) {
      return NextResponse.json(
        { error: 'Access denied. You need WiFi token sales permission for this business.' },
        { status: 403 }
      );
    }

    // Get token configuration
    const config = await prisma.r710TokenConfigs.findUnique({
      where: { id: tokenConfigId }
    });

    if (!config) {
      return NextResponse.json(
        { error: 'Token configuration not found' },
        { status: 404 }
      );
    }

    if (!config.isActive) {
      return NextResponse.json(
        { error: 'Token configuration is not active' },
        { status: 400 }
      );
    }

    // Get business integration to find the device and WLAN
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

    // Get WLAN for this business
    const wlan = await prisma.r710Wlans.findFirst({
      where: {
        businessId,
        deviceRegistryId: integration.deviceRegistryId
      }
    });

    if (!wlan) {
      return NextResponse.json(
        { error: 'WLAN not found for this business' },
        { status: 404 }
      );
    }

    // Get device
    const device = integration.device_registry;

    console.log(`[R710 Tokens] Generating ${quantity} tokens for ${businessId}...`);

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
      console.error('[R710 Tokens] Failed to connect to device:', error);

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

    // Generate tokens on R710 device
    // Convert durationUnit from "hour_Hours" format to "hour" format
    const durationUnitMap: { [key: string]: 'hour' | 'day' | 'week' } = {
      'hour_Hours': 'hour',
      'day_Days': 'day',
      'week_Weeks': 'week'
    };

    const apiDurationUnit = durationUnitMap[config.durationUnit] || 'hour';

    const tokenParams = {
      wlanName: wlan.ssid,
      count: quantity,
      duration: config.durationValue,
      durationUnit: apiDurationUnit,
      deviceLimit: config.deviceLimit || 2
    };

    let generationResult;
    try {
      generationResult = await r710Service.generateTokens(tokenParams);
    } catch (error) {
      console.error('[R710 Tokens] Generation failed:', error);

      // Update device status with error
      await prisma.r710DeviceRegistry.update({
        where: { id: device.id },
        data: {
          lastHealthCheck: new Date(),
          lastError: error instanceof Error ? error.message : 'Failed to generate tokens'
        }
      });

      return NextResponse.json(
        {
          error: 'Failed to generate tokens on R710 device',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

    // Check if generation was successful
    if (!generationResult.success || generationResult.error) {
      await prisma.r710DeviceRegistry.update({
        where: { id: device.id },
        data: {
          lastHealthCheck: new Date(),
          lastError: generationResult.error || 'Token generation failed'
        }
      });

      return NextResponse.json(
        {
          error: 'Failed to generate tokens on R710 device',
          details: generationResult.error || 'Unknown error'
        },
        { status: 500 }
      );
    }

    const generatedTokens = generationResult.tokens || [];

    if (generatedTokens.length === 0) {
      return NextResponse.json(
        { error: 'No tokens were generated by R710 device' },
        { status: 500 }
      );
    }

    // Store tokens in database
    const now = new Date();

    // Calculate duration in seconds
    const durationMultiplier: { [key: string]: number } = {
      'hour': 3600,
      'day': 86400,
      'week': 604800
    };
    const validTimeSeconds = config.durationValue * (durationMultiplier[apiDurationUnit] || 3600);
    const expiresAt = new Date(now.getTime() + validTimeSeconds * 1000);

    const tokensToCreate = generatedTokens.map(token => ({
      businessId,
      wlanId: wlan.id,
      tokenConfigId: config.id,
      username: token.username,
      password: token.password,
      status: 'AVAILABLE' as const,
      validTimeSeconds,
      expiresAtR710: expiresAt,
      createdAtR710: now,
      lastSyncedAt: now
    }));

    const createdTokens = await prisma.r710Tokens.createMany({
      data: tokensToCreate
    });

    console.log(`[R710 Tokens] Successfully created ${createdTokens.count} tokens`);
    console.log('[R710 Tokens] Stored usernames in DB:');
    tokensToCreate.slice(0, 5).forEach((token, index) => {
      console.log(`  ${index + 1}. Username: "${token.username}" (length: ${token.username.length}) → Password: "${token.password.substring(0, 5)}***"`);
    });

    return NextResponse.json({
      success: true,
      message: `Generated ${createdTokens.count} tokens successfully`,
      tokensGenerated: createdTokens.count,
      config: {
        name: config.name,
        durationValue: config.durationValue,
        durationUnit: config.durationUnit
      }
    }, { status: 201 });

  } catch (error) {
    console.error('[R710 Tokens] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to generate tokens', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
