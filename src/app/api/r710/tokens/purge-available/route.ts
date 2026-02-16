/**
 * DELETE /api/r710/tokens/purge-available
 *
 * Delete all AVAILABLE (unsold) R710 tokens for a business.
 * Used when a WLAN has been updated or deleted outside the application,
 * making pre-generated tokens invalid.
 *
 * Token configurations are preserved - only generated tokens are deleted.
 */

import { NextRequest, NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';
import { isSystemAdmin, hasPermission } from '@/lib/permission-utils';
import { getServerUser } from '@/lib/get-server-user'

export async function DELETE(request: NextRequest) {
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


    // Require setup permission or system admin
    if (!isSystemAdmin(user) && !hasPermission(user, 'canSetupPortalIntegration', businessId)) {
      return NextResponse.json(
        { error: 'Access denied. You need portal setup permission.' },
        { status: 403 }
      );
    }

    // Find the WLAN record for this business
    const wlanRecord = await prisma.r710Wlans.findFirst({
      where: { businessId }
    });

    if (!wlanRecord) {
      return NextResponse.json(
        { error: 'No WLAN record found for this business' },
        { status: 404 }
      );
    }

    // Count tokens before deletion for response
    const availableCount = await prisma.r710Tokens.count({
      where: {
        wlanId: wlanRecord.id,
        status: 'AVAILABLE'
      }
    });

    if (availableCount === 0) {
      return NextResponse.json({
        success: true,
        message: 'No available tokens to delete',
        deletedCount: 0,
        preservedConfigs: 0
      });
    }

    // Delete all AVAILABLE tokens
    const deleteResult = await prisma.r710Tokens.deleteMany({
      where: {
        wlanId: wlanRecord.id,
        status: 'AVAILABLE'
      }
    });

    // Count preserved token configs
    const configCount = await prisma.r710TokenConfigs.count({
      where: { wlanId: wlanRecord.id }
    });

    console.log(`[R710 Purge] Deleted ${deleteResult.count} AVAILABLE tokens for business ${businessId}`);
    console.log(`[R710 Purge] Preserved ${configCount} token configuration(s)`);

    return NextResponse.json({
      success: true,
      message: `Deleted ${deleteResult.count} available token(s)`,
      deletedCount: deleteResult.count,
      preservedConfigs: configCount
    });

  } catch (error) {
    console.error('[R710 Purge] Error:', error);
    return NextResponse.json(
      { error: 'Failed to purge available tokens', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
