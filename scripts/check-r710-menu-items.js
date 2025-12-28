const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkR710MenuItems() {
  try {
    console.log('🔍 Checking R710 configuration...\n');

    // Get all R710 token configs
    const configs = await prisma.r710TokenConfigs.findMany({
      select: {
        id: true,
        name: true,
        isActive: true,
      }
    });

    console.log(`📦 R710 Token Configs (${configs.length}):`);
    configs.forEach(config => {
      console.log(`  - ${config.name} (${config.id}) - Active: ${config.isActive}`);
    });

    console.log('\n📋 R710 Business Menu Items:');
    
    // Get all business menu items
    const menuItems = await prisma.r710BusinessTokenMenuItems.findMany({
      include: {
        businesses: {
          select: {
            id: true,
            name: true,
            type: true,
          }
        },
        r710_token_configs: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    if (menuItems.length === 0) {
      console.log('  ❌ No R710 business menu items found!');
      console.log('\n💡 You need to add the token config to a business menu.');
      console.log('   Go to: R710 Portal → Token Packages → Add to your business');
    } else {
      menuItems.forEach(item => {
        console.log(`\n  Business: ${item.businesses.name} (${item.businesses.type})`);
        console.log(`  Token Config: ${item.r710_token_configs.name}`);
        console.log(`  Business Price: $${item.businessPrice}`);
        console.log(`  Active: ${item.isActive}`);
        console.log(`  Display Order: ${item.displayOrder}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkR710MenuItems();
