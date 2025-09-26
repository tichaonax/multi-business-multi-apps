const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcryptjs');
const prisma = new PrismaClient();

// Business permission presets
const BUSINESS_PERMISSION_PRESETS = {
  'business-owner': {
    canViewBusiness: true,
    canEditBusiness: true,
    canDeleteBusiness: true,
    canManageBusinessUsers: true,
    canManageBusinessSettings: true,
    canAccessPersonalFinance: true,
    canAddPersonalExpenses: true,
    canEditPersonalExpenses: true,
    canDeletePersonalExpenses: true,
    canAddMoney: true,
    canManageCategories: true,
    canViewPersonalReports: true,
    canExportPersonalData: true,
    canAccessConstruction: true,
    canCreateProjects: true,
    canEditProjects: true,
    canDeleteProjects: true,
    canManageContractors: true,
    canViewProjectReports: true,
    canManageProjectPayments: true,
    canViewUsers: true,
    canInviteUsers: true,
    canEditUserPermissions: true,
    canRemoveUsers: true,
    canViewAuditLogs: true,
    canExportBusinessData: true,
    canImportBusinessData: true,
    canBackupBusiness: true,
    canRestoreBusiness: true,
    canManageSystemSettings: false,
    canViewSystemLogs: false,
    canManageAllBusinesses: false,
  },
  'employee': {
    canViewBusiness: true,
    canEditBusiness: false,
    canDeleteBusiness: false,
    canManageBusinessUsers: false,
    canManageBusinessSettings: false,
    canAccessPersonalFinance: true,
    canAddPersonalExpenses: true,
    canEditPersonalExpenses: true,
    canDeletePersonalExpenses: false,
    canAddMoney: true,
    canManageCategories: false,
    canViewPersonalReports: true,
    canExportPersonalData: true,
    canAccessConstruction: true,
    canCreateProjects: false,
    canEditProjects: false,
    canDeleteProjects: false,
    canManageContractors: false,
    canViewProjectReports: false,
    canManageProjectPayments: false,
    canViewUsers: true,
    canInviteUsers: false,
    canEditUserPermissions: false,
    canRemoveUsers: false,
    canViewAuditLogs: false,
    canExportBusinessData: false,
    canImportBusinessData: false,
    canBackupBusiness: false,
    canRestoreBusiness: false,
    canManageSystemSettings: false,
    canViewSystemLogs: false,
    canManageAllBusinesses: false,
  }
};

async function createUser() {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.log('Usage: node create-user.js <name> <email> <password> [businessId] [role]');
    console.log('Example: node create-user.js "John Doe" "john@example.com" "password123"');
    console.log('Example with business: node create-user.js "Jane Smith" "jane@example.com" "password123" "business-id" "employee"');
    process.exit(1);
  }

  const [name, email, password, businessId, role = 'employee'] = args;

  try {
    console.log('🚀 Creating user...');

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      console.error('❌ User with this email already exists');
      return;
    }

    // Hash password
    const hashedPassword = await hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hashedPassword,
        role: 'user',
        is_active: true,
      }
    });

    console.log(`👤 Created user: ${user.name} (${user.email})`);

    // If business ID is provided, add user to that business
    if (businessId) {
      // Check if business exists
      const business = await prisma.business.findUnique({
        where: { id: businessId }
      });

      if (!business) {
        console.error('❌ Business not found');
        return;
      }

      // Create business membership
      const membership = await prisma.businessMembership.create({
        data: {
          user_id: user.id,
          business_id: business.id,
          role: role,
          permissions: BUSINESS_PERMISSION_PRESETS[role] || BUSINESS_PERMISSION_PRESETS['employee'],
          is_active: true,
          joined_at: new Date(),
          last_accessed_at: new Date(),
        }
      });

      console.log(`🏢 Added to business: ${business.name} as ${role}`);
    }

    console.log('✅ User created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Also provide a function to list businesses for reference
async function listBusinesses() {
  try {
    const businesses = await prisma.business.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        is_active: true,
      },
      where: {
        is_active: true,
      }
    });

    console.log('\n📋 Available Businesses:');
    businesses.forEach(business => {
      console.log(`  ID: ${business.id} | Name: ${business.name} | Type: ${business.type}`);
    });
    console.log('\n');
  } catch (error) {
    console.error('Error listing businesses:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Check if user wants to list businesses
if (process.argv[2] === 'list-businesses') {
  listBusinesses();
} else {
  createUser();
}