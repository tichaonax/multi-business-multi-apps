require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixSKUPlacement() {
  try {
    console.log('Finding templates with SKU-like values in Barcode Value field...\n');

    // Find templates where barcodeValue looks like a SKU (contains letters and dashes)
    const templates = await prisma.barcodeTemplates.findMany({
      where: {
        OR: [
          { barcodeValue: 'CMQ-7838' },
          { barcodeValue: 'SKS-122' },
          { barcodeValue: 'CNI-9987' }, // This one should already be fixed, but check anyway
        ]
      },
      include: {
        business: {
          select: {
            name: true
          }
        }
      }
    });

    console.log(`Found ${templates.length} template(s) to fix:\n`);

    for (const template of templates) {
      console.log(`Template: ${template.name}`);
      console.log(`  Business: ${template.business.name}`);
      console.log(`  BEFORE:`);
      console.log(`    SKU: ${template.sku || '(empty)'}`);
      console.log(`    Barcode Value: ${template.barcodeValue}`);

      // Move barcodeValue to sku, and use placeholder for barcodeValue
      // Use a unique placeholder based on the SKU so it doesn't conflict
      const placeholder = `SCAN-${template.barcodeValue}`;

      const updated = await prisma.barcodeTemplates.update({
        where: { id: template.id },
        data: {
          sku: template.barcodeValue,
          barcodeValue: placeholder, // Placeholder - user will scan real barcode
        }
      });

      console.log(`  AFTER:`);
      console.log(`    SKU: ${updated.sku}`);
      console.log(`    Barcode Value: ${updated.barcodeValue || '(empty - ready to scan)'}`);
      console.log(`  ✅ Fixed!\n`);
    }

    console.log('\n📋 Next Steps:');
    console.log('1. Go to the templates page');
    console.log('2. Edit each template');
    console.log('3. Scan the physical barcode into the "Barcode Number" field');
    console.log('4. Save the template');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixSKUPlacement();
