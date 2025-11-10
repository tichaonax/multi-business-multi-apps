/**
 * Grant business category management permissions to current user
 * Run with: node grant-category-permissions.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function grantCategoryPermissions() {
  try {
    // Get all users
    const users = await prisma.users.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        canCreateBusinessCategories: true,
        canEditBusinessCategories: true,
        canDeleteBusinessCategories: true,
        canCreateBusinessSubcategories: true,
        canEditBusinessSubcategories: true,
        canDeleteBusinessSubcategories: true,
      }
    });

    console.log('\n📊 Current Users and Category Permissions:\n');
    console.log('═'.repeat(100));
    
    users.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.name} (${user.email})`);
      console.log('   Category Permissions:');
      console.log(`   - Create Categories: ${user.canCreateBusinessCategories ? '✅' : '❌'}`);
      console.log(`   - Edit Categories: ${user.canEditBusinessCategories ? '✅' : '❌'}`);
      console.log(`   - Delete Categories: ${user.canDeleteBusinessCategories ? '✅' : '❌'}`);
      console.log(`   - Create Subcategories: ${user.canCreateBusinessSubcategories ? '✅' : '❌'}`);
      console.log(`   - Edit Subcategories: ${user.canEditBusinessSubcategories ? '✅' : '❌'}`);
      console.log(`   - Delete Subcategories: ${user.canDeleteBusinessSubcategories ? '✅' : '❌'}`);
    });

    console.log('\n═'.repeat(100));
    console.log('\n💡 To grant permissions to a user, I can update them.');
    console.log('   Do you want to grant all category permissions to all users? (y/n)\n');

    // For now, let's just grant to the first user
    if (users.length > 0) {
      const firstUser = users[0];
      
      console.log(`\n🔧 Granting all category permissions to: ${firstUser.name} (${firstUser.email})\n`);
      
      const updated = await prisma.users.update({
        where: { id: firstUser.id },
        data: {
          canCreateBusinessCategories: true,
          canEditBusinessCategories: true,
          canDeleteBusinessCategories: true,
          canCreateBusinessSubcategories: true,
          canEditBusinessSubcategories: true,
          canDeleteBusinessSubcategories: true,
        }
      });

      console.log('✅ Permissions granted successfully!\n');
      console.log('Updated permissions:');
      console.log(`   - Create Categories: ✅`);
      console.log(`   - Edit Categories: ✅`);
      console.log(`   - Delete Categories: ✅`);
      console.log(`   - Create Subcategories: ✅`);
      console.log(`   - Edit Subcategories: ✅`);
      console.log(`   - Delete Subcategories: ✅`);
      console.log('\n🎉 You should now see "📁 Business Categories" in the sidebar under "Tools"!\n');
      console.log('   Navigate to: /business/categories\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

grantCategoryPermissions();
