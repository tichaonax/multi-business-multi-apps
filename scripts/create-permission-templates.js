const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const sampleTemplates = [
  {
    name: 'Store Manager',
    businessType: 'clothing',
    permissions: {
      // Core permissions
      canViewBusinessReports: true,
      canManageBusinessUsers: false,
      canEditBusinessSettings: false,
      canAccessFinancialData: true,
      
      // Clothing-specific permissions
      canViewInventory: true,
      canManageInventory: true,
      canManageSizeVariants: true,
      canViewSeasonalReports: true,
      canManageSeasonalCollections: false,
      canViewSupplierInfo: true,
      canManageSupplierInfo: false,
      canProcessReturns: true,
      canManageDiscounts: true
    }
  },
  {
    name: 'Inventory Specialist',
    businessType: 'clothing',
    permissions: {
      // Core permissions
      canViewBusinessReports: false,
      canManageBusinessUsers: false,
      canEditBusinessSettings: false,
      canAccessFinancialData: false,
      
      // Clothing-specific permissions
      canViewInventory: true,
      canManageInventory: true,
      canManageSizeVariants: true,
      canViewSeasonalReports: false,
      canManageSeasonalCollections: false,
      canViewSupplierInfo: true,
      canManageSupplierInfo: true,
      canProcessReturns: false,
      canManageDiscounts: false
    }
  },
  {
    name: 'Kitchen Manager',
    businessType: 'restaurant',
    permissions: {
      // Core permissions
      canViewBusinessReports: true,
      canManageBusinessUsers: false,
      canEditBusinessSettings: false,
      canAccessFinancialData: false,
      
      // Restaurant-specific permissions
      canViewMenu: true,
      canManageMenu: true,
      canManageKitchenOperations: true,
      canViewKitchenReports: true,
      canManageIngredientInventory: true,
      canViewSupplierInfo: true,
      canManageReservations: false,
      canProcessOrders: true,
      canManageStaff: true
    }
  },
  {
    name: 'Server',
    businessType: 'restaurant',
    permissions: {
      // Core permissions
      canViewBusinessReports: false,
      canManageBusinessUsers: false,
      canEditBusinessSettings: false,
      canAccessFinancialData: false,
      
      // Restaurant-specific permissions
      canViewMenu: true,
      canManageMenu: false,
      canManageKitchenOperations: false,
      canViewKitchenReports: false,
      canManageIngredientInventory: false,
      canViewSupplierInfo: false,
      canManageReservations: true,
      canProcessOrders: true,
      canManageStaff: false
    }
  },
  {
    name: 'Site Supervisor',
    businessType: 'construction',
    permissions: {
      // Core permissions
      canViewBusinessReports: true,
      canManageBusinessUsers: false,
      canEditBusinessSettings: false,
      canAccessFinancialData: true,
      
      // Construction-specific permissions
      canViewProjects: true,
      canManageProjects: true,
      canViewBlueprints: true,
      canManageBlueprints: false,
      canManageContractors: true,
      canViewSafetyReports: true,
      canManageSafetyReports: true,
      canManageEquipment: true,
      canViewProgressReports: true
    }
  }
];

async function main() {
  console.log('🛠️  Creating sample permission templates...');
  
  // Find the first admin user to assign as creator
  const adminUser = await prisma.user.findFirst({
    where: { role: 'admin' }
  });
  
  if (!adminUser) {
    console.error('❌ No admin user found. Please create an admin user first.');
    return;
  }
  
  console.log(`📋 Found admin user: ${adminUser.name} (${adminUser.email})`);
  
  // Create templates
  for (const template of sampleTemplates) {
    try {
      const createdTemplate = await prisma.permissionTemplate.create({
        data: {
          name: template.name,
          businessType: template.businessType,
          permissions: template.permissions,
          createdBy: adminUser.id,
          isActive: true
        }
      });
      
      console.log(`✅ Created template: "${template.name}" for ${template.businessType} business type`);
    } catch (error) {
      console.error(`❌ Failed to create template "${template.name}":`, error.message);
    }
  }
  
  // Show summary
  const totalTemplates = await prisma.permissionTemplate.count({
    where: { isActive: true }
  });
  
  console.log(`\n🎉 Permission template creation complete!`);
  console.log(`📊 Total active templates: ${totalTemplates}`);
  console.log(`🔗 Access templates at: http://localhost:3001/admin/permission-templates`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });