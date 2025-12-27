/**
 * R710 Token Configuration Management - Individual Config
 *
 * Update and delete token configurations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isSystemAdmin, SessionUser, hasPermission } from '@/lib/permission-utils';

/**
 * GET /api/r710/token-configs/[id]
 *
 * Get single token configuration details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await prisma.r710TokenConfigs.findUnique({
      where: { id: params.id }
    });

    if (!config) {
      return NextResponse.json(
        { error: 'Token configuration not found' },
        { status: 404 }
      );
    }

    const user = session.user as SessionUser;

    // Check permission: admin OR has canConfigureWifiTokens permission
    if (!isSystemAdmin(user) && !hasPermission(user, 'canConfigureWifiTokens', config.businessId)) {
      return NextResponse.json(
        { error: 'Access denied. You need WiFi token configuration permission for this business.' },
        { status: 403 }
      );
    }

    return NextResponse.json({
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
        createdAt: config.createdAt,
        updatedAt: config.updatedAt
      }
    });

  } catch (error) {
    console.error('[R710 Token Config] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch token configuration', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/r710/token-configs/[id]
 *
 * Update token configuration
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if config exists first to get businessId for permission check
    const existingConfig = await prisma.r710TokenConfigs.findUnique({
      where: { id: params.id }
    });

    if (!existingConfig) {
      return NextResponse.json(
        { error: 'Token configuration not found' },
        { status: 404 }
      );
    }

    const user = session.user as SessionUser;

    // Check permission: admin OR has canConfigureWifiTokens permission
    if (!isSystemAdmin(user) && !hasPermission(user, 'canConfigureWifiTokens', existingConfig.businessId)) {
      return NextResponse.json(
        { error: 'Access denied. You need WiFi token configuration permission for this business.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      durationValue,
      durationUnit,
      deviceLimit,
      basePrice,
      autoGenerateThreshold,
      autoGenerateQuantity,
      displayOrder,
      isActive
    } = body;

    // Validate numeric fields if provided
    if (durationValue !== undefined && durationValue <= 0) {
      return NextResponse.json(
        { error: 'durationValue must be greater than 0' },
        { status: 400 }
      );
    }

    if (basePrice !== undefined && basePrice < 0) {
      return NextResponse.json(
        { error: 'basePrice cannot be negative' },
        { status: 400 }
      );
    }

    if (deviceLimit !== undefined && deviceLimit <= 0) {
      return NextResponse.json(
        { error: 'deviceLimit must be at least 1' },
        { status: 400 }
      );
    }

    // Validate durationUnit if provided
    if (durationUnit !== undefined) {
      const validUnits = ['hour_Hours', 'day_Days', 'week_Weeks'];
      if (!validUnits.includes(durationUnit)) {
        return NextResponse.json(
          { error: `Invalid durationUnit. Must be one of: ${validUnits.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (durationValue !== undefined) updateData.durationValue = durationValue;
    if (durationUnit !== undefined) updateData.durationUnit = durationUnit;
    if (deviceLimit !== undefined) updateData.deviceLimit = deviceLimit;
    if (basePrice !== undefined) updateData.basePrice = basePrice;
    if (autoGenerateThreshold !== undefined) updateData.autoGenerateThreshold = autoGenerateThreshold;
    if (autoGenerateQuantity !== undefined) updateData.autoGenerateQuantity = autoGenerateQuantity;
    if (displayOrder !== undefined) updateData.displayOrder = displayOrder;
    if (isActive !== undefined) updateData.isActive = isActive;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Update configuration
    const updatedConfig = await prisma.r710TokenConfigs.update({
      where: { id: params.id },
      data: updateData
    });

    console.log(`[R710 Token Config] Configuration updated: ${updatedConfig.name}`);

    return NextResponse.json({
      success: true,
      message: 'Token configuration updated successfully',
      config: {
        id: updatedConfig.id,
        businessId: updatedConfig.businessId,
        wlanId: updatedConfig.wlanId,
        name: updatedConfig.name,
        description: updatedConfig.description,
        durationValue: updatedConfig.durationValue,
        durationUnit: updatedConfig.durationUnit,
        deviceLimit: updatedConfig.deviceLimit,
        basePrice: updatedConfig.basePrice,
        autoGenerateThreshold: updatedConfig.autoGenerateThreshold,
        autoGenerateQuantity: updatedConfig.autoGenerateQuantity,
        displayOrder: updatedConfig.displayOrder,
        isActive: updatedConfig.isActive,
        updatedAt: updatedConfig.updatedAt
      }
    });

  } catch (error) {
    console.error('[R710 Token Config] PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update token configuration', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/r710/token-configs/[id]
 *
 * Delete token configuration
 * Prevents deletion if tokens exist using this config
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await prisma.r710TokenConfigs.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            r710_tokens: true
          }
        }
      }
    });

    if (!config) {
      return NextResponse.json(
        { error: 'Token configuration not found' },
        { status: 404 }
      );
    }

    const user = session.user as SessionUser;

    // Check permission: admin OR has canConfigureWifiTokens permission
    if (!isSystemAdmin(user) && !hasPermission(user, 'canConfigureWifiTokens', config.businessId)) {
      return NextResponse.json(
        { error: 'Access denied. You need WiFi token configuration permission for this business.' },
        { status: 403 }
      );
    }

    // Check if tokens exist using this config
    if (config._count.r710_tokens > 0) {
      return NextResponse.json(
        {
          error: 'Configuration still in use',
          message: `Cannot delete configuration: ${config._count.r710_tokens} token(s) exist using this configuration`,
          tokenCount: config._count.r710_tokens
        },
        { status: 409 }
      );
    }

    // Delete configuration
    await prisma.r710TokenConfigs.delete({
      where: { id: params.id }
    });

    console.log(`[R710 Token Config] Configuration deleted: ${config.name}`);

    return NextResponse.json({
      success: true,
      message: 'Token configuration deleted successfully'
    });

  } catch (error) {
    console.error('[R710 Token Config] DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete token configuration', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
