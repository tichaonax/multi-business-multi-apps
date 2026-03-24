-- Add full set of clothing inventory departments

INSERT INTO inventory_domains (id, name, emoji, description, "businessType", "isActive", "isSystemTemplate", "createdAt")
VALUES
  ('domain_clothing_sportswear',   'Sportswear & Activewear', '🏃', 'Sports clothing and activewear',         'clothing', true, false, NOW()),
  ('domain_clothing_outerwear',    'Outerwear',               '🧥', 'Jackets, coats and outerwear',           'clothing', true, false, NOW()),
  ('domain_clothing_underwear',    'Underwear & Lingerie',    '👙', 'Underwear, lingerie and innerwear',      'clothing', true, false, NOW()),
  ('domain_clothing_swimwear',     'Swimwear',                '🩱', 'Swimwear and beach clothing',            'clothing', true, false, NOW()),
  ('domain_clothing_nightwear',    'Nightwear & Sleepwear',   '😴', 'Pyjamas, nightwear and sleepwear',      'clothing', true, false, NOW()),
  ('domain_clothing_workwear',     'Workwear & Uniforms',     '👷', 'Workwear, uniforms and protective wear', 'clothing', true, false, NOW()),
  ('domain_clothing_schoolwear',   'School Uniforms',         '🎒', 'School uniforms and schoolwear',         'clothing', true, false, NOW()),
  ('domain_clothing_maternity',    'Maternity',               '🤰', 'Maternity and pregnancy clothing',       'clothing', true, false, NOW()),
  ('domain_clothing_bags',         'Bags & Luggage',          '👜', 'Bags, handbags, backpacks and luggage',  'clothing', true, false, NOW()),
  ('domain_clothing_jewellery',    'Jewellery & Watches',     '⌚', 'Jewellery, watches and timepieces',     'clothing', true, false, NOW()),
  ('domain_clothing_hats',         'Caps & Hats',             '🎩', 'Caps, hats and headwear',               'clothing', true, false, NOW()),
  ('domain_clothing_belts',        'Belts & Wallets',         '👛', 'Belts, wallets and small leather goods', 'clothing', true, false, NOW()),
  ('domain_clothing_eyewear',      'Sunglasses & Eyewear',    '👓', 'Sunglasses and fashion eyewear',        'clothing', true, false, NOW()),
  ('domain_clothing_scarves',      'Scarves & Wraps',         '🧣', 'Scarves, wraps and shawls',             'clothing', true, false, NOW()),
  ('domain_clothing_seasonal',     'Seasonal & Occasion Wear','🎄', 'Seasonal, festive and occasion wear',   'clothing', true, false, NOW()),
  ('domain_clothing_vintage',      'Vintage & Retro',         '👗', 'Vintage, retro and second-hand fashion', 'clothing', true, false, NOW()),
  ('domain_clothing_plussize',     'Plus Size',               '🛍️', 'Plus size clothing and fashion',        'clothing', true, false, NOW()),
  ('domain_clothing_toys',         'Toys & Games',            '🧸', 'Toys, games and childrens products',    'clothing', true, false, NOW())
ON CONFLICT (id) DO NOTHING;
