import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/wifi-portal/token-configs
 * Get all token configurations (global packages)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const businessId = searchParams.get('businessId'); // Optional: filter by business

    let tokenConfigs;

    if (businessId) {
      // Get token configs with business-specific pricing if available
      tokenConfigs = await prisma.tokenConfigurations.findMany({
        where: activeOnly ? { isActive: true } : undefined,
        orderBy: [
          { displayOrder: 'asc' },
          { createdAt: 'desc' },
        ],
        include: {
          business_token_menu_items: {
            where: {
              businessId: businessId,
            },
            select: {
              id: true,
              businessPrice: true,
              isActive: true,
              displayOrder: true,
            },
          },
        },
      });
    } else {
      // Get all global token configs
      tokenConfigs = await prisma.tokenConfigurations.findMany({
        where: activeOnly ? { isActive: true } : undefined,
        orderBy: [
          { displayOrder: 'asc' },
          { createdAt: 'desc' },
        ],
        include: {
          _count: {
            select: {
              wifi_tokens: true,
              business_token_menu_items: true,
            },
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      configs: tokenConfigs.map((config) => ({
        id: config.id,
        name: config.name,
        description: config.description,
        durationMinutes: config.durationMinutes,
        bandwidthDownMb: config.bandwidthDownMb,
        bandwidthUpMb: config.bandwidthUpMb,
        basePrice: config.basePrice,
        isActive: config.isActive,
        displayOrder: config.displayOrder,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
        ...(businessId
          ? {
              businessMenuItem: config.business_token_menu_items[0] || null,
            }
          : {
              stats: {
                tokensCreated: (config as any)._count?.wifi_tokens || 0,
                businessesUsing: (config as any)._count?.business_token_menu_items || 0,
              },
            }),
      })),
      tokenConfigs: tokenConfigs.map((config) => ({
        id: config.id,
        name: config.name,
        description: config.description,
        durationMinutes: config.durationMinutes,
        bandwidthDownMb: config.bandwidthDownMb,
        bandwidthUpMb: config.bandwidthUpMb,
        basePrice: config.basePrice,
        isActive: config.isActive,
        displayOrder: config.displayOrder,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
        ...(businessId
          ? {
              businessMenuItem: config.business_token_menu_items[0] || null,
            }
          : {
              stats: {
                tokensCreated: (config as any)._count?.wifi_tokens || 0,
                businessesUsing: (config as any)._count?.business_token_menu_items || 0,
              },
            }),
      })),
      total: tokenConfigs.length,
    });
  } catch (error: any) {
    console.error('Token configs fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch token configurations', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/wifi-portal/token-configs
 * Create a new token configuration (admin/global)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      durationMinutes,
      bandwidthDownMb,
      bandwidthUpMb,
      basePrice,
      isActive = true,
      displayOrder = 0,
    } = body;

    // Validate required fields
    if (!name || !durationMinutes || !bandwidthDownMb || !bandwidthUpMb || basePrice === undefined) {
      return NextResponse.json(
        {
          error: 'Missing required fields: name, durationMinutes, bandwidthDownMb, bandwidthUpMb, basePrice',
        },
        { status: 400 }
      );
    }

    // Validate ranges
    if (durationMinutes <= 0 || durationMinutes > 43200) {
      return NextResponse.json(
        { error: 'durationMinutes must be between 1 and 43200 (30 days)' },
        { status: 400 }
      );
    }

    if (bandwidthDownMb <= 0 || bandwidthUpMb <= 0) {
      return NextResponse.json(
        { error: 'Bandwidth values must be positive' },
        { status: 400 }
      );
    }

    if (basePrice < 0) {
      return NextResponse.json(
        { error: 'Base price cannot be negative' },
        { status: 400 }
      );
    }

    // Check for duplicate name
    const existing = await prisma.tokenConfigurations.findFirst({
      where: { name: name },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A token configuration with this name already exists' },
        { status: 409 }
      );
    }

    // Create token configuration
    const tokenConfig = await prisma.tokenConfigurations.create({
      data: {
        name,
        description: description || null,
        durationMinutes,
        bandwidthDownMb,
        bandwidthUpMb,
        basePrice,
        isActive,
        displayOrder,
      },
    });

    return NextResponse.json(
      {
        success: true,
        tokenConfig: {
          id: tokenConfig.id,
          name: tokenConfig.name,
          description: tokenConfig.description,
          durationMinutes: tokenConfig.durationMinutes,
          bandwidthDownMb: tokenConfig.bandwidthDownMb,
          bandwidthUpMb: tokenConfig.bandwidthUpMb,
          basePrice: tokenConfig.basePrice,
          isActive: tokenConfig.isActive,
          displayOrder: tokenConfig.displayOrder,
          createdAt: tokenConfig.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Token config creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create token configuration', details: error.message },
      { status: 500 }
    );
  }
}
