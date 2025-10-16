import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isSystemAdmin, SessionUser } from '@/lib/permission-utils';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { businessId } = await req.json();

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 });
    }

    const user = session.user as SessionUser;
    let membership: any = null;

    // System admins can switch to any business
    if (isSystemAdmin(user)) {
      // For admin, just verify the business exists and is active
      const business = await prisma.businesses.findUnique({
        where: { id: businessId },
        select: { id: true, name: true, isActive: true }
      });

      if (!business || !business.isActive) {
        return NextResponse.json({ error: 'Business not found or inactive' }, { status: 404 });
      }

      // Create a mock membership object for admin
      membership = {
        business: business,
        permissions: {}, // Admin has all permissions
        role: 'admin'
      };
    } else {
      // Verify user has access to this business
      membership = await prisma.business_memberships.findFirst({
        where: {
          userId: session.user.id,
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
      await prisma.business_memberships.update({
        where: {
          id: membership.id,
        },
        data: {
          lastAccessedAt: new Date(),
        },
      });
    }

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