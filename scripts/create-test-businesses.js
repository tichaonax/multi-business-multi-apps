const { PrismaClient } = require('@prisma/client');

async function createTestBusinesses() {
  const prisma = new PrismaClient();

  const businesses = [
    {name: 'TechCorp Solutions', type: 'consulting', description: 'Technology consulting firm'},
    {name: 'Fresh Market', type: 'grocery', description: 'Local grocery chain'},
    {name: 'BuildRight Construction', type: 'construction', description: 'Commercial construction company'},
    {name: 'Bella Vista Restaurant', type: 'restaurant', description: 'Fine dining establishment'}
  ];

  try {
    for (const businessData of businesses) {
      const business = await prisma.business.create({
        data: {
          name: businessData.name,
          type: businessData.type,
          description: businessData.description,
          isActive: true,
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