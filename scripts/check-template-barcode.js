require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTemplate() {
  try {
    console.log('Searching for template with barcode value: 000000099875\n');

    const template = await prisma.barcodeTemplates.findFirst({
      where: {
        barcodeValue: '000000099875'
      },
      include: {
        business: {
          select: {
            name: true,
            shortName: true
          }
        }
      }
    });

    if (template) {
      console.log('✅ Template found:');
      console.log('   ID:', template.id);
      console.log('   Name:', template.name);
      console.log('   Barcode Value:', template.barcodeValue);
      console.log('   SKU:', template.sku || '(not set)');
      console.log('   Business:', template.business.name);
      console.log('   Type:', template.type);
      console.log('   Description:', template.description);
      console.log('\n');

      if (!template.sku) {
        console.log('❗ Template has no SKU set. Would you like to update it to "CNI-9987"?');
        console.log('   Run: node scripts/update-template-sku.js', template.id, 'CNI-9987');
      }
    } else {
      console.log('❌ No template found with barcode value: 000000099875');
      console.log('\nSearching all templates with similar values...\n');

      const similar = await prisma.barcodeTemplates.findMany({
        where: {
          OR: [
            { barcodeValue: { contains: '9987' } },
            { sku: { contains: '9987' } },
            { name: { contains: '9987', mode: 'insensitive' } }
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

      if (similar.length > 0) {
        console.log(`Found ${similar.length} similar template(s):`);
        similar.forEach(t => {
          console.log(`\n   ID: ${t.id}`);
          console.log(`   Name: ${t.name}`);
          console.log(`   Barcode Value: ${t.barcodeValue}`);
          console.log(`   SKU: ${t.sku || '(not set)'}`);
          console.log(`   Business: ${t.business.name}`);
        });
      } else {
        console.log('No similar templates found.');
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTemplate();
