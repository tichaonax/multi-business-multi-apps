import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { hasPermission } from '@/lib/permission-utils';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
)
 {

    const { employeeId } = await params
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!hasPermission(session.user as any, 'canManageBusinessUsers')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { employeeId } = await params;
    const { email, password, role = 'user', sendInvite = false } = await req.json();

    // Validate required fields
    if (!email || (!password && !sendInvite)) {
      return NextResponse.json(
        { error: 'Email and password (or send invite) are required' },
        { status: 400 }
      );
    }

    // Get employee details including contract information
    const employee = await prisma.employees.findUnique({
      where: { id: employeeId },
      include: {
        users: true,
        businesses: true,
        employee_business_assignments: {
          where: { isActive: true },
          include: { businesses: true }
        },
        employee_contracts_employee_contracts_employeeIdToemployees: {
          where: { status: 'active' },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Check if employee already has a user account
    if ((employee as any).users) {
      return NextResponse.json(
        { error: 'Employee already has a user account' },
        { status: 400 }
      );
    }

    // CRITICAL: Only allow user account creation for employees with SIGNED active contracts
    if (employee.employmentStatus !== 'active') {
      return NextResponse.json(
        {
          error: `Cannot create user account. Employee must have signed an active contract. Current status: ${employee.employmentStatus.replace('_', ' ').toUpperCase()}`,
          currentStatus: employee.employmentStatus,
          requiredStatus: 'active (signed contract)'
        },
        { status: 422 }
      );
    }

    // Validate that employee has a signed active contract
    const activeContract = (employee as any).employee_contracts_employee_contracts_employeeIdToemployees?.[0];
    if (!activeContract) {
      return NextResponse.json(
        { error: 'Cannot create user account. Employee must have an active contract.' },
        { status: 422 }
      );
    }

    if (activeContract.status !== 'active' || !activeContract.employeeSignedAt) {
      return NextResponse.json(
        {
          error: 'Cannot create user account. Employee contract must be signed and active.',
          contractStatus: activeContract.status,
          contractSigned: !!activeContract.employeeSignedAt,
          requirement: 'Contract must be signed (employeeSignedAt) and status must be active'
        },
        { status: 422 }
      );
    }

    // Check if email is already taken
    const existingUser = await prisma.users.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email address is already in use' },
        { status: 409 }
      );
    }

    // Generate temporary password if sending invite
    const finalPassword = password || Math.random().toString(36).slice(-12);
    const hashedPassword = await hash(finalPassword, 12);

    // Create user account and link to employee
    const newUser = await prisma.$transaction(async (tx) => {
      // Create user
      const userCreateData: Prisma.UserUncheckedCreateInput = {
        id: randomUUID(),
        name: employee.fullName,
        email,
        passwordHash: hashedPassword,
        role: role,
        isActive: true,
        passwordResetRequired: sendInvite
      }
      const user = await tx.users.create({
        data: userCreateData
      });

      // Link employee to user
      await tx.employees.update({
        where: { id: employeeId },
        data: { userId: user.id }
      });

      // Create business memberships based on employee's business assignments
      const businessMemberships = [];
      
      // Primary business membership
      businessMemberships.push({
        userId: user.id,
        businessId: employee.primaryBusinessId,
        role: 'employee',
        permissions: {
          // Basic employee permissions based on job role
          canViewBusiness: true,
          canViewEmployees: false,
          canViewReports: false,
        },
        isActive: true,
        invitedBy: session.user.id,
        joinedAt: new Date(),
        lastAccessedAt: new Date(),
      });

      // Additional business assignments
      for (const assignment of (employee as any).employeeBusinessAssignments || []) {
        if (assignment.businessId !== employee.primaryBusinessId) {
          businessMemberships.push({
            userId: user.id,
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
          });
        }
      }

      // Create all business memberships
      await tx.businessMemberships.createMany({
        data: businessMemberships
      });

      return user;
    });

    const response: any = {
      success: true,
      message: 'User account created and linked to employee successfully',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        employeeId: employeeId,
        employeeName: (employee as any).fullName,
        employeeNumber: (employee as any).employeeNumber,
      }
    };

    if (sendInvite) {
      response.temporaryPassword = finalPassword;
      response.message += ' User will need to change password on first login.';
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error creating user from employee:', error);
    return NextResponse.json(
      { error: 'Failed to create user account' },
      { status: 500 }
    );
  }
}