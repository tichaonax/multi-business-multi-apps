-- Fix domain assignments for existing categories that were incorrectly mapped
-- This migration updates categories to point to the correct inventory_domains

-- GROCERY: Fix categories that were assigned to wrong domains
UPDATE business_categories
SET "domainId" = 'domain_grocery_bakery'
WHERE "businessType" = 'grocery'
  AND name ILIKE '%bakery%'
  AND ("domainId" IS NULL OR "domainId" NOT LIKE 'domain_grocery_%');

UPDATE business_categories
SET "domainId" = 'domain_grocery_beverages'
WHERE "businessType" = 'grocery'
  AND (name ILIKE '%beverage%' OR name ILIKE '%drink%' OR name ILIKE '%juice%' OR name ILIKE '%water%')
  AND ("domainId" IS NULL OR "domainId" NOT LIKE 'domain_grocery_%');

UPDATE business_categories
SET "domainId" = 'domain_grocery_canned'
WHERE "businessType" = 'grocery'
  AND (name ILIKE '%canned%' OR name ILIKE '%tinned%' OR name ILIKE '%pantry%')
  AND ("domainId" IS NULL OR "domainId" NOT LIKE 'domain_grocery_%');

UPDATE business_categories
SET "domainId" = 'domain_grocery_grains'
WHERE "businessType" = 'grocery'
  AND (name ILIKE '%grain%' OR name ILIKE '%rice%' OR name ILIKE '%pasta%' OR name ILIKE '%flour%' OR name ILIKE '%cereal%')
  AND ("domainId" IS NULL OR "domainId" NOT LIKE 'domain_grocery_%');

UPDATE business_categories
SET "domainId" = 'domain_grocery_snacks'
WHERE "businessType" = 'grocery'
  AND (name ILIKE '%snack%' OR name ILIKE '%confection%' OR name ILIKE '%sweet%' OR name ILIKE '%chocolate%' OR name ILIKE '%biscuit%' OR name ILIKE '%crisp%')
  AND ("domainId" IS NULL OR "domainId" NOT LIKE 'domain_grocery_%');

UPDATE business_categories
SET "domainId" = 'domain_grocery_oils'
WHERE "businessType" = 'grocery'
  AND (name ILIKE '%oil%' OR name ILIKE '%condiment%' OR name ILIKE '%sauce%' OR name ILIKE '%spread%')
  AND ("domainId" IS NULL OR "domainId" NOT LIKE 'domain_grocery_%');

UPDATE business_categories
SET "domainId" = 'domain_grocery_frozen'
WHERE "businessType" = 'grocery'
  AND (name ILIKE '%frozen%')
  AND ("domainId" IS NULL OR "domainId" NOT LIKE 'domain_grocery_%');

UPDATE business_categories
SET "domainId" = 'domain_grocery_dairy'
WHERE "businessType" = 'grocery'
  AND (name ILIKE '%dairy%' OR name ILIKE '%milk%' OR name ILIKE '%cheese%' OR name ILIKE '%yoghurt%' OR name ILIKE '%yogurt%' OR name ILIKE '%butter%' OR name ILIKE '%cream%' OR name ILIKE '%egg%')
  AND ("domainId" IS NULL OR "domainId" NOT LIKE 'domain_grocery_%');

UPDATE business_categories
SET "domainId" = 'domain_grocery_cleaning'
WHERE "businessType" = 'grocery'
  AND (name ILIKE '%cleaning%' OR name ILIKE '%detergent%' OR name ILIKE '%household%' OR name ILIKE '%laundry%')
  AND ("domainId" IS NULL OR "domainId" NOT LIKE 'domain_grocery_%');

UPDATE business_categories
SET "domainId" = 'domain_grocery_personalcare'
WHERE "businessType" = 'grocery'
  AND (name ILIKE '%personal care%' OR name ILIKE '%hygiene%' OR name ILIKE '%grooming%')
  AND ("domainId" IS NULL OR "domainId" NOT LIKE 'domain_grocery_%');

UPDATE business_categories
SET "domainId" = 'domain_grocery_toiletries'
WHERE "businessType" = 'grocery'
  AND (name ILIKE '%toiletry%' OR name ILIKE '%toiletries%' OR name ILIKE '%soap%' OR name ILIKE '%shampoo%' OR name ILIKE '%toothpaste%')
  AND ("domainId" IS NULL OR "domainId" NOT LIKE 'domain_grocery_%');

UPDATE business_categories
SET "domainId" = 'domain_grocery_alcohol'
WHERE "businessType" = 'grocery'
  AND (name ILIKE '%alcohol%' OR name ILIKE '%beer%' OR name ILIKE '%wine%' OR name ILIKE '%spirit%' OR name ILIKE '%liquor%')
  AND ("domainId" IS NULL OR "domainId" NOT LIKE 'domain_grocery_%');

UPDATE business_categories
SET "domainId" = 'domain_grocery_breakfast'
WHERE "businessType" = 'grocery'
  AND (name ILIKE '%breakfast%' OR name ILIKE '%oat%' OR name ILIKE '%muesli%')
  AND ("domainId" IS NULL OR "domainId" NOT LIKE 'domain_grocery_%');

UPDATE business_categories
SET "domainId" = 'domain_grocery_baby'
WHERE "businessType" = 'grocery'
  AND (name ILIKE '%baby%' OR name ILIKE '%infant%' OR name ILIKE '%formula%')
  AND ("domainId" IS NULL OR "domainId" NOT LIKE 'domain_grocery_%');

UPDATE business_categories
SET "domainId" = 'domain_grocery_petfood'
WHERE "businessType" = 'grocery'
  AND (name ILIKE '%pet%' OR name ILIKE '%dog food%' OR name ILIKE '%cat food%' OR name ILIKE '%animal%')
  AND ("domainId" IS NULL OR "domainId" NOT LIKE 'domain_grocery_%');

UPDATE business_categories
SET "domainId" = 'domain_grocery_health'
WHERE "businessType" = 'grocery'
  AND (name ILIKE '%health%' OR name ILIKE '%vitamin%' OR name ILIKE '%supplement%' OR name ILIKE '%nutrition%')
  AND ("domainId" IS NULL OR "domainId" NOT LIKE 'domain_grocery_%');

UPDATE business_categories
SET "domainId" = 'domain_grocery_spices'
WHERE "businessType" = 'grocery'
  AND (name ILIKE '%spice%' OR name ILIKE '%seasoning%' OR name ILIKE '%herb%' OR name ILIKE '%salt%' OR name ILIKE '%pepper%')
  AND ("domainId" IS NULL OR "domainId" NOT LIKE 'domain_grocery_%');

-- HARDWARE: Fix categories that were assigned to wrong domains
UPDATE business_categories
SET "domainId" = 'domain_hardware_plumbing'
WHERE "businessType" = 'hardware'
  AND (name ILIKE '%plumb%' OR name ILIKE '%pipe%' OR name ILIKE '%fitting%' OR name ILIKE '%valve%' OR name ILIKE '%tap%')
  AND ("domainId" IS NULL OR "domainId" NOT LIKE 'domain_hardware_%');

UPDATE business_categories
SET "domainId" = 'domain_hardware_electrical'
WHERE "businessType" = 'hardware'
  AND (name ILIKE '%electric%' OR name ILIKE '%wiring%' OR name ILIKE '%cable%' OR name ILIKE '%switch%' OR name ILIKE '%socket%' OR name ILIKE '%circuit%')
  AND ("domainId" IS NULL OR "domainId" NOT LIKE 'domain_hardware_%');

UPDATE business_categories
SET "domainId" = 'domain_hardware_fasteners'
WHERE "businessType" = 'hardware'
  AND (name ILIKE '%fastener%' OR name ILIKE '%screw%' OR name ILIKE '%bolt%' OR name ILIKE '%nail%' OR name ILIKE '%anchor%' OR name ILIKE '%fixing%')
  AND ("domainId" IS NULL OR "domainId" NOT LIKE 'domain_hardware_%');

UPDATE business_categories
SET "domainId" = 'domain_hardware_paint'
WHERE "businessType" = 'hardware'
  AND (name ILIKE '%paint%' OR name ILIKE '%primer%' OR name ILIKE '%varnish%' OR name ILIKE '%coating%')
  AND ("domainId" IS NULL OR "domainId" NOT LIKE 'domain_hardware_%');

UPDATE business_categories
SET "domainId" = 'domain_hardware_timber'
WHERE "businessType" = 'hardware'
  AND (name ILIKE '%timber%' OR name ILIKE '%wood%' OR name ILIKE '%lumber%' OR name ILIKE '%board%')
  AND ("domainId" IS NULL OR "domainId" NOT LIKE 'domain_hardware_%');

UPDATE business_categories
SET "domainId" = 'domain_hardware_roofing'
WHERE "businessType" = 'hardware'
  AND (name ILIKE '%roof%' OR name ILIKE '%clad%' OR name ILIKE '%gutter%' OR name ILIKE '%sheet%' OR name ILIKE '%tile%')
  AND ("domainId" IS NULL OR "domainId" NOT LIKE 'domain_hardware_%');

UPDATE business_categories
SET "domainId" = 'domain_hardware_safety'
WHERE "businessType" = 'hardware'
  AND (name ILIKE '%safety%' OR name ILIKE '%ppe%' OR name ILIKE '%protective%' OR name ILIKE '%helmet%' OR name ILIKE '%glove%')
  AND ("domainId" IS NULL OR "domainId" NOT LIKE 'domain_hardware_%');

UPDATE business_categories
SET "domainId" = 'domain_hardware_cement'
WHERE "businessType" = 'hardware'
  AND (name ILIKE '%cement%' OR name ILIKE '%concrete%' OR name ILIKE '%block%' OR name ILIKE '%brick%' OR name ILIKE '%masonry%')
  AND ("domainId" IS NULL OR "domainId" NOT LIKE 'domain_hardware_%');

UPDATE business_categories
SET "domainId" = 'domain_hardware_tools'
WHERE "businessType" = 'hardware'
  AND (name ILIKE '%tool%' OR name ILIKE '%hammer%' OR name ILIKE '%drill%' OR name ILIKE '%saw%' OR name ILIKE '%wrench%' OR name ILIKE '%spanner%')
  AND ("domainId" IS NULL OR "domainId" NOT LIKE 'domain_hardware_%');

-- RESTAURANT: Map kitchen ingredient categories to appropriate domains
UPDATE business_categories
SET "domainId" = 'domain_restaurant_meat'
WHERE "businessType" = 'restaurant'
  AND (name ILIKE '%meat%' OR name ILIKE '%beef%' OR name ILIKE '%pork%' OR name ILIKE '%lamb%' OR name ILIKE '%protein%')
  AND ("domainId" IS NULL OR "domainId" NOT LIKE 'domain_restaurant_%');

UPDATE business_categories
SET "domainId" = 'domain_restaurant_chicken'
WHERE "businessType" = 'restaurant'
  AND (name ILIKE '%chicken%' OR name ILIKE '%poultry%' OR name ILIKE '%turkey%')
  AND ("domainId" IS NULL OR "domainId" NOT LIKE 'domain_restaurant_%');

UPDATE business_categories
SET "domainId" = 'domain_restaurant_seafood'
WHERE "businessType" = 'restaurant'
  AND (name ILIKE '%seafood%' OR name ILIKE '%fish%' OR name ILIKE '%prawn%' OR name ILIKE '%calamari%')
  AND ("domainId" IS NULL OR "domainId" NOT LIKE 'domain_restaurant_%');

UPDATE business_categories
SET "domainId" = 'domain_restaurant_produce'
WHERE "businessType" = 'restaurant'
  AND (name ILIKE '%vegetable%' OR name ILIKE '%produce%' OR name ILIKE '%fruit%' OR name ILIKE '%fresh%')
  AND ("domainId" IS NULL OR "domainId" NOT LIKE 'domain_restaurant_%');

UPDATE business_categories
SET "domainId" = 'domain_restaurant_dairy'
WHERE "businessType" = 'restaurant'
  AND (name ILIKE '%dairy%' OR name ILIKE '%milk%' OR name ILIKE '%cheese%' OR name ILIKE '%butter%' OR name ILIKE '%cream%' OR name ILIKE '%egg%')
  AND ("domainId" IS NULL OR "domainId" NOT LIKE 'domain_restaurant_%');

UPDATE business_categories
SET "domainId" = 'domain_restaurant_spices'
WHERE "businessType" = 'restaurant'
  AND (name ILIKE '%spice%' OR name ILIKE '%herb%' OR name ILIKE '%seasoning%' OR name ILIKE '%condiment%')
  AND ("domainId" IS NULL OR "domainId" NOT LIKE 'domain_restaurant_%');

UPDATE business_categories
SET "domainId" = 'domain_restaurant_drygoods'
WHERE "businessType" = 'restaurant'
  AND (name ILIKE '%dry good%' OR name ILIKE '%pantry%' OR name ILIKE '%flour%' OR name ILIKE '%sugar%' OR name ILIKE '%grain%' OR name ILIKE '%rice%')
  AND ("domainId" IS NULL OR "domainId" NOT LIKE 'domain_restaurant_%');

UPDATE business_categories
SET "domainId" = 'domain_restaurant_softdrinks'
WHERE "businessType" = 'restaurant'
  AND (name ILIKE '%soft drink%' OR name ILIKE '%soda%' OR name ILIKE '%carbonated%')
  AND ("domainId" IS NULL OR "domainId" NOT LIKE 'domain_restaurant_%');

UPDATE business_categories
SET "domainId" = 'domain_restaurant_hot'
WHERE "businessType" = 'restaurant'
  AND (name ILIKE '%coffee%' OR name ILIKE '%tea%' OR name ILIKE '%hot beverage%' OR name ILIKE '%hot drink%')
  AND ("domainId" IS NULL OR "domainId" NOT LIKE 'domain_restaurant_%');

UPDATE business_categories
SET "domainId" = 'domain_restaurant_alcohol'
WHERE "businessType" = 'restaurant'
  AND (name ILIKE '%alcohol%' OR name ILIKE '%beer%' OR name ILIKE '%wine%' OR name ILIKE '%spirit%')
  AND ("domainId" IS NULL OR "domainId" NOT LIKE 'domain_restaurant_%');

UPDATE business_categories
SET "domainId" = 'domain_restaurant_packaging'
WHERE "businessType" = 'restaurant'
  AND (name ILIKE '%packaging%' OR name ILIKE '%takeaway%' OR name ILIKE '%disposable%' OR name ILIKE '%supplies%' OR name ILIKE '%supply%')
  AND ("domainId" IS NULL OR "domainId" NOT LIKE 'domain_restaurant_%');

UPDATE business_categories
SET "domainId" = 'domain_restaurant_desserts'
WHERE "businessType" = 'restaurant'
  AND (name ILIKE '%dessert%' OR name ILIKE '%sweet%' OR name ILIKE '%cake%' OR name ILIKE '%ice cream%')
  AND ("domainId" IS NULL OR "domainId" NOT LIKE 'domain_restaurant_%');

UPDATE business_categories
SET "domainId" = 'domain_restaurant_sides'
WHERE "businessType" = 'restaurant'
  AND (name ILIKE '%side%' OR name ILIKE '%chips%' OR name ILIKE '%fries%' OR name ILIKE '%accompaniment%')
  AND ("domainId" IS NULL OR "domainId" NOT LIKE 'domain_restaurant_%');

UPDATE business_categories
SET "domainId" = 'domain_restaurant_sauces'
WHERE "businessType" = 'restaurant'
  AND (name ILIKE '%sauce%' OR name ILIKE '%dip%' OR name ILIKE '%dressing%' OR name ILIKE '%gravy%')
  AND ("domainId" IS NULL OR "domainId" NOT LIKE 'domain_restaurant_%');
