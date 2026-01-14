require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkJobStructure() {
  const job = await prisma.printJobs.findFirst({
    orderBy: { createdAt: 'desc' }
  });

  console.log('Latest PrintJob structure:');
  console.log(JSON.stringify(job, null, 2));

  await prisma.$disconnect();
}

checkJobStructure();
