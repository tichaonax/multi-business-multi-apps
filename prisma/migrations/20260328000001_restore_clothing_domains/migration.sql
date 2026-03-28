-- =============================================================================
-- Migration: Restore Clothing Domains
-- =============================================================================
-- Migration 20260327000008 deleted all old clothing domains (domain_clothing_*)
-- and replaced them with 10 canonical domains (cdom_*).
-- The old domains existed in production (seeded via UI / earlier migrations)
-- and were NOT intended to be removed — only the new cdom_* ones should have
-- been ADDED alongside them.
--
-- This migration restores the deleted domains using ON CONFLICT DO NOTHING
-- so it is safe to run even if some already exist.
-- The existing cdom_* domains are NOT affected.
-- Note: "Footwear" is skipped because cdom_footwear already uses that name.
-- =============================================================================

-- Restore domains from original seed migration (20251028062000)
INSERT INTO inventory_domains (id, name, emoji, description, "businessType", "isActive", "isSystemTemplate", "createdAt")
VALUES
  ('domain_clothing_mens',   'Men''s Fashion',  '👔', 'Men''s clothing and accessories',         'clothing', true, true, NOW()),
  ('domain_clothing_womens', 'Women''s Fashion','👗', 'Women''s clothing and accessories',        'clothing', true, true, NOW()),
  ('domain_clothing_kids',   'Kids Fashion',    '👶', 'Children''s clothing and accessories',    'clothing', true, true, NOW())
ON CONFLICT (id) DO NOTHING;

-- Restore domains from 20260324000001_add_beauty_cosmetics_personalcare_departments
INSERT INTO inventory_domains (id, name, emoji, description, "businessType", "isActive", "isSystemTemplate", "createdAt")
VALUES
  ('domain_clothing_beauty',       'Beauty',        '💄', 'Beauty products and tools',              'clothing', true, false, NOW()),
  ('domain_clothing_cosmetics',    'Cosmetics',     '💋', 'Makeup and cosmetic products',           'clothing', true, false, NOW()),
  ('domain_clothing_personalcare', 'Personal Care', '🧴', 'Personal care and hygiene products',    'clothing', true, false, NOW())
ON CONFLICT (id) DO NOTHING;

-- Restore domains from 20260324000002_add_clothing_departments_full
-- Note: domain_clothing_footwear ("Footwear") is skipped — cdom_footwear already uses that name
INSERT INTO inventory_domains (id, name, emoji, description, "businessType", "isActive", "isSystemTemplate", "createdAt")
VALUES
  ('domain_clothing_sportswear', 'Sportswear & Activewear', '🏃', 'Sports clothing and activewear',          'clothing', true, false, NOW()),
  ('domain_clothing_outerwear',  'Outerwear',               '🧥', 'Jackets, coats and outerwear',            'clothing', true, false, NOW()),
  ('domain_clothing_underwear',  'Underwear & Lingerie',    '👙', 'Underwear, lingerie and innerwear',       'clothing', true, false, NOW()),
  ('domain_clothing_swimwear',   'Swimwear',                '🩱', 'Swimwear and beach clothing',             'clothing', true, false, NOW()),
  ('domain_clothing_nightwear',  'Nightwear & Sleepwear',   '😴', 'Pyjamas, nightwear and sleepwear',       'clothing', true, false, NOW()),
  ('domain_clothing_workwear',   'Workwear & Uniforms',     '👷', 'Workwear, uniforms and protective wear',  'clothing', true, false, NOW()),
  ('domain_clothing_schoolwear', 'School Uniforms',         '🎒', 'School uniforms and schoolwear',          'clothing', true, false, NOW()),
  ('domain_clothing_maternity',  'Maternity',               '🤰', 'Maternity and pregnancy clothing',        'clothing', true, false, NOW()),
  ('domain_clothing_bags',       'Bags & Luggage',          '👜', 'Bags, handbags, backpacks and luggage',   'clothing', true, false, NOW()),
  ('domain_clothing_jewellery',  'Jewellery & Watches',     '⌚', 'Jewellery, watches and timepieces',      'clothing', true, false, NOW()),
  ('domain_clothing_hats',       'Caps & Hats',             '🎩', 'Caps, hats and headwear',                'clothing', true, false, NOW()),
  ('domain_clothing_belts',      'Belts & Wallets',         '👛', 'Belts, wallets and small leather goods',  'clothing', true, false, NOW()),
  ('domain_clothing_eyewear',    'Sunglasses & Eyewear',    '👓', 'Sunglasses and fashion eyewear',          'clothing', true, false, NOW()),
  ('domain_clothing_scarves',    'Scarves & Wraps',         '🧣', 'Scarves, wraps and shawls',               'clothing', true, false, NOW()),
  ('domain_clothing_seasonal',   'Seasonal & Occasion Wear','🎄', 'Seasonal, festive and occasion wear',     'clothing', true, false, NOW()),
  ('domain_clothing_vintage',    'Vintage & Retro',         '👗', 'Vintage, retro and second-hand fashion',  'clothing', true, false, NOW()),
  ('domain_clothing_plussize',   'Plus Size',               '🛍️', 'Plus size clothing and fashion',         'clothing', true, false, NOW()),
  ('domain_clothing_toys',       'Toys & Games',            '🧸', 'Toys, games and children''s products',   'clothing', true, false, NOW())
ON CONFLICT (id) DO NOTHING;

-- Add domains that existed in production (UI-seeded, no original migration ID)
-- These were visible in production under the HXI Fashions business
INSERT INTO inventory_domains (id, name, emoji, description, "businessType", "isActive", "isSystemTemplate", "createdAt")
VALUES
  ('domain_clothing_girls',        'Girls',              '👧', 'Girls clothing and accessories',         'clothing', true, false, NOW()),
  ('domain_clothing_boys',         'Boys',               '👦', 'Boys clothing and accessories',          'clothing', true, false, NOW()),
  ('domain_clothing_baby',         'Baby',               '👶', 'Baby clothing and essentials',           'clothing', true, false, NOW()),
  ('domain_clothing_home_textiles','Home & Textiles',    '🏠', 'Home textiles and soft furnishings',     'clothing', true, false, NOW()),
  ('domain_clothing_fashion_acc',  'Fashion Accessories','👜', 'Fashion accessories and add-ons',        'clothing', true, false, NOW()),
  ('domain_clothing_gen_merch',    'General Merchandise','🛒', 'General merchandise and sundries',       'clothing', true, false, NOW())
ON CONFLICT (id) DO NOTHING;
