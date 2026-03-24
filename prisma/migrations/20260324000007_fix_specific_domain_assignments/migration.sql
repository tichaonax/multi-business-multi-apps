-- Fix specific wrong domain assignments found in production data

-- GROCERY: Fix incorrect domain assignments
UPDATE business_categories
SET "domainId" = 'domain_grocery_bakery'
WHERE "businessType" = 'grocery' AND name = 'Bakery';

UPDATE business_categories
SET "domainId" = 'domain_grocery_beverages'
WHERE "businessType" = 'grocery' AND name = 'Beverages';

UPDATE business_categories
SET "domainId" = 'domain_grocery_canned'
WHERE "businessType" = 'grocery' AND name = 'Pantry & Canned Goods';

-- HARDWARE: Fix incorrect domain assignments
UPDATE business_categories
SET "domainId" = 'domain_hardware_plumbing'
WHERE "businessType" = 'hardware' AND name = 'Plumbing';

UPDATE business_categories
SET "domainId" = 'domain_hardware_electrical'
WHERE "businessType" = 'hardware' AND name = 'Electrical';

-- RESTAURANT: Fix Desserts assigned to Main Courses domain
UPDATE business_categories
SET "domainId" = 'domain_restaurant_desserts'
WHERE "businessType" = 'restaurant' AND name = 'Desserts';

-- RESTAURANT: Fix Appetizers (already correct but verify)
UPDATE business_categories
SET "domainId" = 'domain_restaurant_soups'
WHERE "businessType" = 'restaurant' AND name = 'Appetizers';
