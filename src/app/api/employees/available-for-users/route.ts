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
          employee_business_assignments: {
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

    const employees = await prisma.employees.findMany({
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
        businesses: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        employee_business_assignments: {
          where: { isActive: true },
          select: {
            businesses: {
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
    }) as any;

    // Format response and attach primaryBusiness (first business) for compatibility
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
      job_titles: {
        title: Array.isArray(employee.jobTitles) ? (employee.jobTitles[0]?.title || null) : (employee.jobTitles?.title || null),
        department: Array.isArray(employee.jobTitles) ? (employee.jobTitles[0]?.department || null) : (employee.jobTitles?.department || null),
        level: Array.isArray(employee.jobTitles) ? (employee.jobTitles[0]?.level || null) : (employee.jobTitles?.level || null)
      },
      primaryBusiness: (Array.isArray(employee.businesses) && employee.businesses.length > 0)
        ? {
            id: employee.businesses[0].id,
            name: employee.businesses[0].name,
            type: employee.businesses[0].type
          }
        : { id: null, name: null, type: null },
      businessAssignments: (employee.employee_business_assignments || []).map((assignment: any) => ({
        business: assignment.businesses,
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