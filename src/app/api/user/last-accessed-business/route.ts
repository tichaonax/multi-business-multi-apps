import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { isSystemAdmin } from '@/lib/permission-utils';
import { getServerUser } from '@/lib/get-server-user'

export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { businessId, businessType } = await req.json();

    if (!businessId || !businessType) {
      return NextResponse.json(
        { error: 'Business ID and type are required' },
        { status: 400 }
      );
    }

    // Verify user has access to this business (system admins can access any business)
    if (!isSystemAdmin(user)) {
      const membership = await prisma.businessMemberships.findFirst({
        where: {
          userId: user.id,
          businessId: businessId,
          isActive: true,
        },
      });

      if (!membership) {
        return NextResponse.json(
          { error: 'Access denied to this business' },
          { status: 403 }
        );
      }
    }

    // Update user's last accessed business
    const updatedUser = await prisma.users.update({
      where: { id: user.id },
      data: {
        lastAccessedBusinessId: businessId,
        lastAccessedBusinessType: businessType,
        lastAccessedAt: new Date(),
      },
      select: {
        id: true,
        lastAccessedBusinessId: true,
        lastAccessedBusinessType: true,
        lastAccessedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      lastAccessed: {
        businessId: updatedUser.lastAccessedBusinessId,
        businessType: updatedUser.lastAccessedBusinessType,
        lastAccessedAt: updatedUser.lastAccessedAt,
      },
    });
  } catch (error) {
    console.error('Error updating last accessed business:', error);
    return NextResponse.json(
      { error: 'Failed to update last accessed business' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await prisma.users.findUnique({
      where: { id: user.id },
      select: {
        lastAccessedBusinessId: true,
        lastAccessedBusinessType: true,
        lastAccessedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      lastAccessed: {
        businessId: user?.lastAccessedBusinessId || null,
        businessType: user?.lastAccessedBusinessType || null,
        lastAccessedAt: user?.lastAccessedAt || null,
      },
    });
  } catch (error) {
    console.error('Error fetching last accessed business:', error);
    return NextResponse.json(
      { error: 'Failed to fetch last accessed business' },
      { status: 500 }
    );
  }
}