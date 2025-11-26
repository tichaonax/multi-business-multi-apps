const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBusinessAPI() {
  try {
    // Simulate what the API does
    const businesses = await prisma.businesses.findMany({
      include: {
        business_accounts: {
          select: {
            id: true,
            balance: true
          }
        }
      },
      where: {
        isActive: true
      }
    });

    console.log('Total businesses:', businesses.length);
    console.log('\nFirst business structure:');
    if (businesses.length > 0) {
      const first = businesses[0];
      console.log('Keys:', Object.keys(first));
      console.log('Has business_accounts:', !!first.business_accounts);
      console.log('business_accounts value:', first.business_accounts);
    }

    console.log('\nBusinesses with accounts:');
    businesses.forEach(b => {
      const hasAccount = b.business_accounts !== null;
      console.log(`- ${b.name}: hasAccount=${hasAccount}, balance=${b.business_accounts?.balance || 0}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkBusinessAPI();
