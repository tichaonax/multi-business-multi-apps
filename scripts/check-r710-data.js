const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkR710Data() {
  const devices = await prisma.r710DeviceRegistry.findMany()
  const integrations = await prisma.r710BusinessIntegrations.findMany()
  const wlans = await prisma.r710Wlans.findMany()

  console.log('R710 Devices:', devices.length)
  devices.forEach(d => console.log(`  - ${d.deviceName || d.id}`))

  console.log('\nR710 Business Integrations:', integrations.length)
  integrations.forEach(i => console.log(`  - Business: ${i.businessId}, Device: ${i.deviceRegistryId}`))

  console.log('\nR710 WLANs:', wlans.length)
  wlans.forEach(w => console.log(`  - ${w.ssid} (Business: ${w.businessId})`))

  await prisma.$disconnect()
}

checkR710Data()
