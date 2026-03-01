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
    { firstName: 'Marcus', lastName: 'Thompson', role: 'finance-manager', jobTitle: 'Finance Manager', compensationType: 'monthly-management' },
    { firstName: 'Michael', lastName: 'Chen', role: 'staff', jobTitle: 'Sales Associate', compensationType: 'hourly-skilled' },
    { firstName: 'Emily', lastName: 'Rodriguez', role: 'sales', jobTitle: 'Sales Representative', compensationType: 'base-plus-commission-low' },
    { firstName: 'David', lastName: 'Williams', role: 'sales', jobTitle: 'Sales Representative', compensationType: 'base-plus-commission-low' }
  ],
  'grocery-demo-1': [
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
    // Check for existing demo employees AND users (query both independently — employees may have been
    // partially deleted in a previous run, leaving orphan users that block re-creation)
    const existingDemoEmployees = await prisma.employees.findMany({
      where: { email: { contains: '-demo.com' } },
      include: { users: true }
    });
    const existingDemoUsers = await prisma.users.findMany({
      where: { email: { contains: '-demo.com' } },
      select: { id: true, email: true }
    });

    const hasExistingData = existingDemoEmployees.length > 0 || existingDemoUsers.length > 0;

    if (hasExistingData) {
      console.log(`⚠️  Found ${existingDemoEmployees.length} existing demo employees, ${existingDemoUsers.length} demo users`);
      console.log('🗑️  Cleaning up existing demo data to ensure fresh seed...\n');

      // Get employee IDs and user IDs from both sources (handle split state)
      const employeeIds = existingDemoEmployees.map(emp => emp.id);
      const demoUserIdsFromEmps = existingDemoEmployees.map(emp => emp.userId).filter(Boolean);
      const demoUserIdsFromUsers = existingDemoUsers.map(u => u.id);
      const demoUserIds = [...new Set([...demoUserIdsFromEmps, ...demoUserIdsFromUsers])];

      // --- Meal program cleanup (must happen FIRST — references employees AND users via RESTRICT FKs) ---
      // Find meal program participants linked to these employees
      const mealParticipants = await prisma.mealProgramParticipants.findMany({
        where: { employeeId: { in: employeeIds } },
        select: { id: true }
      });
      const participantIds = mealParticipants.map(p => p.id);

      // Delete MealProgramTransactions (references participantId + soldByUserId — both RESTRICT)
      if (participantIds.length > 0) {
        await prisma.mealProgramTransactions.deleteMany({ where: { participantId: { in: participantIds } } });
      }
      if (demoUserIds.length > 0) {
        // Catch any remaining transactions where the seller is a demo user
        await prisma.mealProgramTransactions.deleteMany({ where: { soldByUserId: { in: demoUserIds } } });
      }
      // Delete MealProgramEligibleItems (references createdBy user — RESTRICT)
      if (demoUserIds.length > 0) {
        await prisma.mealProgramEligibleItems.deleteMany({ where: { createdBy: { in: demoUserIds } } });
      }
      // Delete MealProgramParticipants (references registeredBy user — RESTRICT)
      if (participantIds.length > 0) {
        await prisma.mealProgramParticipants.deleteMany({ where: { id: { in: participantIds } } });
      }
      if (demoUserIds.length > 0) {
        await prisma.mealProgramParticipants.deleteMany({ where: { registeredBy: { in: demoUserIds } } });
      }
      // --- End meal program cleanup ---

      // Delete related records that have RESTRICT constraint
      // These MUST be deleted BEFORE employees to avoid foreign key constraint violations

      // 1. Delete PayrollAccountPayments (RESTRICT constraint on employeeId)
      const deletedPayrollPayments = await prisma.payrollAccountPayments.deleteMany({
        where: {
          employeeId: { in: employeeIds }
        }
      });
      console.log(`   Deleted ${deletedPayrollPayments.count} payroll account payments`);

      // 2. Delete DisciplinaryActions where employee is the creator (RESTRICT constraint on createdBy)
      const deletedDisciplinaryActions = await prisma.disciplinaryActions.deleteMany({
        where: {
          createdBy: { in: employeeIds }
        }
      });
      console.log(`   Deleted ${deletedDisciplinaryActions.count} disciplinary actions (as creator)`);

      // Delete BusinessTransactions created by demo users (order revenue — RESTRICT FK on createdBy)
      if (demoUserIds.length > 0) {
        const deletedBizTxns = await prisma.businessTransactions.deleteMany({
          where: { createdBy: { in: demoUserIds } }
        });
        console.log(`   Deleted ${deletedBizTxns.count} business transactions created by demo users`);
      }

      // Delete business memberships for all demo users
      if (demoUserIds.length > 0) {
        await prisma.businessMemberships.deleteMany({
          where: { userId: { in: demoUserIds } }
        });
      }

      // Delete employees (cascading deletes will handle employee_* tables)
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

    // Get admin user for contract createdBy
    const adminUser = await prisma.users.findFirst({
      where: { email: 'admin@business.local' },
      select: { id: true }
    });

    // Schedule config per business type
    const scheduleByType = {
      restaurant: { scheduledStartTime: '08:00', scheduledEndTime: '17:00', scheduledDaysPerWeek: 6 },
      grocery:    { scheduledStartTime: '08:00', scheduledEndTime: '17:00', scheduledDaysPerWeek: 6 },
      hardware:   { scheduledStartTime: '08:00', scheduledEndTime: '17:00', scheduledDaysPerWeek: 5 },
      clothing:   { scheduledStartTime: '08:00', scheduledEndTime: '18:00', scheduledDaysPerWeek: 6 },
    };

    // Monthly base salary by compensation type (used for employment contracts)
    const salaryByCompType = {
      'monthly-management': 2500,
      'monthly-professional': 1500,
      'monthly-skilled': 1200,
      'monthly-executive': 5000,
      'monthly-entry': 700,
      'base-plus-commission-high': 1500,
      'base-plus-commission-low': 800,
      'hourly-skilled': 1200,
      'hourly-professional': 1800,
      'hourly-minimum': 700,
    };

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

      const schedule = scheduleByType[business.type.toLowerCase()] || scheduleByType.restaurant;

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
          // Determine user-level permissions based on role
          let userPermissions = {};

          // Finance managers get FULL expense account permissions
          if (empData.role === 'finance-manager') {
            userPermissions = {
              canAccessExpenseAccount: true,
              canCreateExpenseAccount: true,
              canMakeExpenseDeposits: true,
              canMakeExpensePayments: true,
              canViewExpenseReports: true,
              canCreateIndividualPayees: true,
              canDeleteExpenseAccounts: true,
              canAdjustExpensePayments: true
            };
            console.log(`    💰 Granting FULL expense account permissions to Finance Manager`);
          }
          // Regular managers get limited expense account permissions
          else if (empData.role === 'manager') {
            userPermissions = {
              canAccessExpenseAccount: true,
              canMakeExpensePayments: true,
              canViewExpenseReports: true,
              canCreateIndividualPayees: true
            };
            console.log(`    🔑 Granting expense account permissions to manager`);
          }

          // 1. Create user account
          const user = await prisma.users.create({
            data: {
              email: email,
              passwordHash: await hashPassword('Demo@123'),  // Standard demo password
              name: fullName,
              role: 'user',
              isActive: true,
              permissions: userPermissions,
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
              hireDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
              isActive: true,
              employmentStatus: 'active',
              scheduledStartTime: schedule.scheduledStartTime,
              scheduledEndTime: schedule.scheduledEndTime,
              scheduledDaysPerWeek: schedule.scheduledDaysPerWeek,
            }
          });
          totalCreated++;
          console.log(`    ✅ Employee record created: ${employee.employeeNumber} (schedule: ${schedule.scheduledStartTime}–${schedule.scheduledEndTime})`);

          // 2b. Create active employment contract
          try {
            const baseSalary = salaryByCompType[empData.compensationType] || 1000;
            const isCommission = empData.compensationType.includes('commission');
            const isHourly = empData.compensationType.includes('hourly');
            await prisma.employeeContracts.create({
              data: {
                contractNumber: `CONT-${employee.employeeNumber}`,
                employeeId: employee.id,
                primaryBusinessId: businessId,
                jobTitleId: employee.jobTitleId,
                compensationTypeId: employee.compensationTypeId,
                baseSalary,
                status: 'active',
                isSalaryBased: !isCommission && !isHourly,
                isCommissionBased: isCommission,
                startDate: employee.hireDate,
                createdBy: adminUser?.id,
                approvedAt: employee.hireDate,
                approvedBy: adminUser?.id,
              }
            });
            console.log(`    ✅ Employment contract created: CONT-${employee.employeeNumber} ($${baseSalary}/mo)`);
          } catch (contractErr) {
            console.log(`    ⚠️  Contract skipped: ${contractErr.message}`);
          }

          // 3. Create business membership with role-based permissions
          // Map finance-manager to 'manager' for business membership (business roles are limited)
          const businessRole = empData.role === 'finance-manager' ? 'manager' : empData.role;

          const membership = await prisma.businessMemberships.create({
            data: {
              userId: user.id,
              businessId: businessId,
              role: businessRole,
              permissions: getPermissionsByRole(empData.role, business.type),
              isActive: true
            }
          });
          totalMemberships++;
          console.log(`    ✅ Business membership created with role: ${businessRole}`);

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
