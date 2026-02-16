import { NextRequest, NextResponse } from 'next/server';


import { hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { BUSINESS_PERMISSION_PRESETS } from '@/types/permissions';
import { isSystemAdmin } from '@/lib/permission-utils';
import { randomBytes } from 'crypto';
import { getServerUser } from '@/lib/get-server-user'

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }


    // System admins can access all users
    if (isSystemAdmin(user)) {
      const users = await prisma.users.findMany({
        include: {
          // relation from User -> Employee in schema is `employees`
          employees: {
            select: {
              id: true,
              fullName: true,
              employeeNumber: true,
              employmentStatus: true,
            },
          },
          business_memberships: {
            include: {
              businesses: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
              permission_templates: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      
      // Transform the response to match frontend expectations
      const transformedUsers = users.map(user => ({
        ...user,
        employee: user.employees || null, // One-to-one relation (not an array)
        businessMemberships: user.businessMemberships?.map(membership => ({
          ...membership,
          business: membership.businesses,
          template: membership.permission_templates,
          businesses: membership.businesses, // Keep for frontend compatibility
          permissionTemplates: membership.permission_templates // Keep for frontend compatibility
        })) || []
      }));
      
      return NextResponse.json(transformedUsers);
    }

    // Check if user has admin permissions in current business
    const userMembership = await prisma.businessMemberships.findFirst({
      where: {
        userId: user.id,
        isActive: true,
      },
      include: {
        businesses: true,
      },
    });

    if (!userMembership) {
      return NextResponse.json({ error: 'No business access' }, { status: 403 });
    }

    const permissions = userMembership.permissions as any;
    if (!permissions.canManageBusinessUsers) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get all users in the current business
    const users = await prisma.users.findMany({
      include: {
        employees: {
          select: {
            id: true,
            fullName: true,
            employeeNumber: true,
            employmentStatus: true,
          },
        },
        business_memberships: {
          where: {
            businessId: userMembership.businessId,
          },
          include: {
            businesses: {
              select: {
                id: true,
                name: true,
              },
            },
            // relation name is permission_templates
            permission_templates: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    // Transform the response to match frontend expectations
    const transformedUsers = users.map(user => ({
      ...user,
      employee: user.employees || null, // One-to-one relation (not an array)
      businessMemberships: user.businessMemberships?.map(membership => ({
        ...membership,
        business: membership.businesses,
        template: membership.permission_templates,
        businesses: membership.businesses, // Keep for frontend compatibility
        permissionTemplates: membership.permission_templates // Keep for frontend compatibility
      })) || []
    }));

    return NextResponse.json(transformedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }


    // System admins can create users without business context
    if (!isSystemAdmin(user)) {
      // Check if user has admin permissions
      const userMembership = await prisma.businessMemberships.findFirst({
        where: {
          userId: user.id,
          isActive: true,
        },
      });

      if (!userMembership) {
        return NextResponse.json({ error: 'No business access' }, { status: 403 });
      }

      const permissions = userMembership.permissions as any;
      if (!permissions.canManageBusinessUsers) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }

    const { 
      name, 
      email, 
      password, 
      role = 'employee',
      systemRole = 'user',
      customPermissions = null,
      sendInvite = false,
      businessAssignments = [],
      linkToEmployee = false,
      employeeId = null
    } = await req.json();

    // Validate required fields
    if (!name || !email || (!password && !sendInvite)) {
      return NextResponse.json(
        { error: 'Name, email, and password (or send invite) are required' },
        { status: 400 }
      );
    }

    // If linking to employee, validate employee exists and is available
    let employeeToLink = null;
    if (linkToEmployee && employeeId) {
      employeeToLink = await prisma.employees.findFirst({
        where: {
          id: employeeId,
          userId: null, // Employee must not already have a user account
        },
        include: {
          employee_business_assignments: {
            include: {
              businesses: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
          },
        },
      });

      if (!employeeToLink) {
        return NextResponse.json(
          { error: 'Employee not found or already has a user account' },
          { status: 400 }
        );
      }
    }

    // Check if user already exists
    const existingUser = await prisma.users.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Generate temporary password if sending invite
    const finalPassword = password || Math.random().toString(36).slice(-10);
    const hashedPassword = await hash(finalPassword, 12);

    // Generate unique ID for the user
    const userId = randomBytes(12).toString('hex');

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.users.create({
        data: {
          id: userId,
          name,
          email,
          passwordHash: hashedPassword,
          role: systemRole,
          isActive: true,
          passwordResetRequired: sendInvite, // Force password change if invited
        }
      });

      // Link to employee if specified
      if (employeeToLink) {
        await tx.employees.update({
          where: { id: employeeToLink.id },
          data: { userId: newUser.id }
        });
      }

      // Create business memberships from businessAssignments (new wizard format)
      const memberships = [];
      if (businessAssignments && businessAssignments.length > 0) {
        for (const assignment of businessAssignments) {
          // Determine permissions to use
          let assignmentPermissions = {};
          if (assignment.useCustomPermissions && assignment.customPermissions) {
            assignmentPermissions = { ...assignment.customPermissions };
            // ensure manager-only flag is not set for non-manager roles
            if (!(assignment.role === 'business-manager' || assignment.role === 'business-owner')) {
              delete (assignmentPermissions as any).canResetExportedPayrollToPreview
            }
          } else {
            assignmentPermissions = BUSINESS_PERMISSION_PRESETS[assignment.role as keyof typeof BUSINESS_PERMISSION_PRESETS] ||
                                   BUSINESS_PERMISSION_PRESETS['employee'];
          }

          const membership = await tx.businessMemberships.create({
            data: {
              id: randomBytes(12).toString('hex'),
              userId: newUser.id,
              businessId: assignment.businessId,
              role: assignment.role,
              permissions: assignmentPermissions,
              templateId: assignment.selectedTemplate || null,
              isActive: true,
              invitedBy: user.id,
              joinedAt: new Date(),
              lastAccessedAt: new Date(),
            }
          });
          memberships.push(membership);
        }
      } else if (employeeToLink && employeeToLink.employee_business_assignments.length > 0) {
        // If linked to employee but no explicit business assignments, inherit from employee
        for (const empAssignment of employeeToLink.employee_business_assignments) {
          const membership = await tx.businessMemberships.create({
            data: {
              id: randomBytes(12).toString('hex'),
              userId: newUser.id,
              businessId: empAssignment.businessId,
              role: 'employee',
              permissions: BUSINESS_PERMISSION_PRESETS['employee'],
              isActive: true,
              invitedBy: user.id,
              joinedAt: new Date(),
              lastAccessedAt: new Date(),
            }
          });
          memberships.push(membership);
        }
      } else if (!isSystemAdmin(user) && systemRole !== 'admin') {
        // Fallback to old logic for backwards compatibility
        const userMembership = await tx.businessMemberships.findFirst({
          where: {
            userId: user.id,
            isActive: true,
          },
        });

        if (userMembership) {
          let userPermissions = customPermissions || 
                                 BUSINESS_PERMISSION_PRESETS[role as keyof typeof BUSINESS_PERMISSION_PRESETS] ||
                                 BUSINESS_PERMISSION_PRESETS['employee'];
          if (userPermissions && !(role === 'business-manager' || role === 'business-owner')) {
            // strip manager-only permission if present
            userPermissions = { ...userPermissions } as any
            delete (userPermissions as any).canResetExportedPayrollToPreview
          }

          const membership = await tx.businessMemberships.create({
            data: {
              id: randomBytes(12).toString('hex'),
              userId: newUser.id,
              businessId: userMembership.businessId,
              role: role,
              permissions: userPermissions,
              isActive: true,
              invitedBy: user.id,
              joinedAt: new Date(),
              lastAccessedAt: new Date(),
            }
          });
          memberships.push(membership);
        }
      }

      return { newUser, memberships };
    });

    // TODO: Send email invitation if sendInvite is true
    // For now, just return the temporary password
    let message = 'User created successfully';
    if (employeeToLink) {
      message += ` and linked to employee ${employeeToLink.fullName}`;
    }
    if (result.memberships.length > 0) {
      message += ` with access to ${result.memberships.length} business(es)`;
    }

    const response: any = {
      success: true,
      message,
      user: {
        id: result.newUser.id,
        name: result.newUser.name,
        email: result.newUser.email,
        role: role,
        systemRole: systemRole,
        passwordResetRequired: result.newUser.passwordResetRequired,
        linkedEmployee: employeeToLink ? {
          id: employeeToLink.id,
          fullName: employeeToLink.fullName,
          employeeNumber: employeeToLink.employeeNumber,
        } : null,
        businessMemberships: result.memberships.length,
      }
    };

    if (sendInvite) {
      response.temporaryPassword = finalPassword;
      response.message += ' with temporary password. User must change password on first login.';
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}