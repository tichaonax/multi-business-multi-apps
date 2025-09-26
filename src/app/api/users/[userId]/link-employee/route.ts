import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permission-utils';

export async function PUT(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const currentUser = session?.user as any
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!hasPermission(currentUser, 'canManageBusinessUsers')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { userId } = await params;
    const { employeeId } = await req.json();

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        employee: true,
        businessMemberships: { include: { business: true } }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user already linked to an employee
    if (user.employee) {
      return NextResponse.json({
        error: 'User is already linked to an employee'
      }, { status: 400 });
    }

    // Get employee details
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        users: true,
        business: true,
        employeeBusinessAssignments: {
          where: { isActive: true },
          include: { business: true }
        }
      }
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Check if employee already linked to a user
    if (employee.users) {
      return NextResponse.json({
        error: 'Employee is already linked to a user account'
      }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Link user to employee
      await tx.employee.update({
        where: { id: employeeId },
        data: { userId: userId }
      });

      // Sync business memberships from employee business assignments
      const existingMemberships = user.businessMemberships.map(m => m.businessId);

      // Add primary business if not already a member
      if (!existingMemberships.includes(employee.primaryBusinessId)) {
        await tx.businessMembership.create({
          data: {
            userId: userId,
            businessId: employee.primaryBusinessId,
            role: 'employee',
            permissions: {
              canViewBusiness: true,
              canViewEmployees: false,
              canViewReports: false,
            },
            isActive: true,
          invitedBy: session.user.id,
            joinedAt: new Date(),
            lastAccessedAt: new Date(),
          }
        });
      }

      // Add additional business assignments
      for (const assignment of employee.employeeBusinessAssignments) {
        if (!existingMemberships.includes(assignment.businessId) && 
            assignment.businessId !== employee.primaryBusinessId) {
          await tx.businessMembership.create({
            data: {
              userId: userId,
              businessId: assignment.businessId,
              role: assignment.role || 'employee',
              permissions: {
                canViewBusiness: true,
                canViewEmployees: false,
                canViewReports: false,
              },
              isActive: true,
              invitedBy: session.user.id,
              joinedAt: new Date(),
              lastAccessedAt: new Date(),
            }
          });
        }
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'USER_EMPLOYEE_LINKED',
          resourceType: 'User',
          resourceId: userId,
          changes: {
            userId: userId,
            userName: user.name,
            userEmail: user.email,
            employeeId: employeeId,
            employeeName: employee.fullName,
            employeeNumber: employee.employeeNumber,
            primaryBusinessId: employee.primaryBusinessId,
            businessAssignments: employee.employeeBusinessAssignments.map(a => ({
              businessId: a.businessId,
              businessName: a.business.name,
              role: a.role
            }))
          },
          businessId: employee.primaryBusinessId,
          timestamp: new Date(),
        }
      });

      return { user, employee };
    });

    return NextResponse.json({
      success: true,
      message: 'User successfully linked to employee',
      link: {
        userId: userId,
        userName: user.name,
        userEmail: user.email,
        employeeId: employeeId,
        employeeName: employee.fullName,
        employeeNumber: employee.employeeNumber,
        primaryBusiness: employee.business.name,
        additionalBusinesses: employee.employeeBusinessAssignments.length
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
  { params }: { params: { userId: string } }
) {
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

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            employeeNumber: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.employee) {
      return NextResponse.json({
        error: 'User is not linked to any employee'
      }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Unlink user from employee
      await tx.employee.update({
        where: { id: user.employee.id },
        data: { userId: null }
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'USER_EMPLOYEE_UNLINKED',
          resourceType: 'User',
          resourceId: userId,
          changes: {
            userId: userId,
            userName: user.name,
            userEmail: user.email,
            employeeId: user.employee.id,
            employeeName: user.employee.fullName,
            employeeNumber: user.employee.employeeNumber,
          },
          timestamp: new Date(),
        }
      });

      return user.employee;
    });

    return NextResponse.json({
      success: true,
      message: 'User successfully unlinked from employee',
      unlink: {
        userId: userId,
        userName: user.name,
        userEmail: user.email,
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