import { NextRequest, NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permission-utils';
import { getServerUser } from '@/lib/get-server-user'

export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!hasPermission(user as any, 'canViewEmployees')) {
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
        job_titles: {
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
        title: Array.isArray(employee.job_titles) ? (employee.job_titles[0]?.title || null) : (employee.job_titles?.title || null),
        department: Array.isArray(employee.job_titles) ? (employee.job_titles[0]?.department || null) : (employee.job_titles?.department || null),
        level: Array.isArray(employee.job_titles) ? (employee.job_titles[0]?.level || null) : (employee.job_titles?.level || null)
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