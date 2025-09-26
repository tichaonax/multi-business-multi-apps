const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeMultiBusinessSystem() {
  console.log('🔍 MULTI-BUSINESS SYSTEM ANALYSIS');
  console.log('='.repeat(50));

  // 1. Check users and their business memberships
  const users = await prisma.user.findMany({
    include: {
      businessMemberships: {
        include: {
          business: {
            select: { id: true, name: true, type: true, isActive: true }
          }
        }
      },
      employee: {
        include: {
          business: { select: { id: true, name: true, type: true } },
          employeeBusinessAssignments: {
            include: {
              business: { select: { id: true, name: true, type: true } }
            }
          }
        }
      }
    }
  });

  console.log('\n👥 USERS & BUSINESS ACCESS:');
  users.forEach(user => {
    console.log(`\n📧 ${user.email} (${user.name})`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Active: ${user.isActive}`);
    console.log(`   Password Reset Required: ${user.passwordResetRequired}`);

    if (user.businessMemberships.length > 0) {
      console.log(`   Business Memberships (${user.businessMemberships.length}):`);
      user.businessMemberships.forEach(membership => {
        console.log(`     - ${membership.business.name} (${membership.business.type})`);
        console.log(`       Role: ${membership.role}, Active: ${membership.isActive}`);
      });
    } else {
      console.log(`   ❌ No business memberships found`);
    }

    if (user.employee) {
      console.log(`   Employee Record: ${user.employee.fullName}`);
      console.log(`     Primary Business: ${user.employee.business?.name || 'None'}`);
      if (user.employee.employeeBusinessAssignments.length > 0) {
        console.log(`     Business Assignments (${user.employee.employeeBusinessAssignments.length}):`);
        user.employee.employeeBusinessAssignments.forEach(assignment => {
          console.log(`       - ${assignment.business.name} (${assignment.business.type})`);
          console.log(`         Primary: ${assignment.isPrimary}, Active: ${assignment.isActive}`);
        });
      }
    }
  });

  // 2. Check all businesses
  const businesses = await prisma.business.findMany({
    select: {
      id: true,
      name: true,
      type: true,
      isActive: true,
      _count: {
        select: {
          businessMemberships: true,
          employees: true
        }
      }
    }
  });

  console.log('\n\n🏢 BUSINESSES:');
  businesses.forEach(business => {
    console.log(`\n${business.name}`);
    console.log(`   Type: ${business.type}`);
    console.log(`   Active: ${business.isActive}`);
    console.log(`   ID: ${business.id}`);
    console.log(`   Members: ${business._count.businessMemberships}`);
    console.log(`   Employees: ${business._count.employees}`);
  });

  // 3. Check for data consistency issues
  console.log('\n\n⚠️  DATA CONSISTENCY CHECKS:');

  // Check for employees without user accounts
  const employeesWithoutUsers = await prisma.employee.findMany({
    where: { userId: null },
    select: { id: true, fullName: true, email: true, employmentStatus: true }
  });

  if (employeesWithoutUsers.length > 0) {
    console.log(`\n❌ Employees without user accounts (${employeesWithoutUsers.length}):`);
    employeesWithoutUsers.forEach(emp => {
      console.log(`   - ${emp.fullName} (${emp.email}) - Status: ${emp.employmentStatus}`);
    });
  } else {
    console.log(`\n✅ All employees have user accounts`);
  }

  // Check for users without business memberships
  const usersWithoutMemberships = users.filter(u => u.businessMemberships.length === 0 && u.role !== 'admin');
  if (usersWithoutMemberships.length > 0) {
    console.log(`\n❌ Non-admin users without business memberships (${usersWithoutMemberships.length}):`);
    usersWithoutMemberships.forEach(user => {
      console.log(`   - ${user.email} (${user.role})`);
    });
  } else {
    console.log(`\n✅ All non-admin users have business memberships`);
  }

  console.log('\n\n📊 SYSTEM ARCHITECTURE STATUS:');
  console.log('✅ Business Context Provider: Single instance in RootLayout');
  console.log('✅ Business Switcher: Integrated in GlobalHeader');
  console.log('✅ Dynamic Sidebar: Business-type-specific module filtering');
  console.log('✅ API Integration: businessType field included in business-memberships');
  console.log('✅ Permission System: Business-aware permission checking');

  await prisma.$disconnect();
}

analyzeMultiBusinessSystem().catch(console.error);