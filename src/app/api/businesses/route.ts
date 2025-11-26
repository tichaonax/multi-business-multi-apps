import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateUniqueShortName } from '@/lib/business-shortname';
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
    // Get businesses depending on user role; return a consistent wrapper for clients
    const isAdmin = isSystemAdmin(user)

    if (isAdmin) {
      businesses = await prisma.businesses.findMany({
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
          isDemo: true,
          createdAt: true,
          updatedAt: true,
          business_accounts: {
            select: {
              id: true,
              balance: true,
            },
          },
        },
        orderBy: [
          { type: 'asc' },
          { name: 'asc' },
        ],
      });
    } else {
      // Regular users: Get businesses where user is a member (excluding umbrella businesses)
      businesses = await prisma.businesses.findMany({
        where: {
          business_memberships: {
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
          business_memberships: {
            where: {
              userId: session.user.id,
            },
            select: {
              role: true,
              permissions: true,
              isActive: true,
            },
          },
          business_accounts: {
            select: {
              id: true,
              balance: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    }

    return NextResponse.json({ businesses, isAdmin })
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

    // Generate a unique shortName and create business and make the creator the owner
    const shortName = await generateUniqueShortName(prisma as any, name)
    const business = await prisma.businesses.create({
      // Cast data to any to avoid TypeScript strict input type issues (id generation handled at runtime)
      data: ({
        name,
        type,
        description: description || null,
        shortName,
        createdBy: session.user.id,
        business_memberships: {
          create: ({
            userId: session.user.id,
            role: 'business-owner',
            permissions: BUSINESS_PERMISSION_PRESETS['business-owner'],
            isActive: true,
          } as any),
        },
      } as any),
      include: {
        business_memberships: {
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