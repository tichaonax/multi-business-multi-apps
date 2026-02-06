/**
 * R710 Token Config Clone API
 *
 * Clone token configurations from one business to another.
 * Copies package definitions only — does not copy actual tokens.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isSystemAdmin, SessionUser } from '@/lib/permission-utils';

/**
 * POST /api/r710/token-configs/clone
 *
 * Clone selected token configs to a target business.
 * Body: { sourceBusinessId, targetBusinessId, targetWlanId, configIds[] }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as SessionUser;

    if (!isSystemAdmin(user)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { sourceBusinessId, targetBusinessId, targetWlanId, configIds } = body;

    // Validate required fields
    if (!sourceBusinessId || !targetBusinessId || !targetWlanId || !configIds?.length) {
      return NextResponse.json(
        { error: 'Missing required fields: sourceBusinessId, targetBusinessId, targetWlanId, configIds[]' },
        { status: 400 }
      );
    }

    if (sourceBusinessId === targetBusinessId) {
      return NextResponse.json(
        { error: 'Source and target business cannot be the same' },
        { status: 400 }
      );
    }

    // Verify target WLAN exists
    const targetWlan = await prisma.r710Wlans.findUnique({
      where: { id: targetWlanId }
    });

    if (!targetWlan || targetWlan.businessId !== targetBusinessId) {
      return NextResponse.json(
        { error: 'Target WLAN not found or does not belong to target business' },
        { status: 404 }
      );
    }

    // Fetch source configs
    const sourceConfigs = await prisma.r710TokenConfigs.findMany({
      where: {
        id: { in: configIds },
        businessId: sourceBusinessId,
        isActive: true
      }
    });

    if (sourceConfigs.length === 0) {
      return NextResponse.json(
        { error: 'No valid source configurations found' },
        { status: 404 }
      );
    }

    // Clone each config to target business
    const clonedConfigs = await prisma.$transaction(
      sourceConfigs.map(config =>
        prisma.r710TokenConfigs.create({
          data: {
            businessId: targetBusinessId,
            wlanId: targetWlanId,
            name: config.name,
            description: config.description,
            durationValue: config.durationValue,
            durationUnit: config.durationUnit,
            deviceLimit: config.deviceLimit,
            basePrice: config.basePrice,
            autoGenerateThreshold: config.autoGenerateThreshold,
            autoGenerateQuantity: config.autoGenerateQuantity,
            displayOrder: config.displayOrder,
            isActive: true
          }
        })
      )
    );

    console.log(`[R710 Token Configs] Cloned ${clonedConfigs.length} configs from business ${sourceBusinessId} to ${targetBusinessId}`);

    return NextResponse.json({
      success: true,
      message: `Successfully cloned ${clonedConfigs.length} token package(s)`,
      clonedCount: clonedConfigs.length,
      configs: clonedConfigs.map(c => ({
        id: c.id,
        name: c.name,
        basePrice: c.basePrice,
        durationValue: c.durationValue,
        durationUnit: c.durationUnit
      }))
    }, { status: 201 });

  } catch (error) {
    console.error('[R710 Token Configs Clone] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to clone token configurations', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
