/**
 * Business R710 Token Menu Items API
 *
 * GET /api/business/[businessId]/r710-tokens
 * Returns R710 token menu items configured for a specific business
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SessionUser, isSystemAdmin } from '@/lib/permission-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { businessId } = await params;
    const user = session.user as SessionUser;

    // Check if user has access to this business (admins have access to all businesses)
    const isAdmin = isSystemAdmin(user);

    let membership = null;
    if (!isAdmin) {
      membership = await prisma.businessMemberships.findFirst({
        where: {
          userId: session.user.id,
          businessId: businessId,
          isActive: true,
        },
        include: {
          businesses: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      });

      if (!membership) {
        return NextResponse.json(
          { error: 'You do not have access to this business' },
          { status: 403 }
        );
      }
    } else {
      // For admins, get the business info directly
      const business = await prisma.businesses.findUnique({
        where: { id: businessId },
        select: {
          id: true,
          name: true,
          type: true,
        },
      });

      if (!business) {
        return NextResponse.json(
          { error: 'Business not found' },
          { status: 404 }
        );
      }

      membership = { businesses: business };
    }

    // Get R710 business token menu items
    const menuItems = await prisma.r710BusinessTokenMenuItems.findMany({
      where: { businessId: businessId },
      include: {
        r710_token_configs: {
          select: {
            id: true,
            name: true,
            description: true,
            durationValue: true,
            durationUnit: true,
            basePrice: true,
            isActive: true,
            deviceLimit: true,
          },
        },
      },
      orderBy: [
        { displayOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    // Get available token counts per config
    const configIds = menuItems.map(item => item.r710_token_configs.id);
    const availableCounts = await prisma.r710Tokens.groupBy({
      by: ['tokenConfigId'],
      where: {
        businessId: businessId,
        tokenConfigId: { in: configIds },
        status: 'AVAILABLE',
        r710_token_sales: { none: {} },
      },
      _count: { id: true },
    });

    const countMap = new Map(availableCounts.map(c => [c.tokenConfigId, c._count.id]));

    return NextResponse.json({
      success: true,
      business: {
        id: membership.businesses.id,
        name: membership.businesses.name,
        type: membership.businesses.type,
      },
      menuItems: menuItems.map((item) => ({
        id: item.id,
        tokenConfigId: item.r710_token_configs.id,
        businessPrice: item.businessPrice,
        isActive: item.isActive,
        displayOrder: item.displayOrder,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        availableCount: countMap.get(item.r710_token_configs.id) || 0,
        tokenConfig: {
          id: item.r710_token_configs.id,
          name: item.r710_token_configs.name,
          description: item.r710_token_configs.description,
          durationValue: item.r710_token_configs.durationValue,
          durationUnit: item.r710_token_configs.durationUnit,
          basePrice: item.r710_token_configs.basePrice,
          isActive: item.r710_token_configs.isActive,
          deviceLimit: item.r710_token_configs.deviceLimit,
        },
      })),
    });
  } catch (error) {
    console.error('[R710 Business Tokens API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch R710 menu items' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/business/[businessId]/r710-tokens
 * Add a R710 token config to business menu
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { businessId } = await params;
    const user = session.user as SessionUser;
    const body = await request.json();
    const { tokenConfigId, businessPrice, isActive, displayOrder } = body;

    // Validate required fields
    if (!tokenConfigId || businessPrice === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: tokenConfigId, businessPrice' },
        { status: 400 }
      );
    }

    // Check if user has access to this business
    const isAdmin = isSystemAdmin(user);
    if (!isAdmin) {
      const membership = await prisma.businessMemberships.findFirst({
        where: {
          userId: session.user.id,
          businessId: businessId,
          isActive: true,
        },
      });

      if (!membership) {
        return NextResponse.json(
          { error: 'You do not have access to this business' },
          { status: 403 }
        );
      }
    }

    // Verify token config exists
    const tokenConfig = await prisma.r710TokenConfigs.findUnique({
      where: { id: tokenConfigId },
    });

    if (!tokenConfig) {
      return NextResponse.json(
        { error: 'Token config not found' },
        { status: 404 }
      );
    }

    // Check if already exists
    const existing = await prisma.r710BusinessTokenMenuItems.findFirst({
      where: {
        businessId,
        tokenConfigId,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Token config already added to menu' },
        { status: 409 }
      );
    }

    // Create menu item
    const menuItem = await prisma.r710BusinessTokenMenuItems.create({
      data: {
        businessId,
        tokenConfigId,
        businessPrice: parseFloat(businessPrice),
        isActive: isActive !== undefined ? isActive : true,
        displayOrder: displayOrder !== undefined ? displayOrder : 0,
      },
      include: {
        r710_token_configs: true,
      },
    });

    return NextResponse.json({
      success: true,
      menuItem: {
        id: menuItem.id,
        tokenConfigId: menuItem.tokenConfigId,
        businessPrice: menuItem.businessPrice,
        isActive: menuItem.isActive,
        displayOrder: menuItem.displayOrder,
        tokenConfig: menuItem.r710_token_configs,
      },
    }, { status: 201 });

  } catch (error) {
    console.error('[R710 Business Tokens API] POST Error:', error);
    return NextResponse.json(
      { error: 'Failed to add token to menu' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/business/[businessId]/r710-tokens
 * Update a R710 menu item
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { businessId } = await params;
    const user = session.user as SessionUser;
    const body = await request.json();
    const { menuItemId, businessPrice, isActive, displayOrder } = body;

    if (!menuItemId) {
      return NextResponse.json(
        { error: 'Missing required field: menuItemId' },
        { status: 400 }
      );
    }

    // Check if user has access to this business
    const isAdmin = isSystemAdmin(user);
    if (!isAdmin) {
      const membership = await prisma.businessMemberships.findFirst({
        where: {
          userId: session.user.id,
          businessId: businessId,
          isActive: true,
        },
      });

      if (!membership) {
        return NextResponse.json(
          { error: 'You do not have access to this business' },
          { status: 403 }
        );
      }
    }

    // Update menu item
    const updateData: any = {};
    if (businessPrice !== undefined) updateData.businessPrice = parseFloat(businessPrice);
    if (isActive !== undefined) updateData.isActive = isActive;
    if (displayOrder !== undefined) updateData.displayOrder = displayOrder;

    const menuItem = await prisma.r710BusinessTokenMenuItems.update({
      where: { id: menuItemId },
      data: updateData,
      include: {
        r710_token_configs: true,
      },
    });

    return NextResponse.json({
      success: true,
      menuItem: {
        id: menuItem.id,
        tokenConfigId: menuItem.tokenConfigId,
        businessPrice: menuItem.businessPrice,
        isActive: menuItem.isActive,
        displayOrder: menuItem.displayOrder,
        tokenConfig: menuItem.r710_token_configs,
      },
    });

  } catch (error) {
    console.error('[R710 Business Tokens API] PATCH Error:', error);
    return NextResponse.json(
      { error: 'Failed to update menu item' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/business/[businessId]/r710-tokens
 * Remove a R710 token config from business menu
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { businessId } = await params;
    const user = session.user as SessionUser;
    const { searchParams } = new URL(request.url);
    const menuItemId = searchParams.get('menuItemId');

    if (!menuItemId) {
      return NextResponse.json(
        { error: 'Missing required parameter: menuItemId' },
        { status: 400 }
      );
    }

    // Check if user has access to this business
    const isAdmin = isSystemAdmin(user);
    if (!isAdmin) {
      const membership = await prisma.businessMemberships.findFirst({
        where: {
          userId: session.user.id,
          businessId: businessId,
          isActive: true,
        },
      });

      if (!membership) {
        return NextResponse.json(
          { error: 'You do not have access to this business' },
          { status: 403 }
        );
      }
    }

    // Delete menu item
    await prisma.r710BusinessTokenMenuItems.delete({
      where: { id: menuItemId },
    });

    return NextResponse.json({
      success: true,
      message: 'Menu item removed successfully',
    });

  } catch (error) {
    console.error('[R710 Business Tokens API] DELETE Error:', error);
    return NextResponse.json(
      { error: 'Failed to remove menu item' },
      { status: 500 }
    );
  }
}
