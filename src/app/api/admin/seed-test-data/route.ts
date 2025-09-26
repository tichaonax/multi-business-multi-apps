import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
    const testBusinesses = [
      {
        name: 'TechCorp Solutions',
        businessType: 'construction',
        industry: 'Technology',
        address: '123 Innovation Drive, Harare',
        phone: '+263712345678',
        email: 'info@techcorp.co.zw',
        website: 'https://techcorp.co.zw',
        description: 'Leading construction and technology solutions provider'
      },
      {
        name: 'Savanna Restaurant',
        businessType: 'restaurant',
        industry: 'Food & Beverage',
        address: '456 Food Street, Bulawayo',
        phone: '+263787654321',
        email: 'orders@savanna.co.zw',
        website: 'https://savanna.co.zw',
        description: 'Authentic African cuisine and fine dining experience'
      },
      {
        name: 'Green Grocers',
        businessType: 'grocery',
        industry: 'Retail',
        address: '789 Market Square, Gweru',
        phone: '+263711122334',
        email: 'sales@greengrocers.co.zw',
        website: 'https://greengrocers.co.zw',
        description: 'Fresh produce and grocery supplies'
      },
      {
        name: 'Fashion Forward',
        businessType: 'clothing',
        industry: 'Fashion',
        address: '321 Style Avenue, Mutare',
        phone: '+263798765432',
        email: 'info@fashionforward.co.zw',
        website: 'https://fashionforward.co.zw',
        description: 'Contemporary fashion and clothing retail'
      }
    ];

    const businesses = [];
    for (const businessData of testBusinesses) {
      const existingBusiness = await prisma.business.findFirst({
        where: { name: businessData.name }
      });

      if (!existingBusiness) {
        const business = await prisma.business.create({
          data: {
            ...businessData,
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
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email }
      });

      if (!existingUser) {
        const user = await prisma.user.create({
          data: {
            ...userData,
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
          const employee = await prisma.employee.create({
            data: {
              employeeNumber,
              fullName: employeeData.fullName + ` ${employeeCount + 1}`,
              email: uniqueEmail,
              phone: employeeData.phone.slice(0, -3) + String(employeeCount + 100).slice(-3),
              nationalId: employeeData.nationalId.slice(0, -3) + String(employeeCount + 100).slice(-3),
              primaryBusinessId: business.id,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            }
          });

          // Create an employee contract
          await prisma.employeeContract.create({
            data: {
              employeeId: employee.id,
              businessId: business.id,
              contractType: 'permanent',
              position: employeeData.position,
              department: employeeData.department,
              salary: employeeData.salary,
              startDate: new Date(),
              contractStatus: 'active',
              createdAt: new Date(),
              updatedAt: new Date(),
            }
          });
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
          construction: await prisma.business.count({ where: { businessType: 'construction' } }),
          restaurant: await prisma.business.count({ where: { businessType: 'restaurant' } }),
          grocery: await prisma.business.count({ where: { businessType: 'grocery' } }),
          clothing: await prisma.business.count({ where: { businessType: 'clothing' } }),
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