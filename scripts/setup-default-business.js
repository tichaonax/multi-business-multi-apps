const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Business permission presets (copied from our TypeScript types)
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
  }
};

async function setupDefaultBusiness() {
  try {
    console.log('🚀 Setting up default business...');

    // Get the first user (assuming this is you)
    const user = await prisma.user.findFirst({
      orderBy: { createdAt: 'asc' }
    });

    if (!user) {
      console.error('❌ No users found. Please create a user account first.');
      return;
    }

    console.log(`📋 Found user: ${user.email}`);

    // Check if user already has business memberships
    const existingMembership = await prisma.businessMembership.findFirst({
      where: { userId: user.id }
    });

    if (existingMembership) {
      console.log('✅ User already has business memberships');
      return;
    }

    // Create a default business
    const business = await prisma.business.create({
      data: {
        name: 'My Business',
        type: 'general',
        description: 'Default business for personal and construction management',
        createdBy: user.id,
        isActive: true,
      }
    });

    console.log(`🏢 Created business: ${business.name} (ID: ${business.id})`);

    // Create business membership with owner permissions
    const membership = await prisma.businessMembership.create({
      data: {
        userId: user.id,
        businessId: business.id,
        role: 'business-owner',
        permissions: BUSINESS_PERMISSION_PRESETS['business-owner'],
        isActive: true,
        joinedAt: new Date(),
        lastAccessedAt: new Date(),
      }
    });

    console.log(`👥 Created membership: ${user.email} as business-owner`);
    console.log('✅ Setup complete! You can now access the personal finance module.');
    
  } catch (error) {
    console.error('❌ Error setting up default business:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupDefaultBusiness();