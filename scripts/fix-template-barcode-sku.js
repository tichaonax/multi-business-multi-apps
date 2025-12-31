require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixTemplate() {
  const templateId = 'cmjqs4pue00011p6wo2hsmaek'; // Ladies Shoes template
  const newBarcodeValue = '000000099875'; // What gets scanned
  const newSKU = 'CNI-9987'; // Human-readable product code

  try {
    console.log('Fixing Ladies Shoes template...\n');

    const current = await prisma.barcodeTemplates.findUnique({
      where: { id: templateId },
      include: {
        business: {
          select: {
            name: true
          }
        }
      }
    });

    console.log('BEFORE:');
    console.log('   Name:', current.name);
    console.log('   Barcode Value:', current.barcodeValue);
    console.log('   SKU:', current.sku || '(not set)');
    console.log('   Business:', current.business.name);
    console.log('\n');

    const updated = await prisma.barcodeTemplates.update({
      where: { id: templateId },
      data: {
        barcodeValue: newBarcodeValue,
        sku: newSKU
      }
    });

    console.log('✅ AFTER (FIXED):');
    console.log('   Name:', updated.name);
    console.log('   Barcode Value:', updated.barcodeValue, '← What scanner reads');
    console.log('   SKU:', updated.sku, '← Human-readable product code');
    console.log('\n');
    console.log('✅ Template updated successfully!');
    console.log('\nThe template can now be found by scanning or searching:');
    console.log('   - Scan barcode:', newBarcodeValue);
    console.log('   - Search SKU:', newSKU);
    console.log('   - Search name: Ladies Shoes');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixTemplate();
