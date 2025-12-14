import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/wifi-portal/token-configs/[id]
 * Get specific token configuration
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

    const tokenConfig = await prisma.tokenConfigurations.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            wifi_tokens: true,
            business_token_menu_items: true,
          },
        },
      },
    });

    if (!tokenConfig) {
      return NextResponse.json(
        { error: 'Token configuration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
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
        updatedAt: tokenConfig.updatedAt,
        stats: {
          tokensCreated: tokenConfig._count.wifi_tokens,
          businessesUsing: tokenConfig._count.business_token_menu_items,
        },
      },
    });
  } catch (error: any) {
    console.error('Token config fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch token configuration', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/wifi-portal/token-configs/[id]
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

    const body = await request.json();
    const {
      name,
      description,
      durationMinutes,
      bandwidthDownMb,
      bandwidthUpMb,
      basePrice,
      isActive,
      displayOrder,
    } = body;

    // Check if config exists
    const existingConfig = await prisma.tokenConfigurations.findUnique({
      where: { id: params.id },
    });

    if (!existingConfig) {
      return NextResponse.json(
        { error: 'Token configuration not found' },
        { status: 404 }
      );
    }

    // Validate if provided
    if (durationMinutes !== undefined && (durationMinutes <= 0 || durationMinutes > 43200)) {
      return NextResponse.json(
        { error: 'durationMinutes must be between 1 and 43200 (30 days)' },
        { status: 400 }
      );
    }

    if (bandwidthDownMb !== undefined && bandwidthDownMb <= 0) {
      return NextResponse.json(
        { error: 'bandwidthDownMb must be positive' },
        { status: 400 }
      );
    }

    if (bandwidthUpMb !== undefined && bandwidthUpMb <= 0) {
      return NextResponse.json(
        { error: 'bandwidthUpMb must be positive' },
        { status: 400 }
      );
    }

    if (basePrice !== undefined && basePrice < 0) {
      return NextResponse.json(
        { error: 'basePrice cannot be negative' },
        { status: 400 }
      );
    }

    // Check for duplicate name if name is being changed
    if (name && name !== existingConfig.name) {
      const duplicate = await prisma.tokenConfigurations.findFirst({
        where: {
          name: name,
          id: { not: params.id },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: 'A token configuration with this name already exists' },
          { status: 409 }
        );
      }
    }

    // Update token configuration
    const updatedConfig = await prisma.tokenConfigurations.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(durationMinutes !== undefined && { durationMinutes }),
        ...(bandwidthDownMb !== undefined && { bandwidthDownMb }),
        ...(bandwidthUpMb !== undefined && { bandwidthUpMb }),
        ...(basePrice !== undefined && { basePrice }),
        ...(isActive !== undefined && { isActive }),
        ...(displayOrder !== undefined && { displayOrder }),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      tokenConfig: {
        id: updatedConfig.id,
        name: updatedConfig.name,
        description: updatedConfig.description,
        durationMinutes: updatedConfig.durationMinutes,
        bandwidthDownMb: updatedConfig.bandwidthDownMb,
        bandwidthUpMb: updatedConfig.bandwidthUpMb,
        basePrice: updatedConfig.basePrice,
        isActive: updatedConfig.isActive,
        displayOrder: updatedConfig.displayOrder,
        updatedAt: updatedConfig.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Token config update error:', error);
    return NextResponse.json(
      { error: 'Failed to update token configuration', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/wifi-portal/token-configs/[id]
 * Delete token configuration
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

    // Check if config exists
    const existingConfig = await prisma.tokenConfigurations.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            wifi_tokens: true,
            business_token_menu_items: true,
          },
        },
      },
    });

    if (!existingConfig) {
      return NextResponse.json(
        { error: 'Token configuration not found' },
        { status: 404 }
      );
    }

    // Check if there are tokens or business menu items using this config
    if (existingConfig._count.wifi_tokens > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete token configuration with existing tokens',
          details: `${existingConfig._count.wifi_tokens} tokens are using this configuration`,
        },
        { status: 409 }
      );
    }

    if (existingConfig._count.business_token_menu_items > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete token configuration in use by businesses',
          details: `${existingConfig._count.business_token_menu_items} businesses are using this configuration`,
        },
        { status: 409 }
      );
    }

    // Delete the configuration
    await prisma.tokenConfigurations.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Token configuration deleted successfully',
      deletedConfigId: params.id,
      configName: existingConfig.name,
    });
  } catch (error: any) {
    console.error('Token config delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete token configuration', details: error.message },
      { status: 500 }
    );
  }
}
