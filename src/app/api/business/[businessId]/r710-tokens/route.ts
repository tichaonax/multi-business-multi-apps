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
