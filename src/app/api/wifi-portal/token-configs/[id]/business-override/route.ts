import { NextRequest, NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';
import { getServerUser } from '@/lib/get-server-user'

/**
 * PATCH /api/wifi-portal/token-configs/[id]/business-override
 * Update business-specific overrides for a token configuration
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const body = await request.json();
    const {
      businessId,
      durationMinutesOverride,
      bandwidthDownMbOverride,
      bandwidthUpMbOverride,
    } = body;

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId is required' },
        { status: 400 }
      );
    }

    // Verify token config exists
    const tokenConfig = await prisma.tokenConfigurations.findUnique({
      where: { id },
    });

    if (!tokenConfig) {
      return NextResponse.json(
        { error: 'Token configuration not found' },
        { status: 404 }
      );
    }

    // Verify business exists and user has access
    const business = await prisma.businesses.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Validate override values if provided
    if (durationMinutesOverride !== undefined && durationMinutesOverride !== null) {
      if (durationMinutesOverride <= 0 || durationMinutesOverride > 43200) {
        return NextResponse.json(
          { error: 'durationMinutesOverride must be between 1 and 43200 (30 days)' },
          { status: 400 }
        );
      }
    }

    if (bandwidthDownMbOverride !== undefined && bandwidthDownMbOverride !== null) {
      if (bandwidthDownMbOverride <= 0) {
        return NextResponse.json(
          { error: 'bandwidthDownMbOverride must be positive' },
          { status: 400 }
        );
      }
    }

    if (bandwidthUpMbOverride !== undefined && bandwidthUpMbOverride !== null) {
      if (bandwidthUpMbOverride <= 0) {
        return NextResponse.json(
          { error: 'bandwidthUpMbOverride must be positive' },
          { status: 400 }
        );
      }
    }

    // Find or create business token menu item
    const menuItem = await prisma.businessTokenMenuItems.upsert({
      where: {
        businessId_tokenConfigId: {
          businessId,
          tokenConfigId: id,
        },
      },
      create: {
        businessId,
        tokenConfigId: id,
        businessPrice: tokenConfig.basePrice,
        isActive: true,
        displayOrder: tokenConfig.displayOrder,
        durationMinutesOverride: durationMinutesOverride ?? null,
        bandwidthDownMbOverride: bandwidthDownMbOverride ?? null,
        bandwidthUpMbOverride: bandwidthUpMbOverride ?? null,
      },
      update: {
        durationMinutesOverride: durationMinutesOverride ?? null,
        bandwidthDownMbOverride: bandwidthDownMbOverride ?? null,
        bandwidthUpMbOverride: bandwidthUpMbOverride ?? null,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Business overrides updated successfully',
      menuItem: {
        id: menuItem.id,
        businessId: menuItem.businessId,
        tokenConfigId: menuItem.tokenConfigId,
        businessPrice: menuItem.businessPrice,
        durationMinutesOverride: menuItem.durationMinutesOverride,
        bandwidthDownMbOverride: menuItem.bandwidthDownMbOverride,
        bandwidthUpMbOverride: menuItem.bandwidthUpMbOverride,
      },
    });
  } catch (error: any) {
    console.error('Business override update error:', error);
    return NextResponse.json(
      { error: 'Failed to update business overrides', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/wifi-portal/token-configs/[id]/business-override
 * Reset business-specific overrides back to global defaults
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId query parameter is required' },
        { status: 400 }
      );
    }

    // Find the menu item
    const menuItem = await prisma.businessTokenMenuItems.findUnique({
      where: {
        businessId_tokenConfigId: {
          businessId,
          tokenConfigId: id,
        },
      },
    });

    if (!menuItem) {
      return NextResponse.json(
        { error: 'Business token menu item not found' },
        { status: 404 }
      );
    }

    // Reset overrides to null (use global defaults)
    const updated = await prisma.businessTokenMenuItems.update({
      where: {
        id: menuItem.id,
      },
      data: {
        durationMinutesOverride: null,
        bandwidthDownMbOverride: null,
        bandwidthUpMbOverride: null,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Business overrides reset to defaults',
      menuItem: {
        id: updated.id,
        businessId: updated.businessId,
        tokenConfigId: updated.tokenConfigId,
        businessPrice: updated.businessPrice,
        durationMinutesOverride: updated.durationMinutesOverride,
        bandwidthDownMbOverride: updated.bandwidthDownMbOverride,
        bandwidthUpMbOverride: updated.bandwidthUpMbOverride,
      },
    });
  } catch (error: any) {
    console.error('Business override reset error:', error);
    return NextResponse.json(
      { error: 'Failed to reset business overrides', details: error.message },
      { status: 500 }
    );
  }
}
