import { PrismaClient } from '@prisma/client';
import { toTitleCase } from '../src/utils/titleCase';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.businessProducts.findMany();
  for (const product of products) {
    const title = toTitleCase(product.name);
    if (title !== product.name) {
      await prisma.businessProducts.update({ where: { id: product.id }, data: { name: title } });
      console.log(`Updated product: ${product.name} -> ${title}`);
    }
  }

  const categories = await prisma.businessCategories.findMany();
  for (const cat of categories) {
    const title = toTitleCase(cat.name);
    if (title !== cat.name) {
      await prisma.businessCategories.update({ where: { id: cat.id }, data: { name: title } });
      console.log(`Updated category: ${cat.name} -> ${title}`);
    }
  }

  const items = await prisma.barcodeInventoryItems.findMany();
  for (const item of items) {
    const title = toTitleCase(item.name);
    if (title !== item.name) {
      await prisma.barcodeInventoryItems.update({ where: { id: item.id }, data: { name: title } });
      console.log(`Updated inventory item: ${item.name} -> ${title}`);
    }
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(() => prisma.$disconnect());
