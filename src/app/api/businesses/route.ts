import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { BUSINESS_PERMISSION_PRESETS } from '@/types/permissions';
import { isSystemAdmin, SessionUser } from '@/lib/permission-utils';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as SessionUser;

    // System admins get ALL businesses (except umbrella), regular users get only their memberships
    let businesses;
    if (isSystemAdmin(user)) {
      businesses = await prisma.business.findMany({
        where: {
          isActive: true,
          type: {
            not: 'umbrella'
          },
        },
        select: {
          id: true,
          name: true,
          type: true,
          description: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [
          { type: 'asc' },
          { name: 'asc' },
        ],
      });

      return NextResponse.json({
        success: true,
        businesses,
        isAdmin: true
      });
    } else {
      // Regular users: Get businesses where user is a member (excluding umbrella businesses)
      businesses = await prisma.business.findMany({
        where: {
          businessMemberships: {
            some: {
              userId: session.user.id,
              isActive: true,
            },
          },
          type: {
            not: 'umbrella'
          },
        },
        include: {
          businessMemberships: {
            where: {
              userId: session.user.id,
            },
            select: {
              role: true,
              permissions: true,
              isActive: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return NextResponse.json(businesses);
    }
  } catch (error) {
    console.error('Error fetching businesses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch businesses' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, type, description } = await req.json();

    if (!name || !type) {
      return NextResponse.json(
        { error: 'Business name and type are required' },
        { status: 400 }
      );
    }

    // Create business and make the creator the owner
    const business = await prisma.business.create({
      data: {
        name,
        type,
        description: description || null,
        createdBy: session.user.id,
        memberships: {
          create: {
            userId: session.user.id,
            role: 'business-owner',
            permissions: BUSINESS_PERMISSION_PRESETS['business-owner'],
            isActive: true,
          },
        },
      },
      include: {
        memberships: {
          where: {
            userId: session.user.id,
          },
        },
      },
    });

    return NextResponse.json(business);
  } catch (error) {
    console.error('Error creating business:', error);
    return NextResponse.json(
      { error: 'Failed to create business' },
      { status: 500 }
    );
  }
}