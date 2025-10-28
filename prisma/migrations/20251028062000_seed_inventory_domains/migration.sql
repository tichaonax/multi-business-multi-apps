-- Seed Inventory Domain Templates for All Business Types
-- This migration creates domain templates with categories and subcategories

-- =============================================================================
-- CLOTHING BUSINESS DOMAINS
-- =============================================================================

-- Domain: Men's Fashion
INSERT INTO "public"."inventory_domains" ("id", "name", "emoji", "description", "businessType", "isActive", "isSystemTemplate", "createdAt")
VALUES
  ('domain_clothing_mens', 'Men''s Fashion', '👔', 'Men''s clothing and accessories', 'clothing', true, true, NOW());

-- Domain: Women's Fashion
INSERT INTO "public"."inventory_domains" ("id", "name", "emoji", "description", "businessType", "isActive", "isSystemTemplate", "createdAt")
VALUES
  ('domain_clothing_womens', 'Women''s Fashion', '👗', 'Women''s clothing and accessories', 'clothing', true, true, NOW());

-- Domain: Kids Fashion
INSERT INTO "public"."inventory_domains" ("id", "name", "emoji", "description", "businessType", "isActive", "isSystemTemplate", "createdAt")
VALUES
  ('domain_clothing_kids', 'Kids Fashion', '👶', 'Children''s clothing and accessories', 'clothing', true, true, NOW());

-- Domain: Footwear
INSERT INTO "public"."inventory_domains" ("id", "name", "emoji", "description", "businessType", "isActive", "isSystemTemplate", "createdAt")
VALUES
  ('domain_clothing_footwear', 'Footwear', '👟', 'Shoes and footwear for all ages', 'clothing', true, true, NOW());

-- =============================================================================
-- HARDWARE BUSINESS DOMAINS
-- =============================================================================

-- Domain: Hand Tools
INSERT INTO "public"."inventory_domains" ("id", "name", "emoji", "description", "businessType", "isActive", "isSystemTemplate", "createdAt")
VALUES
  ('domain_hardware_hand_tools', 'Hand Tools', '🔨', 'Manual tools and equipment', 'hardware', true, true, NOW());

-- Domain: Power Tools
INSERT INTO "public"."inventory_domains" ("id", "name", "emoji", "description", "businessType", "isActive", "isSystemTemplate", "createdAt")
VALUES
  ('domain_hardware_power_tools', 'Power Tools', '⚡', 'Electric and battery-powered tools', 'hardware', true, true, NOW());

-- Domain: Building Materials
INSERT INTO "public"."inventory_domains" ("id", "name", "emoji", "description", "businessType", "isActive", "isSystemTemplate", "createdAt")
VALUES
  ('domain_hardware_building', 'Building Materials', '🧱', 'Construction and building supplies', 'hardware', true, true, NOW());

-- =============================================================================
-- GROCERY BUSINESS DOMAINS
-- =============================================================================

-- Domain: Fresh Produce
INSERT INTO "public"."inventory_domains" ("id", "name", "emoji", "description", "businessType", "isActive", "isSystemTemplate", "createdAt")
VALUES
  ('domain_grocery_produce', 'Fresh Produce', '🥬', 'Fresh fruits, vegetables, and herbs', 'grocery', true, true, NOW());

-- Domain: Meat & Seafood
INSERT INTO "public"."inventory_domains" ("id", "name", "emoji", "description", "businessType", "isActive", "isSystemTemplate", "createdAt")
VALUES
  ('domain_grocery_meat', 'Meat & Seafood', '🥩', 'Fresh and frozen meats, poultry, and seafood', 'grocery', true, true, NOW());

-- Domain: Dairy Products
INSERT INTO "public"."inventory_domains" ("id", "name", "emoji", "description", "businessType", "isActive", "isSystemTemplate", "createdAt")
VALUES
  ('domain_grocery_dairy', 'Dairy Products', '🥛', 'Milk, cheese, yogurt, and dairy alternatives', 'grocery', true, true, NOW());

-- =============================================================================
-- RESTAURANT BUSINESS DOMAINS
-- =============================================================================

-- Domain: Appetizers
INSERT INTO "public"."inventory_domains" ("id", "name", "emoji", "description", "businessType", "isActive", "isSystemTemplate", "createdAt")
VALUES
  ('domain_restaurant_appetizers', 'Appetizers', '🥗', 'Starters, salads, and small plates', 'restaurant', true, true, NOW());

-- Domain: Main Courses
INSERT INTO "public"."inventory_domains" ("id", "name", "emoji", "description", "businessType", "isActive", "isSystemTemplate", "createdAt")
VALUES
  ('domain_restaurant_mains', 'Main Courses', '🍽️', 'Entrees and main dishes', 'restaurant', true, true, NOW());

-- Domain: Beverages
INSERT INTO "public"."inventory_domains" ("id", "name", "emoji", "description", "businessType", "isActive", "isSystemTemplate", "createdAt")
VALUES
  ('domain_restaurant_beverages', 'Beverages', '☕', 'Drinks, coffee, tea, and juices', 'restaurant', true, true, NOW());

-- =============================================================================
-- UNIVERSAL/GENERAL DOMAINS (applicable to multiple business types)
-- =============================================================================

-- Domain: Accessories
INSERT INTO "public"."inventory_domains" ("id", "name", "emoji", "description", "businessType", "isActive", "isSystemTemplate", "createdAt")
VALUES
  ('domain_universal_accessories', 'Accessories', '👜', 'General accessories and add-ons', 'universal', true, true, NOW());

-- Domain: Seasonal Items
INSERT INTO "public"."inventory_domains" ("id", "name", "emoji", "description", "businessType", "isActive", "isSystemTemplate", "createdAt")
VALUES
  ('domain_universal_seasonal', 'Seasonal Items', '🎄', 'Holiday and seasonal products', 'universal', true, true, NOW());

-- Domain: Clearance
INSERT INTO "public"."inventory_domains" ("id", "name", "emoji", "description", "businessType", "isActive", "isSystemTemplate", "createdAt")
VALUES
  ('domain_universal_clearance', 'Clearance', '💸', 'Clearance and discounted items', 'universal', true, true, NOW());

-- =============================================================================
-- VERIFICATION QUERY (Optional - for manual verification)
-- =============================================================================

-- SELECT name, emoji, "businessType", "isSystemTemplate"
-- FROM "public"."inventory_domains"
-- ORDER BY "businessType", name;
