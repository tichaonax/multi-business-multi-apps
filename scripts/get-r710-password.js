const { PrismaClient } = require('@prisma/client');
const { decrypt } = require('../src/lib/encryption');

const prisma = new PrismaClient();

async function getPassword() {
  const device = await prisma.r710DeviceRegistry.findFirst({
    where: { ipAddress: '192.168.0.108' }
  });

  if (device) {
    const password = decrypt(device.encryptedAdminPassword);
    console.log('IP:', device.ipAddress);
    console.log('Username:', device.adminUsername);
    console.log('Password:', password);
  } else {
    console.log('Device not found');
  }

  await prisma.$disconnect();
}

getPassword();
