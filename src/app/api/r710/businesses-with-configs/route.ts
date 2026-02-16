/**
 * R710 Businesses With Token Configs API
 *
 * Returns businesses that have active R710 token configurations.
 * Used by the clone feature to select a source business.
 */

import { NextRequest, NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';
import { isSystemAdmin } from '@/lib/permission-utils';
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/r710/businesses-with-configs
 *
 * List businesses that have active R710 token configurations (admin-only)
 * Optionally exclude a business by ID (e.g., the current business)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }


    if (!isSystemAdmin(user)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const excludeBusinessId = searchParams.get('excludeBusinessId');

    // Find businesses that have at least one active token config
    const businessesWithConfigs = await prisma.businesses.findMany({
      where: {
        r710_token_configs: {
          some: {
            isActive: true
          }
        },
        ...(excludeBusinessId ? { id: { not: excludeBusinessId } } : {})
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            r710_token_configs: {
              where: { isActive: true }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({
      businesses: businessesWithConfigs.map(b => ({
        id: b.id,
        name: b.name,
        configCount: b._count.r710_token_configs
      }))
    });

  } catch (error) {
    console.error('[R710 Businesses With Configs] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch businesses', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
