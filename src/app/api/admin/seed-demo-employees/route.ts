import { NextRequest, NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { getServerUser } from '@/lib/get-server-user'

// Helper function to check admin access


// Helper function to hash password
async function hashPassword(password: string) {
  return await bcrypt.hash(password, 10);
}

// Helper function to generate phone number
function generatePhone() {
  const areaCode = Math.floor(Math.random() * 900) + 100;
  const prefix = Math.floor(Math.random() * 900) + 100;
  const lineNumber = Math.floor(Math.random() * 9000) + 1000;
  return `${areaCode}-${prefix}-${lineNumber}`;
}

// Helper function to generate national ID
function generateNationalId() {
  const part1 = Math.floor(Math.random() * 90) + 10;
  const part2 = Math.floor(Math.random() * 900000) + 100000;
  const part3 = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const part4 = Math.floor(Math.random() * 90) + 10;
  return `${part1}-${part2}${part3}${part4}`;
}

// Helper function to get permission by role
function getPermissionsByRole(role: string, businessType: string) {
  const basePermissions = {
    sales: {
      pos: { access: true, createOrders: true, processPayments: true },
      products: { view: true, checkStock: true },
      customers: { view: true, create: true },
      reports: { viewOwn: true, viewAll: false },
      orders: { viewOwn: true, viewAll: false },
      inventory: { view: true, updateStock: false }
    },
    manager: {
      pos: { access: true, createOrders: true, processPayments: true, voidOrders: true },
      products: { view: true, create: true, edit: true, delete: true },
      customers: { view: true, create: true, edit: true },
      reports: { viewOwn: true, viewAll: true, export: true },
      orders: { viewOwn: true, viewAll: true, edit: true },
      inventory: { view: true, updateStock: true, adjustStock: true },
      employees: { view: true, viewSchedules: true },
      expenses: { view: true, create: true, approve: false }
    },
    staff: {
      pos: { access: false },
      products: { view: true, checkStock: true },
      orders: { viewOwn: false, viewAll: false },
      inventory: { view: true, updateStock: true }
    }
  };

  return JSON.stringify(basePermissions[role as keyof typeof basePermissions] || basePermissions.staff);
}

// Employee data for each business type
const employeesByBusiness: Record<string, Array<{
  firstName: string;
  lastName: string;
  role: string;
  jobTitle: string;
  compensationType: string;
  skipCreate?: boolean;
}>> = {
  'restaurant-demo-business': [
    { firstName: 'Sarah', lastName: 'Johnson', role: 'manager', jobTitle: 'General Manager', compensationType: 'monthly-management' },
    { firstName: 'Michael', lastName: 'Chen', role: 'staff', jobTitle: 'Sales Associate', compensationType: 'hourly-skilled' },
    { firstName: 'Emily', lastName: 'Rodriguez', role: 'sales', jobTitle: 'Sales Representative', compensationType: 'base-plus-commission-low' },
    { firstName: 'David', lastName: 'Williams', role: 'sales', jobTitle: 'Sales Representative', compensationType: 'base-plus-commission-low' }
  ],
  'grocery-demo-business': [
    { firstName: 'James', lastName: 'Brown', role: 'manager', jobTitle: 'Operations Manager', compensationType: 'monthly-management' },
    { firstName: 'Lisa', lastName: 'Garcia', role: 'sales', jobTitle: 'Sales Associate', compensationType: 'hourly-skilled' },
    { firstName: 'Robert', lastName: 'Martinez', role: 'staff', jobTitle: 'Inventory Clerk', compensationType: 'hourly-minimum' },
    { firstName: 'Jennifer', lastName: 'Davis', role: 'sales', jobTitle: 'Sales Associate', compensationType: 'hourly-skilled' }
  ],
  'grocery-demo-2': [
    { firstName: 'William', lastName: 'Miller', role: 'manager', jobTitle: 'General Manager', compensationType: 'monthly-management' },
    { firstName: 'Patricia', lastName: 'Wilson', role: 'sales', jobTitle: 'Sales Associate', compensationType: 'hourly-skilled' },
    { firstName: 'Richard', lastName: 'Moore', role: 'staff', jobTitle: 'Inventory Clerk', compensationType: 'hourly-minimum' }
  ],
  'hardware-demo-business': [
    { firstName: 'Thomas', lastName: 'Anderson', role: 'manager', jobTitle: 'Sales Manager', compensationType: 'monthly-management' },
    { firstName: 'Christopher', lastName: 'Taylor', role: 'sales', jobTitle: 'Sales Representative', compensationType: 'base-plus-commission-low' },
    { firstName: 'Nancy', lastName: 'Thomas', role: 'sales', jobTitle: 'Sales Associate', compensationType: 'hourly-professional' },
    { firstName: 'Daniel', lastName: 'Jackson', role: 'staff', jobTitle: 'Inventory Clerk', compensationType: 'hourly-skilled' }
  ],
  'clothing-demo-business': [
    { firstName: 'Miro', lastName: 'Hwandaza', role: 'manager', jobTitle: 'General Manager', compensationType: 'monthly-management', skipCreate: true },
    { firstName: 'Amanda', lastName: 'Jackson', role: 'sales', jobTitle: 'Sales Associate', compensationType: 'base-plus-commission-high' },
    { firstName: 'Kevin', lastName: 'Thompson', role: 'sales', jobTitle: 'Sales Associate', compensationType: 'base-plus-commission-high' },
    { firstName: 'Sophia', lastName: 'Lee', role: 'sales', jobTitle: 'Sales Representative', compensationType: 'base-plus-commission-high' }
  ]
};

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();

    if ((!user || user.role !== 'admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 });
    }

    // Check for existing demo employees and clean up
    const existingDemoEmployees = await prisma.employees.findMany({
      where: {
        email: {
          contains: '-demo.com'
        }
      },
      include: {
        users: true
      }
    });

    let cleanupCount = 0;
    if (existingDemoEmployees.length > 0) {
      // Delete business memberships first
      for (const emp of existingDemoEmployees) {
        if (emp.userId) {
          await prisma.businessMemberships.deleteMany({
            where: { userId: emp.userId }
          });
        }
      }

      // Delete employees
      await prisma.employees.deleteMany({
        where: {
          email: {
            contains: '-demo.com'
          }
        }
      });

      // Delete users
      await prisma.users.deleteMany({
        where: {
          email: {
            contains: '-demo.com'
          }
        }
      });

      cleanupCount = existingDemoEmployees.length;
    }

    // Get all job titles and compensation types
    const jobTitles = await prisma.jobTitles.findMany();
    const compensationTypes = await prisma.compensationTypes.findMany();

    const jobTitleMap = jobTitles.reduce((acc, jt) => {
      acc[jt.title] = jt.id;
      return acc;
    }, {} as Record<string, string>);

    const compensationTypeMap = compensationTypes.reduce((acc, ct) => {
      acc[ct.id] = ct.id;
      return acc;
    }, {} as Record<string, string>);

    let totalCreated = 0;
    let totalUsers = 0;
    let totalMemberships = 0;
    const createdEmployees: any[] = [];

    // Process each demo business
    for (const [businessId, employees] of Object.entries(employeesByBusiness)) {
      const business = await prisma.businesses.findUnique({
        where: { id: businessId },
        select: { name: true, type: true }
      });

      if (!business) {
        continue;
      }

      for (const empData of employees) {
        if (empData.skipCreate) {
          continue;
        }

        const email = `${empData.firstName.toLowerCase()}.${empData.lastName.toLowerCase()}@${business.type}-demo.com`;
        const fullName = `${empData.firstName} ${empData.lastName}`;

        try {
          // Create user account
          const createdUser = await prisma.users.create({
            data: {
              email: email,
              passwordHash: await hashPassword('Demo@123'),
              name: fullName,
              role: 'user',
              isActive: true,
              createdAt: new Date()
            }
          });
          totalUsers++;

          // Create employee record
          const jobTitleId = jobTitleMap[empData.jobTitle] || jobTitleMap['General Manager'];
          const compensationTypeId = compensationTypeMap[empData.compensationType] || 'monthly-entry';

          const employee = await prisma.employees.create({
            data: {
              userId: user.id,
              fullName: fullName,
              firstName: empData.firstName,
              lastName: empData.lastName,
              email: email,
              phone: generatePhone(),
              employeeNumber: `EMP${String(totalCreated + 1).padStart(4, '0')}`,
              nationalId: generateNationalId(),
              primaryBusinessId: businessId,
              jobTitleId: jobTitleId,
              compensationTypeId: compensationTypeId,
              hireDate: new Date(),
              isActive: true,
              employmentStatus: 'active'
            }
          });
          totalCreated++;

          // Create business membership
          await prisma.businessMemberships.create({
            data: {
              userId: user.id,
              businessId: businessId,
              role: empData.role,
              permissions: getPermissionsByRole(empData.role, business.type),
              isActive: true
            }
          });
          totalMemberships++;

          createdEmployees.push({
            name: fullName,
            email: email,
            business: business.name,
            role: empData.role,
            jobTitle: empData.jobTitle
          });
        } catch (error: any) {
          console.error(`Error creating employee ${fullName}:`, error.message);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Demo employees seeded successfully',
      data: {
        cleanedUp: cleanupCount,
        created: {
          users: totalUsers,
          employees: totalCreated,
          memberships: totalMemberships
        },
        employees: createdEmployees,
        credentials: {
          format: 'firstname.lastname@businesstype-demo.com',
          password: 'Demo@123',
          example: 'sarah.johnson@restaurant-demo.com / Demo@123'
        }
      }
    });

  } catch (error: any) {
    console.error('Error seeding demo employees:', error);
    return NextResponse.json(
      { error: 'Failed to seed demo employees', details: error.message },
      { status: 500 }
    );
  }
}
