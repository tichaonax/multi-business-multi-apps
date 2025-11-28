-- Seed Complete Clothing Categories
-- This migration provides comprehensive clothing inventory categories
--
-- IDEMPOTENT: Uses ON CONFLICT DO NOTHING - safe to rerun
-- AUTOMATIC: Runs as part of prisma migrate deploy
--
-- Seeds:
--   - 8 inventory domains (men's, women's, boys, girls, baby, accessories, home, general)
--   - 387 business categories
--   - 531 inventory subcategories
--

-- ============================================================================
-- INVENTORY DOMAINS
-- ============================================================================

INSERT INTO inventory_domains (id, name, emoji, description, "businessType", "isActive", "createdAt")
VALUES (
  'domain_clothing_mens',
  'Men''s',
  '👨',
  'Adult male clothing and fashion',
  'clothing',
  true,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_domains (id, name, emoji, description, "businessType", "isActive", "createdAt")
VALUES (
  'domain_clothing_womens',
  'Women''s',
  '👩',
  'Adult female clothing and fashion',
  'clothing',
  true,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_domains (id, name, emoji, description, "businessType", "isActive", "createdAt")
VALUES (
  'domain_clothing_boys',
  'Boys',
  '👦',
  'Boys clothing and fashion',
  'clothing',
  true,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_domains (id, name, emoji, description, "businessType", "isActive", "createdAt")
VALUES (
  'domain_clothing_girls',
  'Girls',
  '👧',
  'Girls clothing and fashion',
  'clothing',
  true,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_domains (id, name, emoji, description, "businessType", "isActive", "createdAt")
VALUES (
  'domain_clothing_baby',
  'Baby',
  '👶',
  'Baby and infant clothing (0-24 months)',
  'clothing',
  true,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_domains (id, name, emoji, description, "businessType", "isActive", "createdAt")
VALUES (
  'domain_clothing_accessories',
  'Fashion Accessories',
  '👔',
  'Fashion accessories, bags, and jewelry',
  'clothing',
  true,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_domains (id, name, emoji, description, "businessType", "isActive", "createdAt")
VALUES (
  'domain_clothing_home_textiles',
  'Home & Textiles',
  '🏠',
  'Household soft goods and textiles',
  'clothing',
  true,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_domains (id, name, emoji, description, "businessType", "isActive", "createdAt")
VALUES (
  'domain_clothing_general_merch',
  'General Merchandise',
  '🎯',
  'Non-clothing items',
  'clothing',
  true,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- BUSINESS CATEGORIES
-- ============================================================================

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_0_bags',
  'Bags (Accessories)',
  '👔',
  'Bags category',
  '#3B82F6',
  1,
  'domain_clothing_accessories',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_1_cap',
  'Cap (Accessories)',
  '👔',
  'Cap category',
  '#3B82F6',
  2,
  'domain_clothing_accessories',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_2_cross_bag',
  'Cross Bag',
  '👔',
  'Cross Bag category',
  '#3B82F6',
  3,
  'domain_clothing_accessories',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_3_hat',
  'Hat (Accessories)',
  '👔',
  'Hat category',
  '#3B82F6',
  4,
  'domain_clothing_accessories',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_4_jackets',
  'Jackets (Accessories)',
  '👔',
  'Jackets category',
  '#3B82F6',
  5,
  'domain_clothing_accessories',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_5_jerseys',
  'Jerseys (Accessories)',
  '👔',
  'Jerseys category',
  '#3B82F6',
  6,
  'domain_clothing_accessories',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_6_jewelry',
  'Jewelry',
  '👔',
  'Jewelry category',
  '#3B82F6',
  7,
  'domain_clothing_accessories',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_7_satchel',
  'Satchel',
  '👔',
  'Satchel category',
  '#3B82F6',
  8,
  'domain_clothing_accessories',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_8_uncategorized',
  'Uncategorized (Accessories)',
  '👔',
  'Uncategorized category',
  '#3B82F6',
  9,
  'domain_clothing_accessories',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_9_accessories',
  'Accessories (Baby)',
  '👔',
  'Accessories category',
  '#3B82F6',
  10,
  'domain_clothing_baby',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_10_baby_toddler_bottoms',
  'Baby & Toddler Bottoms',
  '👔',
  'Baby & Toddler Bottoms category',
  '#3B82F6',
  11,
  'domain_clothing_baby',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_11_baby_toddler_dresses',
  'Baby & Toddler Dresses',
  '👔',
  'Baby & Toddler Dresses category',
  '#3B82F6',
  12,
  'domain_clothing_baby',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_12_baby_toddler_outerwear',
  'Baby & Toddler Outerwear',
  '👔',
  'Baby & Toddler Outerwear category',
  '#3B82F6',
  13,
  'domain_clothing_baby',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_13_baby_toddler_sleepwear',
  'Baby & Toddler Sleepwear',
  '👔',
  'Baby & Toddler Sleepwear category',
  '#3B82F6',
  14,
  'domain_clothing_baby',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_14_baby_toddler_socks_tights',
  'Baby & Toddler Socks & Tights',
  '👔',
  'Baby & Toddler Socks & Tights category',
  '#3B82F6',
  15,
  'domain_clothing_baby',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_15_baby_gear',
  'Baby Gear',
  '👔',
  'Baby Gear category',
  '#3B82F6',
  16,
  'domain_clothing_baby',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_16_baby_one_pieces',
  'Baby One-Pieces',
  '👔',
  'Baby One-Pieces category',
  '#3B82F6',
  17,
  'domain_clothing_baby',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_17_beach_towels',
  'Beach Towels (Baby)',
  '👔',
  'Beach Towels category',
  '#3B82F6',
  18,
  'domain_clothing_baby',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_18_bodysuits',
  'Bodysuits (Baby)',
  '👔',
  'Bodysuits category',
  '#3B82F6',
  19,
  'domain_clothing_baby',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_19_cap',
  'Cap (Baby)',
  '👔',
  'Cap category',
  '#3B82F6',
  20,
  'domain_clothing_baby',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_20_clothing',
  'Clothing (Baby)',
  '👔',
  'Clothing category',
  '#3B82F6',
  21,
  'domain_clothing_baby',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_21_dresses',
  'Dresses (Baby)',
  '👔',
  'Dresses category',
  '#3B82F6',
  22,
  'domain_clothing_baby',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_22_fleece_jackets',
  'Fleece Jackets (Baby)',
  '👔',
  'Fleece Jackets category',
  '#3B82F6',
  23,
  'domain_clothing_baby',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_23_gear',
  'Gear',
  '👔',
  'Gear category',
  '#3B82F6',
  24,
  'domain_clothing_baby',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_24_graphic_tees',
  'Graphic Tees (Baby)',
  '👔',
  'Graphic Tees category',
  '#3B82F6',
  25,
  'domain_clothing_baby',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_25_jackets',
  'Jackets (Baby)',
  '👔',
  'Jackets category',
  '#3B82F6',
  26,
  'domain_clothing_baby',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_26_jeans',
  'Jeans (Baby)',
  '👔',
  'Jeans category',
  '#3B82F6',
  27,
  'domain_clothing_baby',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_27_jumpsuit',
  'Jumpsuit (Baby)',
  '👔',
  'Jumpsuit category',
  '#3B82F6',
  28,
  'domain_clothing_baby',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_28_leggings',
  'Leggings (Baby)',
  '👔',
  'Leggings category',
  '#3B82F6',
  29,
  'domain_clothing_baby',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_29_mixed',
  'Mixed (Baby)',
  '👔',
  'Mixed category',
  '#3B82F6',
  30,
  'domain_clothing_baby',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_30_one_pieces',
  'One Pieces',
  '👔',
  'One Pieces category',
  '#3B82F6',
  31,
  'domain_clothing_baby',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_31_outfit',
  'Outfit (Baby)',
  '👔',
  'Outfit category',
  '#3B82F6',
  32,
  'domain_clothing_baby',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_32_pajamas',
  'Pajamas (Baby)',
  '👔',
  'Pajamas category',
  '#3B82F6',
  33,
  'domain_clothing_baby',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_33_panties',
  'Panties (Baby)',
  '👔',
  'Panties category',
  '#3B82F6',
  34,
  'domain_clothing_baby',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_34_pants',
  'Pants (Baby)',
  '👔',
  'Pants category',
  '#3B82F6',
  35,
  'domain_clothing_baby',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_35_ribbon_towels',
  'Ribbon Towels (Baby)',
  '👔',
  'Ribbon Towels category',
  '#3B82F6',
  36,
  'domain_clothing_baby',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_36_rompers',
  'Rompers (Baby)',
  '👔',
  'Rompers category',
  '#3B82F6',
  37,
  'domain_clothing_baby',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_37_sandals',
  'Sandals (Baby)',
  '👔',
  'Sandals category',
  '#3B82F6',
  38,
  'domain_clothing_baby',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_38_sets',
  'Sets (Baby)',
  '👔',
  'Sets category',
  '#3B82F6',
  39,
  'domain_clothing_baby',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_39_shirts',
  'Shirts (Baby)',
  '👔',
  'Shirts category',
  '#3B82F6',
  40,
  'domain_clothing_baby',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_40_shoes',
  'Shoes (Baby)',
  '👔',
  'Shoes category',
  '#3B82F6',
  41,
  'domain_clothing_baby',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_41_shorts',
  'Shorts (Baby)',
  '👔',
  'Shorts category',
  '#3B82F6',
  42,
  'domain_clothing_baby',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_42_skintights',
  'Skintights (Baby)',
  '👔',
  'Skintights category',
  '#3B82F6',
  43,
  'domain_clothing_baby',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_43_skirts',
  'Skirts (Baby)',
  '👔',
  'Skirts category',
  '#3B82F6',
  44,
  'domain_clothing_baby',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_44_socks',
  'Socks (Baby)',
  '👔',
  'Socks category',
  '#3B82F6',
  45,
  'domain_clothing_baby',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_45_suits',
  'Suits (Baby)',
  '👔',
  'Suits category',
  '#3B82F6',
  46,
  'domain_clothing_baby',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_46_sweaters_hoodies',
  'Sweaters & Hoodies',
  '👔',
  'Sweaters & Hoodies category',
  '#3B82F6',
  47,
  'domain_clothing_baby',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_47_sweatpants',
  'Sweatpants (Baby)',
  '👔',
  'Sweatpants category',
  '#3B82F6',
  48,
  'domain_clothing_baby',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_48_swim',
  'Swim (Baby)',
  '👔',
  'Swim category',
  '#3B82F6',
  49,
  'domain_clothing_baby',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_49_t_shirt',
  'T-Shirt (Baby)',
  '👔',
  'T-Shirt category',
  '#3B82F6',
  50,
  'domain_clothing_baby',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_50_tennis',
  'Tennis (Baby)',
  '👔',
  'Tennis category',
  '#3B82F6',
  51,
  'domain_clothing_baby',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_51_tops',
  'Tops (Baby)',
  '👔',
  'Tops category',
  '#3B82F6',
  52,
  'domain_clothing_baby',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_52_towel',
  'Towel',
  '👔',
  'Towel category',
  '#3B82F6',
  53,
  'domain_clothing_baby',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_53_toys',
  'Toys',
  '👔',
  'Toys category',
  '#3B82F6',
  54,
  'domain_clothing_baby',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_54_tracksuit',
  'Tracksuit (Baby)',
  '👔',
  'Tracksuit category',
  '#3B82F6',
  55,
  'domain_clothing_baby',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_55_trousers',
  'Trousers (Baby)',
  '👔',
  'Trousers category',
  '#3B82F6',
  56,
  'domain_clothing_baby',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_56_underwear',
  'Underwear (Baby)',
  '👔',
  'Underwear category',
  '#3B82F6',
  57,
  'domain_clothing_baby',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_57_vest',
  'Vest (Baby)',
  '👔',
  'Vest category',
  '#3B82F6',
  58,
  'domain_clothing_baby',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_58_vests',
  'Vests (Baby)',
  '👔',
  'Vests category',
  '#3B82F6',
  59,
  'domain_clothing_baby',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_59_accessories',
  'Accessories (Boys)',
  '👔',
  'Accessories category',
  '#3B82F6',
  60,
  'domain_clothing_boys',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_60_big_cuts',
  'Big Cuts',
  '👔',
  'Big Cuts category',
  '#3B82F6',
  61,
  'domain_clothing_boys',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_61_big_mammas',
  'Big Mammas',
  '👔',
  'Big Mammas category',
  '#3B82F6',
  62,
  'domain_clothing_boys',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_62_cap',
  'Cap (Boys)',
  '👔',
  'Cap category',
  '#3B82F6',
  63,
  'domain_clothing_boys',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_63_character_shop',
  'Character Shop (Boys)',
  '👔',
  'Character Shop category',
  '#3B82F6',
  64,
  'domain_clothing_boys',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_64_clothing',
  'Clothing (Boys)',
  '👔',
  'Clothing category',
  '#3B82F6',
  65,
  'domain_clothing_boys',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_65_fleece_jackets',
  'Fleece Jackets (Boys)',
  '👔',
  'Fleece Jackets category',
  '#3B82F6',
  66,
  'domain_clothing_boys',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_66_graphic_tees',
  'Graphic Tees (Boys)',
  '👔',
  'Graphic Tees category',
  '#3B82F6',
  67,
  'domain_clothing_boys',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_67_jackets',
  'Jackets (Boys)',
  '👔',
  'Jackets category',
  '#3B82F6',
  68,
  'domain_clothing_boys',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_68_jackets_outerwear',
  'Jackets & Outerwear (Boys)',
  '👔',
  'Jackets & Outerwear category',
  '#3B82F6',
  69,
  'domain_clothing_boys',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_69_jeans',
  'Jeans (Boys)',
  '👔',
  'Jeans category',
  '#3B82F6',
  70,
  'domain_clothing_boys',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_70_jersey',
  'Jersey (Boys)',
  '👔',
  'Jersey category',
  '#3B82F6',
  71,
  'domain_clothing_boys',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_71_jombo',
  'Jombo (Boys)',
  '👔',
  'Jombo category',
  '#3B82F6',
  72,
  'domain_clothing_boys',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_72_jumpsuit',
  'Jumpsuit (Boys)',
  '👔',
  'Jumpsuit category',
  '#3B82F6',
  73,
  'domain_clothing_boys',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_73_mixed',
  'Mixed (Boys)',
  '👔',
  'Mixed category',
  '#3B82F6',
  74,
  'domain_clothing_boys',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_74_outfit',
  'Outfit (Boys)',
  '👔',
  'Outfit category',
  '#3B82F6',
  75,
  'domain_clothing_boys',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_75_pajamas',
  'Pajamas (Boys)',
  '👔',
  'Pajamas category',
  '#3B82F6',
  76,
  'domain_clothing_boys',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_76_pants',
  'Pants (Boys)',
  '👔',
  'Pants category',
  '#3B82F6',
  77,
  'domain_clothing_boys',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_77_raffles',
  'Raffles (Boys)',
  '👔',
  'Raffles category',
  '#3B82F6',
  78,
  'domain_clothing_boys',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_78_sandals',
  'Sandals (Boys)',
  '👔',
  'Sandals category',
  '#3B82F6',
  79,
  'domain_clothing_boys',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_79_sets',
  'Sets (Boys)',
  '👔',
  'Sets category',
  '#3B82F6',
  80,
  'domain_clothing_boys',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_80_shirts',
  'Shirts (Boys)',
  '👔',
  'Shirts category',
  '#3B82F6',
  81,
  'domain_clothing_boys',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_81_shoes',
  'Shoes (Boys)',
  '👔',
  'Shoes category',
  '#3B82F6',
  82,
  'domain_clothing_boys',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_82_shorts',
  'Shorts (Boys)',
  '👔',
  'Shorts category',
  '#3B82F6',
  83,
  'domain_clothing_boys',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_83_socks',
  'Socks (Boys)',
  '👔',
  'Socks category',
  '#3B82F6',
  84,
  'domain_clothing_boys',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_84_suits',
  'Suits (Boys)',
  '👔',
  'Suits category',
  '#3B82F6',
  85,
  'domain_clothing_boys',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_85_sweatshirt',
  'Sweatshirt (Boys)',
  '👔',
  'Sweatshirt category',
  '#3B82F6',
  86,
  'domain_clothing_boys',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_86_swim',
  'Swim (Boys)',
  '👔',
  'Swim category',
  '#3B82F6',
  87,
  'domain_clothing_boys',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_87_t_shirt',
  'T-Shirt (Boys)',
  '👔',
  'T-Shirt category',
  '#3B82F6',
  88,
  'domain_clothing_boys',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_88_tennis',
  'Tennis (Boys)',
  '👔',
  'Tennis category',
  '#3B82F6',
  89,
  'domain_clothing_boys',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_89_tops',
  'Tops (Boys)',
  '👔',
  'Tops category',
  '#3B82F6',
  90,
  'domain_clothing_boys',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_90_tracksuit',
  'Tracksuit (Boys)',
  '👔',
  'Tracksuit category',
  '#3B82F6',
  91,
  'domain_clothing_boys',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_91_trousers',
  'Trousers (Boys)',
  '👔',
  'Trousers category',
  '#3B82F6',
  92,
  'domain_clothing_boys',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_92_underwear',
  'Underwear (Boys)',
  '👔',
  'Underwear category',
  '#3B82F6',
  93,
  'domain_clothing_boys',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_93_vests',
  'Vests (Boys)',
  '👔',
  'Vests category',
  '#3B82F6',
  94,
  'domain_clothing_boys',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_94_bags',
  'Bags (domain_clothing_general_merch)',
  '👔',
  'Bags category',
  '#3B82F6',
  95,
  'domain_clothing_general_merch',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_95_beach_towels',
  'Beach Towels (domain_clothing_general_merch)',
  '👔',
  'Beach Towels category',
  '#3B82F6',
  96,
  'domain_clothing_general_merch',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_96_carriers',
  'Carriers',
  '👔',
  'Carriers category',
  '#3B82F6',
  97,
  'domain_clothing_general_merch',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_97_dish_towels',
  'Dish Towels',
  '👔',
  'Dish Towels category',
  '#3B82F6',
  98,
  'domain_clothing_general_merch',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_98_iphone',
  'iPhone',
  '👔',
  'iPhone category',
  '#3B82F6',
  99,
  'domain_clothing_general_merch',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_99_jeans',
  'Jeans (domain_clothing_general_merch)',
  '👔',
  'Jeans category',
  '#3B82F6',
  100,
  'domain_clothing_general_merch',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_100_nappies',
  'Nappies',
  '👔',
  'Nappies category',
  '#3B82F6',
  101,
  'domain_clothing_general_merch',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_101_nokia',
  'Nokia',
  '👔',
  'Nokia category',
  '#3B82F6',
  102,
  'domain_clothing_general_merch',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_102_ribbon_towels',
  'Ribbon Towels (domain_clothing_general_merch)',
  '👔',
  'Ribbon Towels category',
  '#3B82F6',
  103,
  'domain_clothing_general_merch',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_103_socks',
  'Socks (domain_clothing_general_merch)',
  '👔',
  'Socks category',
  '#3B82F6',
  104,
  'domain_clothing_general_merch',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_104_sofa_couch_cover',
  'Sofa Couch Cover',
  '👔',
  'Sofa Couch Cover category',
  '#3B82F6',
  105,
  'domain_clothing_general_merch',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_105_towels',
  'Towels (domain_clothing_general_merch)',
  '👔',
  'Towels category',
  '#3B82F6',
  106,
  'domain_clothing_general_merch',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_106_uncategorized',
  'Uncategorized (domain_clothing_general_merch)',
  '👔',
  'Uncategorized category',
  '#3B82F6',
  107,
  'domain_clothing_general_merch',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_107_accessories',
  'Accessories (Girls)',
  '👔',
  'Accessories category',
  '#3B82F6',
  108,
  'domain_clothing_girls',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_108_baby_toddler_tops',
  'Baby & Toddler Tops',
  '👔',
  'Baby & Toddler Tops category',
  '#3B82F6',
  109,
  'domain_clothing_girls',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_109_cap',
  'Cap (Girls)',
  '👔',
  'Cap category',
  '#3B82F6',
  110,
  'domain_clothing_girls',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_110_clothing',
  'Clothing (Girls)',
  '👔',
  'Clothing category',
  '#3B82F6',
  111,
  'domain_clothing_girls',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_111_dresses',
  'Dresses (Girls)',
  '👔',
  'Dresses category',
  '#3B82F6',
  112,
  'domain_clothing_girls',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_112_fleece_jackets',
  'Fleece Jackets (Girls)',
  '👔',
  'Fleece Jackets category',
  '#3B82F6',
  113,
  'domain_clothing_girls',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_113_graphic_tees',
  'Graphic Tees (Girls)',
  '👔',
  'Graphic Tees category',
  '#3B82F6',
  114,
  'domain_clothing_girls',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_114_jackets',
  'Jackets (Girls)',
  '👔',
  'Jackets category',
  '#3B82F6',
  115,
  'domain_clothing_girls',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_115_jackets_outerwear',
  'Jackets & Outerwear (Girls)',
  '👔',
  'Jackets & Outerwear category',
  '#3B82F6',
  116,
  'domain_clothing_girls',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_116_jeans',
  'Jeans (Girls)',
  '👔',
  'Jeans category',
  '#3B82F6',
  117,
  'domain_clothing_girls',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_117_jombo',
  'Jombo (Girls)',
  '👔',
  'Jombo category',
  '#3B82F6',
  118,
  'domain_clothing_girls',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_118_jumbo',
  'Jumbo',
  '👔',
  'Jumbo category',
  '#3B82F6',
  119,
  'domain_clothing_girls',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_119_jumpsuit',
  'Jumpsuit (Girls)',
  '👔',
  'Jumpsuit category',
  '#3B82F6',
  120,
  'domain_clothing_girls',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_120_leggings',
  'Leggings (Girls)',
  '👔',
  'Leggings category',
  '#3B82F6',
  121,
  'domain_clothing_girls',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_121_mixed',
  'Mixed (Girls)',
  '👔',
  'Mixed category',
  '#3B82F6',
  122,
  'domain_clothing_girls',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_122_outfit',
  'Outfit (Girls)',
  '👔',
  'Outfit category',
  '#3B82F6',
  123,
  'domain_clothing_girls',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_123_pajamas',
  'Pajamas (Girls)',
  '👔',
  'Pajamas category',
  '#3B82F6',
  124,
  'domain_clothing_girls',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_124_panties',
  'Panties (Girls)',
  '👔',
  'Panties category',
  '#3B82F6',
  125,
  'domain_clothing_girls',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_125_pants',
  'Pants (Girls)',
  '👔',
  'Pants category',
  '#3B82F6',
  126,
  'domain_clothing_girls',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_126_raffles',
  'Raffles (Girls)',
  '👔',
  'Raffles category',
  '#3B82F6',
  127,
  'domain_clothing_girls',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_127_rompers',
  'Rompers (Girls)',
  '👔',
  'Rompers category',
  '#3B82F6',
  128,
  'domain_clothing_girls',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_128_sandals',
  'Sandals (Girls)',
  '👔',
  'Sandals category',
  '#3B82F6',
  129,
  'domain_clothing_girls',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_129_sets',
  'Sets (Girls)',
  '👔',
  'Sets category',
  '#3B82F6',
  130,
  'domain_clothing_girls',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_130_shirts',
  'Shirts (Girls)',
  '👔',
  'Shirts category',
  '#3B82F6',
  131,
  'domain_clothing_girls',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_131_shoes',
  'Shoes (Girls)',
  '👔',
  'Shoes category',
  '#3B82F6',
  132,
  'domain_clothing_girls',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_132_shorts',
  'Shorts (Girls)',
  '👔',
  'Shorts category',
  '#3B82F6',
  133,
  'domain_clothing_girls',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_133_skirts',
  'Skirts (Girls)',
  '👔',
  'Skirts category',
  '#3B82F6',
  134,
  'domain_clothing_girls',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_134_skirts_shorts',
  'Skirts & Shorts',
  '👔',
  'Skirts & Shorts category',
  '#3B82F6',
  135,
  'domain_clothing_girls',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_135_socks',
  'Socks (Girls)',
  '👔',
  'Socks category',
  '#3B82F6',
  136,
  'domain_clothing_girls',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_136_suits',
  'Suits (Girls)',
  '👔',
  'Suits category',
  '#3B82F6',
  137,
  'domain_clothing_girls',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_137_swim',
  'Swim (Girls)',
  '👔',
  'Swim category',
  '#3B82F6',
  138,
  'domain_clothing_girls',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_138_t_shirt',
  'T-Shirt (Girls)',
  '👔',
  'T-Shirt category',
  '#3B82F6',
  139,
  'domain_clothing_girls',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_139_tights',
  'Tights (Girls)',
  '👔',
  'Tights category',
  '#3B82F6',
  140,
  'domain_clothing_girls',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_140_tops',
  'Tops (Girls)',
  '👔',
  'Tops category',
  '#3B82F6',
  141,
  'domain_clothing_girls',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_141_tracksuit',
  'Tracksuit (Girls)',
  '👔',
  'Tracksuit category',
  '#3B82F6',
  142,
  'domain_clothing_girls',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_142_trousers',
  'Trousers (Girls)',
  '👔',
  'Trousers category',
  '#3B82F6',
  143,
  'domain_clothing_girls',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_143_underwear',
  'Underwear (Girls)',
  '👔',
  'Underwear category',
  '#3B82F6',
  144,
  'domain_clothing_girls',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_144_vests',
  'Vests (Girls)',
  '👔',
  'Vests category',
  '#3B82F6',
  145,
  'domain_clothing_girls',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_145_face_towel',
  'Face Towel',
  '👔',
  'Face Towel category',
  '#3B82F6',
  146,
  'domain_clothing_home_textiles',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_146_king',
  'King',
  '👔',
  'King category',
  '#3B82F6',
  147,
  'domain_clothing_home_textiles',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_147_queen',
  'Queen',
  '👔',
  'Queen category',
  '#3B82F6',
  148,
  'domain_clothing_home_textiles',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_148_small_towel',
  'Small Towel',
  '👔',
  'Small Towel category',
  '#3B82F6',
  149,
  'domain_clothing_home_textiles',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_149_towels',
  'Towels (domain_clothing_home_textiles)',
  '👔',
  'Towels category',
  '#3B82F6',
  150,
  'domain_clothing_home_textiles',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_150_uncategorized',
  'Uncategorized (domain_clothing_home_textiles)',
  '👔',
  'Uncategorized category',
  '#3B82F6',
  151,
  'domain_clothing_home_textiles',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_151_android',
  'Android',
  '👔',
  'Android category',
  '#3B82F6',
  152,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_152_backpack',
  'Backpack',
  '👔',
  'Backpack category',
  '#3B82F6',
  153,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_153_belt',
  'Belt (Men''s)',
  '👔',
  'Belt category',
  '#3B82F6',
  154,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_154_big_size_t_shirts',
  'Big Size T-Shirts',
  '👔',
  'Big Size T-Shirts category',
  '#3B82F6',
  155,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_155_blazer',
  'Blazer (Men''s)',
  '👔',
  'Blazer category',
  '#3B82F6',
  156,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_156_boat_shoes',
  'Boat Shoes',
  '👔',
  'Boat Shoes category',
  '#3B82F6',
  157,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_157_bomber_jacket',
  'Bomber Jacket',
  '👔',
  'Bomber Jacket category',
  '#3B82F6',
  158,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_158_boots',
  'Boots (Men''s)',
  '👔',
  'Boots category',
  '#3B82F6',
  159,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_159_boxer_briefs',
  'Boxer Briefs',
  '👔',
  'Boxer Briefs category',
  '#3B82F6',
  160,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_160_boxer_pants',
  'Boxer Pants',
  '👔',
  'Boxer Pants category',
  '#3B82F6',
  161,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_161_boxers',
  'Boxers',
  '👔',
  'Boxers category',
  '#3B82F6',
  162,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_162_briefs',
  'Briefs',
  '👔',
  'Briefs category',
  '#3B82F6',
  163,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_163_cap',
  'Cap (Men''s)',
  '👔',
  'Cap category',
  '#3B82F6',
  164,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_164_cargo_pants',
  'Cargo Pants',
  '👔',
  'Cargo Pants category',
  '#3B82F6',
  165,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_165_character_shop',
  'Character Shop (Men''s)',
  '👔',
  'Character Shop category',
  '#3B82F6',
  166,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_166_chelsea_boots',
  'Chelsea Boots',
  '👔',
  'Chelsea Boots category',
  '#3B82F6',
  167,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_167_chinos',
  'Chinos',
  '👔',
  'Chinos category',
  '#3B82F6',
  168,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_168_chukka',
  'Chukka',
  '👔',
  'Chukka category',
  '#3B82F6',
  169,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_169_clothing',
  'Clothing (Men''s)',
  '👔',
  'Clothing category',
  '#3B82F6',
  170,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_170_combat',
  'Combat',
  '👔',
  'Combat category',
  '#3B82F6',
  171,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_171_cufflinks',
  'Cufflinks',
  '👔',
  'Cufflinks category',
  '#3B82F6',
  172,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_172_denim_jacket',
  'Denim Jacket',
  '👔',
  'Denim Jacket category',
  '#3B82F6',
  173,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_173_dress',
  'Dress (Men''s)',
  '👔',
  'Dress category',
  '#3B82F6',
  174,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_174_dress_pants',
  'Dress Pants',
  '👔',
  'Dress Pants category',
  '#3B82F6',
  175,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_175_dress_shirt',
  'Dress Shirt',
  '👔',
  'Dress Shirt category',
  '#3B82F6',
  176,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_176_fleece',
  'Fleece (Men''s)',
  '👔',
  'Fleece category',
  '#3B82F6',
  177,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_177_fleece_jackets',
  'Fleece Jackets (Men''s)',
  '👔',
  'Fleece Jackets category',
  '#3B82F6',
  178,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_178_flip_flops',
  'Flip-flops',
  '👔',
  'Flip-flops category',
  '#3B82F6',
  179,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_179_g_string',
  'G-string',
  '👔',
  'G-string category',
  '#3B82F6',
  180,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_180_gloves',
  'Gloves (Men''s)',
  '👔',
  'Gloves category',
  '#3B82F6',
  181,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_181_graphic_tees',
  'Graphic Tees (Men''s)',
  '👔',
  'Graphic Tees category',
  '#3B82F6',
  182,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_182_hat',
  'Hat (Men''s)',
  '👔',
  'Hat category',
  '#3B82F6',
  183,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_183_henley_shirt',
  'Henley Shirt',
  '👔',
  'Henley Shirt category',
  '#3B82F6',
  184,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_184_hiking',
  'Hiking',
  '👔',
  'Hiking category',
  '#3B82F6',
  185,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_185_hoodie',
  'Hoodie',
  '👔',
  'Hoodie category',
  '#3B82F6',
  186,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_186_jacket',
  'Jacket (Men''s)',
  '👔',
  'Jacket category',
  '#3B82F6',
  187,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_187_jackets',
  'Jackets (Men''s)',
  '👔',
  'Jackets category',
  '#3B82F6',
  188,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_188_jeans',
  'Jeans (Men''s)',
  '👔',
  'Jeans category',
  '#3B82F6',
  189,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_189_jersey',
  'Jersey (Men''s)',
  '👔',
  'Jersey category',
  '#3B82F6',
  190,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_190_jockstrap',
  'Jockstrap',
  '👔',
  'Jockstrap category',
  '#3B82F6',
  191,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_191_joggers',
  'Joggers (Men''s)',
  '👔',
  'Joggers category',
  '#3B82F6',
  192,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_192_jombo',
  'Jombo (Men''s)',
  '👔',
  'Jombo category',
  '#3B82F6',
  193,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_193_jumpsuit',
  'Jumpsuit (Men''s)',
  '👔',
  'Jumpsuit category',
  '#3B82F6',
  194,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_194_khakis',
  'Khakis',
  '👔',
  'Khakis category',
  '#3B82F6',
  195,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_195_loafers',
  'Loafers',
  '👔',
  'Loafers category',
  '#3B82F6',
  196,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_196_long_johns',
  'Long Johns',
  '👔',
  'Long Johns category',
  '#3B82F6',
  197,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_197_mixed',
  'Mixed (Men''s)',
  '👔',
  'Mixed category',
  '#3B82F6',
  198,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_198_moccasins',
  'Moccasins',
  '👔',
  'Moccasins category',
  '#3B82F6',
  199,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_199_overalls',
  'Overalls',
  '👔',
  'Overalls category',
  '#3B82F6',
  200,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_200_oxfords',
  'Oxfords',
  '👔',
  'Oxfords category',
  '#3B82F6',
  201,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_201_pajamas',
  'Pajamas (Men''s)',
  '👔',
  'Pajamas category',
  '#3B82F6',
  202,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_202_pants',
  'Pants (Men''s)',
  '👔',
  'Pants category',
  '#3B82F6',
  203,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_203_parka',
  'Parka',
  '👔',
  'Parka category',
  '#3B82F6',
  204,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_204_pea_coat',
  'Pea Coat',
  '👔',
  'Pea Coat category',
  '#3B82F6',
  205,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_205_polo_shirt',
  'Polo Shirt',
  '👔',
  'Polo Shirt category',
  '#3B82F6',
  206,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_206_puffer_jacket',
  'Puffer Jacket',
  '👔',
  'Puffer Jacket category',
  '#3B82F6',
  207,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_207_raffles',
  'Raffles (Men''s)',
  '👔',
  'Raffles category',
  '#3B82F6',
  208,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_208_rain_waterproof',
  'Rain & Waterproof',
  '👔',
  'Rain & Waterproof category',
  '#3B82F6',
  209,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_209_rugby_shirt',
  'Rugby Shirt',
  '👔',
  'Rugby Shirt category',
  '#3B82F6',
  210,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_210_sandals',
  'Sandals (Men''s)',
  '👔',
  'Sandals category',
  '#3B82F6',
  211,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_211_scarf',
  'Scarf (Men''s)',
  '👔',
  'Scarf category',
  '#3B82F6',
  212,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_212_shirts',
  'Shirts (Men''s)',
  '👔',
  'Shirts category',
  '#3B82F6',
  213,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_213_shoes',
  'Shoes (Men''s)',
  '👔',
  'Shoes category',
  '#3B82F6',
  214,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_214_shorts',
  'Shorts (Men''s)',
  '👔',
  'Shorts category',
  '#3B82F6',
  215,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_215_slippers',
  'Slippers',
  '👔',
  'Slippers category',
  '#3B82F6',
  216,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_216_sneakers',
  'Sneakers',
  '👔',
  'Sneakers category',
  '#3B82F6',
  217,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_217_snow_winter',
  'Snow & Winter',
  '👔',
  'Snow & Winter category',
  '#3B82F6',
  218,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_218_socks',
  'Socks (Men''s)',
  '👔',
  'Socks category',
  '#3B82F6',
  219,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_219_suit_jacket',
  'Suit Jacket',
  '👔',
  'Suit Jacket category',
  '#3B82F6',
  220,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_220_suits',
  'Suits (Men''s)',
  '👔',
  'Suits category',
  '#3B82F6',
  221,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_221_sunglasses',
  'Sunglasses',
  '👔',
  'Sunglasses category',
  '#3B82F6',
  222,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_222_sweater',
  'Sweater (Men''s)',
  '👔',
  'Sweater category',
  '#3B82F6',
  223,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_223_sweatpants',
  'Sweatpants (Men''s)',
  '👔',
  'Sweatpants category',
  '#3B82F6',
  224,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_224_sweatshirt',
  'Sweatshirt (Men''s)',
  '👔',
  'Sweatshirt category',
  '#3B82F6',
  225,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_225_swim',
  'Swim (Men''s)',
  '👔',
  'Swim category',
  '#3B82F6',
  226,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_226_t_shirt',
  'T-Shirt (Men''s)',
  '👔',
  'T-Shirt category',
  '#3B82F6',
  227,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_227_t_shirts',
  'T-Shirts',
  '👔',
  'T-Shirts category',
  '#3B82F6',
  228,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_228_tank_top',
  'Tank Top',
  '👔',
  'Tank Top category',
  '#3B82F6',
  229,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_229_tennis',
  'Tennis (Men''s)',
  '👔',
  'Tennis category',
  '#3B82F6',
  230,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_230_thermal_underwear',
  'Thermal Underwear',
  '👔',
  'Thermal Underwear category',
  '#3B82F6',
  231,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_231_thongs',
  'Thongs',
  '👔',
  'Thongs category',
  '#3B82F6',
  232,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_232_tie',
  'Tie',
  '👔',
  'Tie category',
  '#3B82F6',
  233,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_233_tops',
  'Tops (Men''s)',
  '👔',
  'Tops category',
  '#3B82F6',
  234,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_234_tracksuit',
  'Tracksuit (Men''s)',
  '👔',
  'Tracksuit category',
  '#3B82F6',
  235,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_235_trousers',
  'Trousers (Men''s)',
  '👔',
  'Trousers category',
  '#3B82F6',
  236,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_236_trunks',
  'Trunks',
  '👔',
  'Trunks category',
  '#3B82F6',
  237,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_237_turtleneck',
  'Turtleneck',
  '👔',
  'Turtleneck category',
  '#3B82F6',
  238,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_238_uncategorized',
  'Uncategorized (Men''s)',
  '👔',
  'Uncategorized category',
  '#3B82F6',
  239,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_239_underwear',
  'Underwear (Men''s)',
  '👔',
  'Underwear category',
  '#3B82F6',
  240,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_240_vest',
  'Vest (Men''s)',
  '👔',
  'Vest category',
  '#3B82F6',
  241,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_241_vests',
  'Vests (Men''s)',
  '👔',
  'Vests category',
  '#3B82F6',
  242,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_242_wallet',
  'Wallet (Men''s)',
  '👔',
  'Wallet category',
  '#3B82F6',
  243,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_243_watch',
  'Watch (Men''s)',
  '👔',
  'Watch category',
  '#3B82F6',
  244,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_244_windbreaker',
  'Windbreaker',
  '👔',
  'Windbreaker category',
  '#3B82F6',
  245,
  'domain_clothing_mens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_245_accessories',
  'Accessories (Women''s)',
  '👔',
  'Accessories category',
  '#3B82F6',
  246,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_246_active_sneakers',
  'Active Sneakers',
  '👔',
  'Active Sneakers category',
  '#3B82F6',
  247,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_247_activewear',
  'Activewear',
  '👔',
  'Activewear category',
  '#3B82F6',
  248,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_248_bag',
  'Bag',
  '👔',
  'Bag category',
  '#3B82F6',
  249,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_249_baster',
  'Baster',
  '👔',
  'Baster category',
  '#3B82F6',
  250,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_250_belt',
  'Belt (Women''s)',
  '👔',
  'Belt category',
  '#3B82F6',
  251,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_251_bikini',
  'Bikini',
  '👔',
  'Bikini category',
  '#3B82F6',
  252,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_252_blazer',
  'Blazer (Women''s)',
  '👔',
  'Blazer category',
  '#3B82F6',
  253,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_253_blazers',
  'Blazers',
  '👔',
  'Blazers category',
  '#3B82F6',
  254,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_254_blowse',
  'Blowse',
  '👔',
  'Blowse category',
  '#3B82F6',
  255,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_255_bodysuits',
  'Bodysuits (Women''s)',
  '👔',
  'Bodysuits category',
  '#3B82F6',
  256,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_256_booties',
  'Booties',
  '👔',
  'Booties category',
  '#3B82F6',
  257,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_257_boots',
  'Boots (Women''s)',
  '👔',
  'Boots category',
  '#3B82F6',
  258,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_258_borello',
  'Borello',
  '👔',
  'Borello category',
  '#3B82F6',
  259,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_259_bottom',
  'Bottom',
  '👔',
  'Bottom category',
  '#3B82F6',
  260,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_260_bottoms',
  'Bottoms',
  '👔',
  'Bottoms category',
  '#3B82F6',
  261,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_261_bra',
  'Bra',
  '👔',
  'Bra category',
  '#3B82F6',
  262,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_262_bracelet',
  'Bracelet',
  '👔',
  'Bracelet category',
  '#3B82F6',
  263,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_263_bralets',
  'Bralets',
  '👔',
  'Bralets category',
  '#3B82F6',
  264,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_264_bridesmaid',
  'Bridesmaid',
  '👔',
  'Bridesmaid category',
  '#3B82F6',
  265,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_265_bump_shorts',
  'Bump Shorts',
  '👔',
  'Bump Shorts category',
  '#3B82F6',
  266,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_266_cap',
  'Cap (Women''s)',
  '👔',
  'Cap category',
  '#3B82F6',
  267,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_267_cardigans',
  'Cardigans',
  '👔',
  'Cardigans category',
  '#3B82F6',
  268,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_268_casual_sneakers',
  'Casual Sneakers',
  '👔',
  'Casual Sneakers category',
  '#3B82F6',
  269,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_269_casual_wear',
  'Casual Wear',
  '👔',
  'Casual Wear category',
  '#3B82F6',
  270,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_270_clogs',
  'Clogs',
  '👔',
  'Clogs category',
  '#3B82F6',
  271,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_271_clothing',
  'Clothing (Women''s)',
  '👔',
  'Clothing category',
  '#3B82F6',
  272,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_272_co_ords',
  'Co-ords',
  '👔',
  'Co-ords category',
  '#3B82F6',
  273,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_273_coat',
  'Coat',
  '👔',
  'Coat category',
  '#3B82F6',
  274,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_274_coats_jackets',
  'Coats & Jackets',
  '👔',
  'Coats & Jackets category',
  '#3B82F6',
  275,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_275_comfort',
  'Comfort',
  '👔',
  'Comfort category',
  '#3B82F6',
  276,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_276_crop_tops',
  'Crop Tops',
  '👔',
  'Crop Tops category',
  '#3B82F6',
  277,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_277_denim',
  'Denim',
  '👔',
  'Denim category',
  '#3B82F6',
  278,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_278_dress',
  'Dress (Women''s)',
  '👔',
  'Dress category',
  '#3B82F6',
  279,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_279_dress_shoes',
  'Dress Shoes',
  '👔',
  'Dress Shoes category',
  '#3B82F6',
  280,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_280_dresses',
  'Dresses (Women''s)',
  '👔',
  'Dresses category',
  '#3B82F6',
  281,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_281_earrings',
  'Earrings',
  '👔',
  'Earrings category',
  '#3B82F6',
  282,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_282_espadrilles',
  'Espadrilles',
  '👔',
  'Espadrilles category',
  '#3B82F6',
  283,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_283_flat_sandals',
  'Flat Sandals',
  '👔',
  'Flat Sandals category',
  '#3B82F6',
  284,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_284_flats',
  'Flats',
  '👔',
  'Flats category',
  '#3B82F6',
  285,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_285_fleece',
  'Fleece (Women''s)',
  '👔',
  'Fleece category',
  '#3B82F6',
  286,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_286_fleece_jackets',
  'Fleece Jackets (Women''s)',
  '👔',
  'Fleece Jackets category',
  '#3B82F6',
  287,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_287_floral',
  'Floral',
  '👔',
  'Floral category',
  '#3B82F6',
  288,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_288_footwear',
  'Footwear',
  '👔',
  'Footwear category',
  '#3B82F6',
  289,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_289_formal_dress',
  'Formal Dress',
  '👔',
  'Formal Dress category',
  '#3B82F6',
  290,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_290_garments',
  'Garments',
  '👔',
  'Garments category',
  '#3B82F6',
  291,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_291_glasses',
  'Glasses',
  '👔',
  'Glasses category',
  '#3B82F6',
  292,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_292_gloves',
  'Gloves (Women''s)',
  '👔',
  'Gloves category',
  '#3B82F6',
  293,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_293_graphic_tees',
  'Graphic Tees (Women''s)',
  '👔',
  'Graphic Tees category',
  '#3B82F6',
  294,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_294_handbag',
  'Handbag',
  '👔',
  'Handbag category',
  '#3B82F6',
  295,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_295_hat',
  'Hat (Women''s)',
  '👔',
  'Hat category',
  '#3B82F6',
  296,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_296_heeled_sandals',
  'Heeled Sandals',
  '👔',
  'Heeled Sandals category',
  '#3B82F6',
  297,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_297_heels',
  'Heels',
  '👔',
  'Heels category',
  '#3B82F6',
  298,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_298_hiking_shoes',
  'Hiking Shoes',
  '👔',
  'Hiking Shoes category',
  '#3B82F6',
  299,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_299_home_beauty',
  'Home & Beauty',
  '👔',
  'Home & Beauty category',
  '#3B82F6',
  300,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_300_hoodies',
  'Hoodies',
  '👔',
  'Hoodies category',
  '#3B82F6',
  301,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_301_jacket',
  'Jacket (Women''s)',
  '👔',
  'Jacket category',
  '#3B82F6',
  302,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_302_jackets',
  'Jackets (Women''s)',
  '👔',
  'Jackets category',
  '#3B82F6',
  303,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_303_jagg_inns',
  'Jagg Inns',
  '👔',
  'Jagg Inns category',
  '#3B82F6',
  304,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_304_jeans',
  'Jeans (Women''s)',
  '👔',
  'Jeans category',
  '#3B82F6',
  305,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_305_jerseys',
  'Jerseys (Women''s)',
  '👔',
  'Jerseys category',
  '#3B82F6',
  306,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_306_joggers',
  'Joggers (Women''s)',
  '👔',
  'Joggers category',
  '#3B82F6',
  307,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_307_joker',
  'Joker',
  '👔',
  'Joker category',
  '#3B82F6',
  308,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_308_jumbo',
  'JUMBO',
  '👔',
  'JUMBO category',
  '#3B82F6',
  309,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_309_jumpsuit',
  'Jumpsuit (Women''s)',
  '👔',
  'Jumpsuit category',
  '#3B82F6',
  310,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_310_jumpsuits',
  'Jumpsuits',
  '👔',
  'Jumpsuits category',
  '#3B82F6',
  311,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_311_jumpsuits_playsuits',
  'Jumpsuits & Playsuits',
  '👔',
  'Jumpsuits & Playsuits category',
  '#3B82F6',
  312,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_312_kimono',
  'Kimono',
  '👔',
  'Kimono category',
  '#3B82F6',
  313,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_313_knitwear',
  'Knitwear',
  '👔',
  'Knitwear category',
  '#3B82F6',
  314,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_314_leather_handbag',
  'Leather Handbag',
  '👔',
  'Leather Handbag category',
  '#3B82F6',
  315,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_315_leggings',
  'Leggings (Women''s)',
  '👔',
  'Leggings category',
  '#3B82F6',
  316,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_316_lingerie',
  'Lingerie',
  '👔',
  'Lingerie category',
  '#3B82F6',
  317,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_317_lingerie_nightwear',
  'Lingerie & Nightwear',
  '👔',
  'Lingerie & Nightwear category',
  '#3B82F6',
  318,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_318_loungewear',
  'Loungewear',
  '👔',
  'Loungewear category',
  '#3B82F6',
  319,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_319_maternity',
  'Maternity',
  '👔',
  'Maternity category',
  '#3B82F6',
  320,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_320_mixed',
  'Mixed (Women''s)',
  '👔',
  'Mixed category',
  '#3B82F6',
  321,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_321_mules_slides',
  'Mules & Slides',
  '👔',
  'Mules & Slides category',
  '#3B82F6',
  322,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_322_necklace',
  'Necklace',
  '👔',
  'Necklace category',
  '#3B82F6',
  323,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_323_outerwear',
  'Outerwear',
  '👔',
  'Outerwear category',
  '#3B82F6',
  324,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_324_outfit',
  'Outfit (Women''s)',
  '👔',
  'Outfit category',
  '#3B82F6',
  325,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_325_oxfords_loafers',
  'Oxfords & Loafers',
  '👔',
  'Oxfords & Loafers category',
  '#3B82F6',
  326,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_326_pajamas',
  'Pajamas (Women''s)',
  '👔',
  'Pajamas category',
  '#3B82F6',
  327,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_327_panties',
  'Panties (Women''s)',
  '👔',
  'Panties category',
  '#3B82F6',
  328,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_328_pants',
  'Pants (Women''s)',
  '👔',
  'Pants category',
  '#3B82F6',
  329,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_329_peacoat',
  'Peacoat',
  '👔',
  'Peacoat category',
  '#3B82F6',
  330,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_330_petite',
  'Petite',
  '👔',
  'Petite category',
  '#3B82F6',
  331,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_331_platform',
  'Platform',
  '👔',
  'Platform category',
  '#3B82F6',
  332,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_332_plus_size',
  'Plus Size',
  '👔',
  'Plus Size category',
  '#3B82F6',
  333,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_333_poloneck',
  'Poloneck',
  '👔',
  'Poloneck category',
  '#3B82F6',
  334,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_334_pumps',
  'Pumps',
  '👔',
  'Pumps category',
  '#3B82F6',
  335,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_335_purse',
  'Purse',
  '👔',
  'Purse category',
  '#3B82F6',
  336,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_336_push',
  'Push',
  '👔',
  'Push category',
  '#3B82F6',
  337,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_337_raffles',
  'Raffles (Women''s)',
  '👔',
  'Raffles category',
  '#3B82F6',
  338,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_338_rompers',
  'Rompers (Women''s)',
  '👔',
  'Rompers category',
  '#3B82F6',
  339,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_339_running_training',
  'Running & Training',
  '👔',
  'Running & Training category',
  '#3B82F6',
  340,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_340_sandals',
  'Sandals (Women''s)',
  '👔',
  'Sandals category',
  '#3B82F6',
  341,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_341_scarf',
  'Scarf (Women''s)',
  '👔',
  'Scarf category',
  '#3B82F6',
  342,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_342_scrubs',
  'Scrubs',
  '👔',
  'Scrubs category',
  '#3B82F6',
  343,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_343_shape',
  'Shape',
  '👔',
  'Shape category',
  '#3B82F6',
  344,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_344_sheath_dress',
  'Sheath Dress',
  '👔',
  'Sheath Dress category',
  '#3B82F6',
  345,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_345_shirts',
  'Shirts (Women''s)',
  '👔',
  'Shirts category',
  '#3B82F6',
  346,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_346_shoes',
  'Shoes (Women''s)',
  '👔',
  'Shoes category',
  '#3B82F6',
  347,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_347_shorts',
  'Shorts (Women''s)',
  '👔',
  'Shorts category',
  '#3B82F6',
  348,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_348_shoulder_bag',
  'Shoulder Bag',
  '👔',
  'Shoulder Bag category',
  '#3B82F6',
  349,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_349_skin_jeans',
  'Skin Jeans',
  '👔',
  'Skin Jeans category',
  '#3B82F6',
  350,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_350_skintights',
  'Skintights (Women''s)',
  '👔',
  'Skintights category',
  '#3B82F6',
  351,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_351_skirt',
  'Skirt',
  '👔',
  'Skirt category',
  '#3B82F6',
  352,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_352_skirts',
  'Skirts (Women''s)',
  '👔',
  'Skirts category',
  '#3B82F6',
  353,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_353_slake',
  'Slake',
  '👔',
  'Slake category',
  '#3B82F6',
  354,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_354_sleepwear',
  'Sleepwear',
  '👔',
  'Sleepwear category',
  '#3B82F6',
  355,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_355_slim_dress',
  'Slim Dress',
  '👔',
  'Slim Dress category',
  '#3B82F6',
  356,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_356_small_shirt',
  'Small Shirt',
  '👔',
  'Small Shirt category',
  '#3B82F6',
  357,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_357_socks',
  'Socks (Women''s)',
  '👔',
  'Socks category',
  '#3B82F6',
  358,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_358_sport_sandals',
  'Sport Sandals',
  '👔',
  'Sport Sandals category',
  '#3B82F6',
  359,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_359_stripped',
  'Stripped',
  '👔',
  'Stripped category',
  '#3B82F6',
  360,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_360_suit',
  'Suit',
  '👔',
  'Suit category',
  '#3B82F6',
  361,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_361_suits',
  'Suits (Women''s)',
  '👔',
  'Suits category',
  '#3B82F6',
  362,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_362_sundress',
  'Sundress',
  '👔',
  'Sundress category',
  '#3B82F6',
  363,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_363_sweater',
  'Sweater (Women''s)',
  '👔',
  'Sweater category',
  '#3B82F6',
  364,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_364_sweatpants',
  'Sweatpants (Women''s)',
  '👔',
  'Sweatpants category',
  '#3B82F6',
  365,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_365_sweatshirts',
  'Sweatshirts',
  '👔',
  'Sweatshirts category',
  '#3B82F6',
  366,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_366_swim',
  'Swim (Women''s)',
  '👔',
  'Swim category',
  '#3B82F6',
  367,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_367_swimsuit',
  'Swimsuit',
  '👔',
  'Swimsuit category',
  '#3B82F6',
  368,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_368_swimwear',
  'Swimwear',
  '👔',
  'Swimwear category',
  '#3B82F6',
  369,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_369_t_shirt',
  'T-Shirt (Women''s)',
  '👔',
  'T-Shirt category',
  '#3B82F6',
  370,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_370_tall',
  'Tall',
  '👔',
  'Tall category',
  '#3B82F6',
  371,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_371_tennis',
  'Tennis (Women''s)',
  '👔',
  'Tennis category',
  '#3B82F6',
  372,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_372_tights',
  'Tights (Women''s)',
  '👔',
  'Tights category',
  '#3B82F6',
  373,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_373_tops',
  'Tops (Women''s)',
  '👔',
  'Tops category',
  '#3B82F6',
  374,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_374_tracksuit',
  'Tracksuit (Women''s)',
  '👔',
  'Tracksuit category',
  '#3B82F6',
  375,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_375_trousers',
  'Trousers (Women''s)',
  '👔',
  'Trousers category',
  '#3B82F6',
  376,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_376_tunic',
  'Tunic',
  '👔',
  'Tunic category',
  '#3B82F6',
  377,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_377_turkey',
  'Turkey',
  '👔',
  'Turkey category',
  '#3B82F6',
  378,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_378_two_piece_sets',
  'Two Piece Sets',
  '👔',
  'Two Piece Sets category',
  '#3B82F6',
  379,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_379_uncategorized',
  'Uncategorized (Women''s)',
  '👔',
  'Uncategorized category',
  '#3B82F6',
  380,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_380_underwear',
  'Underwear (Women''s)',
  '👔',
  'Underwear category',
  '#3B82F6',
  381,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_381_vest',
  'Vest (Women''s)',
  '👔',
  'Vest category',
  '#3B82F6',
  382,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_382_vests',
  'Vests (Women''s)',
  '👔',
  'Vests category',
  '#3B82F6',
  383,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_383_wallet',
  'Wallet (Women''s)',
  '👔',
  'Wallet category',
  '#3B82F6',
  384,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_384_watch',
  'Watch (Women''s)',
  '👔',
  'Watch category',
  '#3B82F6',
  385,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_385_wedding',
  'Wedding',
  '👔',
  'Wedding category',
  '#3B82F6',
  386,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'category_clothing_386_with_sleeves',
  'With Sleeves',
  '👔',
  'With Sleeves category',
  '#3B82F6',
  387,
  'domain_clothing_womens',
  'clothing',
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- INVENTORY SUBCATEGORIES
-- ============================================================================

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_0_anklet',
  'Anklet',
  'category_clothing_245_accessories',
  NULL,
  'Anklet subcategory',
  1,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_1_aviator_sunglasses',
  'Aviator Sunglasses',
  'category_clothing_245_accessories',
  NULL,
  'Aviator Sunglasses subcategory',
  2,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_2_bandana',
  'Bandana',
  'category_clothing_245_accessories',
  NULL,
  'Bandana subcategory',
  3,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_3_basic_belt',
  'Basic Belt',
  'category_clothing_245_accessories',
  NULL,
  'Basic Belt subcategory',
  4,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_4_beach_bag',
  'Beach Bag',
  'category_clothing_245_accessories',
  NULL,
  'Beach Bag subcategory',
  5,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_5_body_jewellery',
  'Body Jewellery',
  'category_clothing_245_accessories',
  NULL,
  'Body Jewellery subcategory',
  6,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_6_bracelet',
  'Bracelet',
  'category_clothing_245_accessories',
  NULL,
  'Bracelet subcategory',
  7,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_7_bum_bag',
  'Bum Bag',
  'category_clothing_245_accessories',
  NULL,
  'Bum Bag subcategory',
  8,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_8_cat_eye_sunglasses',
  'Cat Eye Sunglasses',
  'category_clothing_245_accessories',
  NULL,
  'Cat Eye Sunglasses subcategory',
  9,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_9_chain_belt',
  'Chain Belt',
  'category_clothing_245_accessories',
  NULL,
  'Chain Belt subcategory',
  10,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_10_choker',
  'Choker',
  'category_clothing_245_accessories',
  NULL,
  'Choker subcategory',
  11,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_11_clutch',
  'Clutch',
  'category_clothing_245_accessories',
  NULL,
  'Clutch subcategory',
  12,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_12_corset_belt',
  'Corset Belt',
  'category_clothing_245_accessories',
  NULL,
  'Corset Belt subcategory',
  13,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_13_cross_body_bag',
  'Cross Body Bag',
  'category_clothing_245_accessories',
  NULL,
  'Cross Body Bag subcategory',
  14,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_14_fedora',
  'Fedora',
  'category_clothing_245_accessories',
  NULL,
  'Fedora subcategory',
  15,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_15_gloves',
  'Gloves',
  'category_clothing_245_accessories',
  NULL,
  'Gloves subcategory',
  16,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_16_hair_clips',
  'Hair Clips',
  'category_clothing_245_accessories',
  NULL,
  'Hair Clips subcategory',
  17,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_17_hair_slide',
  'Hair Slide',
  'category_clothing_245_accessories',
  NULL,
  'Hair Slide subcategory',
  18,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_18_handbag',
  'Handbag',
  'category_clothing_245_accessories',
  NULL,
  'Handbag subcategory',
  19,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_19_harness',
  'Harness',
  'category_clothing_245_accessories',
  NULL,
  'Harness subcategory',
  20,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_20_head_scarf',
  'Head Scarf',
  'category_clothing_245_accessories',
  NULL,
  'Head Scarf subcategory',
  21,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_21_headband',
  'Headband',
  'category_clothing_245_accessories',
  NULL,
  'Headband subcategory',
  22,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_22_jean_belt',
  'Jean Belt',
  'category_clothing_245_accessories',
  NULL,
  'Jean Belt subcategory',
  23,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_23_mini_bag',
  'Mini Bag',
  'category_clothing_245_accessories',
  NULL,
  'Mini Bag subcategory',
  24,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_24_multi_pack_earrings',
  'Multi-Pack Earrings',
  'category_clothing_245_accessories',
  NULL,
  'Multi-Pack Earrings subcategory',
  25,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_25_necklace',
  'Necklace',
  'category_clothing_245_accessories',
  NULL,
  'Necklace subcategory',
  26,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_26_novelty_headband',
  'Novelty Headband',
  'category_clothing_245_accessories',
  NULL,
  'Novelty Headband subcategory',
  27,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_27_oversized_sunglasses',
  'Oversized Sunglasses',
  'category_clothing_245_accessories',
  NULL,
  'Oversized Sunglasses subcategory',
  28,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_28_phone_case',
  'Phone Case',
  'category_clothing_245_accessories',
  NULL,
  'Phone Case subcategory',
  29,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_29_readers',
  'Readers',
  'category_clothing_245_accessories',
  NULL,
  'Readers subcategory',
  30,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_30_retro_sunglasses',
  'Retro Sunglasses',
  'category_clothing_245_accessories',
  NULL,
  'Retro Sunglasses subcategory',
  31,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_31_ring',
  'Ring',
  'category_clothing_245_accessories',
  NULL,
  'Ring subcategory',
  32,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_32_round_sunglasses',
  'Round Sunglasses',
  'category_clothing_245_accessories',
  NULL,
  'Round Sunglasses subcategory',
  33,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_33_rucksack',
  'Rucksack',
  'category_clothing_245_accessories',
  NULL,
  'Rucksack subcategory',
  34,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_34_scrunchie',
  'Scrunchie',
  'category_clothing_245_accessories',
  NULL,
  'Scrunchie subcategory',
  35,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_35_shopper',
  'Shopper',
  'category_clothing_245_accessories',
  NULL,
  'Shopper subcategory',
  36,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_36_shoulder_bag',
  'Shoulder Bag',
  'category_clothing_245_accessories',
  NULL,
  'Shoulder Bag subcategory',
  37,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_37_square_sunglasses',
  'Square Sunglasses',
  'category_clothing_245_accessories',
  NULL,
  'Square Sunglasses subcategory',
  38,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_38_statement_earrings',
  'Statement Earrings',
  'category_clothing_245_accessories',
  NULL,
  'Statement Earrings subcategory',
  39,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_39_taping_belt',
  'Taping Belt',
  'category_clothing_245_accessories',
  NULL,
  'Taping Belt subcategory',
  40,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_40_tote_bag',
  'Tote Bag',
  'category_clothing_245_accessories',
  NULL,
  'Tote Bag subcategory',
  41,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_41_turban',
  'Turban',
  'category_clothing_245_accessories',
  NULL,
  'Turban subcategory',
  42,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_42_visor_sunglasses',
  'Visor Sunglasses',
  'category_clothing_245_accessories',
  NULL,
  'Visor Sunglasses subcategory',
  43,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_43_waist_belt',
  'Waist Belt',
  'category_clothing_245_accessories',
  NULL,
  'Waist Belt subcategory',
  44,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_44_western_belt',
  'Western Belt',
  'category_clothing_245_accessories',
  NULL,
  'Western Belt subcategory',
  45,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_45_leggings',
  'Leggings',
  'category_clothing_247_activewear',
  NULL,
  'Leggings subcategory',
  46,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_46_long_sleeve_top',
  'Long Sleeve Top',
  'category_clothing_247_activewear',
  NULL,
  'Long Sleeve Top subcategory',
  47,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_47_skirt',
  'Skirt',
  'category_clothing_247_activewear',
  NULL,
  'Skirt subcategory',
  48,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_48_sports_jacket',
  'Sports Jacket',
  'category_clothing_247_activewear',
  NULL,
  'Sports Jacket subcategory',
  49,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_49_t_shirt',
  'T-Shirt',
  'category_clothing_247_activewear',
  NULL,
  'T-Shirt subcategory',
  50,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_50_vest',
  'Vest',
  'category_clothing_247_activewear',
  NULL,
  'Vest subcategory',
  51,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_51_cargo_skirt',
  'Cargo Skirt',
  'category_clothing_260_bottoms',
  NULL,
  'Cargo Skirt subcategory',
  52,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_52_flares',
  'Flares',
  'category_clothing_260_bottoms',
  NULL,
  'Flares subcategory',
  53,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_53_floaty_shorts',
  'Floaty Shorts',
  'category_clothing_260_bottoms',
  NULL,
  'Floaty Shorts subcategory',
  54,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_54_hot_pant',
  'Hot Pant',
  'category_clothing_260_bottoms',
  NULL,
  'Hot Pant subcategory',
  55,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_55_maxi_skirt',
  'Maxi Skirt',
  'category_clothing_260_bottoms',
  NULL,
  'Maxi Skirt subcategory',
  56,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_56_midaxi_skirt',
  'Midaxi Skirt',
  'category_clothing_260_bottoms',
  NULL,
  'Midaxi Skirt subcategory',
  57,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_57_midi_skirt',
  'Midi Skirt',
  'category_clothing_260_bottoms',
  NULL,
  'Midi Skirt subcategory',
  58,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_58_mini_skirt',
  'Mini Skirt',
  'category_clothing_260_bottoms',
  NULL,
  'Mini Skirt subcategory',
  59,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_59_runner_shorts',
  'Runner Shorts',
  'category_clothing_260_bottoms',
  NULL,
  'Runner Shorts subcategory',
  60,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_60_skater_skirt',
  'Skater Skirt',
  'category_clothing_260_bottoms',
  NULL,
  'Skater Skirt subcategory',
  61,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_61_skinny_trousers',
  'Skinny Trousers',
  'category_clothing_260_bottoms',
  NULL,
  'Skinny Trousers subcategory',
  62,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_62_skorts',
  'Skorts',
  'category_clothing_260_bottoms',
  NULL,
  'Skorts subcategory',
  63,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_63_straight_leg_trousers',
  'Straight Leg Trousers',
  'category_clothing_260_bottoms',
  NULL,
  'Straight Leg Trousers subcategory',
  64,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_64_wide_leg_trousers',
  'Wide Leg Trousers',
  'category_clothing_260_bottoms',
  NULL,
  'Wide Leg Trousers subcategory',
  65,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_65_bandeau',
  'Bandeau',
  'category_clothing_272_co_ords',
  NULL,
  'Bandeau subcategory',
  66,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_66_blazer',
  'Blazer',
  'category_clothing_272_co_ords',
  NULL,
  'Blazer subcategory',
  67,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_67_blouse',
  'Blouse',
  'category_clothing_272_co_ords',
  NULL,
  'Blouse subcategory',
  68,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_68_bodysuit',
  'Bodysuit',
  'category_clothing_272_co_ords',
  NULL,
  'Bodysuit subcategory',
  69,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_69_bralet',
  'Bralet',
  'category_clothing_272_co_ords',
  NULL,
  'Bralet subcategory',
  70,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_70_cami',
  'Cami',
  'category_clothing_272_co_ords',
  NULL,
  'Cami subcategory',
  71,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_71_casual_jacket',
  'Casual Jacket',
  'category_clothing_272_co_ords',
  NULL,
  'Casual Jacket subcategory',
  72,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_72_corset',
  'Corset',
  'category_clothing_272_co_ords',
  NULL,
  'Corset subcategory',
  73,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_73_crop_top',
  'Crop Top',
  'category_clothing_272_co_ords',
  NULL,
  'Crop Top subcategory',
  74,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_74_flares',
  'Flares',
  'category_clothing_272_co_ords',
  NULL,
  'Flares subcategory',
  75,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_75_floaty_shorts',
  'Floaty Shorts',
  'category_clothing_272_co_ords',
  NULL,
  'Floaty Shorts subcategory',
  76,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_76_hoodie',
  'Hoodie',
  'category_clothing_272_co_ords',
  NULL,
  'Hoodie subcategory',
  77,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_77_hot_pant',
  'Hot Pant',
  'category_clothing_272_co_ords',
  NULL,
  'Hot Pant subcategory',
  78,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_78_long_top',
  'Long Top',
  'category_clothing_272_co_ords',
  NULL,
  'Long Top subcategory',
  79,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_79_maxi_skirt',
  'Maxi Skirt',
  'category_clothing_272_co_ords',
  NULL,
  'Maxi Skirt subcategory',
  80,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_80_midaxi_skirt',
  'Midaxi Skirt',
  'category_clothing_272_co_ords',
  NULL,
  'Midaxi Skirt subcategory',
  81,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_81_midi_skirt',
  'Midi Skirt',
  'category_clothing_272_co_ords',
  NULL,
  'Midi Skirt subcategory',
  82,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_82_mini_skirt',
  'Mini Skirt',
  'category_clothing_272_co_ords',
  NULL,
  'Mini Skirt subcategory',
  83,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_83_runner_shorts',
  'Runner Shorts',
  'category_clothing_272_co_ords',
  NULL,
  'Runner Shorts subcategory',
  84,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_84_shirt',
  'Shirt',
  'category_clothing_272_co_ords',
  NULL,
  'Shirt subcategory',
  85,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_85_straight_leg_trousers',
  'Straight Leg Trousers',
  'category_clothing_272_co_ords',
  NULL,
  'Straight Leg Trousers subcategory',
  86,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_86_t_shirt',
  'T-Shirt',
  'category_clothing_272_co_ords',
  NULL,
  'T-Shirt subcategory',
  87,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_87_tailored_shorts',
  'Tailored Shorts',
  'category_clothing_272_co_ords',
  NULL,
  'Tailored Shorts subcategory',
  88,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_88_vest',
  'Vest',
  'category_clothing_272_co_ords',
  NULL,
  'Vest subcategory',
  89,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_89_wide_leg_trousers',
  'Wide Leg Trousers',
  'category_clothing_272_co_ords',
  NULL,
  'Wide Leg Trousers subcategory',
  90,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_90_cropped_denim_jacket',
  'Cropped Denim Jacket',
  'category_clothing_277_denim',
  NULL,
  'Cropped Denim Jacket subcategory',
  91,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_91_denim_day_dress',
  'Denim Day Dress',
  'category_clothing_277_denim',
  NULL,
  'Denim Day Dress subcategory',
  92,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_92_denim_evening_dress',
  'Denim Evening Dress',
  'category_clothing_277_denim',
  NULL,
  'Denim Evening Dress subcategory',
  93,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_93_denim_maxi_skirt',
  'Denim Maxi Skirt',
  'category_clothing_277_denim',
  NULL,
  'Denim Maxi Skirt subcategory',
  94,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_94_denim_midi_skirt',
  'Denim Midi Skirt',
  'category_clothing_277_denim',
  NULL,
  'Denim Midi Skirt subcategory',
  95,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_95_denim_mini_skirt',
  'Denim Mini Skirt',
  'category_clothing_277_denim',
  NULL,
  'Denim Mini Skirt subcategory',
  96,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_96_denim_shirt',
  'Denim Shirt',
  'category_clothing_277_denim',
  NULL,
  'Denim Shirt subcategory',
  97,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_97_denim_shorts',
  'Denim Shorts',
  'category_clothing_277_denim',
  NULL,
  'Denim Shorts subcategory',
  98,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_98_denim_top',
  'Denim Top',
  'category_clothing_277_denim',
  NULL,
  'Denim Top subcategory',
  99,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_99_flared_jeans',
  'Flared Jeans',
  'category_clothing_277_denim',
  NULL,
  'Flared Jeans subcategory',
  100,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_100_longline_denim_jacket',
  'Longline Denim Jacket',
  'category_clothing_277_denim',
  NULL,
  'Longline Denim Jacket subcategory',
  101,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_101_oversized_denim_jacket',
  'Oversized denim jacket',
  'category_clothing_277_denim',
  NULL,
  'Oversized denim jacket subcategory',
  102,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_102_split_hem_jeans',
  'Split Hem Jeans',
  'category_clothing_277_denim',
  NULL,
  'Split Hem Jeans subcategory',
  103,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_103_straight_jeans',
  'Straight Jeans',
  'category_clothing_277_denim',
  NULL,
  'Straight Jeans subcategory',
  104,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_104_wide_leg_jeans',
  'Wide Leg Jeans',
  'category_clothing_277_denim',
  NULL,
  'Wide Leg Jeans subcategory',
  105,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_105_blazer_dress',
  'Blazer Dress',
  'category_clothing_280_dresses',
  NULL,
  'Blazer Dress subcategory',
  106,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_106_bodycon_dress',
  'Bodycon Dress',
  'category_clothing_280_dresses',
  NULL,
  'Bodycon Dress subcategory',
  107,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_107_jumper_dress',
  'Jumper Dress',
  'category_clothing_280_dresses',
  NULL,
  'Jumper Dress subcategory',
  108,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_108_maxi_dress',
  'Maxi Dress',
  'category_clothing_280_dresses',
  NULL,
  'Maxi Dress subcategory',
  109,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_109_midi_dress',
  'Midi Dress',
  'category_clothing_280_dresses',
  NULL,
  'Midi Dress subcategory',
  110,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_110_shift_dress',
  'Shift Dress',
  'category_clothing_280_dresses',
  NULL,
  'Shift Dress subcategory',
  111,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_111_shirt_dress',
  'Shirt Dress',
  'category_clothing_280_dresses',
  NULL,
  'Shirt Dress subcategory',
  112,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_112_skater_dress',
  'Skater Dress',
  'category_clothing_280_dresses',
  NULL,
  'Skater Dress subcategory',
  113,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_113_smock_dress',
  'Smock Dress',
  'category_clothing_280_dresses',
  NULL,
  'Smock Dress subcategory',
  114,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_114_swing_dress',
  'Swing Dress',
  'category_clothing_280_dresses',
  NULL,
  'Swing Dress subcategory',
  115,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_115_t_shirt_dress',
  'T-Shirt Dress',
  'category_clothing_280_dresses',
  NULL,
  'T-Shirt Dress subcategory',
  116,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_116_tea_dress',
  'Tea Dress',
  'category_clothing_280_dresses',
  NULL,
  'Tea Dress subcategory',
  117,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_117_ankle_boots',
  'Ankle Boots',
  'category_clothing_288_footwear',
  NULL,
  'Ankle Boots subcategory',
  118,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_118_ballet_loafer_pumps',
  'Ballet Loafer Pumps',
  'category_clothing_288_footwear',
  NULL,
  'Ballet Loafer Pumps subcategory',
  119,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_119_biker_hiker_ankle_boots',
  'Biker Hiker Ankle Boots',
  'category_clothing_288_footwear',
  NULL,
  'Biker Hiker Ankle Boots subcategory',
  120,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_120_court_shoes',
  'Court Shoes',
  'category_clothing_288_footwear',
  NULL,
  'Court Shoes subcategory',
  121,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_121_espadrilles',
  'Espadrilles',
  'category_clothing_288_footwear',
  NULL,
  'Espadrilles subcategory',
  122,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_122_flip_flops',
  'Flip-Flops',
  'category_clothing_288_footwear',
  NULL,
  'Flip-Flops subcategory',
  123,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_123_heeled_ankle_boots',
  'Heeled Ankle Boots',
  'category_clothing_288_footwear',
  NULL,
  'Heeled Ankle Boots subcategory',
  124,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_124_heeled_mules',
  'Heeled Mules',
  'category_clothing_288_footwear',
  NULL,
  'Heeled Mules subcategory',
  125,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_125_heeled_sandals',
  'Heeled Sandals',
  'category_clothing_288_footwear',
  NULL,
  'Heeled Sandals subcategory',
  126,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_126_knee_high_boots',
  'Knee High Boots',
  'category_clothing_288_footwear',
  NULL,
  'Knee High Boots subcategory',
  127,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_127_mules',
  'Mules',
  'category_clothing_288_footwear',
  NULL,
  'Mules subcategory',
  128,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_128_over_the_knee_boots',
  'Over The Knee Boots',
  'category_clothing_288_footwear',
  NULL,
  'Over The Knee Boots subcategory',
  129,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_129_platform_heeled_sandals',
  'Platform Heeled Sandals',
  'category_clothing_288_footwear',
  NULL,
  'Platform Heeled Sandals subcategory',
  130,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_130_sandals',
  'Sandals',
  'category_clothing_288_footwear',
  NULL,
  'Sandals subcategory',
  131,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_131_sliders',
  'Sliders',
  'category_clothing_288_footwear',
  NULL,
  'Sliders subcategory',
  132,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_132_trainers',
  'Trainers',
  'category_clothing_288_footwear',
  NULL,
  'Trainers subcategory',
  133,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_133_wedges',
  'Wedges',
  'category_clothing_288_footwear',
  NULL,
  'Wedges subcategory',
  134,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_134_wellies',
  'Wellies',
  'category_clothing_288_footwear',
  NULL,
  'Wellies subcategory',
  135,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_135_wide_fit_boots',
  'Wide Fit Boots',
  'category_clothing_288_footwear',
  NULL,
  'Wide Fit Boots subcategory',
  136,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_136_wide_fit_flats',
  'Wide Fit Flats',
  'category_clothing_288_footwear',
  NULL,
  'Wide Fit Flats subcategory',
  137,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_137_wide_fit_heels',
  'Wide Fit Heels',
  'category_clothing_288_footwear',
  NULL,
  'Wide Fit Heels subcategory',
  138,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_138_beauty_box',
  'Beauty Box',
  'category_clothing_299_home_beauty',
  NULL,
  'Beauty Box subcategory',
  139,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_139_bedding',
  'Bedding',
  'category_clothing_299_home_beauty',
  NULL,
  'Bedding subcategory',
  140,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_140_blusher',
  'Blusher',
  'category_clothing_299_home_beauty',
  NULL,
  'Blusher subcategory',
  141,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_141_body_glitter',
  'Body Glitter',
  'category_clothing_299_home_beauty',
  NULL,
  'Body Glitter subcategory',
  142,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_142_body_moisturiser',
  'Body Moisturiser',
  'category_clothing_299_home_beauty',
  NULL,
  'Body Moisturiser subcategory',
  143,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_143_books',
  'Books',
  'category_clothing_299_home_beauty',
  NULL,
  'Books subcategory',
  144,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_144_bronzer',
  'Bronzer',
  'category_clothing_299_home_beauty',
  NULL,
  'Bronzer subcategory',
  145,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_145_candle',
  'Candle',
  'category_clothing_299_home_beauty',
  NULL,
  'Candle subcategory',
  146,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_146_concealer',
  'Concealer',
  'category_clothing_299_home_beauty',
  NULL,
  'Concealer subcategory',
  147,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_147_cushions',
  'Cushions',
  'category_clothing_299_home_beauty',
  NULL,
  'Cushions subcategory',
  148,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_148_eye_brow_pencil',
  'Eye Brow Pencil',
  'category_clothing_299_home_beauty',
  NULL,
  'Eye Brow Pencil subcategory',
  149,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_149_eye_brow_wax',
  'Eye Brow Wax',
  'category_clothing_299_home_beauty',
  NULL,
  'Eye Brow Wax subcategory',
  150,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_150_eye_cream_serum',
  'Eye Cream Serum',
  'category_clothing_299_home_beauty',
  NULL,
  'Eye Cream Serum subcategory',
  151,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_151_eyelashes',
  'Eyelashes',
  'category_clothing_299_home_beauty',
  NULL,
  'Eyelashes subcategory',
  152,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_152_eyeliner',
  'Eyeliner',
  'category_clothing_299_home_beauty',
  NULL,
  'Eyeliner subcategory',
  153,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_153_eyeshadow',
  'Eyeshadow',
  'category_clothing_299_home_beauty',
  NULL,
  'Eyeshadow subcategory',
  154,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_154_face_paints',
  'Face Paints',
  'category_clothing_299_home_beauty',
  NULL,
  'Face Paints subcategory',
  155,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_155_foundation',
  'Foundation',
  'category_clothing_299_home_beauty',
  NULL,
  'Foundation subcategory',
  156,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_156_games',
  'Games',
  'category_clothing_299_home_beauty',
  NULL,
  'Games subcategory',
  157,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_157_glassware',
  'Glassware',
  'category_clothing_299_home_beauty',
  NULL,
  'Glassware subcategory',
  158,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_158_hair_bobbles',
  'Hair Bobbles',
  'category_clothing_299_home_beauty',
  NULL,
  'Hair Bobbles subcategory',
  159,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_159_hair_brush',
  'Hair Brush',
  'category_clothing_299_home_beauty',
  NULL,
  'Hair Brush subcategory',
  160,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_160_hair_clips',
  'Hair Clips',
  'category_clothing_299_home_beauty',
  NULL,
  'Hair Clips subcategory',
  161,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_161_hair_dye',
  'Hair Dye',
  'category_clothing_299_home_beauty',
  NULL,
  'Hair Dye subcategory',
  162,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_162_hair_extensions',
  'Hair Extensions',
  'category_clothing_299_home_beauty',
  NULL,
  'Hair Extensions subcategory',
  163,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_163_hair_masks',
  'Hair Masks',
  'category_clothing_299_home_beauty',
  NULL,
  'Hair Masks subcategory',
  164,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_164_hair_spray',
  'Hair Spray',
  'category_clothing_299_home_beauty',
  NULL,
  'Hair Spray subcategory',
  165,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_165_heat_protection_spray',
  'Heat Protection Spray',
  'category_clothing_299_home_beauty',
  NULL,
  'Heat Protection Spray subcategory',
  166,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_166_highlighter',
  'Highlighter',
  'category_clothing_299_home_beauty',
  NULL,
  'Highlighter subcategory',
  167,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_167_leave_in_treatments',
  'Leave In Treatments',
  'category_clothing_299_home_beauty',
  NULL,
  'Leave In Treatments subcategory',
  168,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_168_lighting',
  'Lighting',
  'category_clothing_299_home_beauty',
  NULL,
  'Lighting subcategory',
  169,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_169_lip_gloss',
  'Lip Gloss',
  'category_clothing_299_home_beauty',
  NULL,
  'Lip Gloss subcategory',
  170,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_170_lip_kits',
  'Lip Kits',
  'category_clothing_299_home_beauty',
  NULL,
  'Lip Kits subcategory',
  171,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_171_lip_liner',
  'Lip Liner',
  'category_clothing_299_home_beauty',
  NULL,
  'Lip Liner subcategory',
  172,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_172_lip_mask',
  'Lip Mask',
  'category_clothing_299_home_beauty',
  NULL,
  'Lip Mask subcategory',
  173,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_173_lip_oil',
  'Lip Oil',
  'category_clothing_299_home_beauty',
  NULL,
  'Lip Oil subcategory',
  174,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_174_lip_plumper',
  'Lip Plumper',
  'category_clothing_299_home_beauty',
  NULL,
  'Lip Plumper subcategory',
  175,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_175_lipsticks',
  'Lipsticks',
  'category_clothing_299_home_beauty',
  NULL,
  'Lipsticks subcategory',
  176,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_176_makeup_bags',
  'Makeup Bags',
  'category_clothing_299_home_beauty',
  NULL,
  'Makeup Bags subcategory',
  177,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_177_makeup_brush_sets',
  'Makeup Brush Sets',
  'category_clothing_299_home_beauty',
  NULL,
  'Makeup Brush Sets subcategory',
  178,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_178_makeup_brushes',
  'Makeup Brushes',
  'category_clothing_299_home_beauty',
  NULL,
  'Makeup Brushes subcategory',
  179,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_179_makeup_headbands',
  'Makeup Headbands',
  'category_clothing_299_home_beauty',
  NULL,
  'Makeup Headbands subcategory',
  180,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_180_makeup_organiser',
  'Makeup Organiser',
  'category_clothing_299_home_beauty',
  NULL,
  'Makeup Organiser subcategory',
  181,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_181_mascara',
  'Mascara',
  'category_clothing_299_home_beauty',
  NULL,
  'Mascara subcategory',
  182,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_182_ornament',
  'Ornament',
  'category_clothing_299_home_beauty',
  NULL,
  'Ornament subcategory',
  183,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_183_primer',
  'Primer',
  'category_clothing_299_home_beauty',
  NULL,
  'Primer subcategory',
  184,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_184_rugs_mats',
  'Rugs Mats',
  'category_clothing_299_home_beauty',
  NULL,
  'Rugs Mats subcategory',
  185,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_185_serum',
  'Serum',
  'category_clothing_299_home_beauty',
  NULL,
  'Serum subcategory',
  186,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_186_setting_sprays_and_powders',
  'Setting Sprays and powders',
  'category_clothing_299_home_beauty',
  NULL,
  'Setting Sprays and powders subcategory',
  187,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_187_shampoo_conditioner',
  'Shampoo & Conditioner',
  'category_clothing_299_home_beauty',
  NULL,
  'Shampoo & Conditioner subcategory',
  188,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_188_spf_lip_balms',
  'SPF Lip Balms',
  'category_clothing_299_home_beauty',
  NULL,
  'SPF Lip Balms subcategory',
  189,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_189_spf_lotion',
  'SPF Lotion',
  'category_clothing_299_home_beauty',
  NULL,
  'SPF Lotion subcategory',
  190,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_190_sponges',
  'Sponges',
  'category_clothing_299_home_beauty',
  NULL,
  'Sponges subcategory',
  191,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_191_straighteners',
  'Straighteners',
  'category_clothing_299_home_beauty',
  NULL,
  'Straighteners subcategory',
  192,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_192_tableware',
  'Tableware',
  'category_clothing_299_home_beauty',
  NULL,
  'Tableware subcategory',
  193,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_193_tan_remover',
  'Tan Remover',
  'category_clothing_299_home_beauty',
  NULL,
  'Tan Remover subcategory',
  194,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_194_tanning_brush',
  'Tanning Brush',
  'category_clothing_299_home_beauty',
  NULL,
  'Tanning Brush subcategory',
  195,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_195_tanning_drops',
  'Tanning Drops',
  'category_clothing_299_home_beauty',
  NULL,
  'Tanning Drops subcategory',
  196,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_196_tanning_mousse',
  'Tanning Mousse',
  'category_clothing_299_home_beauty',
  NULL,
  'Tanning Mousse subcategory',
  197,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_197_tanning_oil',
  'Tanning Oil',
  'category_clothing_299_home_beauty',
  NULL,
  'Tanning Oil subcategory',
  198,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_198_tanning_serums',
  'Tanning Serums',
  'category_clothing_299_home_beauty',
  NULL,
  'Tanning Serums subcategory',
  199,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_199_throws',
  'Throws',
  'category_clothing_299_home_beauty',
  NULL,
  'Throws subcategory',
  200,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_200_water_bottle',
  'Water Bottle',
  'category_clothing_299_home_beauty',
  NULL,
  'Water Bottle subcategory',
  201,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_201_wax_melt',
  'Wax Melt',
  'category_clothing_299_home_beauty',
  NULL,
  'Wax Melt subcategory',
  202,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_202_jumpsuit',
  'Jumpsuit',
  'category_clothing_311_jumpsuits_playsuits',
  NULL,
  'Jumpsuit subcategory',
  203,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_203_playsuit',
  'Playsuit',
  'category_clothing_311_jumpsuits_playsuits',
  NULL,
  'Playsuit subcategory',
  204,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_204_unitard',
  'Unitard',
  'category_clothing_311_jumpsuits_playsuits',
  NULL,
  'Unitard subcategory',
  205,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_205_bandeau',
  'Bandeau',
  'category_clothing_313_knitwear',
  NULL,
  'Bandeau subcategory',
  206,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_206_beach_dress',
  'Beach Dress',
  'category_clothing_313_knitwear',
  NULL,
  'Beach Dress subcategory',
  207,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_207_bodycon_dress',
  'Bodycon Dress',
  'category_clothing_313_knitwear',
  NULL,
  'Bodycon Dress subcategory',
  208,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_208_bodysuit',
  'Bodysuit',
  'category_clothing_313_knitwear',
  NULL,
  'Bodysuit subcategory',
  209,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_209_bralet',
  'Bralet',
  'category_clothing_313_knitwear',
  NULL,
  'Bralet subcategory',
  210,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_210_crop_jumper',
  'Crop Jumper',
  'category_clothing_313_knitwear',
  NULL,
  'Crop Jumper subcategory',
  211,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_211_crop_top',
  'Crop Top',
  'category_clothing_313_knitwear',
  NULL,
  'Crop Top subcategory',
  212,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_212_jumper_dress',
  'Jumper Dress',
  'category_clothing_313_knitwear',
  NULL,
  'Jumper Dress subcategory',
  213,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_213_knitted_shorts',
  'Knitted Shorts',
  'category_clothing_313_knitwear',
  NULL,
  'Knitted Shorts subcategory',
  214,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_214_knitted_skirt',
  'Knitted Skirt',
  'category_clothing_313_knitwear',
  NULL,
  'Knitted Skirt subcategory',
  215,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_215_knitted_trousers',
  'Knitted Trousers',
  'category_clothing_313_knitwear',
  NULL,
  'Knitted Trousers subcategory',
  216,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_216_long_top',
  'Long Top',
  'category_clothing_313_knitwear',
  NULL,
  'Long Top subcategory',
  217,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_217_maxi_cardigan',
  'Maxi Cardigan',
  'category_clothing_313_knitwear',
  NULL,
  'Maxi Cardigan subcategory',
  218,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_218_maxi_dress',
  'Maxi Dress',
  'category_clothing_313_knitwear',
  NULL,
  'Maxi Dress subcategory',
  219,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_219_midi_cardigan',
  'Midi Cardigan',
  'category_clothing_313_knitwear',
  NULL,
  'Midi Cardigan subcategory',
  220,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_220_midi_dress',
  'Midi Dress',
  'category_clothing_313_knitwear',
  NULL,
  'Midi Dress subcategory',
  221,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_221_vest',
  'Vest',
  'category_clothing_313_knitwear',
  NULL,
  'Vest subcategory',
  222,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_222_bodysuit',
  'Bodysuit',
  'category_clothing_317_lingerie_nightwear',
  NULL,
  'Bodysuit subcategory',
  223,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_223_bra',
  'Bra',
  'category_clothing_317_lingerie_nightwear',
  NULL,
  'Bra subcategory',
  224,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_224_corset',
  'Corset',
  'category_clothing_317_lingerie_nightwear',
  NULL,
  'Corset subcategory',
  225,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_225_pyjama_trouser_set',
  'Pyjama Trouser Set',
  'category_clothing_317_lingerie_nightwear',
  NULL,
  'Pyjama Trouser Set subcategory',
  226,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_226_shapewear',
  'Shapewear',
  'category_clothing_317_lingerie_nightwear',
  NULL,
  'Shapewear subcategory',
  227,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_227_2_piece',
  '2 Piece',
  'category_clothing_319_maternity',
  NULL,
  '2 Piece subcategory',
  228,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_228_beach_dress',
  'Beach Dress',
  'category_clothing_319_maternity',
  NULL,
  'Beach Dress subcategory',
  229,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_229_bikini_top',
  'Bikini Top',
  'category_clothing_319_maternity',
  NULL,
  'Bikini Top subcategory',
  230,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_230_blouse',
  'Blouse',
  'category_clothing_319_maternity',
  NULL,
  'Blouse subcategory',
  231,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_231_bodycon_dress',
  'Bodycon Dress',
  'category_clothing_319_maternity',
  NULL,
  'Bodycon Dress subcategory',
  232,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_232_bodysuit',
  'Bodysuit',
  'category_clothing_319_maternity',
  NULL,
  'Bodysuit subcategory',
  233,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_233_bra',
  'Bra',
  'category_clothing_319_maternity',
  NULL,
  'Bra subcategory',
  234,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_234_cami',
  'Cami',
  'category_clothing_319_maternity',
  NULL,
  'Cami subcategory',
  235,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_235_casual_jacket',
  'Casual Jacket',
  'category_clothing_319_maternity',
  NULL,
  'Casual Jacket subcategory',
  236,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_236_crop_cardigan',
  'Crop Cardigan',
  'category_clothing_319_maternity',
  NULL,
  'Crop Cardigan subcategory',
  237,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_237_crop_top',
  'Crop Top',
  'category_clothing_319_maternity',
  NULL,
  'Crop Top subcategory',
  238,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_238_cycling_shorts',
  'Cycling Shorts',
  'category_clothing_319_maternity',
  NULL,
  'Cycling Shorts subcategory',
  239,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_239_denim_jumpsuits',
  'Denim Jumpsuits',
  'category_clothing_319_maternity',
  NULL,
  'Denim Jumpsuits subcategory',
  240,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_240_denim_shorts',
  'Denim Shorts',
  'category_clothing_319_maternity',
  NULL,
  'Denim Shorts subcategory',
  241,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_241_denim_top',
  'Denim Top',
  'category_clothing_319_maternity',
  NULL,
  'Denim Top subcategory',
  242,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_242_flares',
  'Flares',
  'category_clothing_319_maternity',
  NULL,
  'Flares subcategory',
  243,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_243_floaty_shorts',
  'Floaty Shorts',
  'category_clothing_319_maternity',
  NULL,
  'Floaty Shorts subcategory',
  244,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_244_hoodie',
  'Hoodie',
  'category_clothing_319_maternity',
  NULL,
  'Hoodie subcategory',
  245,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_245_hot_pant',
  'Hot Pant',
  'category_clothing_319_maternity',
  NULL,
  'Hot Pant subcategory',
  246,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_246_joggers',
  'Joggers',
  'category_clothing_319_maternity',
  NULL,
  'Joggers subcategory',
  247,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_247_jumper',
  'Jumper',
  'category_clothing_319_maternity',
  NULL,
  'Jumper subcategory',
  248,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_248_jumper_dress',
  'Jumper Dress',
  'category_clothing_319_maternity',
  NULL,
  'Jumper Dress subcategory',
  249,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_249_jumpsuit',
  'Jumpsuit',
  'category_clothing_319_maternity',
  NULL,
  'Jumpsuit subcategory',
  250,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_250_knicker',
  'Knicker',
  'category_clothing_319_maternity',
  NULL,
  'Knicker subcategory',
  251,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_251_knitted_skirt',
  'Knitted Skirt',
  'category_clothing_319_maternity',
  NULL,
  'Knitted Skirt subcategory',
  252,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_252_knitted_trousers',
  'Knitted Trousers',
  'category_clothing_319_maternity',
  NULL,
  'Knitted Trousers subcategory',
  253,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_253_leggings',
  'Leggings',
  'category_clothing_319_maternity',
  NULL,
  'Leggings subcategory',
  254,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_254_long_bottom',
  'Long Bottom',
  'category_clothing_319_maternity',
  NULL,
  'Long Bottom subcategory',
  255,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_255_long_top',
  'Long Top',
  'category_clothing_319_maternity',
  NULL,
  'Long Top subcategory',
  256,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_256_maxi_dress',
  'Maxi Dress',
  'category_clothing_319_maternity',
  NULL,
  'Maxi Dress subcategory',
  257,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_257_maxi_skirt',
  'Maxi Skirt',
  'category_clothing_319_maternity',
  NULL,
  'Maxi Skirt subcategory',
  258,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_258_midi_dress',
  'Midi Dress',
  'category_clothing_319_maternity',
  NULL,
  'Midi Dress subcategory',
  259,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_259_nightie',
  'Nightie',
  'category_clothing_319_maternity',
  NULL,
  'Nightie subcategory',
  260,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_260_playsuit',
  'Playsuit',
  'category_clothing_319_maternity',
  NULL,
  'Playsuit subcategory',
  261,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_261_pyjama_shorts_set',
  'Pyjama Shorts Set',
  'category_clothing_319_maternity',
  NULL,
  'Pyjama Shorts Set subcategory',
  262,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_262_pyjama_trouser_set',
  'Pyjama Trouser Set',
  'category_clothing_319_maternity',
  NULL,
  'Pyjama Trouser Set subcategory',
  263,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_263_shift_dress',
  'Shift Dress',
  'category_clothing_319_maternity',
  NULL,
  'Shift Dress subcategory',
  264,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_264_shirt',
  'Shirt',
  'category_clothing_319_maternity',
  NULL,
  'Shirt subcategory',
  265,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_265_short_sleeve',
  'Short Sleeve',
  'category_clothing_319_maternity',
  NULL,
  'Short Sleeve subcategory',
  266,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_266_shorts',
  'Shorts',
  'category_clothing_319_maternity',
  NULL,
  'Shorts subcategory',
  267,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_267_split_hem_jeans',
  'Split Hem Jeans',
  'category_clothing_319_maternity',
  NULL,
  'Split Hem Jeans subcategory',
  268,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_268_straight_jeans',
  'Straight Jeans',
  'category_clothing_319_maternity',
  NULL,
  'Straight Jeans subcategory',
  269,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_269_straight_leg_trousers',
  'Straight Leg Trousers',
  'category_clothing_319_maternity',
  NULL,
  'Straight Leg Trousers subcategory',
  270,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_270_sweatshirt',
  'Sweatshirt',
  'category_clothing_319_maternity',
  NULL,
  'Sweatshirt subcategory',
  271,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_271_swimsuit',
  'Swimsuit',
  'category_clothing_319_maternity',
  NULL,
  'Swimsuit subcategory',
  272,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_272_t_shirt',
  'T-Shirt',
  'category_clothing_319_maternity',
  NULL,
  'T-Shirt subcategory',
  273,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_273_unitard',
  'Unitard',
  'category_clothing_319_maternity',
  NULL,
  'Unitard subcategory',
  274,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_274_vest',
  'Vest',
  'category_clothing_319_maternity',
  NULL,
  'Vest subcategory',
  275,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_275_wide_leg_jeans',
  'Wide Leg Jeans',
  'category_clothing_319_maternity',
  NULL,
  'Wide Leg Jeans subcategory',
  276,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_276_wide_leg_trousers',
  'Wide Leg Trousers',
  'category_clothing_319_maternity',
  NULL,
  'Wide Leg Trousers subcategory',
  277,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_277_aviator_jacket',
  'Aviator Jacket',
  'category_clothing_323_outerwear',
  NULL,
  'Aviator Jacket subcategory',
  278,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_278_biker_jacket',
  'Biker Jacket',
  'category_clothing_323_outerwear',
  NULL,
  'Biker Jacket subcategory',
  279,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_279_blazer',
  'Blazer',
  'category_clothing_323_outerwear',
  NULL,
  'Blazer subcategory',
  280,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_280_bomber_jacket',
  'Bomber Jacket',
  'category_clothing_323_outerwear',
  NULL,
  'Bomber Jacket subcategory',
  281,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_281_casual_jacket',
  'Casual Jacket',
  'category_clothing_323_outerwear',
  NULL,
  'Casual Jacket subcategory',
  282,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_282_coat',
  'Coat',
  'category_clothing_323_outerwear',
  NULL,
  'Coat subcategory',
  283,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_283_cropped_puffer_jacket',
  'Cropped Puffer Jacket',
  'category_clothing_323_outerwear',
  NULL,
  'Cropped Puffer Jacket subcategory',
  284,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_284_maxi_puffer_jacket',
  'Maxi Puffer Jacket',
  'category_clothing_323_outerwear',
  NULL,
  'Maxi Puffer Jacket subcategory',
  285,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_285_puffer_gilet',
  'Puffer Gilet',
  'category_clothing_323_outerwear',
  NULL,
  'Puffer Gilet subcategory',
  286,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_286_puffer_jacket',
  'Puffer Jacket',
  'category_clothing_323_outerwear',
  NULL,
  'Puffer Jacket subcategory',
  287,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_287_ski_jackets',
  'Ski Jackets',
  'category_clothing_323_outerwear',
  NULL,
  'Ski Jackets subcategory',
  288,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_288_teddy_coat',
  'Teddy Coat',
  'category_clothing_323_outerwear',
  NULL,
  'Teddy Coat subcategory',
  289,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_289_tracksuit',
  'Tracksuit',
  'category_clothing_323_outerwear',
  NULL,
  'Tracksuit subcategory',
  290,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_290_trench_coat',
  'Trench Coat',
  'category_clothing_323_outerwear',
  NULL,
  'Trench Coat subcategory',
  291,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_291_aviator_jacket',
  'Aviator Jacket',
  'category_clothing_330_petite',
  NULL,
  'Aviator Jacket subcategory',
  292,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_292_bandeau',
  'Bandeau',
  'category_clothing_330_petite',
  NULL,
  'Bandeau subcategory',
  293,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_293_biker_jacket',
  'Biker Jacket',
  'category_clothing_330_petite',
  NULL,
  'Biker Jacket subcategory',
  294,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_294_blazer',
  'Blazer',
  'category_clothing_330_petite',
  NULL,
  'Blazer subcategory',
  295,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_295_blouse',
  'Blouse',
  'category_clothing_330_petite',
  NULL,
  'Blouse subcategory',
  296,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_296_bodycon_dress',
  'Bodycon Dress',
  'category_clothing_330_petite',
  NULL,
  'Bodycon Dress subcategory',
  297,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_297_bodysuit',
  'Bodysuit',
  'category_clothing_330_petite',
  NULL,
  'Bodysuit subcategory',
  298,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_298_bomber_jacket',
  'Bomber Jacket',
  'category_clothing_330_petite',
  NULL,
  'Bomber Jacket subcategory',
  299,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_299_boyfriend_jeans',
  'Boyfriend Jeans',
  'category_clothing_330_petite',
  NULL,
  'Boyfriend Jeans subcategory',
  300,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_300_bralet',
  'Bralet',
  'category_clothing_330_petite',
  NULL,
  'Bralet subcategory',
  301,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_301_cami',
  'Cami',
  'category_clothing_330_petite',
  NULL,
  'Cami subcategory',
  302,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_302_cargo_skirt',
  'Cargo Skirt',
  'category_clothing_330_petite',
  NULL,
  'Cargo Skirt subcategory',
  303,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_303_casual_jacket',
  'Casual Jacket',
  'category_clothing_330_petite',
  NULL,
  'Casual Jacket subcategory',
  304,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_304_coat',
  'Coat',
  'category_clothing_330_petite',
  NULL,
  'Coat subcategory',
  305,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_305_corset',
  'Corset',
  'category_clothing_330_petite',
  NULL,
  'Corset subcategory',
  306,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_306_crop_cardigan',
  'Crop Cardigan',
  'category_clothing_330_petite',
  NULL,
  'Crop Cardigan subcategory',
  307,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_307_crop_top',
  'Crop Top',
  'category_clothing_330_petite',
  NULL,
  'Crop Top subcategory',
  308,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_308_cropped_denim_jacket',
  'Cropped Denim Jacket',
  'category_clothing_330_petite',
  NULL,
  'Cropped Denim Jacket subcategory',
  309,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_309_cycling_shorts',
  'Cycling Shorts',
  'category_clothing_330_petite',
  NULL,
  'Cycling Shorts subcategory',
  310,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_310_denim_day_dress',
  'Denim Day Dress',
  'category_clothing_330_petite',
  NULL,
  'Denim Day Dress subcategory',
  311,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_311_denim_evening_dress',
  'Denim Evening Dress',
  'category_clothing_330_petite',
  NULL,
  'Denim Evening Dress subcategory',
  312,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_312_denim_jumpsuits',
  'Denim Jumpsuits',
  'category_clothing_330_petite',
  NULL,
  'Denim Jumpsuits subcategory',
  313,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_313_denim_mini_skirt',
  'Denim Mini Skirt',
  'category_clothing_330_petite',
  NULL,
  'Denim Mini Skirt subcategory',
  314,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_314_denim_shirt',
  'Denim Shirt',
  'category_clothing_330_petite',
  NULL,
  'Denim Shirt subcategory',
  315,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_315_denim_shorts',
  'Denim Shorts',
  'category_clothing_330_petite',
  NULL,
  'Denim Shorts subcategory',
  316,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_316_denim_top',
  'Denim Top',
  'category_clothing_330_petite',
  NULL,
  'Denim Top subcategory',
  317,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_317_faux_fur_coat',
  'Faux Fur Coat',
  'category_clothing_330_petite',
  NULL,
  'Faux Fur Coat subcategory',
  318,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_318_flared_jeans',
  'Flared Jeans',
  'category_clothing_330_petite',
  NULL,
  'Flared Jeans subcategory',
  319,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_319_flares',
  'Flares',
  'category_clothing_330_petite',
  NULL,
  'Flares subcategory',
  320,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_320_gilet',
  'Gilet',
  'category_clothing_330_petite',
  NULL,
  'Gilet subcategory',
  321,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_321_hoodie',
  'Hoodie',
  'category_clothing_330_petite',
  NULL,
  'Hoodie subcategory',
  322,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_322_hot_pant',
  'Hot Pant',
  'category_clothing_330_petite',
  NULL,
  'Hot Pant subcategory',
  323,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_323_joggers',
  'Joggers',
  'category_clothing_330_petite',
  NULL,
  'Joggers subcategory',
  324,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_324_jumper',
  'Jumper',
  'category_clothing_330_petite',
  NULL,
  'Jumper subcategory',
  325,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_325_jumper_dress',
  'Jumper Dress',
  'category_clothing_330_petite',
  NULL,
  'Jumper Dress subcategory',
  326,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_326_jumpsuit',
  'Jumpsuit',
  'category_clothing_330_petite',
  NULL,
  'Jumpsuit subcategory',
  327,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_327_knitted_shorts',
  'Knitted Shorts',
  'category_clothing_330_petite',
  NULL,
  'Knitted Shorts subcategory',
  328,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_328_knitted_skirt',
  'Knitted Skirt',
  'category_clothing_330_petite',
  NULL,
  'Knitted Skirt subcategory',
  329,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_329_knitted_trousers',
  'Knitted Trousers',
  'category_clothing_330_petite',
  NULL,
  'Knitted Trousers subcategory',
  330,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_330_leggings',
  'Leggings',
  'category_clothing_330_petite',
  NULL,
  'Leggings subcategory',
  331,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_331_long_top',
  'Long Top',
  'category_clothing_330_petite',
  NULL,
  'Long Top subcategory',
  332,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_332_maxi_dress',
  'Maxi Dress',
  'category_clothing_330_petite',
  NULL,
  'Maxi Dress subcategory',
  333,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_333_maxi_puffer_jacket',
  'Maxi Puffer Jacket',
  'category_clothing_330_petite',
  NULL,
  'Maxi Puffer Jacket subcategory',
  334,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_334_maxi_skirt',
  'Maxi Skirt',
  'category_clothing_330_petite',
  NULL,
  'Maxi Skirt subcategory',
  335,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_335_midi_dress',
  'Midi Dress',
  'category_clothing_330_petite',
  NULL,
  'Midi Dress subcategory',
  336,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_336_mini_skirt',
  'Mini Skirt',
  'category_clothing_330_petite',
  NULL,
  'Mini Skirt subcategory',
  337,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_337_mom_jeans',
  'Mom Jeans',
  'category_clothing_330_petite',
  NULL,
  'Mom Jeans subcategory',
  338,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_338_oversized_denim_jacket',
  'Oversized denim jacket',
  'category_clothing_330_petite',
  NULL,
  'Oversized denim jacket subcategory',
  339,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_339_playsuit',
  'Playsuit',
  'category_clothing_330_petite',
  NULL,
  'Playsuit subcategory',
  340,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_340_puffer_jacket',
  'Puffer Jacket',
  'category_clothing_330_petite',
  NULL,
  'Puffer Jacket subcategory',
  341,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_341_regular_fit_denim_jacket',
  'Regular fit denim jacket',
  'category_clothing_330_petite',
  NULL,
  'Regular fit denim jacket subcategory',
  342,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_342_runner_shorts',
  'Runner Shorts',
  'category_clothing_330_petite',
  NULL,
  'Runner Shorts subcategory',
  343,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_343_shift_dress',
  'Shift Dress',
  'category_clothing_330_petite',
  NULL,
  'Shift Dress subcategory',
  344,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_344_skater_dress',
  'Skater Dress',
  'category_clothing_330_petite',
  NULL,
  'Skater Dress subcategory',
  345,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_345_skinny_jeans',
  'Skinny Jeans',
  'category_clothing_330_petite',
  NULL,
  'Skinny Jeans subcategory',
  346,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_346_smock_dress',
  'Smock Dress',
  'category_clothing_330_petite',
  NULL,
  'Smock Dress subcategory',
  347,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_347_split_hem_jeans',
  'Split Hem Jeans',
  'category_clothing_330_petite',
  NULL,
  'Split Hem Jeans subcategory',
  348,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_348_straight_jeans',
  'Straight Jeans',
  'category_clothing_330_petite',
  NULL,
  'Straight Jeans subcategory',
  349,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_349_straight_leg_trousers',
  'Straight Leg Trousers',
  'category_clothing_330_petite',
  NULL,
  'Straight Leg Trousers subcategory',
  350,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_350_sweatshirt',
  'Sweatshirt',
  'category_clothing_330_petite',
  NULL,
  'Sweatshirt subcategory',
  351,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_351_teddy_coat',
  'Teddy Coat',
  'category_clothing_330_petite',
  NULL,
  'Teddy Coat subcategory',
  352,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_352_tracksuit',
  'Tracksuit',
  'category_clothing_330_petite',
  NULL,
  'Tracksuit subcategory',
  353,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_353_trench_coat',
  'Trench Coat',
  'category_clothing_330_petite',
  NULL,
  'Trench Coat subcategory',
  354,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_354_unitard',
  'Unitard',
  'category_clothing_330_petite',
  NULL,
  'Unitard subcategory',
  355,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_355_wide_leg_jeans',
  'Wide Leg Jeans',
  'category_clothing_330_petite',
  NULL,
  'Wide Leg Jeans subcategory',
  356,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_356_wide_leg_trousers',
  'Wide Leg Trousers',
  'category_clothing_330_petite',
  NULL,
  'Wide Leg Trousers subcategory',
  357,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_357_bandeau',
  'Bandeau',
  'category_clothing_332_plus_size',
  NULL,
  'Bandeau subcategory',
  358,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_358_beach_dress',
  'Beach Dress',
  'category_clothing_332_plus_size',
  NULL,
  'Beach Dress subcategory',
  359,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_359_beach_maxi_dress',
  'Beach Maxi Dress',
  'category_clothing_332_plus_size',
  NULL,
  'Beach Maxi Dress subcategory',
  360,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_360_beach_shirt',
  'Beach Shirt',
  'category_clothing_332_plus_size',
  NULL,
  'Beach Shirt subcategory',
  361,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_361_beach_skirt',
  'Beach Skirt',
  'category_clothing_332_plus_size',
  NULL,
  'Beach Skirt subcategory',
  362,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_362_beach_trousers',
  'Beach Trousers',
  'category_clothing_332_plus_size',
  NULL,
  'Beach Trousers subcategory',
  363,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_363_bikini_top',
  'Bikini Top',
  'category_clothing_332_plus_size',
  NULL,
  'Bikini Top subcategory',
  364,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_364_blazer',
  'Blazer',
  'category_clothing_332_plus_size',
  NULL,
  'Blazer subcategory',
  365,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_365_blazer_dress',
  'Blazer Dress',
  'category_clothing_332_plus_size',
  NULL,
  'Blazer Dress subcategory',
  366,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_366_blouse',
  'Blouse',
  'category_clothing_332_plus_size',
  NULL,
  'Blouse subcategory',
  367,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_367_bodycon_dress',
  'Bodycon Dress',
  'category_clothing_332_plus_size',
  NULL,
  'Bodycon Dress subcategory',
  368,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_368_bodysuit',
  'Bodysuit',
  'category_clothing_332_plus_size',
  NULL,
  'Bodysuit subcategory',
  369,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_369_bomber_jacket',
  'Bomber Jacket',
  'category_clothing_332_plus_size',
  NULL,
  'Bomber Jacket subcategory',
  370,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_370_cami',
  'Cami',
  'category_clothing_332_plus_size',
  NULL,
  'Cami subcategory',
  371,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_371_cargo_skirt',
  'Cargo Skirt',
  'category_clothing_332_plus_size',
  NULL,
  'Cargo Skirt subcategory',
  372,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_372_casual_jacket',
  'Casual Jacket',
  'category_clothing_332_plus_size',
  NULL,
  'Casual Jacket subcategory',
  373,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_373_coat',
  'Coat',
  'category_clothing_332_plus_size',
  NULL,
  'Coat subcategory',
  374,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_374_corset',
  'Corset',
  'category_clothing_332_plus_size',
  NULL,
  'Corset subcategory',
  375,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_375_crop_top',
  'Crop Top',
  'category_clothing_332_plus_size',
  NULL,
  'Crop Top subcategory',
  376,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_376_cropped_denim_jacket',
  'Cropped Denim Jacket',
  'category_clothing_332_plus_size',
  NULL,
  'Cropped Denim Jacket subcategory',
  377,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_377_denim_day_dress',
  'Denim Day Dress',
  'category_clothing_332_plus_size',
  NULL,
  'Denim Day Dress subcategory',
  378,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_378_denim_evening_dress',
  'Denim Evening Dress',
  'category_clothing_332_plus_size',
  NULL,
  'Denim Evening Dress subcategory',
  379,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_379_denim_mini_skirt',
  'Denim Mini Skirt',
  'category_clothing_332_plus_size',
  NULL,
  'Denim Mini Skirt subcategory',
  380,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_380_denim_shorts',
  'Denim Shorts',
  'category_clothing_332_plus_size',
  NULL,
  'Denim Shorts subcategory',
  381,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_381_denim_top',
  'Denim Top',
  'category_clothing_332_plus_size',
  NULL,
  'Denim Top subcategory',
  382,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_382_flares',
  'Flares',
  'category_clothing_332_plus_size',
  NULL,
  'Flares subcategory',
  383,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_383_floaty_shorts',
  'Floaty Shorts',
  'category_clothing_332_plus_size',
  NULL,
  'Floaty Shorts subcategory',
  384,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_384_jumper_dress',
  'Jumper Dress',
  'category_clothing_332_plus_size',
  NULL,
  'Jumper Dress subcategory',
  385,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_385_jumpsuit',
  'Jumpsuit',
  'category_clothing_332_plus_size',
  NULL,
  'Jumpsuit subcategory',
  386,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_386_knitted_skirt',
  'Knitted Skirt',
  'category_clothing_332_plus_size',
  NULL,
  'Knitted Skirt subcategory',
  387,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_387_light_set',
  'Light Set',
  'category_clothing_332_plus_size',
  NULL,
  'Light Set subcategory',
  388,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_388_long_top',
  'Long Top',
  'category_clothing_332_plus_size',
  NULL,
  'Long Top subcategory',
  389,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_389_maxi_dress',
  'Maxi Dress',
  'category_clothing_332_plus_size',
  NULL,
  'Maxi Dress subcategory',
  390,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_390_maxi_puffer_jacket',
  'Maxi Puffer Jacket',
  'category_clothing_332_plus_size',
  NULL,
  'Maxi Puffer Jacket subcategory',
  391,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_391_maxi_skirt',
  'Maxi Skirt',
  'category_clothing_332_plus_size',
  NULL,
  'Maxi Skirt subcategory',
  392,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_392_midaxi_skirt',
  'Midaxi Skirt',
  'category_clothing_332_plus_size',
  NULL,
  'Midaxi Skirt subcategory',
  393,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_393_midi_dress',
  'Midi Dress',
  'category_clothing_332_plus_size',
  NULL,
  'Midi Dress subcategory',
  394,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_394_midi_skirt',
  'Midi Skirt',
  'category_clothing_332_plus_size',
  NULL,
  'Midi Skirt subcategory',
  395,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_395_mini_skirt',
  'Mini Skirt',
  'category_clothing_332_plus_size',
  NULL,
  'Mini Skirt subcategory',
  396,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_396_oversized_denim_jacket',
  'Oversized denim jacket',
  'category_clothing_332_plus_size',
  NULL,
  'Oversized denim jacket subcategory',
  397,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_397_puffer_jacket',
  'Puffer Jacket',
  'category_clothing_332_plus_size',
  NULL,
  'Puffer Jacket subcategory',
  398,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_398_shift_dress',
  'Shift Dress',
  'category_clothing_332_plus_size',
  NULL,
  'Shift Dress subcategory',
  399,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_399_shirt',
  'Shirt',
  'category_clothing_332_plus_size',
  NULL,
  'Shirt subcategory',
  400,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_400_shirt_dress',
  'Shirt Dress',
  'category_clothing_332_plus_size',
  NULL,
  'Shirt Dress subcategory',
  401,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_401_straight_leg_trousers',
  'Straight Leg Trousers',
  'category_clothing_332_plus_size',
  NULL,
  'Straight Leg Trousers subcategory',
  402,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_402_swimsuit',
  'Swimsuit',
  'category_clothing_332_plus_size',
  NULL,
  'Swimsuit subcategory',
  403,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_403_t_shirt',
  'T-Shirt',
  'category_clothing_332_plus_size',
  NULL,
  'T-Shirt subcategory',
  404,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_404_tailored_shorts',
  'Tailored Shorts',
  'category_clothing_332_plus_size',
  NULL,
  'Tailored Shorts subcategory',
  405,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_405_trench_coat',
  'Trench Coat',
  'category_clothing_332_plus_size',
  NULL,
  'Trench Coat subcategory',
  406,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_406_vest',
  'Vest',
  'category_clothing_332_plus_size',
  NULL,
  'Vest subcategory',
  407,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_407_wide_leg_trousers',
  'Wide Leg Trousers',
  'category_clothing_332_plus_size',
  NULL,
  'Wide Leg Trousers subcategory',
  408,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_408_bandeau',
  'Bandeau',
  'category_clothing_343_shape',
  NULL,
  'Bandeau subcategory',
  409,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_409_bodycon_dress',
  'Bodycon Dress',
  'category_clothing_343_shape',
  NULL,
  'Bodycon Dress subcategory',
  410,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_410_bodysuit',
  'Bodysuit',
  'category_clothing_343_shape',
  NULL,
  'Bodysuit subcategory',
  411,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_411_bralet',
  'Bralet',
  'category_clothing_343_shape',
  NULL,
  'Bralet subcategory',
  412,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_412_cargo_shorts',
  'Cargo Shorts',
  'category_clothing_343_shape',
  NULL,
  'Cargo Shorts subcategory',
  413,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_413_cargo_skirt',
  'Cargo Skirt',
  'category_clothing_343_shape',
  NULL,
  'Cargo Skirt subcategory',
  414,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_414_casual_jacket',
  'Casual Jacket',
  'category_clothing_343_shape',
  NULL,
  'Casual Jacket subcategory',
  415,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_415_corset',
  'Corset',
  'category_clothing_343_shape',
  NULL,
  'Corset subcategory',
  416,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_416_crop_top',
  'Crop Top',
  'category_clothing_343_shape',
  NULL,
  'Crop Top subcategory',
  417,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_417_cropped_denim_jacket',
  'Cropped Denim Jacket',
  'category_clothing_343_shape',
  NULL,
  'Cropped Denim Jacket subcategory',
  418,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_418_cycling_shorts',
  'Cycling Shorts',
  'category_clothing_343_shape',
  NULL,
  'Cycling Shorts subcategory',
  419,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_419_denim_evening_dress',
  'Denim Evening Dress',
  'category_clothing_343_shape',
  NULL,
  'Denim Evening Dress subcategory',
  420,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_420_denim_jumpsuits',
  'Denim Jumpsuits',
  'category_clothing_343_shape',
  NULL,
  'Denim Jumpsuits subcategory',
  421,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_421_denim_maxi_skirt',
  'Denim Maxi Skirt',
  'category_clothing_343_shape',
  NULL,
  'Denim Maxi Skirt subcategory',
  422,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_422_denim_midi_skirt',
  'Denim Midi Skirt',
  'category_clothing_343_shape',
  NULL,
  'Denim Midi Skirt subcategory',
  423,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_423_denim_mini_skirt',
  'Denim Mini Skirt',
  'category_clothing_343_shape',
  NULL,
  'Denim Mini Skirt subcategory',
  424,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_424_denim_shorts',
  'Denim Shorts',
  'category_clothing_343_shape',
  NULL,
  'Denim Shorts subcategory',
  425,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_425_denim_top',
  'Denim Top',
  'category_clothing_343_shape',
  NULL,
  'Denim Top subcategory',
  426,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_426_flared_jeans',
  'Flared Jeans',
  'category_clothing_343_shape',
  NULL,
  'Flared Jeans subcategory',
  427,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_427_flares',
  'Flares',
  'category_clothing_343_shape',
  NULL,
  'Flares subcategory',
  428,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_428_hot_pant',
  'Hot Pant',
  'category_clothing_343_shape',
  NULL,
  'Hot Pant subcategory',
  429,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_429_joggers',
  'Joggers',
  'category_clothing_343_shape',
  NULL,
  'Joggers subcategory',
  430,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_430_jumpsuit',
  'Jumpsuit',
  'category_clothing_343_shape',
  NULL,
  'Jumpsuit subcategory',
  431,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_431_knitted_shorts',
  'Knitted Shorts',
  'category_clothing_343_shape',
  NULL,
  'Knitted Shorts subcategory',
  432,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_432_knitted_skirt',
  'Knitted Skirt',
  'category_clothing_343_shape',
  NULL,
  'Knitted Skirt subcategory',
  433,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_433_leggings',
  'Leggings',
  'category_clothing_343_shape',
  NULL,
  'Leggings subcategory',
  434,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_434_long_top',
  'Long Top',
  'category_clothing_343_shape',
  NULL,
  'Long Top subcategory',
  435,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_435_maxi_dress',
  'Maxi Dress',
  'category_clothing_343_shape',
  NULL,
  'Maxi Dress subcategory',
  436,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_436_maxi_skirt',
  'Maxi Skirt',
  'category_clothing_343_shape',
  NULL,
  'Maxi Skirt subcategory',
  437,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_437_midaxi_skirt',
  'Midaxi Skirt',
  'category_clothing_343_shape',
  NULL,
  'Midaxi Skirt subcategory',
  438,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_438_midi_dress',
  'Midi Dress',
  'category_clothing_343_shape',
  NULL,
  'Midi Dress subcategory',
  439,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_439_midi_skirt',
  'Midi Skirt',
  'category_clothing_343_shape',
  NULL,
  'Midi Skirt subcategory',
  440,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_440_mini_skirt',
  'Mini Skirt',
  'category_clothing_343_shape',
  NULL,
  'Mini Skirt subcategory',
  441,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_441_mom_jeans',
  'Mom Jeans',
  'category_clothing_343_shape',
  NULL,
  'Mom Jeans subcategory',
  442,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_442_playsuit',
  'Playsuit',
  'category_clothing_343_shape',
  NULL,
  'Playsuit subcategory',
  443,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_443_runner_shorts',
  'Runner Shorts',
  'category_clothing_343_shape',
  NULL,
  'Runner Shorts subcategory',
  444,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_444_set',
  'Set',
  'category_clothing_343_shape',
  NULL,
  'Set subcategory',
  445,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_445_skinny_jeans',
  'Skinny Jeans',
  'category_clothing_343_shape',
  NULL,
  'Skinny Jeans subcategory',
  446,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_446_straight_jeans',
  'Straight Jeans',
  'category_clothing_343_shape',
  NULL,
  'Straight Jeans subcategory',
  447,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_447_straight_leg_trousers',
  'Straight Leg Trousers',
  'category_clothing_343_shape',
  NULL,
  'Straight Leg Trousers subcategory',
  448,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_448_swimsuit',
  'Swimsuit',
  'category_clothing_343_shape',
  NULL,
  'Swimsuit subcategory',
  449,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_449_t_shirt',
  'T-Shirt',
  'category_clothing_343_shape',
  NULL,
  'T-Shirt subcategory',
  450,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_450_tailored_shorts',
  'Tailored Shorts',
  'category_clothing_343_shape',
  NULL,
  'Tailored Shorts subcategory',
  451,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_451_unitard',
  'Unitard',
  'category_clothing_343_shape',
  NULL,
  'Unitard subcategory',
  452,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_452_wide_leg_jeans',
  'Wide Leg Jeans',
  'category_clothing_343_shape',
  NULL,
  'Wide Leg Jeans subcategory',
  453,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_453_wide_leg_trousers',
  'Wide Leg Trousers',
  'category_clothing_343_shape',
  NULL,
  'Wide Leg Trousers subcategory',
  454,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_454_beach_dress',
  'Beach Dress',
  'category_clothing_368_swimwear',
  NULL,
  'Beach Dress subcategory',
  455,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_455_beach_flares',
  'Beach Flares',
  'category_clothing_368_swimwear',
  NULL,
  'Beach Flares subcategory',
  456,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_456_beach_jumpsuit',
  'Beach Jumpsuit',
  'category_clothing_368_swimwear',
  NULL,
  'Beach Jumpsuit subcategory',
  457,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_457_beach_kimono',
  'Beach Kimono',
  'category_clothing_368_swimwear',
  NULL,
  'Beach Kimono subcategory',
  458,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_458_beach_maxi_dress',
  'Beach Maxi Dress',
  'category_clothing_368_swimwear',
  NULL,
  'Beach Maxi Dress subcategory',
  459,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_459_beach_maxi_skirt',
  'Beach Maxi Skirt',
  'category_clothing_368_swimwear',
  NULL,
  'Beach Maxi Skirt subcategory',
  460,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_460_beach_playsuit',
  'Beach Playsuit',
  'category_clothing_368_swimwear',
  NULL,
  'Beach Playsuit subcategory',
  461,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_461_beach_sarong',
  'Beach Sarong',
  'category_clothing_368_swimwear',
  NULL,
  'Beach Sarong subcategory',
  462,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_462_beach_set',
  'Beach Set',
  'category_clothing_368_swimwear',
  NULL,
  'Beach Set subcategory',
  463,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_463_beach_shirt',
  'Beach Shirt',
  'category_clothing_368_swimwear',
  NULL,
  'Beach Shirt subcategory',
  464,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_464_beach_shorts',
  'Beach Shorts',
  'category_clothing_368_swimwear',
  NULL,
  'Beach Shorts subcategory',
  465,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_465_beach_skirt',
  'Beach Skirt',
  'category_clothing_368_swimwear',
  NULL,
  'Beach Skirt subcategory',
  466,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_466_beach_top',
  'Beach Top',
  'category_clothing_368_swimwear',
  NULL,
  'Beach Top subcategory',
  467,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_467_beach_trousers',
  'Beach Trousers',
  'category_clothing_368_swimwear',
  NULL,
  'Beach Trousers subcategory',
  468,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_468_bikini_bottoms',
  'Bikini Bottoms',
  'category_clothing_368_swimwear',
  NULL,
  'Bikini Bottoms subcategory',
  469,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_469_bikini_set',
  'Bikini Set',
  'category_clothing_368_swimwear',
  NULL,
  'Bikini Set subcategory',
  470,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_470_bikini_top',
  'Bikini Top',
  'category_clothing_368_swimwear',
  NULL,
  'Bikini Top subcategory',
  471,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_471_high_leg',
  'High Leg',
  'category_clothing_368_swimwear',
  NULL,
  'High Leg subcategory',
  472,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_472_high_waist',
  'High Waist',
  'category_clothing_368_swimwear',
  NULL,
  'High Waist subcategory',
  473,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_473_mix_match',
  'Mix & Match',
  'category_clothing_368_swimwear',
  NULL,
  'Mix & Match subcategory',
  474,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_474_swimsuit',
  'Swimsuit',
  'category_clothing_368_swimwear',
  NULL,
  'Swimsuit subcategory',
  475,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_475_tanga',
  'Tanga',
  'category_clothing_368_swimwear',
  NULL,
  'Tanga subcategory',
  476,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_476_thong_bikini',
  'Thong Bikini',
  'category_clothing_368_swimwear',
  NULL,
  'Thong Bikini subcategory',
  477,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_477_tie_side',
  'Tie Side',
  'category_clothing_368_swimwear',
  NULL,
  'Tie Side subcategory',
  478,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_478_triangle',
  'Triangle',
  'category_clothing_368_swimwear',
  NULL,
  'Triangle subcategory',
  479,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_479_underwired',
  'Underwired',
  'category_clothing_368_swimwear',
  NULL,
  'Underwired subcategory',
  480,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_480_bandeau',
  'Bandeau',
  'category_clothing_370_tall',
  NULL,
  'Bandeau subcategory',
  481,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_481_blazer_dress',
  'Blazer Dress',
  'category_clothing_370_tall',
  NULL,
  'Blazer Dress subcategory',
  482,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_482_bodycon_dress',
  'Bodycon Dress',
  'category_clothing_370_tall',
  NULL,
  'Bodycon Dress subcategory',
  483,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_483_bodysuit',
  'Bodysuit',
  'category_clothing_370_tall',
  NULL,
  'Bodysuit subcategory',
  484,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_484_bomber_jacket',
  'Bomber Jacket',
  'category_clothing_370_tall',
  NULL,
  'Bomber Jacket subcategory',
  485,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_485_boyfriend_jeans',
  'Boyfriend Jeans',
  'category_clothing_370_tall',
  NULL,
  'Boyfriend Jeans subcategory',
  486,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_486_cami',
  'Cami',
  'category_clothing_370_tall',
  NULL,
  'Cami subcategory',
  487,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_487_cigarette_trouser',
  'Cigarette Trouser',
  'category_clothing_370_tall',
  NULL,
  'Cigarette Trouser subcategory',
  488,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_488_corset',
  'Corset',
  'category_clothing_370_tall',
  NULL,
  'Corset subcategory',
  489,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_489_crop_top',
  'Crop Top',
  'category_clothing_370_tall',
  NULL,
  'Crop Top subcategory',
  490,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_490_denim_day_dress',
  'Denim Day Dress',
  'category_clothing_370_tall',
  NULL,
  'Denim Day Dress subcategory',
  491,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_491_denim_jumpsuits',
  'Denim Jumpsuits',
  'category_clothing_370_tall',
  NULL,
  'Denim Jumpsuits subcategory',
  492,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_492_denim_mini_skirt',
  'Denim Mini Skirt',
  'category_clothing_370_tall',
  NULL,
  'Denim Mini Skirt subcategory',
  493,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_493_denim_shorts',
  'Denim Shorts',
  'category_clothing_370_tall',
  NULL,
  'Denim Shorts subcategory',
  494,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_494_denim_top',
  'Denim Top',
  'category_clothing_370_tall',
  NULL,
  'Denim Top subcategory',
  495,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_495_flares',
  'Flares',
  'category_clothing_370_tall',
  NULL,
  'Flares subcategory',
  496,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_496_floaty_shorts',
  'Floaty Shorts',
  'category_clothing_370_tall',
  NULL,
  'Floaty Shorts subcategory',
  497,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_497_joggers',
  'Joggers',
  'category_clothing_370_tall',
  NULL,
  'Joggers subcategory',
  498,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_498_jumpsuit',
  'Jumpsuit',
  'category_clothing_370_tall',
  NULL,
  'Jumpsuit subcategory',
  499,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_499_knitted_trousers',
  'Knitted Trousers',
  'category_clothing_370_tall',
  NULL,
  'Knitted Trousers subcategory',
  500,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_500_long_top',
  'Long Top',
  'category_clothing_370_tall',
  NULL,
  'Long Top subcategory',
  501,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_501_maxi_dress',
  'Maxi Dress',
  'category_clothing_370_tall',
  NULL,
  'Maxi Dress subcategory',
  502,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_502_midi_dress',
  'Midi Dress',
  'category_clothing_370_tall',
  NULL,
  'Midi Dress subcategory',
  503,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_503_midi_skirt',
  'Midi Skirt',
  'category_clothing_370_tall',
  NULL,
  'Midi Skirt subcategory',
  504,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_504_mini_skirt',
  'Mini Skirt',
  'category_clothing_370_tall',
  NULL,
  'Mini Skirt subcategory',
  505,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_505_mom_jeans',
  'Mom Jeans',
  'category_clothing_370_tall',
  NULL,
  'Mom Jeans subcategory',
  506,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_506_playsuit',
  'Playsuit',
  'category_clothing_370_tall',
  NULL,
  'Playsuit subcategory',
  507,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_507_puffer_jacket',
  'Puffer Jacket',
  'category_clothing_370_tall',
  NULL,
  'Puffer Jacket subcategory',
  508,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_508_regular_fit_denim_jacket',
  'Regular fit denim jacket',
  'category_clothing_370_tall',
  NULL,
  'Regular fit denim jacket subcategory',
  509,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_509_shift_dress',
  'Shift Dress',
  'category_clothing_370_tall',
  NULL,
  'Shift Dress subcategory',
  510,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_510_shirt',
  'Shirt',
  'category_clothing_370_tall',
  NULL,
  'Shirt subcategory',
  511,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_511_skater_skirt',
  'Skater Skirt',
  'category_clothing_370_tall',
  NULL,
  'Skater Skirt subcategory',
  512,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_512_skinny_jeans',
  'Skinny Jeans',
  'category_clothing_370_tall',
  NULL,
  'Skinny Jeans subcategory',
  513,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_513_split_hem_jeans',
  'Split Hem Jeans',
  'category_clothing_370_tall',
  NULL,
  'Split Hem Jeans subcategory',
  514,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_514_straight_jeans',
  'Straight Jeans',
  'category_clothing_370_tall',
  NULL,
  'Straight Jeans subcategory',
  515,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_515_straight_leg_trousers',
  'Straight Leg Trousers',
  'category_clothing_370_tall',
  NULL,
  'Straight Leg Trousers subcategory',
  516,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_516_sweatshirt',
  'Sweatshirt',
  'category_clothing_370_tall',
  NULL,
  'Sweatshirt subcategory',
  517,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_517_trench_coat',
  'Trench Coat',
  'category_clothing_370_tall',
  NULL,
  'Trench Coat subcategory',
  518,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_518_vest',
  'Vest',
  'category_clothing_370_tall',
  NULL,
  'Vest subcategory',
  519,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_519_wide_leg_trousers',
  'Wide Leg Trousers',
  'category_clothing_370_tall',
  NULL,
  'Wide Leg Trousers subcategory',
  520,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_520_bandeau',
  'Bandeau',
  'category_clothing_373_tops',
  NULL,
  'Bandeau subcategory',
  521,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_521_blouse',
  'Blouse',
  'category_clothing_373_tops',
  NULL,
  'Blouse subcategory',
  522,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_522_bodysuit',
  'Bodysuit',
  'category_clothing_373_tops',
  NULL,
  'Bodysuit subcategory',
  523,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_523_cami',
  'Cami',
  'category_clothing_373_tops',
  NULL,
  'Cami subcategory',
  524,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_524_corset',
  'Corset',
  'category_clothing_373_tops',
  NULL,
  'Corset subcategory',
  525,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_525_crop_top',
  'Crop Top',
  'category_clothing_373_tops',
  NULL,
  'Crop Top subcategory',
  526,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_526_long_top',
  'Long Top',
  'category_clothing_373_tops',
  NULL,
  'Long Top subcategory',
  527,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_527_shirt',
  'Shirt',
  'category_clothing_373_tops',
  NULL,
  'Shirt subcategory',
  528,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_528_sweatshirt',
  'Sweatshirt',
  'category_clothing_373_tops',
  NULL,
  'Sweatshirt subcategory',
  529,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_529_t_shirt',
  'T-Shirt',
  'category_clothing_373_tops',
  NULL,
  'T-Shirt subcategory',
  530,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  'subcategory_clothing_530_vest',
  'Vest',
  'category_clothing_373_tops',
  NULL,
  'Vest subcategory',
  531,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

