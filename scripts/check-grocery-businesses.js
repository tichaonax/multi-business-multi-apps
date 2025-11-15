const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const businesses = await prisma.businesses.findMany({
      where: { type: 'grocery', isDemo: true },
      orderBy: { createdAt: 'asc' }
    });

    console.log('Grocery demo businesses:');
    businesses.forEach(b => {
      console.log(`  - ${b.id} | ${b.name}`);
    });
    console.log(`\nTotal: ${businesses.length}`);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
})();
