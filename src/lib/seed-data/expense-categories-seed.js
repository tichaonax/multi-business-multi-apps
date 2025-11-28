const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const prisma = new PrismaClient();

// Domain configuration mapping file names to domain info
const DOMAIN_CONFIG = {
  'business-expenses.md': {
    name: 'Business',
    emoji: '💼',
    description: 'Business operations and management expenses',
  },
  'personal-expenses.md': {
    name: 'Personal',
    emoji: '👤',
    description: 'Personal living and lifestyle expenses',
  },
  'vehicle-expenses.md': {
    name: 'Vehicle',
    emoji: '🚗',
    description: 'Transportation and vehicle-related expenses',
  },
  'groceries-expenses.md': {
    name: 'Groceries',
    emoji: '🛒',
    description: 'Food and grocery items',
  },
  'hardware-expenses.md': {
    name: 'Hardware',
    emoji: '🔧',
    description: 'Tools, equipment, and hardware supplies',
  },
  'restaurant-expenses.md': {
    name: 'Restaurant',
    emoji: '🍽️',
    description: 'Dining and food services',
  },
  'clothing-expenses.md': {
    name: 'Clothing',
    emoji: '👔',
    description: 'Apparel and accessories',
  },
  'construction-expenses.md': {
    name: 'Construction',
    emoji: '🏗️',
    description: 'Construction and building projects',
  },
};

/**
 * Extract emoji from a markdown line
 * Example: "- 🏦 Bank Fees" => "🏦"
 * Example: "### 🍕 Food Types" => "🍕"
 */
function extractEmoji(text) {
  // Remove markdown prefixes (###, -, etc.) and whitespace first
  let cleanText = text.replace(/^#{1,6}\s*/, '').replace(/^-\s*/, '').trim();

  const emojiRegex = /[\p{Emoji}\u200d]+/u;
  const match = cleanText.match(emojiRegex);
  return match ? match[0].trim() : '💰'; // Default emoji if none found
}

/**
 * Extract text after emoji
 * Example: "- 🏦 Bank Fees" => "Bank Fees"
 * Example: "### 🍕 Food Types" => "Food Types"
 */
function extractText(line) {
  // Remove markdown prefixes (###, -, etc.) and whitespace
  let text = line.replace(/^#{1,6}\s*/, '').replace(/^-\s*/, '').trim();

  // Remove emoji characters
  text = text.replace(/[\p{Emoji}\u200d]+/gu, '').trim();

  return text;
}

/**
 * Parse a single markdown file to extract categories and subcategories
 */
function parseMarkdownFile(filePath, domainInfo) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  const categories = [];
  let currentCategory = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines, main title, and section headers without "###"
    if (!trimmed || trimmed.startsWith('#') && !trimmed.startsWith('###')) {
      continue;
    }

    // Category header (### 🏦 Financial & Banking)
    if (trimmed.startsWith('###')) {
      if (currentCategory) {
        categories.push(currentCategory);
      }

      const categoryEmoji = extractEmoji(trimmed);
      const categoryName = extractText(trimmed);

      currentCategory = {
        name: categoryName,
        emoji: categoryEmoji,
        subcategories: [],
      };
    }
    // Subcategory item (- 🏦 Bank Fees)
    else if (trimmed.startsWith('-') && currentCategory) {
      const subcategoryEmoji = extractEmoji(trimmed);
      const subcategoryName = extractText(trimmed);

      if (subcategoryName) {
        currentCategory.subcategories.push({
          name: subcategoryName,
          emoji: subcategoryEmoji,
        });
      }
    }
  }

  // Push last category
  if (currentCategory) {
    categories.push(currentCategory);
  }

  return {
    domainName: domainInfo.name,
    domainEmoji: domainInfo.emoji,
    domainDescription: domainInfo.description,
    categories,
  };
}

/**
 * Generate color based on domain
 */
function getColorForDomain(domainName) {
  const colorMap = {
    'Business': '#3B82F6',      // Blue
    'Personal': '#8B5CF6',      // Purple
    'Vehicle': '#EF4444',       // Red
    'Groceries': '#10B981',     // Green
    'Hardware': '#F59E0B',      // Orange
    'Restaurant': '#EC4899',    // Pink
    'Clothing': '#6366F1',      // Indigo
    'Construction': '#F97316',  // Orange-red
  };

  return colorMap[domainName] || '#3B82F6';
}

/**
 * Seed domains, categories, and subcategories from markdown files
 */
async function seedExpenseCategories() {
  console.log('🌱 Starting expense category seed...\n');

  const seedDataDir = path.join(process.cwd(), 'seed-data', 'expense-types');
  const parsedDomains = [];

  // Parse all markdown files
  for (const [fileName, domainInfo] of Object.entries(DOMAIN_CONFIG)) {
    const filePath = path.join(seedDataDir, fileName);

    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  Warning: ${fileName} not found, skipping...`);
      continue;
    }

    console.log(`📄 Parsing ${fileName}...`);
    const parsed = parseMarkdownFile(filePath, domainInfo);
    parsedDomains.push(parsed);
  }

  console.log(`\n✅ Parsed ${parsedDomains.length} domain files\n`);

  // Use transaction for atomicity
  await prisma.$transaction(async (tx) => {
    let domainCount = 0;
    let categoryCount = 0;
    let subcategoryCount = 0;

    for (const domain of parsedDomains) {
      console.log(`🏗️  Creating domain: ${domain.domainEmoji} ${domain.domainName}`);

      // Create domain
      const createdDomain = await tx.expenseDomains.create({
        data: {
          id: randomUUID(),
          name: domain.domainName,
          emoji: domain.domainEmoji,
          description: domain.domainDescription,
          isActive: true,
        },
      });
      domainCount++;

      // Create categories for this domain
      for (const category of domain.categories) {
        const createdCategory = await tx.expenseCategories.create({
          data: {
            id: randomUUID(),
            domainId: createdDomain.id,
            name: category.name,
            emoji: category.emoji,
            color: getColorForDomain(domain.domainName),
            description: `${category.name} expenses for ${domain.domainName}`,
            isDefault: true,
            isUserCreated: false,
          },
        });
        categoryCount++;

        // Create subcategories for this category
        for (const subcategory of category.subcategories) {
          await tx.expenseSubcategories.create({
            data: {
              id: randomUUID(),
              categoryId: createdCategory.id,
              name: subcategory.name,
              emoji: subcategory.emoji,
              description: `${subcategory.name} under ${category.name}`,
              isDefault: true,
              isUserCreated: false,
            },
          });
          subcategoryCount++;
        }
      }
    }

    console.log('\n📊 Seed Summary:');
    console.log(`   Domains: ${domainCount}`);
    console.log(`   Categories: ${categoryCount}`);
    console.log(`   Subcategories: ${subcategoryCount}`);
  });

  console.log('\n✅ Expense category seed completed successfully!\n');
}

/**
 * Create mapping from old category strings to new category IDs
 * This will be used for migrating existing expenses
 */
async function createCategoryMapping() {
  console.log('🗺️  Creating category mapping for migration...\n');

  const mapping = new Map();

  // Get all subcategories with their category info
  const subcategories = await prisma.expenseSubcategories.findMany({
    include: {
      category: {
        include: {
          domain: true,
        },
      },
    },
  });

  for (const subcategory of subcategories) {
    // Map by subcategory name (most specific)
    mapping.set(subcategory.name.toLowerCase(), {
      categoryId: subcategory.categoryId,
      subcategoryId: subcategory.id,
    });

    // Also map by category name (less specific, will be overwritten if subcategory matches)
    if (subcategory.category) {
      mapping.set(subcategory.category.name.toLowerCase(), {
        categoryId: subcategory.category.id,
      });
    }
  }

  console.log(`✅ Created ${mapping.size} category mappings\n`);

  return mapping;
}

/**
 * Migrate existing expenses to new category structure
 */
async function migrateExistingExpenses() {
  console.log('🔄 Starting expense migration...\n');

  // Get all expenses that don't have categoryId set
  const expenses = await prisma.personalExpenses.findMany({
    where: {
      categoryId: null,
    },
    select: {
      id: true,
      category: true,
    },
  });

  console.log(`📋 Found ${expenses.length} expenses to migrate\n`);

  if (expenses.length === 0) {
    console.log('✅ No expenses to migrate\n');
    return {
      total: 0,
      successful: 0,
      uncategorized: 0,
    };
  }

  // Get category mapping
  const mapping = await createCategoryMapping();

  // Create an "Uncategorized" category for unmapped expenses
  let uncategorizedCategory = await prisma.expenseCategories.findFirst({
    where: { name: 'Uncategorized' },
  });

  if (!uncategorizedCategory) {
    uncategorizedCategory = await prisma.expenseCategories.create({
      data: {
        id: randomUUID(),
        name: 'Uncategorized',
        emoji: '❓',
        color: '#6B7280',
        description: 'Expenses that could not be automatically categorized',
        isDefault: true,
        isUserCreated: false,
      },
    });
    console.log('📦 Created "Uncategorized" category for unmapped expenses\n');
  }

  let successful = 0;
  let uncategorized = 0;

  // Migrate each expense
  for (const expense of expenses) {
    const oldCategoryLower = expense.category.toLowerCase().trim();
    const mapped = mapping.get(oldCategoryLower);

    if (mapped) {
      // Found a match
      await prisma.personalExpenses.update({
        where: { id: expense.id },
        data: {
          categoryId: mapped.categoryId,
          subcategoryId: mapped.subcategoryId,
        },
      });
      successful++;
    } else {
      // No match found, use Uncategorized
      await prisma.personalExpenses.update({
        where: { id: expense.id },
        data: {
          categoryId: uncategorizedCategory.id,
        },
      });
      uncategorized++;
      console.log(`⚠️  Could not map: "${expense.category}" -> Uncategorized`);
    }
  }

  const report = {
    total: expenses.length,
    successful,
    uncategorized,
  };

  console.log('\n📊 Migration Report:');
  console.log(`   Total expenses: ${report.total}`);
  console.log(`   Successfully mapped: ${report.successful}`);
  console.log(`   Uncategorized: ${report.uncategorized}`);
  console.log(`   Success rate: ${((successful / expenses.length) * 100).toFixed(1)}%\n`);

  return report;
}

/**
 * Main seed function - runs all seed operations
 */
async function runExpenseCategorySeed() {
  try {
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('   💰 EXPENSE CATEGORY SEED & MIGRATION\n');
    console.log('═══════════════════════════════════════════════════════\n');

    // Step 1: Seed categories
    await seedExpenseCategories();

    // Step 2: Migrate existing expenses
    await migrateExistingExpenses();

    console.log('═══════════════════════════════════════════════════════\n');
    console.log('   ✅ ALL OPERATIONS COMPLETED SUCCESSFULLY!\n');
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  runExpenseCategorySeed()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = {
  seedExpenseCategories,
  createCategoryMapping,
  migrateExistingExpenses,
  runExpenseCategorySeed
};
