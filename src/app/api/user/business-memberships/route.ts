import { NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';
import { BUSINESS_PERMISSION_PRESETS, mergeWithBusinessPermissions } from '@/types/permissions';
import { isSystemAdmin } from '@/lib/permission-utils';
import { getServerUser } from '@/lib/get-server-user'

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }


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
          isDemo: true,
          address: true,
          phone: true,
          defaultPage: true,
          couponsEnabled: true,
          promosEnabled: true,
          expense_accounts: {
            select: { id: true, accountName: true },
            where: { isActive: true, isSibling: false },
            orderBy: { accountName: 'asc' },
          },
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
        couponsEnabled: business.couponsEnabled ?? false,
        promosEnabled: business.promosEnabled ?? false,
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
        isDemo: business.isDemo, // Include demo flag
        address: business.address, // Business address for receipts
        phone: business.phone, // Business phone for receipts
        defaultPage: business.defaultPage, // Default landing page
        expenseAccounts: business.expense_accounts.map(ea => ({ id: ea.id, accountName: ea.accountName })),
        joinedAt: new Date(),
        lastAccessedAt: new Date(),
      }));

      console.log('🔍 [API] Admin memberships returned:', adminMemberships.map(m => ({
        businessName: m.businessName,
        address: m.address,
        phone: m.phone
      })));

      return NextResponse.json(adminMemberships);
    }

    // Regular users get their actual memberships
    const memberships = await prisma.businessMemberships.findMany({
      where: {
        userId: user.id,
      },
      include: {
        businesses: {
          select: {
            id: true,
            name: true,
            type: true,
            description: true,
            isActive: true,
            isDemo: true,
            address: true,
            phone: true,
            defaultPage: true,
            couponsEnabled: true,
            promosEnabled: true,
            expense_accounts: {
              select: { id: true, accountName: true },
              where: { isActive: true, isSibling: false },
              orderBy: { accountName: 'asc' },
            },
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
      couponsEnabled: membership.businesses.couponsEnabled ?? false,
      promosEnabled: membership.businesses.promosEnabled ?? false,
      role: membership.role as any,
      permissions: mergeWithBusinessPermissions(membership.permissions as any, membership.role),
      isActive: membership.isActive && membership.businesses.isActive,
      isDemo: membership.businesses.isDemo, // Include demo flag
      address: membership.businesses.address, // Business address for receipts
      phone: membership.businesses.phone, // Business phone for receipts
      defaultPage: membership.businesses.defaultPage, // Default landing page
      expenseAccounts: membership.businesses.expense_accounts.map(ea => ({ id: ea.id, accountName: ea.accountName })),
      joinedAt: membership.joinedAt,
      lastAccessedAt: membership.lastAccessedAt,
    }));

    console.log('🔍 [API] Regular user memberships returned:', transformedMemberships.map(m => ({
      businessName: m.businessName,
      address: m.address,
      phone: m.phone
    })));

    return NextResponse.json(transformedMemberships);
  } catch (error) {
    console.error('Error fetching business memberships:', error);
    return NextResponse.json(
      { error: 'Failed to fetch business memberships' },
      { status: 500 }
    );
  }
}