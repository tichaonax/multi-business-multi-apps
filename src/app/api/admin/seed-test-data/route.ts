import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

// Helper: produce a random DOB ensuring age >= 18
function randomDob(minAge = 18, maxAge = 65) {
  const today = new Date()
  const maxDate = new Date()
  maxDate.setFullYear(today.getFullYear() - minAge)
  const minDate = new Date()
  minDate.setFullYear(today.getFullYear() - maxAge)
  const rand = new Date(minDate.getTime() + Math.floor(Math.random() * (maxDate.getTime() - minDate.getTime())))
  return rand
}

// Small runtime type-guard to avoid casting session.user to `any` inline
function isAdmin(session: unknown): boolean {
  if (!session || typeof session !== 'object') return false;
  const maybeUser = (session as any).user;
  return !!maybeUser && typeof maybeUser.role === 'string' && maybeUser.role === 'admin';
}

export async function POST(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!isAdmin(session)) {
      return NextResponse.json({ message: 'Admin access required' }, { status: 401 });
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
      const existingBusiness = await prisma.businesses.findFirst({ where: { name: businessData.name } });

      if (!existingBusiness) {
        const business = await prisma.businesses.create({
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
      const existingUser = await prisma.users.findUnique({ where: { email: userData.email } });

      if (!existingUser) {
        // Add a simple passwordHash for seeded users so the DB required field is satisfied
        const passwordHash = `seeded-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const user = await prisma.users.create({
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

      const existingMembership = await prisma.businessMemberships.findFirst({
        where: {
          userId: user.id,
          businessId: business.id
        }
      });

      if (!existingMembership) {
        await prisma.businessMemberships.create({
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
    const compType = await prisma.compensationTypes.findFirst();
    const jobTitle = await prisma.jobTitles.findFirst();
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

        const existingEmployee = await prisma.employees.findFirst({
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
              const employee = await prisma.employees.create({
                data: {
                  id: randomUUID(),
                  employeeNumber,
                  fullName: employeeData.fullName + ` ${employeeCount + 1}`,
                  firstName,
                  lastName,
                  email: uniqueEmail,
                  phone: employeeData.phone.slice(0, -3) + String(employeeCount + 100).slice(-3),
                  nationalId: employeeData.nationalId.slice(0, -3) + String(employeeCount + 100).slice(-3),
                  // Ensure seeded employees include a dateOfBirth so UI and business logic
                  // that relies on DOB does not encounter missing values.
                  dateOfBirth: randomDob(),
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
                await prisma.employeeContracts.create({
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
    const totalBusinesses = await prisma.businesses.count();
    const totalUsers = await prisma.users.count();
    const totalEmployees = await prisma.employees.count();
    const totalContracts = await prisma.employeeContracts.count();
    const totalMemberships = await prisma.businessMemberships.count();

    return NextResponse.json({
      message: 'Test data created successfully',
      summary: {
        businesses: totalBusinesses,
        users: totalUsers,
        employees: totalEmployees,
        contracts: totalContracts,
        memberships: totalMemberships,
        businessTypes: {
          construction: await prisma.businesses.count({ where: { type: 'construction' } }),
          restaurant: await prisma.businesses.count({ where: { type: 'restaurant' } }),
          grocery: await prisma.businesses.count({ where: { type: 'grocery' } }),
          clothing: await prisma.businesses.count({ where: { type: 'clothing' } }),
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