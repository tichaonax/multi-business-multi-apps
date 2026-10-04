import { NextRequest, NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permission-utils';

import { randomBytes } from 'crypto';
import { getServerUser } from '@/lib/get-server-user'
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
)
 {

    const { userId } = await params
  try {
    const user = await getServerUser();
    const currentUser = user as any
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!hasPermission(currentUser, 'canManageBusinessUsers')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { employeeId } = await req.json();

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    // Get the TARGET user's details — distinct from `user` above, which is
    // the admin performing this action. Earlier code here used `user` in
    // place of `dbUser` throughout this handler (wrong shape — the session
    // user from getServerUser() has no `employees`/`business_memberships`
    // fields at all), which crashed on the business-memberships lookup below
    // and surfaced to the admin as a generic "Failed to link user to employee".
    const dbUser = await prisma.users.findUnique({
      where: { id: userId },
      include: {
        employees: true,
        business_memberships: { include: { businesses: true } }
      }
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user already linked to an employee
    if (dbUser.employees) {
      return NextResponse.json({
        error: 'User is already linked to an employee'
      }, { status: 400 });
    }

    // Get employee details
    const employee = await prisma.employees.findUnique({
      where: { id: employeeId },
      include: {
        users: true,
        businesses: true,
        employee_business_assignments: {
          where: { isActive: true },
          include: { businesses: true }
        }
      }
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Check if employee already linked to a user
    if ((employee as any).users) {
      return NextResponse.json({
        error: 'Employee is already linked to a user account'
      }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Link user to employee
      await tx.employees.update({
        where: { id: employeeId },
        data: { userId: userId }
      });

      // SYNC: at link time, the Employee's name/photo takes precedence over
      // whatever this user account already had — same rule the backfill
      // migration applied to existing mismatched pairs, so a *new* link
      // can't reintroduce the same mismatch.
      await tx.users.update({
        where: { id: userId },
        data: {
          firstName: employee.firstName,
          lastName: employee.lastName,
          name: employee.fullName,
          profilePhotoUrl: employee.profilePhotoUrl,
        }
      });

      // Sync business memberships from employee business assignments
  const existingMemberships = dbUser.business_memberships.map((m: any) => m.businessId);

      // Add primary business if not already a member
      if (!existingMemberships.includes(employee.primaryBusinessId)) {
        await tx.businessMemberships.create({
        data: {
          id: randomBytes(12).toString('hex'),
            userId: userId,
            businessId: employee.primaryBusinessId,
            role: 'employee',
            permissions: {
              canViewBusiness: true,
              canViewEmployees: false,
              canViewReports: false,
            },
            isActive: true,
          invitedBy: user.id,
            joinedAt: new Date(),
            lastAccessedAt: new Date(),
          }
        });
      }

      // Add additional business assignments
      for (const assignment of employee.employee_business_assignments || []) {
        if (!existingMemberships.includes(assignment.businessId) && 
            assignment.businessId !== employee.primaryBusinessId) {
          await tx.businessMemberships.create({
        data: {
          id: randomBytes(12).toString('hex'),
              userId: userId,
              businessId: assignment.businessId,
              role: assignment.role || 'employee',
              permissions: {
                canViewBusiness: true,
                canViewEmployees: false,
                canViewReports: false,
              },
              isActive: true,
              invitedBy: user.id,
              joinedAt: new Date(),
              lastAccessedAt: new Date(),
            }
          });
        }
      }

      // Create audit log
      await tx.auditLogs.create({
        data: {
          userId: user.id,
          action: 'USER_EMPLOYEE_LINKED',
          resourceType: 'User',
          resourceId: userId,
          changes: {
            userId: userId,
            userName: dbUser.name,
            userEmail: dbUser.email,
            employeeId: employeeId,
            employeeName: employee.fullName,
            employeeNumber: employee.employeeNumber,
            primaryBusinessId: employee.primaryBusinessId,
            businessAssignments: employee.employee_business_assignments?.map((a: any) => ({
              businessId: a.businessId,
              businessName: a.businesses?.name || null,
              role: a.role
            }))
          },
          businessId: employee.primaryBusinessId,
          timestamp: new Date(),
        }
      });

      return { dbUser, employee };
    });

    return NextResponse.json({
      success: true,
      message: 'User successfully linked to employee',
      link: {
        userId: userId,
        userName: dbUser.name,
        userEmail: dbUser.email,
        employeeId: employeeId,
        employeeName: employee.fullName,
        employeeNumber: employee.employeeNumber,
        primaryBusiness: (employee as any).businesses?.name || null,
        additionalBusinesses: (employee.employee_business_assignments || []).length
      }
    });

  } catch (error) {
    console.error('Error linking user to employee:', error);
    return NextResponse.json(
      { error: 'Failed to link user to employee' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
)
 {

    const { userId } = await params
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!hasPermission(user as any, 'canManageBusinessUsers')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get the TARGET user's details — distinct from `user` above (the admin
    // performing this action). See the matching note in PUT above.
    const dbUser = await prisma.users.findUnique({
      where: { id: userId },
        include: {
          employees: {
            select: {
              id: true,
              fullName: true,
              employeeNumber: true
            }
          }
        }
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

      if (!dbUser.employees) {
      return NextResponse.json({
        error: 'User is not linked to any employee'
      }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Unlink user from employee
        await tx.employees.update({
          where: { id: dbUser.employees!.id },
        data: { userId: null }
      });

      // Create audit log
      await tx.auditLogs.create({
        data: {
          userId: user.id,
          action: 'USER_EMPLOYEE_UNLINKED',
          resourceType: 'User',
          resourceId: userId,
          changes: {
            userId: userId,
            userName: dbUser.name,
            userEmail: dbUser.email,
              employeeId: dbUser.employees!.id,
              employeeName: dbUser.employees!.fullName,
              employeeNumber: dbUser.employees!.employeeNumber,
          },
          timestamp: new Date(),
        }
      });

        return dbUser.employees!;
    });

    return NextResponse.json({
      success: true,
      message: 'User successfully unlinked from employee',
      unlink: {
        userId: userId,
        userName: dbUser.name,
        userEmail: dbUser.email,
        employeeId: result.id,
        employeeName: result.fullName,
        employeeNumber: result.employeeNumber,
      }
    });

  } catch (error) {
    console.error('Error unlinking user from employee:', error);
    return NextResponse.json(
      { error: 'Failed to unlink user from employee' },
      { status: 500 }
    );
  }
}