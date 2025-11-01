-- Seed Default Business Categories and Subcategories
-- This migration provides default inventory categories for each business type
-- Categories are shared by businessType (not businessId)

-- RERUNNABLE: Uses conditional inserts - only runs if business of that type exists
-- SAFE: Uses NOT EXISTS checks to prevent duplicates
-- AUTOMATIC: Runs as part of prisma migrate deploy (no manual script needed)

-- Note: If no business of a type exists yet, those categories will be skipped
-- They will be inserted when this migration is re-run (e.g., via migrate deploy)

-- =============================================================================
-- HELPER: Function to insert category only if business type exists
-- =============================================================================

DO $$
DECLARE
  v_clothing_business_id UUID;
  v_hardware_business_id UUID;
  v_grocery_business_id UUID;
  v_restaurant_business_id UUID;
BEGIN
  -- Get one business ID for each type (needed for FK constraint)
  SELECT id INTO v_clothing_business_id FROM businesses WHERE type = 'clothing' LIMIT 1;
  SELECT id INTO v_hardware_business_id FROM businesses WHERE type = 'hardware' LIMIT 1;
  SELECT id INTO v_grocery_business_id FROM businesses WHERE type = 'grocery' LIMIT 1;
  SELECT id INTO v_restaurant_business_id FROM businesses WHERE type = 'restaurant' LIMIT 1;

  -- ==========================================================================
  -- CLOTHING CATEGORIES
  -- ==========================================================================
  
  IF v_clothing_business_id IS NOT NULL THEN
    -- Men's Fashion
    INSERT INTO business_categories (id, "businessId", "businessType", name, description, emoji, color, "displayOrder", "domainId", "isUserCreated", "isActive", "createdAt", "updatedAt")
    VALUES ('cat_clothing_mens_001', v_clothing_business_id, 'clothing', 'Men''s Fashion', 'Men''s clothing and accessories', '👔', '#3B82F6', 1, 'domain_clothing_mens', false, true, NOW(), NOW())
    ON CONFLICT ("businessType", name) DO NOTHING;
    
    -- Women's Fashion
    INSERT INTO business_categories (id, "businessId", "businessType", name, description, emoji, color, "displayOrder", "domainId", "isUserCreated", "isActive", "createdAt", "updatedAt")
    VALUES ('cat_clothing_womens_001', v_clothing_business_id, 'clothing', 'Women''s Fashion', 'Women''s clothing and accessories', '👗', '#EC4899', 2, 'domain_clothing_womens', false, true, NOW(), NOW())
    ON CONFLICT ("businessType", name) DO NOTHING;
    
    -- Kids Fashion
    INSERT INTO business_categories (id, "businessId", "businessType", name, description, emoji, color, "displayOrder", "domainId", "isUserCreated", "isActive", "createdAt", "updatedAt")
    VALUES ('cat_clothing_kids_001', v_clothing_business_id, 'clothing', 'Kids Fashion', 'Children''s clothing and accessories', '👶', '#F59E0B', 3, 'domain_clothing_kids', false, true, NOW(), NOW())
    ON CONFLICT ("businessType", name) DO NOTHING;
    
    -- Footwear
    INSERT INTO business_categories (id, "businessId", "businessType", name, description, emoji, color, "displayOrder", "domainId", "isUserCreated", "isActive", "createdAt", "updatedAt")
    VALUES ('cat_clothing_footwear_001', v_clothing_business_id, 'clothing', 'Footwear', 'Shoes and footwear for all ages', '👟', '#10B981', 4, 'domain_clothing_footwear', false, true, NOW(), NOW())
    ON CONFLICT ("businessType", name) DO NOTHING;
    
    -- Accessories
    INSERT INTO business_categories (id, "businessId", "businessType", name, description, emoji, color, "displayOrder", "domainId", "isUserCreated", "isActive", "createdAt", "updatedAt")
    VALUES ('cat_clothing_accessories_001', v_clothing_business_id, 'clothing', 'Accessories', 'Fashion accessories and add-ons', '👜', '#8B5CF6', 5, 'domain_universal_accessories', false, true, NOW(), NOW())
    ON CONFLICT ("businessType", name) DO NOTHING;
    
    -- Subcategories for Men's Fashion
    INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isActive", "createdAt", "updatedAt")
    VALUES 
      ('subcat_clothing_mens_shirts', 'cat_clothing_mens_001', 'Shirts', 'Dress shirts, casual shirts, t-shirts', '👕', 1, true, NOW(), NOW()),
      ('subcat_clothing_mens_pants', 'cat_clothing_mens_001', 'Pants', 'Trousers, jeans, shorts', '👖', 2, true, NOW(), NOW()),
      ('subcat_clothing_mens_suits', 'cat_clothing_mens_001', 'Suits', 'Business suits and formal wear', '🤵', 3, true, NOW(), NOW()),
      ('subcat_clothing_mens_outerwear', 'cat_clothing_mens_001', 'Outerwear', 'Jackets, coats, blazers', '🧥', 4, true, NOW(), NOW())
    ON CONFLICT ("categoryId", name) DO NOTHING;
    
    -- Subcategories for Women's Fashion
    INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isActive", "createdAt", "updatedAt")
    VALUES 
      ('subcat_clothing_womens_dresses', 'cat_clothing_womens_001', 'Dresses', 'Casual, formal, and evening dresses', '👗', 1, true, NOW(), NOW()),
      ('subcat_clothing_womens_tops', 'cat_clothing_womens_001', 'Tops', 'Blouses, shirts, t-shirts', '👚', 2, true, NOW(), NOW()),
      ('subcat_clothing_womens_bottoms', 'cat_clothing_womens_001', 'Bottoms', 'Skirts, pants, jeans', '👖', 3, true, NOW(), NOW()),
      ('subcat_clothing_womens_outerwear', 'cat_clothing_womens_001', 'Outerwear', 'Jackets, coats, cardigans', '🧥', 4, true, NOW(), NOW())
    ON CONFLICT ("categoryId", name) DO NOTHING;
    
    -- Subcategories for Kids Fashion
    INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isActive", "createdAt", "updatedAt")
    VALUES 
      ('subcat_clothing_kids_boys', 'cat_clothing_kids_001', 'Boys', 'Boys'' clothing and accessories', '👦', 1, true, NOW(), NOW()),
      ('subcat_clothing_kids_girls', 'cat_clothing_kids_001', 'Girls', 'Girls'' clothing and accessories', '👧', 2, true, NOW(), NOW()),
      ('subcat_clothing_kids_baby', 'cat_clothing_kids_001', 'Baby', 'Baby clothing and essentials', '👶', 3, true, NOW(), NOW())
    ON CONFLICT ("categoryId", name) DO NOTHING;
    
    -- Subcategories for Footwear
    INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isActive", "createdAt", "updatedAt")
    VALUES 
      ('subcat_clothing_footwear_casual', 'cat_clothing_footwear_001', 'Casual Shoes', 'Sneakers, loafers, casual footwear', '👟', 1, true, NOW(), NOW()),
      ('subcat_clothing_footwear_formal', 'cat_clothing_footwear_001', 'Formal Shoes', 'Dress shoes, heels, formal footwear', '👞', 2, true, NOW(), NOW()),
      ('subcat_clothing_footwear_sports', 'cat_clothing_footwear_001', 'Sports Shoes', 'Athletic shoes, running shoes', '⚽', 3, true, NOW(), NOW())
    ON CONFLICT ("categoryId", name) DO NOTHING;
    
    -- Subcategories for Accessories
    INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isActive", "createdAt", "updatedAt")
    VALUES 
      ('subcat_clothing_accessories_bags', 'cat_clothing_accessories_001', 'Bags', 'Handbags, backpacks, wallets', '👜', 1, true, NOW(), NOW()),
      ('subcat_clothing_accessories_jewelry', 'cat_clothing_accessories_001', 'Jewelry', 'Necklaces, bracelets, rings', '💍', 2, true, NOW(), NOW()),
      ('subcat_clothing_accessories_watches', 'cat_clothing_accessories_001', 'Watches', 'Wristwatches and timepieces', '⌚', 3, true, NOW(), NOW())
    ON CONFLICT ("categoryId", name) DO NOTHING;
    
    RAISE NOTICE 'Clothing categories seeded successfully';
  ELSE
    RAISE NOTICE 'Skipping clothing categories - no clothing business exists yet';
  END IF;

  -- ==========================================================================
  -- HARDWARE CATEGORIES
  -- ==========================================================================
  
  IF v_hardware_business_id IS NOT NULL THEN
    -- Hand Tools
    INSERT INTO business_categories (id, "businessId", "businessType", name, description, emoji, color, "displayOrder", "domainId", "isUserCreated", "isActive", "createdAt", "updatedAt")
    VALUES ('cat_hardware_hand_tools_001', v_hardware_business_id, 'hardware', 'Hand Tools', 'Manual tools and equipment', '🔨', '#EF4444', 1, 'domain_hardware_hand_tools', false, true, NOW(), NOW())
    ON CONFLICT ("businessType", name) DO NOTHING;
    
    -- Power Tools
    INSERT INTO business_categories (id, "businessId", "businessType", name, description, emoji, color, "displayOrder", "domainId", "isUserCreated", "isActive", "createdAt", "updatedAt")
    VALUES ('cat_hardware_power_tools_001', v_hardware_business_id, 'hardware', 'Power Tools', 'Electric and battery-powered tools', '⚡', '#F59E0B', 2, 'domain_hardware_power_tools', false, true, NOW(), NOW())
    ON CONFLICT ("businessType", name) DO NOTHING;
    
    -- Building Materials
    INSERT INTO business_categories (id, "businessId", "businessType", name, description, emoji, color, "displayOrder", "domainId", "isUserCreated", "isActive", "createdAt", "updatedAt")
    VALUES ('cat_hardware_building_001', v_hardware_business_id, 'hardware', 'Building Materials', 'Construction and building supplies', '🧱', '#8B5CF6', 3, 'domain_hardware_building', false, true, NOW(), NOW())
    ON CONFLICT ("businessType", name) DO NOTHING;
    
    -- Plumbing
    INSERT INTO business_categories (id, "businessId", "businessType", name, description, emoji, color, "displayOrder", "domainId", "isUserCreated", "isActive", "createdAt", "updatedAt")
    VALUES ('cat_hardware_plumbing_001', v_hardware_business_id, 'hardware', 'Plumbing', 'Pipes, fittings, and plumbing supplies', '🚰', '#06B6D4', 4, 'domain_hardware_hand_tools', false, true, NOW(), NOW())
    ON CONFLICT ("businessType", name) DO NOTHING;
    
    -- Electrical
    INSERT INTO business_categories (id, "businessId", "businessType", name, description, emoji, color, "displayOrder", "domainId", "isUserCreated", "isActive", "createdAt", "updatedAt")
    VALUES ('cat_hardware_electrical_001', v_hardware_business_id, 'hardware', 'Electrical', 'Wiring, switches, and electrical supplies', '💡', '#FBBF24', 5, 'domain_hardware_power_tools', false, true, NOW(), NOW())
    ON CONFLICT ("businessType", name) DO NOTHING;
    
    -- Hardware Subcategories (abbreviated for space)
    INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isActive", "createdAt", "updatedAt")
    VALUES 
      ('subcat_hardware_hand_hammers', 'cat_hardware_hand_tools_001', 'Hammers', 'Claw hammers, sledgehammers', '🔨', 1, true, NOW(), NOW()),
      ('subcat_hardware_hand_screwdrivers', 'cat_hardware_hand_tools_001', 'Screwdrivers', 'Flathead, Phillips, precision', '🔧', 2, true, NOW(), NOW()),
      ('subcat_hardware_power_drills', 'cat_hardware_power_tools_001', 'Drills', 'Electric drills, hammer drills', '🔩', 1, true, NOW(), NOW()),
      ('subcat_hardware_power_saws', 'cat_hardware_power_tools_001', 'Saws', 'Circular saws, jigsaws, miter saws', '🪚', 2, true, NOW(), NOW())
    ON CONFLICT ("categoryId", name) DO NOTHING;
    
    RAISE NOTICE 'Hardware categories seeded successfully';
  ELSE
    RAISE NOTICE 'Skipping hardware categories - no hardware business exists yet';
  END IF;

  -- ==========================================================================
  -- GROCERY CATEGORIES
  -- ==========================================================================
  
  IF v_grocery_business_id IS NOT NULL THEN
    -- Fresh Produce
    INSERT INTO business_categories (id, "businessId", "businessType", name, description, emoji, color, "displayOrder", "domainId", "isUserCreated", "isActive", "createdAt", "updatedAt")
    VALUES ('cat_grocery_produce_001', v_grocery_business_id, 'grocery', 'Fresh Produce', 'Fresh fruits, vegetables, and herbs', '🥬', '#10B981', 1, 'domain_grocery_produce', false, true, NOW(), NOW())
    ON CONFLICT ("businessType", name) DO NOTHING;
    
    -- Meat & Seafood
    INSERT INTO business_categories (id, "businessId", "businessType", name, description, emoji, color, "displayOrder", "domainId", "isUserCreated", "isActive", "createdAt", "updatedAt")
    VALUES ('cat_grocery_meat_001', v_grocery_business_id, 'grocery', 'Meat & Seafood', 'Fresh and frozen meats, poultry, seafood', '🥩', '#EF4444', 2, 'domain_grocery_meat', false, true, NOW(), NOW())
    ON CONFLICT ("businessType", name) DO NOTHING;
    
    -- Dairy Products
    INSERT INTO business_categories (id, "businessId", "businessType", name, description, emoji, color, "displayOrder", "domainId", "isUserCreated", "isActive", "createdAt", "updatedAt")
    VALUES ('cat_grocery_dairy_001', v_grocery_business_id, 'grocery', 'Dairy Products', 'Milk, cheese, yogurt, dairy alternatives', '🥛', '#3B82F6', 3, 'domain_grocery_dairy', false, true, NOW(), NOW())
    ON CONFLICT ("businessType", name) DO NOTHING;
    
    -- Grocery Subcategories (abbreviated)
    INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isActive", "createdAt", "updatedAt")
    VALUES 
      ('subcat_grocery_produce_fruits', 'cat_grocery_produce_001', 'Fruits', 'Fresh fruits and berries', '🍎', 1, true, NOW(), NOW()),
      ('subcat_grocery_produce_vegetables', 'cat_grocery_produce_001', 'Vegetables', 'Fresh vegetables', '🥕', 2, true, NOW(), NOW()),
      ('subcat_grocery_meat_beef', 'cat_grocery_meat_001', 'Beef', 'Fresh beef and steaks', '🥩', 1, true, NOW(), NOW()),
      ('subcat_grocery_dairy_milk', 'cat_grocery_dairy_001', 'Milk', 'Fresh milk and alternatives', '🥛', 1, true, NOW(), NOW())
    ON CONFLICT ("categoryId", name) DO NOTHING;
    
    RAISE NOTICE 'Grocery categories seeded successfully';
  ELSE
    RAISE NOTICE 'Skipping grocery categories - no grocery business exists yet';
  END IF;

  -- ==========================================================================
  -- RESTAURANT CATEGORIES
  -- ==========================================================================
  
  IF v_restaurant_business_id IS NOT NULL THEN
    -- Appetizers
    INSERT INTO business_categories (id, "businessId", "businessType", name, description, emoji, color, "displayOrder", "domainId", "isUserCreated", "isActive", "createdAt", "updatedAt")
    VALUES ('cat_restaurant_appetizers_001', v_restaurant_business_id, 'restaurant', 'Appetizers', 'Starters, salads, and small plates', '🥗', '#10B981', 1, 'domain_restaurant_appetizers', false, true, NOW(), NOW())
    ON CONFLICT ("businessType", name) DO NOTHING;
    
    -- Main Courses
    INSERT INTO business_categories (id, "businessId", "businessType", name, description, emoji, color, "displayOrder", "domainId", "isUserCreated", "isActive", "createdAt", "updatedAt")
    VALUES ('cat_restaurant_mains_001', v_restaurant_business_id, 'restaurant', 'Main Courses', 'Entrees and main dishes', '🍽️', '#EF4444', 2, 'domain_restaurant_mains', false, true, NOW(), NOW())
    ON CONFLICT ("businessType", name) DO NOTHING;
    
    -- Restaurant Subcategories (abbreviated)
    INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isActive", "createdAt", "updatedAt")
    VALUES 
      ('subcat_restaurant_appetizers_salads', 'cat_restaurant_appetizers_001', 'Salads', 'Fresh salads and greens', '🥗', 1, true, NOW(), NOW()),
      ('subcat_restaurant_mains_meat', 'cat_restaurant_mains_001', 'Meat Dishes', 'Beef, pork, lamb dishes', '🥩', 1, true, NOW(), NOW())
    ON CONFLICT ("categoryId", name) DO NOTHING;
    
    RAISE NOTICE 'Restaurant categories seeded successfully';
  ELSE
    RAISE NOTICE 'Skipping restaurant categories - no restaurant business exists yet';
  END IF;

END $$;
