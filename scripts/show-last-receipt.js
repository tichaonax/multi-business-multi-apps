const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function showLastReceipt() {
  const job = await prisma.printJobs.findFirst({
    where: { status: 'COMPLETED' },
    orderBy: { createdAt: 'desc' }
  });

  if (!job) {
    console.log('No completed jobs found');
    return;
  }

  const content = job.jobData.receiptText || '';

  console.log('=== LAST RECEIPT CONTENT ===');
  console.log(content);
  console.log('=== END ===');
  console.log('\nLength:', content.length, 'characters');
  console.log('Created:', job.createdAt);

  await prisma.$disconnect();
}

showLastReceipt();
