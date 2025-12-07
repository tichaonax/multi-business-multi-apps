const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const users = await prisma.users.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        business_memberships: {
          select: {
            businessId: true,
            businesses: {
              select: {
                name: true,
                isDemo: true
              }
            }
          }
        }
      }
    });

    console.log('Users in database:', users.length);
    console.log('');

    users.forEach(u => {
      console.log('Email:', u.email);
      console.log('Role:', u.role);
      console.log('Memberships:', u.business_memberships.length);
      u.business_memberships.forEach(m => {
        console.log('  -', m.businesses.name, '(isDemo:', m.businesses.isDemo + ')');
      });
      console.log('');
    });

    // Check which users would be backed up
    const businessIds = await prisma.businesses.findMany({
      where: { isDemo: false },
      select: { id: true }
    }).then(bs => bs.map(b => b.id));

    const backedUpUsers = await prisma.users.findMany({
      where: {
        business_memberships: {
          some: {
            businessId: { in: businessIds }
          }
        }
      }
    });

    console.log('Users that would be backed up:', backedUpUsers.length);
    backedUpUsers.forEach(u => console.log('  -', u.email));

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
})();
