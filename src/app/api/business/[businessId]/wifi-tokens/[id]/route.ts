import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/business/[businessId]/wifi-tokens/[id]
 * Get specific business token menu item
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { businessId: string; id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { businessId, id } = params;

    // Check if user has access to this business (admins have access to all businesses)
    const isAdmin = session.user.role === 'admin';

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

    const menuItem = await prisma.businessTokenMenuItems.findFirst({
      where: {
        id: id,
        businessId: businessId,
      },
      include: {
        token_configurations: true,
        businesses: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    if (!menuItem) {
      return NextResponse.json(
        { error: 'Business token menu item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      menuItem: {
        id: menuItem.id,
        businessId: menuItem.businessId,
        businessName: menuItem.businesses.name,
        businessType: menuItem.businesses.type,
        businessPrice: menuItem.businessPrice,
        isActive: menuItem.isActive,
        displayOrder: menuItem.displayOrder,
        createdAt: menuItem.createdAt,
        updatedAt: menuItem.updatedAt,
        tokenConfig: menuItem.token_configurations,
        priceMarkup: Number(menuItem.businessPrice) - Number(menuItem.token_configurations.basePrice),
      },
    });
  } catch (error: any) {
    console.error('Business WiFi token menu item fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch business token menu item', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/business/[businessId]/wifi-tokens/[id]
 * Update business token menu item (change custom price, active status, display order)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { businessId: string; id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { businessId, id } = params;
    const body = await request.json();
    const { businessPrice, isActive, displayOrder } = body;

    // Check if user has access to this business (admins have access to all businesses)
    const isAdmin = session.user.role === 'admin';

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

    // Validate business type
    const businessType = membership.businesses.type;
    if (businessType !== 'restaurant' && businessType !== 'grocery') {
      return NextResponse.json(
        { error: 'WiFi tokens are only available for restaurant and grocery businesses' },
        { status: 403 }
      );
    }

    // Check if menu item exists
    const existingMenuItem = await prisma.businessTokenMenuItems.findFirst({
      where: {
        id: id,
        businessId: businessId,
      },
    });

    if (!existingMenuItem) {
      return NextResponse.json(
        { error: 'Business token menu item not found' },
        { status: 404 }
      );
    }

    // Validate businessPrice if provided
    if (businessPrice !== undefined && businessPrice < 0) {
      return NextResponse.json(
        { error: 'Business price cannot be negative' },
        { status: 400 }
      );
    }

    // Update menu item
    const updatedMenuItem = await prisma.businessTokenMenuItems.update({
      where: { id: id },
      data: {
        ...(businessPrice !== undefined && { businessPrice }),
        ...(isActive !== undefined && { isActive }),
        ...(displayOrder !== undefined && { displayOrder }),
        updatedAt: new Date(),
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

    return NextResponse.json({
      success: true,
      menuItem: {
        id: updatedMenuItem.id,
        businessId: updatedMenuItem.businessId,
        businessPrice: updatedMenuItem.businessPrice,
        isActive: updatedMenuItem.isActive,
        displayOrder: updatedMenuItem.displayOrder,
        updatedAt: updatedMenuItem.updatedAt,
        tokenConfig: updatedMenuItem.token_configurations,
        priceMarkup: Number(updatedMenuItem.businessPrice) - Number(updatedMenuItem.token_configurations.basePrice),
      },
    });
  } catch (error: any) {
    console.error('Business WiFi token menu item update error:', error);
    return NextResponse.json(
      { error: 'Failed to update business token menu item', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/business/[businessId]/wifi-tokens/[id]
 * Remove token from business menu
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { businessId: string; id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { businessId, id } = params;

    // Check if user has access to this business (admins have access to all businesses)
    const isAdmin = session.user.role === 'admin';

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

    // Validate business type
    const businessType = membership.businesses.type;
    if (businessType !== 'restaurant' && businessType !== 'grocery') {
      return NextResponse.json(
        { error: 'WiFi tokens are only available for restaurant and grocery businesses' },
        { status: 403 }
      );
    }

    // Check if menu item exists
    const existingMenuItem = await prisma.businessTokenMenuItems.findFirst({
      where: {
        id: id,
        businessId: businessId,
      },
      include: {
        token_configurations: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            wifi_tokens: true,
          },
        },
      },
    });

    if (!existingMenuItem) {
      return NextResponse.json(
        { error: 'Business token menu item not found' },
        { status: 404 }
      );
    }

    // Check if there are tokens created using this menu item
    if (existingMenuItem._count.wifi_tokens > 0) {
      return NextResponse.json(
        {
          error: 'Cannot remove token from menu with existing token sales',
          details: `${existingMenuItem._count.wifi_tokens} tokens were sold using this menu item. Set isActive=false instead.`,
        },
        { status: 409 }
      );
    }

    // Delete the menu item
    await prisma.businessTokenMenuItems.delete({
      where: { id: id },
    });

    return NextResponse.json({
      success: true,
      message: 'Token removed from business menu successfully',
      deletedMenuItemId: id,
      tokenName: existingMenuItem.token_configurations.name,
    });
  } catch (error: any) {
    console.error('Business WiFi token menu item delete error:', error);
    return NextResponse.json(
      { error: 'Failed to remove token from business menu', details: error.message },
      { status: 500 }
    );
  }
}
