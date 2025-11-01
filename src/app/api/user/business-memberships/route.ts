import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { BUSINESS_PERMISSION_PRESETS, mergeWithBusinessPermissions } from '@/types/permissions';
import { isSystemAdmin, SessionUser } from '@/lib/permission-utils';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as SessionUser;

    // System admins get access to all ACTIVE businesses only
    // Inactive businesses should NOT appear in business switcher
    if (isSystemAdmin(user)) {
      const allBusinesses = await prisma.businesses.findMany({
        where: {
          isActive: true, // Only active businesses
        },
        select: {
          id: true,
          name: true,
          type: true,
          description: true,
          isActive: true,
        },
        orderBy: {
          name: 'asc',
        },
      });

      // Transform businesses to look like memberships with full permissions
      const adminMemberships = allBusinesses.map(business => ({
        businessId: business.id,
        businessName: business.name,
        businessType: business.type,
        role: 'admin' as any,
        permissions: {
          // Grant all permissions for system admins
          canManageAllBusinesses: true,
          canManageLaybys: true,
          canAccessCustomers: true,
          canManageCustomers: true,
          canManageProducts: true,
          canManageInventory: true,
          canAccessFinancialData: true,
          canManageBusinessUsers: true,
          canManageEmployees: true,
          canAccessPayroll: true,
          canViewReports: true,
        },
        isActive: business.isActive, // Use actual business active status
        joinedAt: new Date(),
        lastAccessedAt: new Date(),
      }));

      return NextResponse.json(adminMemberships);
    }

    // Regular users get their actual memberships
    const memberships = await prisma.businessMemberships.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        businesses: {
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
      businessName: membership.businesses.name,
      businessType: membership.businesses.type,
      role: membership.role as any,
      permissions: mergeWithBusinessPermissions(membership.permissions as any),
      isActive: membership.isActive && membership.businesses.isActive,
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