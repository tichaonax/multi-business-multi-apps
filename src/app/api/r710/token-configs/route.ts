/**
 * R710 Token Configuration API
 *
 * Manage WiFi token packages (duration, bandwidth, pricing)
 */

import { NextRequest, NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';
import { isSystemAdmin } from '@/lib/permission-utils';
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/r710/token-configs
 *
 * List token configurations available for a business
 * Includes system-wide configs and business-specific overrides
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId parameter required' },
        { status: 400 }
      );
    }


    // System admins can access any business token configs
    if (!isSystemAdmin(user)) {
      // Non-admins must be a member of the business
      const membership = await prisma.businessMemberships.findFirst({
        where: {
          businessId,
          userId: user.id
        }
      });

      if (!membership) {
        return NextResponse.json(
          { error: 'Access denied to this business' },
          { status: 403 }
        );
      }
    }

    // Get all active token configurations for this business
    const configs = await prisma.r710TokenConfigs.findMany({
      where: {
        businessId,
        isActive: true
      },
      include: {
        r710_wlans: {
          select: {
            id: true,
            wlanId: true,
            ssid: true
          }
        }
      },
      orderBy: { displayOrder: 'asc' }
    });

    return NextResponse.json({
      configs: configs.map(config => ({
        id: config.id,
        businessId: config.businessId,
        wlanId: config.wlanId,
        name: config.name,
        description: config.description,
        durationValue: config.durationValue,
        durationUnit: config.durationUnit,
        deviceLimit: config.deviceLimit,
        basePrice: config.basePrice,
        autoGenerateThreshold: config.autoGenerateThreshold,
        autoGenerateQuantity: config.autoGenerateQuantity,
        displayOrder: config.displayOrder,
        isActive: config.isActive,
        createdAt: config.createdAt,
        wlan: config.r710_wlans
      })),
      total: configs.length
    });

  } catch (error) {
    console.error('[R710 Token Configs] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch token configurations', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/r710/token-configs
 *
 * Create new token configuration (admin or business-specific)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      businessId,
      wlanId,
      name,
      description,
      durationValue,
      durationUnit,
      deviceLimit,
      basePrice,
      autoGenerateThreshold,
      autoGenerateQuantity,
      displayOrder
    } = body;

    // Validate required fields
    if (!businessId || !wlanId || !name || !durationValue || !durationUnit || basePrice === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: businessId, wlanId, name, durationValue, durationUnit, basePrice' },
        { status: 400 }
      );
    }

    // Validate durationUnit
    const validUnits = ['hour_Hours', 'day_Days', 'week_Weeks'];
    if (!validUnits.includes(durationUnit)) {
      return NextResponse.json(
        { error: `Invalid durationUnit. Must be one of: ${validUnits.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate numeric fields
    if (durationValue <= 0) {
      return NextResponse.json(
        { error: 'durationValue must be greater than 0' },
        { status: 400 }
      );
    }

    if (basePrice < 0) {
      return NextResponse.json(
        { error: 'basePrice cannot be negative' },
        { status: 400 }
      );
    }


    // Check permission: admin OR has canConfigureWifiTokens permission
    if (!isSystemAdmin(user) && !hasPermission(user, 'canConfigureWifiTokens', businessId)) {
      return NextResponse.json(
        {
          error: 'Access denied. You need WiFi token configuration permission for this business.',
          message: 'Contact administrator to create new token packages'
        },
        { status: 403 }
      );
    }

    // Create configuration
    const config = await prisma.r710TokenConfigs.create({
      data: {
        businessId,
        wlanId,
        name,
        description: description || null,
        durationValue,
        durationUnit,
        deviceLimit: deviceLimit ?? 1,
        basePrice,
        autoGenerateThreshold: autoGenerateThreshold ?? 5,
        autoGenerateQuantity: autoGenerateQuantity ?? 20,
        displayOrder: displayOrder ?? 0,
        isActive: true
      }
    });

    console.log(`[R710 Token Configs] New configuration created: ${config.name} (${config.durationValue} ${config.durationUnit})`);

    return NextResponse.json({
      success: true,
      message: 'Token configuration created successfully',
      config: {
        id: config.id,
        businessId: config.businessId,
        wlanId: config.wlanId,
        name: config.name,
        description: config.description,
        durationValue: config.durationValue,
        durationUnit: config.durationUnit,
        deviceLimit: config.deviceLimit,
        basePrice: config.basePrice,
        autoGenerateThreshold: config.autoGenerateThreshold,
        autoGenerateQuantity: config.autoGenerateQuantity,
        displayOrder: config.displayOrder,
        isActive: config.isActive,
        createdAt: config.createdAt
      }
    }, { status: 201 });

  } catch (error) {
    console.error('[R710 Token Configs] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create token configuration', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
