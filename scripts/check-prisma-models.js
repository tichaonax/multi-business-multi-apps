const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkModels() {
  const models = Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$'));

  console.log('Looking for problem models:');
  console.log('seedDataTemplates:', models.includes('seedDataTemplates') ? 'FOUND' : 'NOT FOUND');
  console.log('vehicleTrips:', models.includes('vehicleTrips') ? 'FOUND' : 'NOT FOUND');
  console.log('systemSettings:', models.includes('systemSettings') ? 'FOUND' : 'NOT FOUND');

  console.log('\nSeed-related models:');
  const seedRelated = models.filter(m => m.toLowerCase().includes('seed'));
  console.log(seedRelated);

  console.log('\nVehicle-related models:');
  const vehicleRelated = models.filter(m => m.toLowerCase().includes('vehicle'));
  console.log(vehicleRelated);

  console.log('\nSystem-related models:');
  const systemRelated = models.filter(m => m.toLowerCase().includes('system'));
  console.log(systemRelated);

  await prisma.$disconnect();
}

checkModels();
