import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Fix category emojis that have ### instead of actual emojis
 */
async function fixCategoryEmojis() {
  try {
    console.log('🔧 Fixing category emojis...\n');

    // Find all categories with ### as emoji
    const categoriesWithBadEmoji = await prisma.expenseCategories.findMany({
      where: {
        emoji: {
          contains: '###'
        }
      },
      select: {
        id: true,
        name: true,
        emoji: true,
      }
    });

    console.log(`Found ${categoriesWithBadEmoji.length} categories with ### emoji\n`);

    if (categoriesWithBadEmoji.length === 0) {
      console.log('✅ No categories need fixing!');
      return;
    }

    // For each category, extract the actual emoji from the name if it exists
    let fixed = 0;
    for (const category of categoriesWithBadEmoji) {
      // Try to extract emoji from the name field (in case it was stored there)
      const emojiRegex = /[\p{Emoji}\u200d]+/u;
      const match = category.name.match(emojiRegex);

      if (match) {
        // Found an emoji in the name, use it
        const newEmoji = match[0].trim();
        const newName = category.name.replace(emojiRegex, '').trim();

        await prisma.expenseCategories.update({
          where: { id: category.id },
          data: {
            emoji: newEmoji,
            name: newName,
          }
        });

        console.log(`✅ Fixed: "${category.name}" -> emoji: "${newEmoji}", name: "${newName}"`);
        fixed++;
      } else {
        // No emoji found, set to default
        await prisma.expenseCategories.update({
          where: { id: category.id },
          data: {
            emoji: '💰', // Default emoji
          }
        });

        console.log(`⚠️  No emoji found for "${category.name}", set to default 💰`);
        fixed++;
      }
    }

    console.log(`\n✅ Fixed ${fixed} categories`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixCategoryEmojis();
