require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateTemplateSKU() {
  const templateId = process.argv[2];
  const sku = process.argv[3];

  if (!templateId || !sku) {
    console.error('Usage: node scripts/update-template-sku.js <templateId> <sku>');
    console.error('Example: node scripts/update-template-sku.js clxy123abc CNI-9987');
    process.exit(1);
  }

  try {
    console.log(`Updating template ${templateId} with SKU: ${sku}\n`);

    const template = await prisma.barcodeTemplates.findUnique({
      where: { id: templateId },
      include: {
        business: {
          select: {
            name: true
          }
        }
      }
    });

    if (!template) {
      console.error(`❌ Template with ID ${templateId} not found`);
      process.exit(1);
    }

    console.log('Current template:');
    console.log('   Name:', template.name);
    console.log('   Barcode Value:', template.barcodeValue);
    console.log('   Current SKU:', template.sku || '(not set)');
    console.log('   Business:', template.business.name);
    console.log('\n');

    const updated = await prisma.barcodeTemplates.update({
      where: { id: templateId },
      data: { sku }
    });

    console.log('✅ Successfully updated!');
    console.log('   New SKU:', updated.sku);
    console.log('\nThe template can now be found by searching for either:');
    console.log('   - Barcode value:', updated.barcodeValue);
    console.log('   - SKU:', updated.sku);

  } catch (error) {
    console.error('❌ Error updating template:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateTemplateSKU();
