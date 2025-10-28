/**
 * Seed script for inventory categories
 * Run with: npx tsx prisma/seed-categories.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding inventory categories...');

  // Create demo businesses if they don't exist
  console.log('Creating demo businesses...');
  await prisma.businesses.upsert({
    where: { id: 'clothing-demo-business' },
    update: {},
    create: {
      id: 'clothing-demo-business',
      name: 'Fashion Boutique Demo',
      type: 'clothing',
      description: 'Demo clothing store with fashion items',
      isActive: true,
    },
  });

  await prisma.businesses.upsert({
    where: { id: 'hardware-demo-business' },
    update: {},
    create: {
      id: 'hardware-demo-business',
      name: 'Hardware Store Demo',
      type: 'hardware',
      description: 'Demo hardware store with tools and supplies',
      isActive: true,
    },
  });

  await prisma.businesses.upsert({
    where: { id: 'grocery-demo-business' },
    update: {},
    create: {
      id: 'grocery-demo-business',
      name: 'Grocery Market Demo',
      type: 'grocery',
      description: 'Demo grocery store with fresh produce',
      isActive: true,
    },
  });

  await prisma.businesses.upsert({
    where: { id: 'restaurant-demo-business' },
    update: {},
    create: {
      id: 'restaurant-demo-business',
      name: 'Restaurant Demo',
      type: 'restaurant',
      description: 'Demo restaurant with menu items',
      isActive: true,
    },
  });

  // ============================================================
  // CLOTHING BUSINESS CATEGORIES
  // ============================================================
  console.log('Seeding clothing categories...');

  // Men's Fashion
  const mensFashion = await prisma.businessCategories.upsert({
    where: { id: 'cat-clothing-mens' },
    update: {},
    create: {
      id: 'cat-clothing-mens',
      businessId: 'clothing-demo-business',
      name: "Men's Fashion",
      emoji: '👔',
      color: '#3B82F6',
      description: "Men's clothing and accessories",
      businessType: 'clothing',
      displayOrder: 1,
      isActive: true,
      isUserCreated: false,
      updatedAt: new Date()
    },
  });

  // Men's subcategories
  await prisma.inventorySubcategories.createMany({
    data: [
      {
        id: 'subcat-mens-shirts',
        categoryId: mensFashion.id,
        name: 'Shirts & Tops',
        emoji: '👕',
        description: 'Dress shirts, casual shirts, polo shirts',
        displayOrder: 1,
      },
      {
        id: 'subcat-mens-pants',
        categoryId: mensFashion.id,
        name: 'Pants & Trousers',
        emoji: '👖',
        description: 'Jeans, chinos, dress pants',
        displayOrder: 2,
      },
      {
        id: 'subcat-mens-suits',
        categoryId: mensFashion.id,
        name: 'Suits & Blazers',
        emoji: '🤵',
        description: 'Formal suits and blazers',
        displayOrder: 3,
      },
      {
        id: 'subcat-mens-outerwear',
        categoryId: mensFashion.id,
        name: 'Outerwear',
        emoji: '🧥',
        description: 'Jackets, coats, hoodies',
        displayOrder: 4,
      },
    ],
    skipDuplicates: true,
  });

  // Women's Fashion
  const womensFashion = await prisma.businessCategories.upsert({
    where: { id: 'cat-clothing-womens' },
    update: {},
    create: {
      id: 'cat-clothing-womens',
      businessId: 'clothing-demo-business',
      name: "Women's Fashion",
      emoji: '👗',
      color: '#EC4899',
      description: "Women's clothing and accessories",
      businessType: 'clothing',
      displayOrder: 2,
      isActive: true,
      isUserCreated: false,
      updatedAt: new Date()
    },
  });

  await prisma.inventorySubcategories.createMany({
    data: [
      {
        id: 'subcat-womens-dresses',
        categoryId: womensFashion.id,
        name: 'Dresses',
        emoji: '👗',
        description: 'Casual and formal dresses',
        displayOrder: 1,
      },
      {
        id: 'subcat-womens-tops',
        categoryId: womensFashion.id,
        name: 'Tops & Blouses',
        emoji: '👚',
        description: 'Shirts, blouses, t-shirts',
        displayOrder: 2,
      },
      {
        id: 'subcat-womens-bottoms',
        categoryId: womensFashion.id,
        name: 'Skirts & Pants',
        emoji: '👖',
        description: 'Skirts, pants, jeans',
        displayOrder: 3,
      },
      {
        id: 'subcat-womens-activewear',
        categoryId: womensFashion.id,
        name: 'Activewear',
        emoji: '🏃‍♀️',
        description: 'Sports and fitness clothing',
        displayOrder: 4,
      },
    ],
    skipDuplicates: true,
  });

  // Kids Fashion
  const kidsFashion = await prisma.businessCategories.upsert({
    where: { id: 'cat-clothing-kids' },
    update: {},
    create: {
      id: 'cat-clothing-kids',
      businessId: 'clothing-demo-business',
      name: 'Kids Fashion',
      emoji: '👶',
      color: '#10B981',
      description: "Children's clothing and accessories",
      businessType: 'clothing',
      displayOrder: 3,
      isActive: true,
      isUserCreated: false,
      updatedAt: new Date()
    },
  });

  await prisma.inventorySubcategories.createMany({
    data: [
      {
        id: 'subcat-kids-infant',
        categoryId: kidsFashion.id,
        name: 'Infant (0-2 years)',
        emoji: '👶',
        description: 'Baby clothing and onesies',
        displayOrder: 1,
      },
      {
        id: 'subcat-kids-toddler',
        categoryId: kidsFashion.id,
        name: 'Toddler (2-4 years)',
        emoji: '🧒',
        description: 'Toddler clothing',
        displayOrder: 2,
      },
      {
        id: 'subcat-kids-child',
        categoryId: kidsFashion.id,
        name: 'Children (5-12 years)',
        emoji: '👧',
        description: 'Kids clothing',
        displayOrder: 3,
      },
      {
        id: 'subcat-kids-teen',
        categoryId: kidsFashion.id,
        name: 'Teen (13+ years)',
        emoji: '🧑',
        description: 'Teenage clothing',
        displayOrder: 4,
      },
    ],
    skipDuplicates: true,
  });

  // Footwear
  const footwear = await prisma.businessCategories.upsert({
    where: { id: 'cat-clothing-footwear' },
    update: {},
    create: {
      id: 'cat-clothing-footwear',
      businessId: 'clothing-demo-business',
      name: 'Footwear',
      emoji: '👟',
      color: '#F59E0B',
      description: 'Shoes, boots, and sandals',
      businessType: 'clothing',
      displayOrder: 4,
      isActive: true,
      isUserCreated: false,
      updatedAt: new Date()
    },
  });

  await prisma.inventorySubcategories.createMany({
    data: [
      {
        id: 'subcat-footwear-athletic',
        categoryId: footwear.id,
        name: 'Athletic Shoes',
        emoji: '👟',
        description: 'Running shoes, trainers',
        displayOrder: 1,
      },
      {
        id: 'subcat-footwear-formal',
        categoryId: footwear.id,
        name: 'Formal Shoes',
        emoji: '👞',
        description: 'Dress shoes, oxfords',
        displayOrder: 2,
      },
      {
        id: 'subcat-footwear-casual',
        categoryId: footwear.id,
        name: 'Casual Shoes',
        emoji: '👟',
        description: 'Sneakers, loafers',
        displayOrder: 3,
      },
      {
        id: 'subcat-footwear-boots',
        categoryId: footwear.id,
        name: 'Boots',
        emoji: '👢',
        description: 'Winter boots, work boots',
        displayOrder: 4,
      },
    ],
    skipDuplicates: true,
  });

  // Accessories
  await prisma.businessCategories.upsert({
    where: { id: 'cat-clothing-accessories' },
    update: {},
    create: {
      id: 'cat-clothing-accessories',
      businessId: 'clothing-demo-business',
      name: 'Accessories',
      emoji: '👜',
      color: '#8B5CF6',
      description: 'Bags, jewelry, and accessories',
      businessType: 'clothing',
      displayOrder: 5,
      isActive: true,
      isUserCreated: false,
      updatedAt: new Date()
    },
  });

  // ============================================================
  // HARDWARE BUSINESS CATEGORIES
  // ============================================================
  console.log('Seeding hardware categories...');

  // Power Tools
  const powerTools = await prisma.businessCategories.upsert({
    where: { id: 'cat-hardware-power-tools' },
    update: {},
    create: {
      id: 'cat-hardware-power-tools',
      businessId: 'hardware-demo-business',
      name: 'Power Tools',
      emoji: '⚡',
      color: '#EF4444',
      description: 'Electric and battery-powered tools',
      businessType: 'hardware',
      displayOrder: 1,
      isActive: true,
      isUserCreated: false,
      updatedAt: new Date()
    },
  });

  await prisma.inventorySubcategories.createMany({
    data: [
      {
        id: 'subcat-power-drills',
        categoryId: powerTools.id,
        name: 'Drills & Drivers',
        emoji: '🔩',
        description: 'Cordless drills, impact drivers',
        displayOrder: 1,
      },
      {
        id: 'subcat-power-saws',
        categoryId: powerTools.id,
        name: 'Saws',
        emoji: '🪚',
        description: 'Circular saws, jigsaws, miter saws',
        displayOrder: 2,
      },
      {
        id: 'subcat-power-sanders',
        categoryId: powerTools.id,
        name: 'Sanders & Grinders',
        emoji: '⚙️',
        description: 'Orbital sanders, angle grinders',
        displayOrder: 3,
      },
      {
        id: 'subcat-power-misc',
        categoryId: powerTools.id,
        name: 'Other Power Tools',
        emoji: '🔌',
        description: 'Routers, planers, nailers',
        displayOrder: 4,
      },
    ],
    skipDuplicates: true,
  });

  // Hand Tools
  const handTools = await prisma.businessCategories.upsert({
    where: { id: 'cat-hardware-hand-tools' },
    update: {},
    create: {
      id: 'cat-hardware-hand-tools',
      businessId: 'hardware-demo-business',
      name: 'Hand Tools',
      emoji: '🔨',
      color: '#F59E0B',
      description: 'Manual tools and hand tools',
      businessType: 'hardware',
      displayOrder: 2,
      isActive: true,
      isUserCreated: false,
      updatedAt: new Date()
    },
  });

  await prisma.inventorySubcategories.createMany({
    data: [
      {
        id: 'subcat-hand-hammers',
        categoryId: handTools.id,
        name: 'Hammers & Mallets',
        emoji: '🔨',
        description: 'Claw hammers, sledgehammers',
        displayOrder: 1,
      },
      {
        id: 'subcat-hand-wrenches',
        categoryId: handTools.id,
        name: 'Wrenches & Pliers',
        emoji: '🔧',
        description: 'Adjustable wrenches, pliers',
        displayOrder: 2,
      },
      {
        id: 'subcat-hand-screwdrivers',
        categoryId: handTools.id,
        name: 'Screwdrivers',
        emoji: '🪛',
        description: 'Flathead, Phillips screwdrivers',
        displayOrder: 3,
      },
      {
        id: 'subcat-hand-measuring',
        categoryId: handTools.id,
        name: 'Measuring Tools',
        emoji: '📏',
        description: 'Tape measures, levels, squares',
        displayOrder: 4,
      },
    ],
    skipDuplicates: true,
  });

  // Other hardware categories
  await prisma.businessCategories.createMany({
    data: [
      {
        id: 'cat-hardware-building',
        businessId: 'hardware-demo-business',
        name: 'Building Materials',
        emoji: '🧱',
        color: '#78716C',
        description: 'Construction and building supplies',
        businessType: 'hardware',
        displayOrder: 3,
        isActive: true,
        isUserCreated: false,
      updatedAt: new Date()
      },
      {
        id: 'cat-hardware-plumbing',
        businessId: 'hardware-demo-business',
        name: 'Plumbing & Electrical',
        emoji: '🚰',
        color: '#3B82F6',
        description: 'Plumbing and electrical supplies',
        businessType: 'hardware',
        displayOrder: 4,
        isActive: true,
        isUserCreated: false,
      updatedAt: new Date()
      },
      {
        id: 'cat-hardware-paint',
        businessId: 'hardware-demo-business',
        name: 'Paint & Supplies',
        emoji: '🎨',
        color: '#EC4899',
        description: 'Paint, brushes, and finishing supplies',
        businessType: 'hardware',
        displayOrder: 5,
        isActive: true,
        isUserCreated: false,
      updatedAt: new Date()
      },
    ],
    skipDuplicates: true,
  });

  // ============================================================
  // GROCERY BUSINESS CATEGORIES
  // ============================================================
  console.log('Seeding grocery categories...');

  // Fresh Produce
  const produce = await prisma.businessCategories.upsert({
    where: { id: 'cat-grocery-produce' },
    update: {},
    create: {
      id: 'cat-grocery-produce',
      businessId: 'grocery-demo-business',
      name: 'Fresh Produce',
      emoji: '🥬',
      color: '#10B981',
      description: 'Fresh fruits and vegetables',
      businessType: 'grocery',
      displayOrder: 1,
      isActive: true,
      isUserCreated: false,
      updatedAt: new Date()
    },
  });

  await prisma.inventorySubcategories.createMany({
    data: [
      {
        id: 'subcat-produce-vegetables',
        categoryId: produce.id,
        name: 'Vegetables',
        emoji: '🥕',
        description: 'Fresh vegetables',
        displayOrder: 1,
      },
      {
        id: 'subcat-produce-fruits',
        categoryId: produce.id,
        name: 'Fruits',
        emoji: '🍎',
        description: 'Fresh fruits',
        displayOrder: 2,
      },
      {
        id: 'subcat-produce-leafy',
        categoryId: produce.id,
        name: 'Leafy Greens',
        emoji: '🥬',
        description: 'Lettuce, spinach, kale',
        displayOrder: 3,
      },
      {
        id: 'subcat-produce-herbs',
        categoryId: produce.id,
        name: 'Herbs & Spices',
        emoji: '🌿',
        description: 'Fresh herbs and seasonings',
        displayOrder: 4,
      },
    ],
    skipDuplicates: true,
  });

  // Meat & Seafood
  const meat = await prisma.businessCategories.upsert({
    where: { id: 'cat-grocery-meat' },
    update: {},
    create: {
      id: 'cat-grocery-meat',
      businessId: 'grocery-demo-business',
      name: 'Meat & Seafood',
      emoji: '🥩',
      color: '#EF4444',
      description: 'Fresh meat, poultry, and seafood',
      businessType: 'grocery',
      displayOrder: 2,
      isActive: true,
      isUserCreated: false,
      updatedAt: new Date()
    },
  });

  await prisma.inventorySubcategories.createMany({
    data: [
      {
        id: 'subcat-meat-beef',
        categoryId: meat.id,
        name: 'Beef',
        emoji: '🥩',
        description: 'Beef cuts and ground beef',
        displayOrder: 1,
      },
      {
        id: 'subcat-meat-poultry',
        categoryId: meat.id,
        name: 'Poultry',
        emoji: '🍗',
        description: 'Chicken, turkey, duck',
        displayOrder: 2,
      },
      {
        id: 'subcat-meat-pork',
        categoryId: meat.id,
        name: 'Pork',
        emoji: '🥓',
        description: 'Pork cuts and bacon',
        displayOrder: 3,
      },
      {
        id: 'subcat-meat-seafood',
        categoryId: meat.id,
        name: 'Seafood',
        emoji: '🐟',
        description: 'Fish, shellfish, seafood',
        displayOrder: 4,
      },
    ],
    skipDuplicates: true,
  });

  // Dairy & Eggs
  const dairy = await prisma.businessCategories.upsert({
    where: { id: 'cat-grocery-dairy' },
    update: {},
    create: {
      id: 'cat-grocery-dairy',
      businessId: 'grocery-demo-business',
      name: 'Dairy & Eggs',
      emoji: '🥛',
      color: '#F59E0B',
      description: 'Milk, cheese, yogurt, and eggs',
      businessType: 'grocery',
      displayOrder: 3,
      isActive: true,
      isUserCreated: false,
      updatedAt: new Date()
    },
  });

  await prisma.inventorySubcategories.createMany({
    data: [
      {
        id: 'subcat-dairy-milk',
        categoryId: dairy.id,
        name: 'Milk & Cream',
        emoji: '🥛',
        description: 'Dairy and non-dairy milk',
        displayOrder: 1,
      },
      {
        id: 'subcat-dairy-cheese',
        categoryId: dairy.id,
        name: 'Cheese',
        emoji: '🧀',
        description: 'Various cheese types',
        displayOrder: 2,
      },
      {
        id: 'subcat-dairy-yogurt',
        categoryId: dairy.id,
        name: 'Yogurt',
        emoji: '🥛',
        description: 'Regular and Greek yogurt',
        displayOrder: 3,
      },
      {
        id: 'subcat-dairy-eggs',
        categoryId: dairy.id,
        name: 'Eggs',
        emoji: '🥚',
        description: 'Fresh eggs',
        displayOrder: 4,
      },
    ],
    skipDuplicates: true,
  });

  // Other grocery categories
  await prisma.businessCategories.createMany({
    data: [
      {
        id: 'cat-grocery-bakery',
        businessId: 'grocery-demo-business',
        name: 'Bakery',
        emoji: '🍞',
        color: '#F59E0B',
        description: 'Fresh bread and baked goods',
        businessType: 'grocery',
        displayOrder: 4,
        isActive: true,
        isUserCreated: false,
      updatedAt: new Date()
      },
      {
        id: 'cat-grocery-pantry',
        businessId: 'grocery-demo-business',
        name: 'Pantry & Dry Goods',
        emoji: '🥫',
        color: '#8B5CF6',
        description: 'Canned goods, pasta, rice, and dry items',
        businessType: 'grocery',
        displayOrder: 5,
        isActive: true,
        isUserCreated: false,
      updatedAt: new Date()
      },
      {
        id: 'cat-grocery-beverages',
        businessId: 'grocery-demo-business',
        name: 'Beverages',
        emoji: '🥤',
        color: '#06B6D4',
        description: 'Soft drinks, juices, and beverages',
        businessType: 'grocery',
        displayOrder: 6,
        isActive: true,
        isUserCreated: false,
      updatedAt: new Date()
      },
    ],
    skipDuplicates: true,
  });

  // ============================================================
  // RESTAURANT BUSINESS CATEGORIES
  // ============================================================
  console.log('Seeding restaurant categories...');

  await prisma.businessCategories.createMany({
    data: [
      {
        id: 'cat-restaurant-appetizers',
        businessId: 'restaurant-demo-business',
        name: 'Appetizers',
        emoji: '🥗',
        color: '#10B981',
        description: 'Starters and small plates',
        businessType: 'restaurant',
        displayOrder: 1,
        isActive: true,
        isUserCreated: false,
      updatedAt: new Date()
      },
      {
        id: 'cat-restaurant-mains',
        businessId: 'restaurant-demo-business',
        name: 'Main Courses',
        emoji: '🍽️',
        color: '#EF4444',
        description: 'Entrees and main dishes',
        businessType: 'restaurant',
        displayOrder: 2,
        isActive: true,
        isUserCreated: false,
      updatedAt: new Date()
      },
      {
        id: 'cat-restaurant-desserts',
        businessId: 'restaurant-demo-business',
        name: 'Desserts',
        emoji: '🍰',
        color: '#EC4899',
        description: 'Sweet treats and desserts',
        businessType: 'restaurant',
        displayOrder: 3,
        isActive: true,
        isUserCreated: false,
      updatedAt: new Date()
      },
      {
        id: 'cat-restaurant-beverages',
        businessId: 'restaurant-demo-business',
        name: 'Beverages',
        emoji: '☕',
        color: '#F59E0B',
        description: 'Drinks and beverages',
        businessType: 'restaurant',
        displayOrder: 4,
        isActive: true,
        isUserCreated: false,
      updatedAt: new Date()
      },
      {
        id: 'cat-restaurant-specials',
        businessId: 'restaurant-demo-business',
        name: 'Daily Specials',
        emoji: '⭐',
        color: '#8B5CF6',
        description: 'Chef specials and seasonal items',
        businessType: 'restaurant',
        displayOrder: 5,
        isActive: true,
        isUserCreated: false,
      updatedAt: new Date()
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Seeding completed successfully!');
  console.log('📊 Summary:');
  console.log('   - Created 4 demo businesses');
  console.log('   - Seeded 20+ categories with emojis');
  console.log('   - Added 30+ subcategories');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
