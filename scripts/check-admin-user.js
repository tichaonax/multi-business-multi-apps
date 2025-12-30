require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAdminUser() {
  try {
    console.log('Checking for admin user...\n');

    const adminUser = await prisma.users.findUnique({
      where: { id: 'admin-system-user-default' },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (adminUser) {
      console.log('✅ Admin user exists:');
      console.log(adminUser);
    } else {
      console.log('❌ Admin user does NOT exist in database');
      console.log('\nSearching for any users with "admin" in email...');

      const adminUsers = await prisma.users.findMany({
        where: {
          email: {
            contains: 'admin',
            mode: 'insensitive',
          },
        },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });

      console.log(`Found ${adminUsers.length} admin-like users:`);
      adminUsers.forEach(u => {
        console.log(`  - ${u.name} (${u.email}) - ID: ${u.id}`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdminUser();
