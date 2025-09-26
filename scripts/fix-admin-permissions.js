const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateAdminPermissions() {
  try {
    // Get all admin business memberships
    const adminMemberships = await prisma.businessMembership.findMany({
      where: {
        user: { email: 'admin@business.local' },
        isActive: true
      },
      include: { business: true }
    });

    console.log('Updating', adminMemberships.length, 'business memberships...');

    for (const membership of adminMemberships) {
      const currentPermissions = membership.permissions || {};

      // Add missing permissions
      const updatedPermissions = {
        ...currentPermissions,
        canViewUsers: true,           // Required for business management
        canAccessFinancialData: true  // Required for loan management
      };

      await prisma.businessMembership.update({
        where: { id: membership.id },
        data: { permissions: updatedPermissions }
      });

      console.log('✓ Updated', membership.business.name, '- Added canViewUsers and canAccessFinancialData');
    }

    console.log('✅ All admin business memberships updated successfully!');
    console.log('Please refresh the browser to see Business Management and Business Loans links');

  } catch (error) {
    console.error('❌ Error updating admin permissions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateAdminPermissions();