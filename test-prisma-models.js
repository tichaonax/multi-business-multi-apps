const { PrismaClient } = require('@prisma/client');

async function testPrismaModels() {
  try {
    console.log('Initializing Prisma client...');
    const prisma = new PrismaClient();
    
    console.log('Available models:', Object.keys(prisma).filter(key => 
      typeof prisma[key] === 'object' && 
      prisma[key].findMany
    ).sort());
    
    console.log('\nModel checks:');
    console.log('- User model available:', !!prisma.user);
    console.log('- BusinessMembership model available:', !!prisma.businessMembership);
    console.log('- Business model available:', !!prisma.business);
    
    if (prisma.user) {
      console.log('\nTesting User model...');
      try {
        const userCount = await prisma.user.count();
        console.log('Total users in database:', userCount);
        
        if (userCount > 0) {
          console.log('\nChecking for admin user...');
          const adminUser = await prisma.user.findUnique({
            where: { email: 'admin@business.local' }
          });
          console.log('Admin user exists:', !!adminUser);
          if (adminUser) {
            console.log('Admin user details:', {
              id: adminUser.id,
              email: adminUser.email,
              isActive: adminUser.isActive,
              role: adminUser.role
            });
          }
        }
      } catch (dbError) {
        console.error('Database query error:', dbError.message);
      }
    }
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testPrismaModels();