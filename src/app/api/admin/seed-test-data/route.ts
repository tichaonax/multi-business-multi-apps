import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

export async function POST(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 401 }
      );
    }

    // Create sample businesses if they don't exist
    // NOTE: map only fields that exist on the Business model to avoid sending unexpected keys to Prisma
    const testBusinesses = [
      {
        name: 'TechCorp Solutions',
        type: 'construction',
        description: 'Leading construction and technology solutions provider'
      },
      {
        name: 'Savanna Restaurant',
        type: 'restaurant',
        description: 'Authentic African cuisine and fine dining experience'
      },
      {
        name: 'Green Grocers',
        type: 'grocery',
        description: 'Fresh produce and grocery supplies'
      },
      {
        name: 'Fashion Forward',
        type: 'clothing',
        description: 'Contemporary fashion and clothing retail'
      }
    ];

    const businesses = [];
    for (const businessData of testBusinesses) {
      const existingBusiness = await prisma.business.findFirst({ where: { name: businessData.name } });

      if (!existingBusiness) {
        const business = await prisma.business.create({
          data: {
            id: randomUUID(),
            name: businessData.name,
            type: businessData.type || 'other',
            description: businessData.description || null,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        });
        businesses.push(business);
      } else {
        businesses.push(existingBusiness);
      }
    }

    // Create test users if they don't exist
    const testUsers = [
      { name: 'Alice Johnson', email: 'alice@test.com', role: 'manager' },
      { name: 'Bob Smith', email: 'bob@test.com', role: 'employee' },
      { name: 'Carol Davis', email: 'carol@test.com', role: 'manager' },
      { name: 'David Wilson', email: 'david@test.com', role: 'employee' },
      { name: 'Emma Brown', email: 'emma@test.com', role: 'employee' },
    ];

    const users = [];
    for (const userData of testUsers) {
      const existingUser = await prisma.user.findUnique({ where: { email: userData.email } });

      if (!existingUser) {
        // Add a simple passwordHash for seeded users so the DB required field is satisfied
        const passwordHash = `seeded-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const user = await prisma.user.create({
          data: {
            id: randomUUID(),
            name: userData.name,
            email: userData.email,
            role: userData.role || 'user',
            passwordHash,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        });
        users.push(user);
      } else {
        users.push(existingUser);
      }
    }

    // Create business memberships for users
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const business = businesses[i % businesses.length]; // Distribute users across businesses

      const existingMembership = await prisma.businessMembership.findFirst({
        where: {
          userId: user.id,
          businessId: business.id
        }
      });

      if (!existingMembership) {
        await prisma.businessMembership.create({
          data: {
            id: randomUUID(),
            userId: user.id,
            businessId: business.id,
            role: user.role,
            isActive: true,
            permissions: {},
            joinedAt: new Date(),
          }
        });
      }
    }

    // Create sample employees for each business
    const sampleEmployees = [
      {
        fullName: 'John Doe',
        email: 'john.doe@company.com',
        phone: '+263712345001',
        nationalId: '63-123456A78',
        position: 'Site Manager',
        department: 'Construction',
        salary: 1200.00,
      },
      {
        fullName: 'Jane Smith',
        email: 'jane.smith@company.com',
        phone: '+263712345002',
        nationalId: '63-234567B89',
        position: 'Chef',
        department: 'Kitchen',
        salary: 800.00,
      },
      {
        fullName: 'Mike Johnson',
        email: 'mike.johnson@company.com',
        phone: '+263712345003',
        nationalId: '63-345678C90',
        position: 'Store Manager',
        department: 'Retail',
        salary: 950.00,
      },
      {
        fullName: 'Sarah Wilson',
        email: 'sarah.wilson@company.com',
        phone: '+263712345004',
        nationalId: '63-456789D01',
        position: 'Sales Associate',
        department: 'Sales',
        salary: 600.00,
      },
    ];

    let employeeCount = 0;
    // Check for required reference data before creating employees (avoid FK failures)
    const compType = await prisma.compensationType.findFirst();
    const jobTitle = await prisma.jobTitle.findFirst();
    const canCreateEmployees = Boolean(compType && jobTitle);

    for (let businessIndex = 0; businessIndex < businesses.length; businessIndex++) {
      const business = businesses[businessIndex];

      // Create 2-3 employees per business
      const employeesToCreate = Math.floor(Math.random() * 2) + 2;

      for (let i = 0; i < employeesToCreate; i++) {
        const employeeData = sampleEmployees[employeeCount % sampleEmployees.length];

        // Generate unique employee number
        const employeeNumber = `EMP${(1000 + employeeCount).toString()}`;

        // Adjust email to be unique
        const uniqueEmail = employeeData.email.replace('@company.com', `${employeeCount}@${business.name.toLowerCase().replace(/\s+/g, '')}.com`);

        const existingEmployee = await prisma.employee.findFirst({
          where: {
            OR: [
              { email: uniqueEmail },
              { employeeNumber: employeeNumber }
            ]
          }
        });

        if (!existingEmployee) {
          if (!canCreateEmployees) {
            console.warn('Skipping employee creation; missing compensation types or job titles')
          } else {
            try {
              const [firstName, ...rest] = employeeData.fullName.split(' ')
              const lastName = rest.join(' ') || ''
              const employee = await prisma.employee.create({
                data: {
                  id: randomUUID(),
                  employeeNumber,
                  fullName: employeeData.fullName + ` ${employeeCount + 1}`,
                  firstName,
                  lastName,
                  email: uniqueEmail,
                  phone: employeeData.phone.slice(0, -3) + String(employeeCount + 100).slice(-3),
                  nationalId: employeeData.nationalId.slice(0, -3) + String(employeeCount + 100).slice(-3),
                  primaryBusinessId: business.id,
                  compensationTypeId: compType!.id,
                  jobTitleId: jobTitle!.id,
                  hireDate: new Date(),
                  isActive: true,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                }
              });

              // Create an employee contract with required FK references
              try {
                await prisma.employeeContract.create({
                  data: {
                    id: randomUUID(),
                    employeeId: employee.id,
                    primaryBusinessId: business.id,
                    contractNumber: `CT-${employeeNumber}`,
                    baseSalary: employeeData.salary,
                    compensationTypeId: compType!.id,
                    jobTitleId: jobTitle!.id,
                    startDate: new Date(),
                    updatedAt: new Date(),
                    createdAt: new Date(),
                    status: 'active',
                  }
                });
              } catch (contractErr) {
                console.warn('Skipping employee contract creation due to error:', String(contractErr));
              }
            } catch (empErr) {
              console.warn('Skipping employee creation due to error:', String(empErr));
            }
          }
        }

        employeeCount++;
      }
    }

    // Get summary of created data
    const totalBusinesses = await prisma.business.count();
    const totalUsers = await prisma.user.count();
    const totalEmployees = await prisma.employee.count();
    const totalContracts = await prisma.employeeContract.count();
    const totalMemberships = await prisma.businessMembership.count();

    return NextResponse.json({
      message: 'Test data created successfully',
      summary: {
        businesses: totalBusinesses,
        users: totalUsers,
        employees: totalEmployees,
        contracts: totalContracts,
        memberships: totalMemberships,
        businessTypes: {
          construction: await prisma.business.count({ where: { type: 'construction' } }),
          restaurant: await prisma.business.count({ where: { type: 'restaurant' } }),
          grocery: await prisma.business.count({ where: { type: 'grocery' } }),
          clothing: await prisma.business.count({ where: { type: 'clothing' } }),
        }
      }
    });

  } catch (error) {
    console.error('Error creating test data:', error);
    return NextResponse.json(
      { message: 'Failed to create test data', error: String(error) },
      { status: 500 }
    );
  }
}