const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Helper function to hash password
async function hashPassword(password) {
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
function getPermissionsByRole(role, businessType) {
  const basePermissions = {
    // Sales Staff Permissions (Essential for commission tracking!)
    sales: {
      pos: { access: true, createOrders: true, processPayments: true },
      products: { view: true, checkStock: true },
      customers: { view: true, create: true },
      reports: {
        viewOwn: true,  // ⭐ Can see their own sales
        viewAll: false
      },
      orders: { viewOwn: true, viewAll: false },
      inventory: { view: true, updateStock: false }
    },

    // Manager Permissions
    manager: {
      pos: { access: true, createOrders: true, processPayments: true, voidOrders: true },
      products: { view: true, create: true, edit: true, delete: true },
      customers: { view: true, create: true, edit: true },
      reports: {
        viewOwn: true,
        viewAll: true,  // ⭐ Can see all sales for commission management
        export: true
      },
      orders: { viewOwn: true, viewAll: true, edit: true },
      inventory: { view: true, updateStock: true, adjustStock: true },
      employees: { view: true, viewSchedules: true },
      expenses: { view: true, create: true, approve: false }
    },

    // Kitchen/Stock Clerk (Non-sales)
    staff: {
      pos: { access: false },
      products: { view: true, checkStock: true },
      orders: { viewOwn: false, viewAll: false },
      inventory: { view: true, updateStock: true }
    }
  };

  return JSON.stringify(basePermissions[role] || basePermissions.staff);
}

// Employee data for each business type
const employeesByBusiness = {
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
    { firstName: 'Miro', lastName: 'Hwandaza', role: 'manager', jobTitle: 'General Manager', compensationType: 'monthly-management', skipCreate: true }, // Already exists
    { firstName: 'Amanda', lastName: 'Jackson', role: 'sales', jobTitle: 'Sales Associate', compensationType: 'base-plus-commission-high' },
    { firstName: 'Kevin', lastName: 'Thompson', role: 'sales', jobTitle: 'Sales Associate', compensationType: 'base-plus-commission-high' },
    { firstName: 'Sophia', lastName: 'Lee', role: 'sales', jobTitle: 'Sales Representative', compensationType: 'base-plus-commission-high' }
  ]
};

async function seedDemoEmployees() {
  console.log('🌱 Starting demo employee seeding with user accounts and permissions...\n');

  try {
    // Check for existing demo employees and optionally clean up
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

    if (existingDemoEmployees.length > 0) {
      console.log(`⚠️  Found ${existingDemoEmployees.length} existing demo employees`);
      console.log('🗑️  Cleaning up existing demo data to ensure fresh seed...\n');

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

      console.log('✅ Cleanup complete\n');
    }

    // Get all job titles and compensation types for reference
    const jobTitles = await prisma.jobTitles.findMany();
    const compensationTypes = await prisma.compensationTypes.findMany();

    // Create lookup maps
    const jobTitleMap = jobTitles.reduce((acc, jt) => {
      acc[jt.title] = jt.id;
      return acc;
    }, {});

    const compensationTypeMap = compensationTypes.reduce((acc, ct) => {
      acc[ct.id] = ct.id;
      return acc;
    }, {});

    let totalCreated = 0;
    let totalUsers = 0;
    let totalMemberships = 0;

    // Process each demo business
    for (const [businessId, employees] of Object.entries(employeesByBusiness)) {
      console.log(`\n📦 Processing business: ${businessId}`);

      const business = await prisma.businesses.findUnique({
        where: { id: businessId },
        select: { name: true, type: true }
      });

      if (!business) {
        console.log(`  ⚠️  Business not found: ${businessId}`);
        continue;
      }

      console.log(`  Business: ${business.name} (${business.type})`);

      let employeeNumber = 1;

      for (const empData of employees) {
        // Skip if marked to skip (e.g., Miro already exists)
        if (empData.skipCreate) {
          console.log(`  ⏭️  Skipping ${empData.firstName} ${empData.lastName} (already exists)`);
          continue;
        }

        const email = `${empData.firstName.toLowerCase()}.${empData.lastName.toLowerCase()}@${business.type}-demo.com`;
        const fullName = `${empData.firstName} ${empData.lastName}`;

        console.log(`  👤 Creating employee: ${fullName}`);

        try {
          // 1. Create user account
          const user = await prisma.users.create({
            data: {
              email: email,
              passwordHash: await hashPassword('Demo@123'),  // Standard demo password
              name: fullName,
              role: 'user',
              isActive: true,
              createdAt: new Date()
            }
          });
          totalUsers++;
          console.log(`    ✅ User account created: ${email}`);

          // 2. Create employee record
          const jobTitleId = jobTitleMap[empData.jobTitle];
          if (!jobTitleId) {
            console.log(`    ⚠️  Job title not found: ${empData.jobTitle}, using General Manager`);
          }

          const compensationTypeId = compensationTypeMap[empData.compensationType];
          if (!compensationTypeId) {
            console.log(`    ⚠️  Compensation type not found: ${empData.compensationType}, using monthly-entry`);
          }

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
              jobTitleId: jobTitleId || jobTitleMap['General Manager'],
              compensationTypeId: compensationTypeId || 'monthly-entry',
              hireDate: new Date(),
              isActive: true,
              employmentStatus: 'active'
            }
          });
          totalCreated++;
          console.log(`    ✅ Employee record created: ${employee.employeeNumber}`);

          // 3. Create business membership with role-based permissions
          const membership = await prisma.businessMemberships.create({
            data: {
              userId: user.id,
              businessId: businessId,
              role: empData.role,
              permissions: getPermissionsByRole(empData.role, business.type),
              isActive: true
            }
          });
          totalMemberships++;
          console.log(`    ✅ Business membership created with role: ${empData.role}`);

          employeeNumber++;

        } catch (error) {
          console.error(`    ❌ Error creating employee ${fullName}:`, error.message);
        }
      }
    }

    console.log('\n✅ Demo employee seeding complete!');
    console.log(`\n📊 Summary:`);
    console.log(`   - Users created: ${totalUsers}`);
    console.log(`   - Employees created: ${totalCreated}`);
    console.log(`   - Business memberships created: ${totalMemberships}`);
    console.log(`\n🔑 Demo credentials:`);
    console.log(`   - Email: [firstname].[lastname]@[businesstype]-demo.com`);
    console.log(`   - Password: Demo@123`);
    console.log(`   - Example: sarah.johnson@restaurant-demo.com / Demo@123`);

  } catch (error) {
    console.error('❌ Error seeding demo employees:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding function
seedDemoEmployees()
  .then(() => {
    console.log('\n✨ Seeding script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Seeding script failed:', error);
    process.exit(1);
  });
