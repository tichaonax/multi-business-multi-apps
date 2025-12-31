const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testSkuGeneration() {
  try {
    console.log('Testing SKU generation function...\n');

    // Get a business to test with
    const business = await prisma.businesses.findFirst({
      select: {
        id: true,
        name: true,
        sku_prefix: true,
        sku_format: true,
        sku_digits: true,
      },
    });

    if (!business) {
      console.log('No business found in database. Create a business first.');
      return;
    }

    console.log('Business found:');
    console.log(`  Name: ${business.name}`);
    console.log(`  SKU Prefix: ${business.sku_prefix || 'Not set'}`);
    console.log(`  SKU Format: ${business.sku_format || 'Not set'}`);
    console.log(`  SKU Digits: ${business.sku_digits || 'Not set'}\n`);

    // Test SKU generation with different formats
    console.log('Testing SKU generation:\n');

    // Test 1: Basic business prefix
    const sku1 = await prisma.$queryRaw`
      SELECT generate_next_sku(${business.id}::TEXT) as sku
    `;
    console.log(`1. Basic format: ${sku1[0].sku}`);

    // Test 2: With category
    const sku2 = await prisma.$queryRaw`
      SELECT generate_next_sku(${business.id}::TEXT, 'Quilts'::VARCHAR) as sku
    `;
    console.log(`2. With category 'Quilts': ${sku2[0].sku}`);

    // Test 3: With department
    const sku3 = await prisma.$queryRaw`
      SELECT generate_next_sku(${business.id}::TEXT, NULL::VARCHAR, 'Home & Beauty'::VARCHAR) as sku
    `;
    console.log(`3. With department 'Home & Beauty': ${sku3[0].sku}`);

    // Show current sequences
    console.log('\n\nCurrent SKU sequences:');
    const sequences = await prisma.sku_sequences.findMany({
      where: { businessId: business.id },
      select: {
        prefix: true,
        currentSequence: true,
      },
    });

    sequences.forEach((seq) => {
      console.log(`  ${seq.prefix}: ${seq.currentSequence}`);
    });

    console.log('\n✅ SKU generation function is working correctly!');
  } catch (error) {
    console.error('❌ Error testing SKU generation:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testSkuGeneration();
