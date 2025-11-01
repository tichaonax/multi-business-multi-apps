/**
 * Seed Type-Level Categories for All Business Types
 * 
 * This script creates default categories and subcategories that are shared
 * across all businesses of the same type (clothing, hardware, grocery, restaurant).
 * 
 * Run this after fresh deployment: node scripts/seed-type-categories.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CATEGORY_DATA = {
  clothing: {
    categories: [
      {
        id: 'cat_clothing_mens_001',
        name: "Men's Fashion",
        description: "Men's clothing and accessories",
        emoji: '👔',
        color: '#3B82F6',
        displayOrder: 1,
        domainId: 'domain_clothing_mens',
        subcategories: [
          { id: 'subcat_clothing_mens_shirts', name: 'Shirts', description: 'Dress shirts, casual shirts, t-shirts', emoji: '👕', displayOrder: 1 },
          { id: 'subcat_clothing_mens_pants', name: 'Pants', description: 'Trousers, jeans, shorts', emoji: '👖', displayOrder: 2 },
          { id: 'subcat_clothing_mens_suits', name: 'Suits', description: 'Business suits and formal wear', emoji: '🤵', displayOrder: 3 },
          { id: 'subcat_clothing_mens_outerwear', name: 'Outerwear', description: 'Jackets, coats, blazers', emoji: '🧥', displayOrder: 4 },
        ]
      },
      {
        id: 'cat_clothing_womens_001',
        name: "Women's Fashion",
        description: "Women's clothing and accessories",
        emoji: '👗',
        color: '#EC4899',
        displayOrder: 2,
        domainId: 'domain_clothing_womens',
        subcategories: [
          { id: 'subcat_clothing_womens_dresses', name: 'Dresses', description: 'Casual, formal, and evening dresses', emoji: '👗', displayOrder: 1 },
          { id: 'subcat_clothing_womens_tops', name: 'Tops', description: 'Blouses, shirts, t-shirts', emoji: '👚', displayOrder: 2 },
          { id: 'subcat_clothing_womens_bottoms', name: 'Bottoms', description: 'Skirts, pants, jeans', emoji: '👖', displayOrder: 3 },
          { id: 'subcat_clothing_womens_outerwear', name: 'Outerwear', description: 'Jackets, coats, cardigans', emoji: '🧥', displayOrder: 4 },
        ]
      },
      {
        id: 'cat_clothing_kids_001',
        name: "Kids Fashion",
        description: "Children's clothing and accessories",
        emoji: '👶',
        color: '#F59E0B',
        displayOrder: 3,
        domainId: 'domain_clothing_kids',
        subcategories: [
          { id: 'subcat_clothing_kids_boys', name: 'Boys', description: "Boys' clothing and accessories", emoji: '👦', displayOrder: 1 },
          { id: 'subcat_clothing_kids_girls', name: 'Girls', description: "Girls' clothing and accessories", emoji: '👧', displayOrder: 2 },
          { id: 'subcat_clothing_kids_baby', name: 'Baby', description: 'Baby clothing and essentials', emoji: '👶', displayOrder: 3 },
        ]
      },
      {
        id: 'cat_clothing_footwear_001',
        name: 'Footwear',
        description: 'Shoes and footwear for all ages',
        emoji: '👟',
        color: '#10B981',
        displayOrder: 4,
        domainId: 'domain_clothing_footwear',
        subcategories: [
          { id: 'subcat_clothing_footwear_casual', name: 'Casual Shoes', description: 'Sneakers, loafers, casual footwear', emoji: '👟', displayOrder: 1 },
          { id: 'subcat_clothing_footwear_formal', name: 'Formal Shoes', description: 'Dress shoes, heels, formal footwear', emoji: '👞', displayOrder: 2 },
          { id: 'subcat_clothing_footwear_sports', name: 'Sports Shoes', description: 'Athletic shoes, running shoes', emoji: '⚽', displayOrder: 3 },
        ]
      },
      {
        id: 'cat_clothing_accessories_001',
        name: 'Accessories',
        description: 'Fashion accessories and add-ons',
        emoji: '👜',
        color: '#8B5CF6',
        displayOrder: 5,
        domainId: 'domain_universal_accessories',
        subcategories: [
          { id: 'subcat_clothing_accessories_bags', name: 'Bags', description: 'Handbags, backpacks, wallets', emoji: '👜', displayOrder: 1 },
          { id: 'subcat_clothing_accessories_jewelry', name: 'Jewelry', description: 'Necklaces, bracelets, rings', emoji: '💍', displayOrder: 2 },
          { id: 'subcat_clothing_accessories_watches', name: 'Watches', description: 'Wristwatches and timepieces', emoji: '⌚', displayOrder: 3 },
        ]
      }
    ]
  },
  hardware: {
    categories: [
      {
        id: 'cat_hardware_hand_tools_001',
        name: 'Hand Tools',
        description: 'Manual tools and equipment',
        emoji: '🔨',
        color: '#EF4444',
        displayOrder: 1,
        domainId: 'domain_hardware_hand_tools',
        subcategories: [
          { id: 'subcat_hardware_hand_hammers', name: 'Hammers', description: 'Claw hammers, sledgehammers', emoji: '🔨', displayOrder: 1 },
          { id: 'subcat_hardware_hand_screwdrivers', name: 'Screwdrivers', description: 'Flathead, Phillips, precision', emoji: '🔧', displayOrder: 2 },
          { id: 'subcat_hardware_hand_wrenches', name: 'Wrenches', description: 'Adjustable, socket, torque wrenches', emoji: '🔧', displayOrder: 3 },
          { id: 'subcat_hardware_hand_measuring', name: 'Measuring Tools', description: 'Tape measures, levels, rulers', emoji: '📏', displayOrder: 4 },
        ]
      },
      {
        id: 'cat_hardware_power_tools_001',
        name: 'Power Tools',
        description: 'Electric and battery-powered tools',
        emoji: '⚡',
        color: '#F59E0B',
        displayOrder: 2,
        domainId: 'domain_hardware_power_tools',
        subcategories: [
          { id: 'subcat_hardware_power_drills', name: 'Drills', description: 'Electric drills, hammer drills', emoji: '🔩', displayOrder: 1 },
          { id: 'subcat_hardware_power_saws', name: 'Saws', description: 'Circular saws, jigsaws, miter saws', emoji: '🪚', displayOrder: 2 },
          { id: 'subcat_hardware_power_sanders', name: 'Sanders', description: 'Orbital sanders, belt sanders', emoji: '⚙️', displayOrder: 3 },
        ]
      },
      {
        id: 'cat_hardware_building_001',
        name: 'Building Materials',
        description: 'Construction and building supplies',
        emoji: '🧱',
        color: '#8B5CF6',
        displayOrder: 3,
        domainId: 'domain_hardware_building',
        subcategories: [
          { id: 'subcat_hardware_building_lumber', name: 'Lumber', description: 'Wood boards, planks, beams', emoji: '🪵', displayOrder: 1 },
          { id: 'subcat_hardware_building_cement', name: 'Cement & Concrete', description: 'Cement, concrete mix, mortar', emoji: '🧱', displayOrder: 2 },
          { id: 'subcat_hardware_building_paint', name: 'Paint & Supplies', description: 'Paint, brushes, rollers', emoji: '🎨', displayOrder: 3 },
        ]
      },
      {
        id: 'cat_hardware_plumbing_001',
        name: 'Plumbing',
        description: 'Pipes, fittings, and plumbing supplies',
        emoji: '🚰',
        color: '#06B6D4',
        displayOrder: 4,
        domainId: 'domain_hardware_hand_tools',
        subcategories: [
          { id: 'subcat_hardware_plumbing_pipes', name: 'Pipes', description: 'PVC, copper, steel pipes', emoji: '🚰', displayOrder: 1 },
          { id: 'subcat_hardware_plumbing_fittings', name: 'Fittings', description: 'Elbows, tees, couplings', emoji: '🔩', displayOrder: 2 },
        ]
      },
      {
        id: 'cat_hardware_electrical_001',
        name: 'Electrical',
        description: 'Wiring, switches, and electrical supplies',
        emoji: '💡',
        color: '#FBBF24',
        displayOrder: 5,
        domainId: 'domain_hardware_power_tools',
        subcategories: [
          { id: 'subcat_hardware_electrical_wire', name: 'Wire & Cable', description: 'Electrical wire, cable, conduit', emoji: '💡', displayOrder: 1 },
          { id: 'subcat_hardware_electrical_switches', name: 'Switches & Outlets', description: 'Light switches, power outlets', emoji: '🔌', displayOrder: 2 },
        ]
      }
    ]
  },
  grocery: {
    categories: [
      {
        id: 'cat_grocery_produce_001',
        name: 'Fresh Produce',
        description: 'Fresh fruits, vegetables, and herbs',
        emoji: '🥬',
        color: '#10B981',
        displayOrder: 1,
        domainId: 'domain_grocery_produce',
        subcategories: [
          { id: 'subcat_grocery_produce_fruits', name: 'Fruits', description: 'Fresh fruits and berries', emoji: '🍎', displayOrder: 1 },
          { id: 'subcat_grocery_produce_vegetables', name: 'Vegetables', description: 'Fresh vegetables', emoji: '🥕', displayOrder: 2 },
          { id: 'subcat_grocery_produce_herbs', name: 'Herbs', description: 'Fresh herbs and spices', emoji: '🌿', displayOrder: 3 },
        ]
      },
      {
        id: 'cat_grocery_meat_001',
        name: 'Meat & Seafood',
        description: 'Fresh and frozen meats, poultry, seafood',
        emoji: '🥩',
        color: '#EF4444',
        displayOrder: 2,
        domainId: 'domain_grocery_meat',
        subcategories: [
          { id: 'subcat_grocery_meat_beef', name: 'Beef', description: 'Fresh beef and steaks', emoji: '🥩', displayOrder: 1 },
          { id: 'subcat_grocery_meat_chicken', name: 'Chicken & Poultry', description: 'Fresh chicken, turkey', emoji: '🍗', displayOrder: 2 },
          { id: 'subcat_grocery_meat_seafood', name: 'Seafood', description: 'Fish, shrimp, shellfish', emoji: '🐟', displayOrder: 3 },
        ]
      },
      {
        id: 'cat_grocery_dairy_001',
        name: 'Dairy Products',
        description: 'Milk, cheese, yogurt, dairy alternatives',
        emoji: '🥛',
        color: '#3B82F6',
        displayOrder: 3,
        domainId: 'domain_grocery_dairy',
        subcategories: [
          { id: 'subcat_grocery_dairy_milk', name: 'Milk', description: 'Fresh milk and alternatives', emoji: '🥛', displayOrder: 1 },
          { id: 'subcat_grocery_dairy_cheese', name: 'Cheese', description: 'Various cheese types', emoji: '🧀', displayOrder: 2 },
          { id: 'subcat_grocery_dairy_yogurt', name: 'Yogurt', description: 'Yogurt and cultured products', emoji: '🥄', displayOrder: 3 },
        ]
      },
      {
        id: 'cat_grocery_bakery_001',
        name: 'Bakery',
        description: 'Bread, pastries, cakes',
        emoji: '🍞',
        color: '#F59E0B',
        displayOrder: 4,
        domainId: 'domain_grocery_produce',
        subcategories: [
          { id: 'subcat_grocery_bakery_bread', name: 'Bread', description: 'Fresh bread and rolls', emoji: '🍞', displayOrder: 1 },
          { id: 'subcat_grocery_bakery_pastries', name: 'Pastries', description: 'Donuts, croissants, pastries', emoji: '🥐', displayOrder: 2 },
        ]
      },
      {
        id: 'cat_grocery_beverages_001',
        name: 'Beverages',
        description: 'Soft drinks, juices, water',
        emoji: '🥤',
        color: '#06B6D4',
        displayOrder: 5,
        domainId: 'domain_grocery_dairy',
        subcategories: [
          { id: 'subcat_grocery_beverages_soft', name: 'Soft Drinks', description: 'Sodas and carbonated drinks', emoji: '🥤', displayOrder: 1 },
          { id: 'subcat_grocery_beverages_juice', name: 'Juices', description: 'Fruit juices and drinks', emoji: '🧃', displayOrder: 2 },
        ]
      },
      {
        id: 'cat_grocery_pantry_001',
        name: 'Pantry & Canned Goods',
        description: 'Canned foods, pasta, rice, grains',
        emoji: '🥫',
        color: '#8B5CF6',
        displayOrder: 6,
        domainId: 'domain_grocery_produce',
        subcategories: [
          { id: 'subcat_grocery_pantry_canned', name: 'Canned Goods', description: 'Canned vegetables, soups', emoji: '🥫', displayOrder: 1 },
          { id: 'subcat_grocery_pantry_pasta', name: 'Pasta & Rice', description: 'Dry pasta, rice, grains', emoji: '🍝', displayOrder: 2 },
        ]
      }
    ]
  },
  restaurant: {
    categories: [
      {
        id: 'cat_restaurant_appetizers_001',
        name: 'Appetizers',
        description: 'Starters, salads, and small plates',
        emoji: '🥗',
        color: '#10B981',
        displayOrder: 1,
        domainId: 'domain_restaurant_appetizers',
        subcategories: [
          { id: 'subcat_restaurant_appetizers_salads', name: 'Salads', description: 'Fresh salads and greens', emoji: '🥗', displayOrder: 1 },
          { id: 'subcat_restaurant_appetizers_soups', name: 'Soups', description: 'Hot and cold soups', emoji: '🍲', displayOrder: 2 },
          { id: 'subcat_restaurant_appetizers_finger', name: 'Finger Foods', description: 'Small bites and finger foods', emoji: '🍢', displayOrder: 3 },
        ]
      },
      {
        id: 'cat_restaurant_mains_001',
        name: 'Main Courses',
        description: 'Entrees and main dishes',
        emoji: '🍽️',
        color: '#EF4444',
        displayOrder: 2,
        domainId: 'domain_restaurant_mains',
        subcategories: [
          { id: 'subcat_restaurant_mains_meat', name: 'Meat Dishes', description: 'Beef, pork, lamb dishes', emoji: '🥩', displayOrder: 1 },
          { id: 'subcat_restaurant_mains_seafood', name: 'Seafood', description: 'Fish and seafood dishes', emoji: '🐟', displayOrder: 2 },
          { id: 'subcat_restaurant_mains_vegetarian', name: 'Vegetarian', description: 'Vegetarian and vegan options', emoji: '🥗', displayOrder: 3 },
          { id: 'subcat_restaurant_mains_pasta', name: 'Pasta', description: 'Pasta and Italian dishes', emoji: '🍝', displayOrder: 4 },
        ]
      },
      {
        id: 'cat_restaurant_desserts_001',
        name: 'Desserts',
        description: 'Sweets and dessert items',
        emoji: '🍰',
        color: '#EC4899',
        displayOrder: 3,
        domainId: 'domain_restaurant_mains',
        subcategories: [
          { id: 'subcat_restaurant_desserts_cakes', name: 'Cakes', description: 'Cakes and layer desserts', emoji: '🍰', displayOrder: 1 },
          { id: 'subcat_restaurant_desserts_ice_cream', name: 'Ice Cream', description: 'Ice cream and frozen desserts', emoji: '🍨', displayOrder: 2 },
        ]
      },
      {
        id: 'cat_restaurant_beverages_001',
        name: 'Beverages',
        description: 'Drinks, coffee, tea, and juices',
        emoji: '☕',
        color: '#06B6D4',
        displayOrder: 4,
        domainId: 'domain_restaurant_beverages',
        subcategories: [
          { id: 'subcat_restaurant_beverages_hot', name: 'Hot Beverages', description: 'Coffee, tea, hot chocolate', emoji: '☕', displayOrder: 1 },
          { id: 'subcat_restaurant_beverages_cold', name: 'Cold Beverages', description: 'Sodas, juices, iced drinks', emoji: '🥤', displayOrder: 2 },
          { id: 'subcat_restaurant_beverages_alcoholic', name: 'Alcoholic', description: 'Beer, wine, cocktails', emoji: '🍺', displayOrder: 3 },
        ]
      }
    ]
  }
};

async function seedTypeCategories() {
  console.log('🌱 Starting Type-Level Category Seeding...\n');

  let totalCategoriesCreated = 0;
  let totalSubcategoriesCreated = 0;

  for (const [businessType, data] of Object.entries(CATEGORY_DATA)) {
    console.log(`\n📦 Processing ${businessType} business type...`);

    // Check if categories already exist for this type
    const existingCount = await prisma.businessCategories.count({
      where: { businessType, isUserCreated: false }
    });

    if (existingCount > 0) {
      console.log(`   ⏭️  Skipping ${businessType} - ${existingCount} categories already exist`);
      continue;
    }

    // Get or create a reference business for this type
    let referenceBusiness = await prisma.businesses.findFirst({
      where: { type: businessType },
      select: { id: true }
    });

    if (!referenceBusiness) {
      console.log(`   ⚠️  No ${businessType} business exists yet. Categories will be created when first business is added.`);
      continue;
    }

    // Process each category
    for (const category of data.categories) {
      try {
        // Create category
        const createdCategory = await prisma.businessCategories.create({
          data: {
            id: category.id,
            businessId: referenceBusiness.id,
            businessType: businessType,
            name: category.name,
            description: category.description,
            emoji: category.emoji,
            color: category.color,
            displayOrder: category.displayOrder,
            domainId: category.domainId,
            isUserCreated: false,
            isActive: true,
            updatedAt: new Date()
          }
        });

        totalCategoriesCreated++;
        console.log(`   ✅ Created category: ${category.name}`);

        // Create subcategories
        if (category.subcategories && category.subcategories.length > 0) {
          for (const subcategory of category.subcategories) {
            await prisma.inventorySubcategories.create({
              data: {
                id: subcategory.id,
                categoryId: createdCategory.id,
                name: subcategory.name,
                description: subcategory.description,
                emoji: subcategory.emoji,
                displayOrder: subcategory.displayOrder,
                isActive: true,
                updatedAt: new Date()
              }
            });

            totalSubcategoriesCreated++;
          }
          console.log(`      └─ Created ${category.subcategories.length} subcategories`);
        }
      } catch (error) {
        if (error.code === 'P2002') {
          console.log(`   ⏭️  Skipping ${category.name} - already exists`);
        } else {
          console.error(`   ❌ Error creating ${category.name}:`, error.message);
        }
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ SEEDING COMPLETE');
  console.log('='.repeat(60));
  console.log(`📊 Categories created: ${totalCategoriesCreated}`);
  console.log(`📊 Subcategories created: ${totalSubcategoriesCreated}`);
  console.log('');

  // Show final summary
  console.log('📋 Final Category Count by Business Type:\n');
  const summary = await prisma.businessCategories.groupBy({
    by: ['businessType'],
    _count: { id: true },
    where: { isUserCreated: false }
  });

  summary.forEach(row => {
    console.log(`   ${row.businessType}: ${row._count.id} categories`);
  });

  await prisma.$disconnect();
}

// Run the seeding
seedTypeCategories()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
