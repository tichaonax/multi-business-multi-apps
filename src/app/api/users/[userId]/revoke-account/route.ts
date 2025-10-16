import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permission-utils';

import { randomBytes } from 'crypto';
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
)
 {

    const { userId } = await params
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!hasPermission(session.user as any, 'canManageBusinessUsers')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { userId } = await params;
    const { reason, notes } = await req.json();

    // Get user details including employee relationship
    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: {
        employees: {
          select: {
            id: true,
            fullName: true,
            employeeNumber: true,
            employmentStatus: true
          }
        },
        businessMemberships: {
          include: { businesses: true }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Deactivate user account
      const updatedUser = await tx.users.update({
        where: { id: userId },
        data: {
          isActive: false,
          deactivatedAt: new Date(),
          deactivatedBy: session.user.id,
          deactivationReason: reason || 'Account revoked',
          deactivationNotes: notes,
        }
      });

      // Deactivate all business memberships
      await tx.businessMemberships.updateMany({
        where: { userId: userId },
        data: { isActive: false }
      });

      // Unlink from employee (preserve employee record)
      if ((user as any).employees) {
        await tx.employees.update({
          where: { id: (user as any).employees.id },
          data: { userId: null }
        });
      }

      // Create audit log
      await tx.auditLogs.create({
        data: {
          userId: session.user.id,
          action: 'USER_ACCOUNT_REVOKED',
          resourceType: 'User',
          resourceId: userId,
          changes: {
            targetUserId: userId,
            targetUserEmail: user.email,
            targetUserName: user.name,
            linkedEmployeeId: (user as any).employees?.id,
            linkedEmployeeName: (user as any).employees?.fullName,
            reason,
            notes,
            businessMemberships: user.business_memberships.map(m => ({
              businessId: m.businessId,
              businessName: (m as any).businesses?.name || null
            }))
          },
          businessId: (user as any).business_memberships.find((m: any) => m.isActive)?.businessId,
          timestamp: new Date(),
        }
      });

      return updatedUser;
    });

    return NextResponse.json({
      success: true,
      message: 'User account revoked successfully. Employee record preserved.',
      user: {
        id: result.id,
        name: result.name,
        email: result.email,
        isActive: result.isActive,
        deactivatedAt: result.deactivatedAt,
  employeePreserved: !!(user as any).employees,
  employeeId: (user as any).employees?.id,
  employeeName: (user as any).employees?.fullName,
      }
    });

  } catch (error) {
    console.error('Error revoking user account:', error);
    return NextResponse.json(
      { error: 'Failed to revoke user account' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
)
 {

    const { userId } = await params
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!hasPermission(session.user as any, 'canManageBusinessUsers')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { userId } = await params;
    const { notes } = await req.json();

    // Get user details
    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: {
        employees: {
          select: {
            id: true,
            fullName: true,
            employeeNumber: true,
            employmentStatus: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.isActive) {
      return NextResponse.json({ error: 'User account is already active' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Reactivate user account
      const updatedUser = await tx.users.update({
        where: { id: userId },
        data: {
          isActive: true,
          reactivatedAt: new Date(),
          reactivatedBy: session.user.id,
          reactivationNotes: notes,
          deactivatedAt: null,
          deactivatedBy: null,
          deactivationReason: null,
          deactivationNotes: null,
        }
      });

      // Relink to employee if employee exists and has no other user account
      if ((user as any).employees) {
        const employeeHasOtherUser = await tx.employees.findFirst({
          where: {
            id: (user as any).employees.id,
            userId: { not: null }
          }
        });

        if (!employeeHasOtherUser) {
          await tx.employees.update({
            where: { id: (user as any).employees.id },
            data: { userId: userId }
          });
        }
      }

      // Create audit log
      await tx.auditLogs.create({
        data: {
          userId: session.user.id,
          action: 'USER_ACCOUNT_REACTIVATED',
          resourceType: 'User',
          resourceId: userId,
          changes: {
            targetUserId: userId,
            targetUserEmail: user.email,
            targetUserName: user.name,
            linkedEmployeeId: (user as any).employees?.id,
            linkedEmployeeName: (user as any).employees?.fullName,
            notes,
          },
          timestamp: new Date(),
        }
      });

      return updatedUser;
    });

    return NextResponse.json({
      success: true,
      message: 'User account reactivated successfully',
      user: {
        id: result.id,
        name: result.name,
        email: result.email,
        isActive: result.isActive,
        reactivatedAt: result.reactivatedAt,
  employeeLinked: !!(user as any).employees,
  employeeId: (user as any).employees?.id,
  employeeName: (user as any).employees?.fullName,
      }
    });

  } catch (error) {
    console.error('Error reactivating user account:', error);
    return NextResponse.json(
      { error: 'Failed to reactivate user account' },
      { status: 500 }
    );
  }
}