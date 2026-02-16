import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { hasPermission } from '@/lib/permission-utils';

import { randomBytes } from 'crypto';
import { getServerUser } from '@/lib/get-server-user'
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
)
 {

    const { employeeId } = await params
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!hasPermission(user as any, 'canEditEmployees')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { employeeId } = await params;
    const { employmentStatus, isActive, reason, notes } = await req.json();

    if (!employmentStatus && isActive === undefined) {
      return NextResponse.json({
        error: 'Either employmentStatus or isActive must be provided'
      }, { status: 400 });
    }

    // Get employee basic fields and linked user separately to avoid complex include typing
    const employee = await prisma.employees.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        fullName: true,
        employeeNumber: true,
        employmentStatus: true,
        isActive: true,
        primaryBusinessId: true,
        userId: true
      }
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Fetch linked user (if any)
    const linkedUser = employee.userId
      ? await prisma.users.findUnique({
        where: { id: employee.userId },
        select: { id: true, name: true, email: true, isActive: true }
      })
      : null;

    // Fetch the most recent contract for the employee (if any)
    const currentContract = await prisma.employeeContracts.findFirst({
      where: { employeeId: employeeId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, status: true, endDate: true }
    });

    const hasSuspendedContract = currentContract && currentContract.status === 'suspended';

    // If employee has suspended contract and trying to change status, block it
    if (hasSuspendedContract && employmentStatus && employmentStatus !== 'pending_contract') {
      return NextResponse.json({
        error: 'Cannot change employment status while contract is suspended. Employee must remain in "pending_contract" status until a new contract is created.',
        currentContractStatus: currentContract.status,
        currentEmploymentStatus: employee.employmentStatus,
        requiredStatus: 'pending_contract'
      }, { status: 422 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Determine final employment status - override to pending_contract if contract will be suspended
      let finalEmploymentStatus = employmentStatus;
      let finalIsActive = isActive;

      // If changing status to suspended, automatically set to pending_contract
      if (employmentStatus === 'suspended') {
        finalEmploymentStatus = 'pending_contract';
        finalIsActive = false;
      }

      // Update employee status
      const updatedEmployee = await tx.employees.update({
        where: { id: employeeId },
        data: {
          ...(finalEmploymentStatus && { employmentStatus: finalEmploymentStatus }),
          ...(finalIsActive !== undefined && { isActive: finalIsActive }),
          updatedAt: new Date()
        }
      });

      // SYNC RULE: Employee terminated → Contract terminated (only sync rule for employee->contract)
      if (employmentStatus === 'terminated') {
        // Terminate all non-terminated contracts when employee is terminated
        await tx.employeeContracts.updateMany({
          where: {
            employeeId: employeeId,
            status: { not: 'terminated' }
          },
          data: {
            status: 'terminated',
            endDate: new Date()
          }
        });
      }

      // NOTE: Other employee status changes (active, on_leave, suspended, pending_contract)
      // do NOT sync to contract status. Contract status is managed independently.

      let userSyncAction = null;
      let updatedUser = null;

      // Sync user account status if linked
      if (linkedUser) {
        const shouldDeactivateUser =
          employmentStatus === 'terminated' ||
          employmentStatus === 'suspended' ||
          isActive === false;

        const shouldActivateUser =
          (employmentStatus === 'active' || isActive === true) &&
          linkedUser.isActive === false;

        if (shouldDeactivateUser && linkedUser.isActive) {
          // Deactivate user account
          updatedUser = await tx.users.update({
            where: { id: linkedUser.id },
            data: {
              isActive: false,
              deactivatedAt: new Date(),
              deactivatedBy: user.id,
              deactivationReason: `Employee ${employmentStatus || 'deactivated'}`,
              deactivationNotes: notes || `Automatically deactivated due to employee status change`
            }
          });

          // Deactivate business memberships
          await tx.businessMemberships.updateMany({
            where: { userId: linkedUser.id },
            data: { isActive: false }
          });

          userSyncAction = 'deactivated';

        } else if (shouldActivateUser) {
          // Reactivate user account (requires manual approval)
          // For now, just log this for admin review
          userSyncAction = 'pending_reactivation';
        }

        // Create audit log for synchronization
        await tx.auditLogs.create({
          data: {
            userId: user.id,
            action: 'EMPLOYEE_STATUS_SYNC',
            resourceType: 'Employee',
            resourceId: employeeId,
            changes: {
              employeeId,
              employeeName: employee.fullName,
              employeeNumber: employee.employeeNumber,
              oldStatus: employee.employmentStatus,
              newStatus: employmentStatus,
              oldActive: employee.isActive,
              newActive: isActive,
              linkedUserId: linkedUser.id,
              linkedUserEmail: linkedUser.email,
              userSyncAction,
              reason,
              notes
            },
            businessId: employee.primaryBusinessId,
            timestamp: new Date(),
          }
        });
      }

      return {
        employee: updatedEmployee,
        user: updatedUser,
        userSyncAction
      };
    });

    const response: any = {
      success: true,
      message: 'Employee status updated successfully',
      employee: {
        id: result.employee.id,
        fullName: result.employee.fullName,
        employeeNumber: result.employee.employeeNumber,
        employmentStatus: result.employee.employmentStatus,
        isActive: result.employee.isActive
      }
    };

    if (result.userSyncAction) {
      response.userSync = {
        action: result.userSyncAction,
        userId: linkedUser?.id,
        userEmail: linkedUser?.email,
        message: result.userSyncAction === 'deactivated'
          ? 'Linked user account has been deactivated'
          : 'Linked user account requires manual reactivation review'
      };
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error updating employee status:', error);
    return NextResponse.json(
      { error: 'Failed to update employee status' },
      { status: 500 }
    );
  }
}

// Get employee status and linked user information
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
)
 {

    const { employeeId } = await params
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!hasPermission(user as any, 'canViewEmployees')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { employeeId } = await params;

    const employee = await prisma.employees.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        fullName: true,
        employeeNumber: true,
        employmentStatus: true,
        isActive: true,
        updatedAt: true,
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
            deactivatedAt: true,
            deactivationReason: true,
            reactivatedAt: true
          }
        }
      }
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json({
      employee: {
        id: employee.id,
        fullName: employee.fullName,
        employeeNumber: employee.employeeNumber,
        employmentStatus: employee.employmentStatus,
        isActive: employee.isActive,
        lastUpdated: employee.updatedAt
      },
      linkedUser: employee.users ? {
        id: employee.users.id,
        name: employee.users.name,
        email: employee.users.email,
        isActive: employee.users.isActive,
        deactivatedAt: employee.users.deactivatedAt,
        deactivationReason: employee.users.deactivationReason,
        reactivatedAt: employee.users.reactivatedAt,
        syncStatus: employee.isActive === employee.users.isActive ? 'synced' : 'out_of_sync'
      } : null
    });

  } catch (error) {
    console.error('Error fetching employee status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employee status' },
      { status: 500 }
    );
  }
}