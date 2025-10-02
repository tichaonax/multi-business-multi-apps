import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { BUSINESS_PERMISSION_PRESETS } from '@/types/permissions';
import { isSystemAdmin } from '@/lib/permission-utils';
import { SessionUser } from '@/lib/permission-utils';

interface Context {
  params: Promise<{
    businessId: string;
  }>;
}

export async function GET(req: NextRequest, { params }: Context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { businessId } = await params;
    const user = session.user as SessionUser;

    // System admins have access to all business members
    if (!isSystemAdmin(user)) {
      // Check if user has permission to view members through business membership
      const userMembership = await prisma.businessMembership.findFirst({
        where: {
          userId: session.user.id,
          businessId: businessId,
          isActive: true,
        },
      });

      if (!userMembership) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      const userPermissions = userMembership.permissions as any;
      if (!userPermissions.canViewUsers) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }

    // Get all members of the business
    const members = await prisma.businessMembership.findMany({
      where: {
        businessId: businessId,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'desc',
      },
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error('Error fetching business members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch business members' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, { params }: Context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { businessId } = await params;
    const { email, role = 'employee' } = await req.json();
    const user = session.user as SessionUser;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // System admins can invite members to any business
    if (!isSystemAdmin(user)) {
      // Check if user has permission to invite members through business membership
      const userMembership = await prisma.businessMembership.findFirst({
        where: {
          userId: session.user.id,
          businessId: businessId,
          isActive: true,
        },
      });

      if (!userMembership) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      const userPermissions = userMembership.permissions as any;
      if (!userPermissions.canInviteUsers) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }

    // Find the user to invite
    const invitedUser = await prisma.user.findUnique({
      where: { email },
    });

    if (!invitedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is already a member
    const existingMembership = await prisma.businessMembership.findFirst({
      where: {
        userId: invitedUser.id,
        businessId: businessId,
      },
    });

    if (existingMembership) {
      if (existingMembership.isActive) {
        return NextResponse.json(
          { error: 'User is already a member of this business' },
          { status: 400 }
        );
      } else {
        // Reactivate existing membership
        const updatedMembership = await prisma.businessMembership.update({
          where: { id: existingMembership.id },
          data: {
            isActive: true,
            role: role,
            permissions: BUSINESS_PERMISSION_PRESETS[role as keyof typeof BUSINESS_PERMISSION_PRESETS],
            invitedBy: session.user.id,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });
        return NextResponse.json(updatedMembership);
      }
    }

    // Create new membership
    const newMembership = await prisma.businessMembership.create({
      data: {
        userId: invitedUser.id,
        businessId: businessId,
        role: role,
        permissions: BUSINESS_PERMISSION_PRESETS[role as keyof typeof BUSINESS_PERMISSION_PRESETS],
        invitedBy: session.user.id,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(newMembership);
  } catch (error) {
    console.error('Error inviting business member:', error);
    return NextResponse.json(
      { error: 'Failed to invite member' },
      { status: 500 }
    );
  }
}