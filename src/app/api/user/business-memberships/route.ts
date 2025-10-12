import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { BUSINESS_PERMISSION_PRESETS, mergeWithBusinessPermissions } from '@/types/permissions';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const memberships = await prisma.businessMemberships.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            type: true,
            description: true,
            isActive: true,
          },
        },
      },
      orderBy: {
        lastAccessedAt: 'desc',
      },
    });

    // Transform to match BusinessMembership interface
    const transformedMemberships = memberships.map(membership => ({
      businessId: membership.businessId,
      businessName: membership.business.name,
      businessType: membership.business.type, // Add business type
      role: membership.role as any,
      permissions: mergeWithBusinessPermissions(membership.permissions as any),
      isActive: membership.isActive && membership.business.isActive,
      joinedAt: membership.joinedAt,
      lastAccessedAt: membership.lastAccessedAt,
    }));

    return NextResponse.json(transformedMemberships);
  } catch (error) {
    console.error('Error fetching business memberships:', error);
    return NextResponse.json(
      { error: 'Failed to fetch business memberships' },
      { status: 500 }
    );
  }
}