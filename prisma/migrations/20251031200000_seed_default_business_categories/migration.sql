-- Seed Default Business Categories and Subcategories
-- This migration provides default inventory categories for each business type
-- Categories are shared by businessType (not businessId)

-- NOTE: This migration will be run AFTER the first business of each type is created
-- Run: npm run seed:categories OR node scripts/seed-type-categories.js

-- This file serves as documentation of the default category structure
-- The actual seeding is done via the seed-type-categories.js script

-- =============================================================================
-- PLACEHOLDER - Actual seeding done via script
-- =============================================================================

-- This migration is intentionally empty to maintain migration order
-- The seed-type-categories.js script will handle the actual data insertion
-- after ensuring businesses exist for each type
  
  -- Women's Fashion
  ('cat_clothing_womens_001', '00000000-0000-0000-0000-000000000001', 'clothing', 'Women''s Fashion', 'Women''s clothing and accessories', '👗', '#EC4899', 2, 'domain_clothing_womens', false, true, NOW(), NOW()),
  
  -- Kids Fashion
  ('cat_clothing_kids_001', '00000000-0000-0000-0000-000000000001', 'clothing', 'Kids Fashion', 'Children''s clothing and accessories', '👶', '#F59E0B', 3, 'domain_clothing_kids', false, true, NOW(), NOW()),
  
  -- Footwear
  ('cat_clothing_footwear_001', '00000000-0000-0000-0000-000000000001', 'clothing', 'Footwear', 'Shoes and footwear for all ages', '👟', '#10B981', 4, 'domain_clothing_footwear', false, true, NOW(), NOW()),
  
  -- Accessories
  ('cat_clothing_accessories_001', '00000000-0000-0000-0000-000000000001', 'clothing', 'Accessories', 'Fashion accessories and add-ons', '👜', '#8B5CF6', 5, 'domain_universal_accessories', false, true, NOW(), NOW())
ON CONFLICT ("businessType", "name") DO NOTHING;

-- =============================================================================
-- CLOTHING SUBCATEGORIES
-- =============================================================================

INSERT INTO "inventory_subcategories" ("id", "categoryId", "name", "description", "emoji", "displayOrder", "isActive", "createdAt", "updatedAt")
VALUES
  -- Men's Fashion Subcategories
  ('subcat_clothing_mens_shirts', 'cat_clothing_mens_001', 'Shirts', 'Dress shirts, casual shirts, t-shirts', '👕', 1, true, NOW(), NOW()),
  ('subcat_clothing_mens_pants', 'cat_clothing_mens_001', 'Pants', 'Trousers, jeans, shorts', '👖', 2, true, NOW(), NOW()),
  ('subcat_clothing_mens_suits', 'cat_clothing_mens_001', 'Suits', 'Business suits and formal wear', '🤵', 3, true, NOW(), NOW()),
  ('subcat_clothing_mens_outerwear', 'cat_clothing_mens_001', 'Outerwear', 'Jackets, coats, blazers', '🧥', 4, true, NOW(), NOW()),
  
  -- Women's Fashion Subcategories
  ('subcat_clothing_womens_dresses', 'cat_clothing_womens_001', 'Dresses', 'Casual, formal, and evening dresses', '👗', 1, true, NOW(), NOW()),
  ('subcat_clothing_womens_tops', 'cat_clothing_womens_001', 'Tops', 'Blouses, shirts, t-shirts', '👚', 2, true, NOW(), NOW()),
  ('subcat_clothing_womens_bottoms', 'cat_clothing_womens_001', 'Bottoms', 'Skirts, pants, jeans', '👖', 3, true, NOW(), NOW()),
  ('subcat_clothing_womens_outerwear', 'cat_clothing_womens_001', 'Outerwear', 'Jackets, coats, cardigans', '🧥', 4, true, NOW(), NOW()),
  
  -- Kids Fashion Subcategories
  ('subcat_clothing_kids_boys', 'cat_clothing_kids_001', 'Boys', 'Boys'' clothing and accessories', '👦', 1, true, NOW(), NOW()),
  ('subcat_clothing_kids_girls', 'cat_clothing_kids_001', 'Girls', 'Girls'' clothing and accessories', '👧', 2, true, NOW(), NOW()),
  ('subcat_clothing_kids_baby', 'cat_clothing_kids_001', 'Baby', 'Baby clothing and essentials', '👶', 3, true, NOW(), NOW()),
  
  -- Footwear Subcategories
  ('subcat_clothing_footwear_casual', 'cat_clothing_footwear_001', 'Casual Shoes', 'Sneakers, loafers, casual footwear', '👟', 1, true, NOW(), NOW()),
  ('subcat_clothing_footwear_formal', 'cat_clothing_footwear_001', 'Formal Shoes', 'Dress shoes, heels, formal footwear', '👞', 2, true, NOW(), NOW()),
  ('subcat_clothing_footwear_sports', 'cat_clothing_footwear_001', 'Sports Shoes', 'Athletic shoes, running shoes', '⚽', 3, true, NOW(), NOW()),
  
  -- Accessories Subcategories
  ('subcat_clothing_accessories_bags', 'cat_clothing_accessories_001', 'Bags', 'Handbags, backpacks, wallets', '👜', 1, true, NOW(), NOW()),
  ('subcat_clothing_accessories_jewelry', 'cat_clothing_accessories_001', 'Jewelry', 'Necklaces, bracelets, rings', '💍', 2, true, NOW(), NOW()),
  ('subcat_clothing_accessories_watches', 'cat_clothing_accessories_001', 'Watches', 'Wristwatches and timepieces', '⌚', 3, true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- =============================================================================
-- HARDWARE BUSINESS CATEGORIES
-- =============================================================================

INSERT INTO "business_categories" ("id", "businessId", "businessType", "name", "description", "emoji", "color", "displayOrder", "domainId", "isUserCreated", "isActive", "createdAt", "updatedAt")
VALUES
  -- Hand Tools
  ('cat_hardware_hand_tools_001', '00000000-0000-0000-0000-000000000002', 'hardware', 'Hand Tools', 'Manual tools and equipment', '🔨', '#EF4444', 1, 'domain_hardware_hand_tools', false, true, NOW(), NOW()),
  
  -- Power Tools
  ('cat_hardware_power_tools_001', '00000000-0000-0000-0000-000000000002', 'hardware', 'Power Tools', 'Electric and battery-powered tools', '⚡', '#F59E0B', 2, 'domain_hardware_power_tools', false, true, NOW(), NOW()),
  
  -- Building Materials
  ('cat_hardware_building_001', '00000000-0000-0000-0000-000000000002', 'hardware', 'Building Materials', 'Construction and building supplies', '🧱', '#8B5CF6', 3, 'domain_hardware_building', false, true, NOW(), NOW()),
  
  -- Plumbing
  ('cat_hardware_plumbing_001', '00000000-0000-0000-0000-000000000002', 'hardware', 'Plumbing', 'Pipes, fittings, and plumbing supplies', '🚰', '#06B6D4', 4, 'domain_hardware_hand_tools', false, true, NOW(), NOW()),
  
  -- Electrical
  ('cat_hardware_electrical_001', '00000000-0000-0000-0000-000000000002', 'hardware', 'Electrical', 'Wiring, switches, and electrical supplies', '💡', '#FBBF24', 5, 'domain_hardware_power_tools', false, true, NOW(), NOW())
ON CONFLICT ("businessType", "name") DO NOTHING;

-- =============================================================================
-- HARDWARE SUBCATEGORIES
-- =============================================================================

INSERT INTO "inventory_subcategories" ("id", "categoryId", "name", "description", "emoji", "displayOrder", "isActive", "createdAt", "updatedAt")
VALUES
  -- Hand Tools Subcategories
  ('subcat_hardware_hand_hammers', 'cat_hardware_hand_tools_001', 'Hammers', 'Claw hammers, sledgehammers', '🔨', 1, true, NOW(), NOW()),
  ('subcat_hardware_hand_screwdrivers', 'cat_hardware_hand_tools_001', 'Screwdrivers', 'Flathead, Phillips, precision', '🔧', 2, true, NOW(), NOW()),
  ('subcat_hardware_hand_wrenches', 'cat_hardware_hand_tools_001', 'Wrenches', 'Adjustable, socket, torque wrenches', '🔧', 3, true, NOW(), NOW()),
  ('subcat_hardware_hand_measuring', 'cat_hardware_hand_tools_001', 'Measuring Tools', 'Tape measures, levels, rulers', '📏', 4, true, NOW(), NOW()),
  
  -- Power Tools Subcategories
  ('subcat_hardware_power_drills', 'cat_hardware_power_tools_001', 'Drills', 'Electric drills, hammer drills', '🔩', 1, true, NOW(), NOW()),
  ('subcat_hardware_power_saws', 'cat_hardware_power_tools_001', 'Saws', 'Circular saws, jigsaws, miter saws', '🪚', 2, true, NOW(), NOW()),
  ('subcat_hardware_power_sanders', 'cat_hardware_power_tools_001', 'Sanders', 'Orbital sanders, belt sanders', '⚙️', 3, true, NOW(), NOW()),
  
  -- Building Materials Subcategories
  ('subcat_hardware_building_lumber', 'cat_hardware_building_001', 'Lumber', 'Wood boards, planks, beams', '🪵', 1, true, NOW(), NOW()),
  ('subcat_hardware_building_cement', 'cat_hardware_building_001', 'Cement & Concrete', 'Cement, concrete mix, mortar', '🧱', 2, true, NOW(), NOW()),
  ('subcat_hardware_building_paint', 'cat_hardware_building_001', 'Paint & Supplies', 'Paint, brushes, rollers', '🎨', 3, true, NOW(), NOW()),
  
  -- Plumbing Subcategories
  ('subcat_hardware_plumbing_pipes', 'cat_hardware_plumbing_001', 'Pipes', 'PVC, copper, steel pipes', '🚰', 1, true, NOW(), NOW()),
  ('subcat_hardware_plumbing_fittings', 'cat_hardware_plumbing_001', 'Fittings', 'Elbows, tees, couplings', '🔩', 2, true, NOW(), NOW()),
  
  -- Electrical Subcategories
  ('subcat_hardware_electrical_wire', 'cat_hardware_electrical_001', 'Wire & Cable', 'Electrical wire, cable, conduit', '💡', 1, true, NOW(), NOW()),
  ('subcat_hardware_electrical_switches', 'cat_hardware_electrical_001', 'Switches & Outlets', 'Light switches, power outlets', '🔌', 2, true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- =============================================================================
-- GROCERY BUSINESS CATEGORIES
-- =============================================================================

INSERT INTO "business_categories" ("id", "businessId", "businessType", "name", "description", "emoji", "color", "displayOrder", "domainId", "isUserCreated", "isActive", "createdAt", "updatedAt")
VALUES
  -- Fresh Produce
  ('cat_grocery_produce_001', '00000000-0000-0000-0000-000000000003', 'grocery', 'Fresh Produce', 'Fresh fruits, vegetables, and herbs', '🥬', '#10B981', 1, 'domain_grocery_produce', false, true, NOW(), NOW()),
  
  -- Meat & Seafood
  ('cat_grocery_meat_001', '00000000-0000-0000-0000-000000000003', 'grocery', 'Meat & Seafood', 'Fresh and frozen meats, poultry, seafood', '🥩', '#EF4444', 2, 'domain_grocery_meat', false, true, NOW(), NOW()),
  
  -- Dairy Products
  ('cat_grocery_dairy_001', '00000000-0000-0000-0000-000000000003', 'grocery', 'Dairy Products', 'Milk, cheese, yogurt, dairy alternatives', '🥛', '#3B82F6', 3, 'domain_grocery_dairy', false, true, NOW(), NOW()),
  
  -- Bakery
  ('cat_grocery_bakery_001', '00000000-0000-0000-0000-000000000003', 'grocery', 'Bakery', 'Bread, pastries, cakes', '🍞', '#F59E0B', 4, 'domain_grocery_produce', false, true, NOW(), NOW()),
  
  -- Beverages
  ('cat_grocery_beverages_001', '00000000-0000-0000-0000-000000000003', 'grocery', 'Beverages', 'Soft drinks, juices, water', '🥤', '#06B6D4', 5, 'domain_grocery_dairy', false, true, NOW(), NOW()),
  
  -- Pantry & Canned Goods
  ('cat_grocery_pantry_001', '00000000-0000-0000-0000-000000000003', 'grocery', 'Pantry & Canned Goods', 'Canned foods, pasta, rice, grains', '🥫', '#8B5CF6', 6, 'domain_grocery_produce', false, true, NOW(), NOW())
ON CONFLICT ("businessType", "name") DO NOTHING;

-- =============================================================================
-- GROCERY SUBCATEGORIES
-- =============================================================================

INSERT INTO "inventory_subcategories" ("id", "categoryId", "name", "description", "emoji", "displayOrder", "isActive", "createdAt", "updatedAt")
VALUES
  -- Fresh Produce Subcategories
  ('subcat_grocery_produce_fruits', 'cat_grocery_produce_001', 'Fruits', 'Fresh fruits and berries', '🍎', 1, true, NOW(), NOW()),
  ('subcat_grocery_produce_vegetables', 'cat_grocery_produce_001', 'Vegetables', 'Fresh vegetables', '🥕', 2, true, NOW(), NOW()),
  ('subcat_grocery_produce_herbs', 'cat_grocery_produce_001', 'Herbs', 'Fresh herbs and spices', '🌿', 3, true, NOW(), NOW()),
  
  -- Meat & Seafood Subcategories
  ('subcat_grocery_meat_beef', 'cat_grocery_meat_001', 'Beef', 'Fresh beef and steaks', '🥩', 1, true, NOW(), NOW()),
  ('subcat_grocery_meat_chicken', 'cat_grocery_meat_001', 'Chicken & Poultry', 'Fresh chicken, turkey', '🍗', 2, true, NOW(), NOW()),
  ('subcat_grocery_meat_seafood', 'cat_grocery_meat_001', 'Seafood', 'Fish, shrimp, shellfish', '🐟', 3, true, NOW(), NOW()),
  
  -- Dairy Products Subcategories
  ('subcat_grocery_dairy_milk', 'cat_grocery_dairy_001', 'Milk', 'Fresh milk and alternatives', '🥛', 1, true, NOW(), NOW()),
  ('subcat_grocery_dairy_cheese', 'cat_grocery_dairy_001', 'Cheese', 'Various cheese types', '🧀', 2, true, NOW(), NOW()),
  ('subcat_grocery_dairy_yogurt', 'cat_grocery_dairy_001', 'Yogurt', 'Yogurt and cultured products', '🥄', 3, true, NOW(), NOW()),
  
  -- Bakery Subcategories
  ('subcat_grocery_bakery_bread', 'cat_grocery_bakery_001', 'Bread', 'Fresh bread and rolls', '🍞', 1, true, NOW(), NOW()),
  ('subcat_grocery_bakery_pastries', 'cat_grocery_bakery_001', 'Pastries', 'Donuts, croissants, pastries', '🥐', 2, true, NOW(), NOW()),
  
  -- Beverages Subcategories
  ('subcat_grocery_beverages_soft', 'cat_grocery_beverages_001', 'Soft Drinks', 'Sodas and carbonated drinks', '🥤', 1, true, NOW(), NOW()),
  ('subcat_grocery_beverages_juice', 'cat_grocery_beverages_001', 'Juices', 'Fruit juices and drinks', '🧃', 2, true, NOW(), NOW()),
  
  -- Pantry Subcategories
  ('subcat_grocery_pantry_canned', 'cat_grocery_pantry_001', 'Canned Goods', 'Canned vegetables, soups', '🥫', 1, true, NOW(), NOW()),
  ('subcat_grocery_pantry_pasta', 'cat_grocery_pantry_001', 'Pasta & Rice', 'Dry pasta, rice, grains', '🍝', 2, true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- =============================================================================
-- RESTAURANT BUSINESS CATEGORIES
-- =============================================================================

INSERT INTO "business_categories" ("id", "businessId", "businessType", "name", "description", "emoji", "color", "displayOrder", "domainId", "isUserCreated", "isActive", "createdAt", "updatedAt")
VALUES
  -- Appetizers
  ('cat_restaurant_appetizers_001', '00000000-0000-0000-0000-000000000004', 'restaurant', 'Appetizers', 'Starters, salads, and small plates', '🥗', '#10B981', 1, 'domain_restaurant_appetizers', false, true, NOW(), NOW()),
  
  -- Main Courses
  ('cat_restaurant_mains_001', '00000000-0000-0000-0000-000000000004', 'restaurant', 'Main Courses', 'Entrees and main dishes', '🍽️', '#EF4444', 2, 'domain_restaurant_mains', false, true, NOW(), NOW()),
  
  -- Desserts
  ('cat_restaurant_desserts_001', '00000000-0000-0000-0000-000000000004', 'restaurant', 'Desserts', 'Sweets and dessert items', '🍰', '#EC4899', 3, 'domain_restaurant_mains', false, true, NOW(), NOW()),
  
  -- Beverages
  ('cat_restaurant_beverages_001', '00000000-0000-0000-0000-000000000004', 'restaurant', 'Beverages', 'Drinks, coffee, tea, and juices', '☕', '#06B6D4', 4, 'domain_restaurant_beverages', false, true, NOW(), NOW())
ON CONFLICT ("businessType", "name") DO NOTHING;

-- =============================================================================
-- RESTAURANT SUBCATEGORIES
-- =============================================================================

INSERT INTO "inventory_subcategories" ("id", "categoryId", "name", "description", "emoji", "displayOrder", "isActive", "createdAt", "updatedAt")
VALUES
  -- Appetizers Subcategories
  ('subcat_restaurant_appetizers_salads', 'cat_restaurant_appetizers_001', 'Salads', 'Fresh salads and greens', '🥗', 1, true, NOW(), NOW()),
  ('subcat_restaurant_appetizers_soups', 'cat_restaurant_appetizers_001', 'Soups', 'Hot and cold soups', '🍲', 2, true, NOW(), NOW()),
  ('subcat_restaurant_appetizers_finger', 'cat_restaurant_appetizers_001', 'Finger Foods', 'Small bites and finger foods', '🍢', 3, true, NOW(), NOW()),
  
  -- Main Courses Subcategories
  ('subcat_restaurant_mains_meat', 'cat_restaurant_mains_001', 'Meat Dishes', 'Beef, pork, lamb dishes', '🥩', 1, true, NOW(), NOW()),
  ('subcat_restaurant_mains_seafood', 'cat_restaurant_mains_001', 'Seafood', 'Fish and seafood dishes', '🐟', 2, true, NOW(), NOW()),
  ('subcat_restaurant_mains_vegetarian', 'cat_restaurant_mains_001', 'Vegetarian', 'Vegetarian and vegan options', '🥗', 3, true, NOW(), NOW()),
  ('subcat_restaurant_mains_pasta', 'cat_restaurant_mains_001', 'Pasta', 'Pasta and Italian dishes', '🍝', 4, true, NOW(), NOW()),
  
  -- Desserts Subcategories
  ('subcat_restaurant_desserts_cakes', 'cat_restaurant_desserts_001', 'Cakes', 'Cakes and layer desserts', '🍰', 1, true, NOW(), NOW()),
  ('subcat_restaurant_desserts_ice_cream', 'cat_restaurant_desserts_001', 'Ice Cream', 'Ice cream and frozen desserts', '🍨', 2, true, NOW(), NOW()),
  
  -- Beverages Subcategories
  ('subcat_restaurant_beverages_hot', 'cat_restaurant_beverages_001', 'Hot Beverages', 'Coffee, tea, hot chocolate', '☕', 1, true, NOW(), NOW()),
  ('subcat_restaurant_beverages_cold', 'cat_restaurant_beverages_001', 'Cold Beverages', 'Sodas, juices, iced drinks', '🥤', 2, true, NOW(), NOW()),
  ('subcat_restaurant_beverages_alcoholic', 'cat_restaurant_beverages_001', 'Alcoholic', 'Beer, wine, cocktails', '🍺', 3, true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- =============================================================================
-- VERIFICATION QUERIES (Comment out for production)
-- =============================================================================

-- Check seeded categories
-- SELECT businessType, name, emoji, isUserCreated
-- FROM business_categories
-- WHERE isUserCreated = false
-- ORDER BY businessType, displayOrder;

-- Check seeded subcategories
-- SELECT bc.businessType, bc.name as category, s.name as subcategory, s.emoji
-- FROM inventory_subcategories s
-- JOIN business_categories bc ON s.categoryId = bc.id
-- WHERE bc.isUserCreated = false
-- ORDER BY bc.businessType, bc.displayOrder, s.displayOrder;
