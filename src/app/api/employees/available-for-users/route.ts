import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permission-utils';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!hasPermission(session.user as any, 'canViewEmployees')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const businessId = searchParams.get('businessId');
    const status = searchParams.get('status') || 'active';
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build where clause
    let whereClause: any = {
      userId: null, // Only employees without user accounts
      isActive: status === 'active' ? true : status === 'inactive' ? false : undefined
    };

    // Add business filter
    if (businessId) {
      whereClause.OR = [
        { primaryBusinessId: businessId },
        { 
          employeeBusinessAssignments: {
            some: {
              businessId: businessId,
              isActive: true
            }
          }
        }
      ];
    }

    // Add search filter
    if (search) {
      whereClause.OR = [
        ...(whereClause.OR || []),
        { fullName: { contains: search, mode: 'insensitive' } },
        { employeeNumber: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { nationalId: { contains: search, mode: 'insensitive' } }
      ];
    }

    const employees = await prisma.employee.findMany({
      where: whereClause,
      select: {
        id: true,
        fullName: true,
        firstName: true,
        lastName: true,
        employeeNumber: true,
        email: true,
        phone: true,
        employmentStatus: true,
        isActive: true,
        hireDate: true,
        jobTitles: {
          select: {
            title: true,
            department: true,
            level: true
          }
        },
        business: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        employeeBusinessAssignments: {
          where: { isActive: true },
          select: {
            business: {
              select: {
                id: true,
                name: true,
                type: true
              }
            },
            role: true,
            isPrimary: true
          }
        }
      },
      orderBy: [
        { isActive: 'desc' },
        { fullName: 'asc' }
      ],
      take: limit
    });

    // Format response
    const formattedEmployees = employees.map(employee => ({
      id: employee.id,
      fullName: employee.fullName,
      firstName: employee.firstName,
      lastName: employee.lastName,
      employeeNumber: employee.employeeNumber,
      email: employee.email,
      phone: employee.phone,
      employmentStatus: employee.employmentStatus,
      isActive: employee.isActive,
      hireDate: employee.hireDate,
      jobTitle: {
        title: employee.jobTitles.title,
        department: employee.jobTitles.department,
        level: employee.jobTitles.level
      },
      primaryBusiness: {
        id: employee.business.id,
        name: employee.business.name,
        type: employee.business.type
      },
      businessAssignments: employee.employeeBusinessAssignments.map(assignment => ({
        business: assignment.business,
        role: assignment.role,
        isPrimary: assignment.isPrimary
      }))
    }));

    return NextResponse.json({
      employees: formattedEmployees,
      count: formattedEmployees.length,
      hasMore: formattedEmployees.length === limit,
      filters: {
        search: search || null,
        businessId: businessId || null,
        status,
        limit
      }
    });

  } catch (error) {
    console.error('Error fetching available employees:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available employees' },
      { status: 500 }
    );
  }
}