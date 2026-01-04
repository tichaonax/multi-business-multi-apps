const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkWlans() {
  const wlans = await prisma.r710Wlans.findMany({
    select: { wlanId: true, ssid: true, businessId: true }
  });
  console.log('R710 WLANs:');
  wlans.forEach(w => {
    console.log(`  wlanId: ${w.wlanId} | SSID: ${w.ssid} | Business: ${w.businessId}`);
  });
  await prisma.$disconnect();
}

checkWlans();
