const { PrismaClient } = require('@prisma/client');

async function createTestBusinesses() {
  const prisma = new PrismaClient();

  const businesses = [
    {name: 'TechCorp Solutions [Demo]', type: 'consulting', description: 'Technology consulting firm'},
    {name: 'Fresh Market [Demo]', type: 'grocery', description: 'Local grocery chain'},
    {name: 'BuildRight Construction [Demo]', type: 'construction', description: 'Commercial construction company'},
    {name: 'Bella Vista Restaurant [Demo]', type: 'restaurant', description: 'Fine dining establishment'}
  ];

  try {
    for (const businessData of businesses) {
      const business = await prisma.businesses.create({
        data: {
          name: businessData.name,
          type: businessData.type,
          description: businessData.description,
          isActive: true,
          isDemo: true,
          settings: {},
          createdBy: null // System created
        }
      });
      console.log('✅ Created business:', business.name);
    }
    console.log('All test businesses created successfully!');
  } catch (error) {
    console.error('Error creating businesses:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestBusinesses();