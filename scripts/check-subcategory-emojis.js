const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkSubcategoryEmojis() {
  try {
    console.log('Checking subcategory emojis...\n');

    const subcategories = await prisma.expenseSubcategories.findMany({
      take: 20,
      select: {
        id: true,
        name: true,
        emoji: true,
        category: {
          select: {
            name: true,
            emoji: true,
          },
        },
      },
    });

    console.log(`Found ${subcategories.length} subcategories (showing first 20):\n`);

    subcategories.forEach((sub, index) => {
      console.log(`${index + 1}. ${sub.name}`);
      console.log(`   Category: ${sub.category.emoji} ${sub.category.name}`);
      console.log(`   Emoji: "${sub.emoji}" (${sub.emoji ? 'HAS EMOJI' : 'NO EMOJI'})`);
      console.log('');
    });

    // Count how many have emojis
    const withEmoji = subcategories.filter(s => s.emoji).length;
    const withoutEmoji = subcategories.filter(s => !s.emoji).length;

    console.log('\nSummary:');
    console.log(`- Subcategories with emojis: ${withEmoji}`);
    console.log(`- Subcategories without emojis: ${withoutEmoji}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSubcategoryEmojis();
