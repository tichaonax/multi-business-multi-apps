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

    const { businessId } = await req.json();

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 });
    }

    let membership: any = null;

    // System admins can switch to any business
    if (isSystemAdmin(user)) {
      // For admin, just verify the business exists and is active
      const business = await prisma.businesses.findUnique({
        where: { id: businessId },
        select: { id: true, name: true, isActive: true, type: true }
      });

      if (!business || !business.isActive) {
        return NextResponse.json({ error: 'Business not found or inactive' }, { status: 404 });
      }

      // Create a mock membership object for admin
      membership = {
        businesses: business, // Use 'businesses' to match Prisma relation name
        permissions: {}, // Admin has all permissions
        role: 'admin'
      };
    } else {
      // Verify user has access to this business
      membership = await prisma.businessMemberships.findFirst({
        where: {
          userId: user.id,
          businessId: businessId,
          isActive: true,
        },
        include: {
          businesses: true,
        },
      });

      if (!membership || !membership.businesses.isActive) {
        return NextResponse.json({ error: 'Business not found or access denied' }, { status: 403 });
      }
    }

    // Update last accessed timestamp only for real memberships (admins won't have a DB membership id)
    if (membership && membership.id) {
      await prisma.businessMemberships.update({
        where: {
          id: membership.id,
        },
        data: {
          lastAccessedAt: new Date(),
        },
      });
    }

    // Record this as the user's last accessed business (used to restore it on
    // next login when no admin-set default business exists). Done for every
    // user, admins included — the branch above only touches the per-business
    // membership row, which admins may not have one of.
    await prisma.users.update({
      where: { id: user.id },
      data: {
        lastAccessedBusinessId: businessId,
        lastAccessedBusinessType: membership.businesses.type,
        lastAccessedAt: new Date(),
      },
    }).catch(() => { /* non-critical — don't fail the switch over this */ });

    return NextResponse.json({
      success: true, 
      businessId,
      businessName: membership.businesses.name,
    });
  } catch (error) {
    console.error('Error setting current business:', error);
    return NextResponse.json(
      { error: 'Failed to set current business' },
      { status: 500 }
    );
  }
}