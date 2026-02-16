import { NextRequest, NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/business/[businessId]/wifi-tokens
 * Get WiFi token menu for a specific business (restaurant or grocery)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { businessId } = await params;

    // Check if user has access to this business (admins have access to all businesses)
    const isAdmin = user.role === 'admin';

    let membership = null;
    if (!isAdmin) {
      membership = await prisma.businessMemberships.findFirst({
        where: {
          userId: user.id,
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

    // Validate business type
    const businessType = membership.businesses.type;
    if (!['restaurant', 'grocery', 'clothing', 'services'].includes(businessType)) {
      return NextResponse.json(
        { error: 'WiFi tokens are only available for restaurant, grocery, clothing, and services businesses' },
        { status: 403 }
      );
    }

    // Get business token menu items
    const menuItems = await prisma.businessTokenMenuItems.findMany({
      where: { businessId: businessId },
      include: {
        token_configurations: {
          select: {
            id: true,
            name: true,
            description: true,
            durationMinutes: true,
            bandwidthDownMb: true,
            bandwidthUpMb: true,
            basePrice: true,
            isActive: true,
          },
        },
      },
      orderBy: [
        { displayOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({
      success: true,
      business: {
        id: membership.businesses.id,
        name: membership.businesses.name,
        type: membership.businesses.type,
      },
      menuItems: menuItems.map((item) => ({
        id: item.id,
        tokenConfigId: item.token_configurations.id, // Direct access for POS cross-reference
        businessPrice: item.businessPrice,
        isActive: item.isActive,
        displayOrder: item.displayOrder,
        durationMinutesOverride: item.durationMinutesOverride,
        bandwidthDownMbOverride: item.bandwidthDownMbOverride,
        bandwidthUpMbOverride: item.bandwidthUpMbOverride,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        tokenConfig: {
          id: item.token_configurations.id,
          name: item.token_configurations.name,
          description: item.token_configurations.description,
          durationMinutes: item.token_configurations.durationMinutes,
          bandwidthDownMb: item.token_configurations.bandwidthDownMb,
          bandwidthUpMb: item.token_configurations.bandwidthUpMb,
          basePrice: item.token_configurations.basePrice,
          isActive: item.token_configurations.isActive,
        },
        priceMarkup: Number(item.businessPrice) - Number(item.token_configurations.basePrice),
        priceMarkupPercent: ((Number(item.businessPrice) - Number(item.token_configurations.basePrice)) / Number(item.token_configurations.basePrice) * 100).toFixed(2),
      })),
      total: menuItems.length,
    });
  } catch (error: any) {
    console.error('Business WiFi token menu fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch business WiFi token menu', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/business/[businessId]/wifi-tokens
 * Add token configuration to business menu with custom pricing
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { businessId } = await params;
    const body = await request.json();
    const { tokenConfigId, businessPrice, isActive = true, displayOrder = 0 } = body;

    // Validate required fields
    if (!tokenConfigId || businessPrice === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: tokenConfigId, businessPrice' },
        { status: 400 }
      );
    }

    // Check if user has access to this business (admins have access to all businesses)
    const isAdmin = user.role === 'admin';

    let membership = null;
    if (!isAdmin) {
      membership = await prisma.businessMemberships.findFirst({
        where: {
          userId: user.id,
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

    // Validate business type
    const businessType = membership.businesses.type;
    if (!['restaurant', 'grocery', 'clothing', 'services'].includes(businessType)) {
      return NextResponse.json(
        { error: 'WiFi tokens are only available for restaurant, grocery, clothing, and services businesses' },
        { status: 403 }
      );
    }

    // Validate businessPrice
    if (businessPrice < 0) {
      return NextResponse.json(
        { error: 'Business price cannot be negative' },
        { status: 400 }
      );
    }

    // Check if token config exists
    const tokenConfig = await prisma.tokenConfigurations.findUnique({
      where: { id: tokenConfigId },
    });

    if (!tokenConfig) {
      return NextResponse.json(
        { error: 'Token configuration not found' },
        { status: 404 }
      );
    }

    if (!tokenConfig.isActive) {
      return NextResponse.json(
        { error: 'Cannot add inactive token configuration to menu' },
        { status: 400 }
      );
    }

    // Check if already exists (unique constraint: [businessId, tokenConfigId])
    const existing = await prisma.businessTokenMenuItems.findFirst({
      where: {
        businessId: businessId,
        tokenConfigId: tokenConfigId,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'This token is already in the business menu. Use PUT to update pricing.' },
        { status: 409 }
      );
    }

    // Create business token menu item
    const menuItem = await prisma.businessTokenMenuItems.create({
      data: {
        businessId: businessId,
        tokenConfigId: tokenConfigId,
        businessPrice: businessPrice,
        isActive: isActive,
        displayOrder: displayOrder,
      },
      include: {
        token_configurations: {
          select: {
            id: true,
            name: true,
            description: true,
            durationMinutes: true,
            bandwidthDownMb: true,
            bandwidthUpMb: true,
            basePrice: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        menuItem: {
          id: menuItem.id,
          businessId: menuItem.businessId,
          businessPrice: menuItem.businessPrice,
          isActive: menuItem.isActive,
          displayOrder: menuItem.displayOrder,
          createdAt: menuItem.createdAt,
          tokenConfig: {
            id: menuItem.token_configurations.id,
            name: menuItem.token_configurations.name,
            description: menuItem.token_configurations.description,
            durationMinutes: menuItem.token_configurations.durationMinutes,
            bandwidthDownMb: menuItem.token_configurations.bandwidthDownMb,
            bandwidthUpMb: menuItem.token_configurations.bandwidthUpMb,
            basePrice: menuItem.token_configurations.basePrice,
          },
          priceMarkup: Number(menuItem.businessPrice) - Number(menuItem.token_configurations.basePrice),
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Business WiFi token menu item creation error:', error);

    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'This token is already in the business menu' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to add token to business menu', details: error.message },
      { status: 500 }
    );
  }
}
