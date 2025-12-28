const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkWlan() {
  const wlan = await prisma.r710Wlans.findUnique({
    where: { id: 'a70def4a-53da-441e-bd14-bbe76f539ffb' }
  });
  console.log('\nWLAN Data:');
  console.log(JSON.stringify(wlan, null, 2));
  await prisma.$disconnect();
}

checkWlan();
