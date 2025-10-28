/**
 * Cleanup script to remove existing demo categories before re-seeding
 * Run with: npx tsx prisma/cleanup-categories.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Cleaning up existing demo categories...');

  const demoBusinessIds = [
    'clothing-demo-business',
    'hardware-demo-business',
    'grocery-demo-business',
    'restaurant-demo-business',
  ];

  // Use raw SQL for efficient cascade deletion
  for (const businessId of demoBusinessIds) {
    // Delete stock movements first
    await prisma.$executeRaw`
      DELETE FROM business_stock_movements
      WHERE "businessId" = ${businessId}
    `;

    // Delete product attributes
    await prisma.$executeRaw`
      DELETE FROM product_attributes
      WHERE "productId" IN (
        SELECT id FROM business_products WHERE "businessId" = ${businessId}
      )
    `;

    // Delete product variants
    await prisma.$executeRaw`
      DELETE FROM product_variants
      WHERE "productId" IN (
        SELECT id FROM business_products WHERE "businessId" = ${businessId}
      )
    `;

    // Delete products
    await prisma.$executeRaw`
      DELETE FROM business_products WHERE "businessId" = ${businessId}
    `;
    console.log(`   Cleaned products for ${businessId}`);
  }

  // Delete subcategories and categories for each business
  for (const businessId of demoBusinessIds) {
    await prisma.$executeRaw`
      DELETE FROM inventory_subcategories
      WHERE "categoryId" IN (
        SELECT id FROM business_categories WHERE "businessId" = ${businessId}
      )
    `;

    await prisma.$executeRaw`
      DELETE FROM business_categories WHERE "businessId" = ${businessId}
    `;
  }
  console.log(`   Cleaned subcategories and categories`);

  console.log('✅ Cleanup completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during cleanup:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
