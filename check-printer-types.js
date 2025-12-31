const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

prisma.networkPrinters.findMany({
  select: { id: true, printerName: true, printerType: true }
}).then(printers => {
  console.log(JSON.stringify(printers, null, 2));
  prisma.$disconnect();
});
