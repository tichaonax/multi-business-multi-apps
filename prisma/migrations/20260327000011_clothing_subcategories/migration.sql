-- Migration 00011: Fill missing clothing subcategories
-- Source: Clothing Domains.md
-- Uses ON CONFLICT (categoryId, name) DO NOTHING to skip existing entries

INSERT INTO inventory_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "displayOrder", "createdAt")
VALUES
  -- Apparel: Tops (ccat_tops) — existing: Blouses & Button-Ups, Hoodies & Sweatshirts, Polo Shirts, T-Shirts
  ('csc_tops_1', 'ccat_tops', 'Button-Down Shirts', '👔', false, false, 5, NOW()),
  ('csc_tops_2', 'ccat_tops', 'Blouses',            '👚', false, false, 6, NOW()),
  ('csc_tops_3', 'ccat_tops', 'Hoodies',            '🧥', false, false, 7, NOW()),
  ('csc_tops_4', 'ccat_tops', 'Sweatshirts',        '🧥', false, false, 8, NOW()),
  ('csc_tops_5', 'ccat_tops', 'Jackets',            '🧥', false, false, 9, NOW()),
  ('csc_tops_6', 'ccat_tops', 'Sweaters',           '🧥', false, false, 10, NOW()),
  ('csc_tops_7', 'ccat_tops', 'Tunics',             '🧣', false, false, 11, NOW()),
  -- Apparel: Bottoms (ccat_bottoms) — existing: Jeans, Leggings & Joggers, Shorts
  ('csc_bot_1', 'ccat_bottoms', 'Pants',       '👖', false, false, 4, NOW()),
  ('csc_bot_2', 'ccat_bottoms', 'Skirts',      '👗', false, false, 5, NOW()),
  ('csc_bot_3', 'ccat_bottoms', 'Leggings',    '👖', false, false, 6, NOW()),
  ('csc_bot_4', 'ccat_bottoms', 'Joggers',     '🩳', false, false, 7, NOW()),
  ('csc_bot_5', 'ccat_bottoms', 'Cargo Pants', '👖', false, false, 8, NOW()),
  ('csc_bot_6', 'ccat_bottoms', 'Dress Pants', '👖', false, false, 9, NOW()),
  -- Apparel: Dresses & Sets (ccat_dresses) — existing: Casual Dresses, Formal Dresses, Jumpsuits & Rompers
  ('csc_drs_1', 'ccat_dresses', 'Maxi Dresses',  '👗', false, false, 4, NOW()),
  ('csc_drs_2', 'ccat_dresses', 'Midi Dresses',  '👗', false, false, 5, NOW()),
  ('csc_drs_3', 'ccat_dresses', 'Mini Dresses',  '👗', false, false, 6, NOW()),
  ('csc_drs_4', 'ccat_dresses', 'Matching Sets', '👘', false, false, 7, NOW()),
  ('csc_drs_5', 'ccat_dresses', 'Jumpsuits',     '👗', false, false, 8, NOW()),
  ('csc_drs_6', 'ccat_dresses', 'Rompers',       '👗', false, false, 9, NOW()),
  -- Apparel: Outerwear (ccat_outerwear) — all missing
  ('csc_out_1', 'ccat_outerwear', 'Coats',       '🧥', false, false, 1, NOW()),
  ('csc_out_2', 'ccat_outerwear', 'Jackets',     '🧥', false, false, 2, NOW()),
  ('csc_out_3', 'ccat_outerwear', 'Blazers',     '🧥', false, false, 3, NOW()),
  ('csc_out_4', 'ccat_outerwear', 'Parkas',      '🧥', false, false, 4, NOW()),
  ('csc_out_5', 'ccat_outerwear', 'Vests',       '🧥', false, false, 5, NOW()),
  ('csc_out_6', 'ccat_outerwear', 'Raincoats',   '🧥', false, false, 6, NOW()),
  ('csc_out_7', 'ccat_outerwear', 'Windbreakers','🧥', false, false, 7, NOW()),
  -- Men's: Tops (ccat_mens_tops) — existing: Dress Shirts, Sweaters & Hoodies, T-Shirts
  ('csc_mto_1', 'ccat_mens_tops', 'Polo Shirts', '👔', false, false, 4, NOW()),
  ('csc_mto_2', 'ccat_mens_tops', 'Hoodies',     '🧥', false, false, 5, NOW()),
  ('csc_mto_3', 'ccat_mens_tops', 'Sweatshirts', '🧥', false, false, 6, NOW()),
  ('csc_mto_4', 'ccat_mens_tops', 'Sweaters',    '🧥', false, false, 7, NOW()),
  -- Men's: Bottoms (ccat_mens_bottoms) — existing: Jeans, Shorts, Trousers & Chinos
  ('csc_mbo_1', 'ccat_mens_bottoms', 'Dress Pants', '👖', false, false, 4, NOW()),
  ('csc_mbo_2', 'ccat_mens_bottoms', 'Joggers',     '🩳', false, false, 5, NOW()),
  ('csc_mbo_3', 'ccat_mens_bottoms', 'Casual Pants','👖', false, false, 6, NOW()),
  -- Men's: Outerwear (ccat_mens_outerwear) — all missing
  ('csc_mou_1', 'ccat_mens_outerwear', 'Jackets','🧥', false, false, 1, NOW()),
  ('csc_mou_2', 'ccat_mens_outerwear', 'Coats',  '🧥', false, false, 2, NOW()),
  ('csc_mou_3', 'ccat_mens_outerwear', 'Blazers','🧥', false, false, 3, NOW()),
  ('csc_mou_4', 'ccat_mens_outerwear', 'Vests',  '🧥', false, false, 4, NOW()),
  -- Men's: Footwear (ccat_mens_footwear) — all missing
  ('csc_mfw_1', 'ccat_mens_footwear', 'Sneakers',   '👟', false, false, 1, NOW()),
  ('csc_mfw_2', 'ccat_mens_footwear', 'Dress Shoes','👞', false, false, 2, NOW()),
  ('csc_mfw_3', 'ccat_mens_footwear', 'Boots',      '🥾', false, false, 3, NOW()),
  ('csc_mfw_4', 'ccat_mens_footwear', 'Sandals',    '🩴', false, false, 4, NOW()),
  -- Women's: Tops (ccat_womens_tops) — existing: Blouses, Cardigans & Sweaters, T-Shirts & Tanks
  ('csc_wto_1', 'ccat_womens_tops', 'Button-Up Shirts','👔', false, false, 4, NOW()),
  ('csc_wto_2', 'ccat_womens_tops', 'Hoodies',         '🧥', false, false, 5, NOW()),
  -- Women's: Bottoms (ccat_womens_bottoms) — existing: Jeans, Leggings, Skirts
  ('csc_wbo_1', 'ccat_womens_bottoms', 'Pants',   '👖', false, false, 4, NOW()),
  ('csc_wbo_2', 'ccat_womens_bottoms', 'Shorts',  '🩳', false, false, 5, NOW()),
  ('csc_wbo_3', 'ccat_womens_bottoms', 'Joggers', '🩳', false, false, 6, NOW()),
  -- Women's: Dresses (ccat_womens_dresses) — all missing
  ('csc_wdr_1', 'ccat_womens_dresses', 'Casual Dresses','👗', false, false, 1, NOW()),
  ('csc_wdr_2', 'ccat_womens_dresses', 'Formal Dresses','👗', false, false, 2, NOW()),
  ('csc_wdr_3', 'ccat_womens_dresses', 'Maxi Dresses',  '👗', false, false, 3, NOW()),
  ('csc_wdr_4', 'ccat_womens_dresses', 'Midi Dresses',  '👗', false, false, 4, NOW()),
  ('csc_wdr_5', 'ccat_womens_dresses', 'Mini Dresses',  '👗', false, false, 5, NOW()),
  ('csc_wdr_6', 'ccat_womens_dresses', 'Party Dresses', '👗', false, false, 6, NOW()),
  -- Women's: Outerwear (ccat_womens_outer) — all missing
  ('csc_wou_1', 'ccat_womens_outer', 'Coats',    '🧥', false, false, 1, NOW()),
  ('csc_wou_2', 'ccat_womens_outer', 'Jackets',  '🧥', false, false, 2, NOW()),
  ('csc_wou_3', 'ccat_womens_outer', 'Blazers',  '🧥', false, false, 3, NOW()),
  ('csc_wou_4', 'ccat_womens_outer', 'Vests',    '🧥', false, false, 4, NOW()),
  ('csc_wou_5', 'ccat_womens_outer', 'Raincoats','🧥', false, false, 5, NOW()),
  -- Women's: Footwear (ccat_womens_footwear) — all missing
  ('csc_wfw_1', 'ccat_womens_footwear', 'Heels',  '👠', false, false, 1, NOW()),
  ('csc_wfw_2', 'ccat_womens_footwear', 'Sneakers','👟', false, false, 2, NOW()),
  ('csc_wfw_3', 'ccat_womens_footwear', 'Flats',  '🥿', false, false, 3, NOW()),
  ('csc_wfw_4', 'ccat_womens_footwear', 'Boots',  '🥾', false, false, 4, NOW()),
  ('csc_wfw_5', 'ccat_womens_footwear', 'Sandals','🩴', false, false, 5, NOW()),
  -- Kids: Boys (ccat_boys) — existing: Shorts & Jeans, T-Shirts & Tops
  ('csc_boy_1', 'ccat_boys', 'Polo Shirts',        '👔', false, false, 3, NOW()),
  ('csc_boy_2', 'ccat_boys', 'Button-Down Shirts', '👔', false, false, 4, NOW()),
  ('csc_boy_3', 'ccat_boys', 'Jeans',              '👖', false, false, 5, NOW()),
  ('csc_boy_4', 'ccat_boys', 'Shorts',             '🩳', false, false, 6, NOW()),
  ('csc_boy_5', 'ccat_boys', 'Hoodies',            '🧥', false, false, 7, NOW()),
  ('csc_boy_6', 'ccat_boys', 'Shoes',              '🥾', false, false, 8, NOW()),
  -- Kids: Girls (ccat_girls) — existing: Dresses & Skirts, Tops & Shirts
  ('csc_grl_1', 'ccat_girls', 'Tops',   '👚', false, false, 3, NOW()),
  ('csc_grl_2', 'ccat_girls', 'Dresses','👗', false, false, 4, NOW()),
  ('csc_grl_3', 'ccat_girls', 'Jeans',  '👖', false, false, 5, NOW()),
  ('csc_grl_4', 'ccat_girls', 'Skirts', '👗', false, false, 6, NOW()),
  ('csc_grl_5', 'ccat_girls', 'Shorts', '🩳', false, false, 7, NOW()),
  ('csc_grl_6', 'ccat_girls', 'Jackets','🧥', false, false, 8, NOW()),
  ('csc_grl_7', 'ccat_girls', 'Shoes',  '🥿', false, false, 9, NOW()),
  -- Kids: Infant (ccat_infant) — existing: Onesies & Bodysuits, Sleepers & Growbags
  ('csc_inf_1', 'ccat_infant', 'Onesies',  '👕', false, false, 3, NOW()),
  ('csc_inf_2', 'ccat_infant', 'Bodysuits','🍼', false, false, 4, NOW()),
  ('csc_inf_3', 'ccat_infant', 'Sleepers', '🧦', false, false, 5, NOW()),
  ('csc_inf_4', 'ccat_infant', 'Hats',     '🧢', false, false, 6, NOW()),
  ('csc_inf_5', 'ccat_infant', 'Mittens',  '🧤', false, false, 7, NOW()),
  ('csc_inf_6', 'ccat_infant', 'Socks',    '🧦', false, false, 8, NOW()),
  -- Baby Wear: Newborn Essentials (ccat_newborn) — all missing
  ('csc_nbw_1', 'ccat_newborn', 'Onesies', '👕', false, false, 1, NOW()),
  ('csc_nbw_2', 'ccat_newborn', 'Sleepers','🧦', false, false, 2, NOW()),
  ('csc_nbw_3', 'ccat_newborn', 'Caps',    '🧢', false, false, 3, NOW()),
  ('csc_nbw_4', 'ccat_newborn', 'Mittens', '🧤', false, false, 4, NOW()),
  ('csc_nbw_5', 'ccat_newborn', 'Socks',   '🧦', false, false, 5, NOW()),
  ('csc_nbw_6', 'ccat_newborn', 'Bibs',    '🍼', false, false, 6, NOW()),
  -- Baby Wear: Baby Accessories (ccat_baby_acc_clth) — all missing
  ('csc_bac_1', 'ccat_baby_acc_clth', 'Swaddles',   '🧷', false, false, 1, NOW()),
  ('csc_bac_2', 'ccat_baby_acc_clth', 'Blankets',   '🛏️', false, false, 2, NOW()),
  ('csc_bac_3', 'ccat_baby_acc_clth', 'Hats',       '🧢', false, false, 3, NOW()),
  ('csc_bac_4', 'ccat_baby_acc_clth', 'Booties',    '🧦', false, false, 4, NOW()),
  ('csc_bac_5', 'ccat_baby_acc_clth', 'Burp Cloths','🍼', false, false, 5, NOW()),
  -- Footwear: Casual Shoes (ccat_casual_shoes) — existing: Boots, Sandals & Flip-Flops, Sneakers
  ('csc_csw_1', 'ccat_casual_shoes', 'Slip-ons','🥿', false, false, 4, NOW()),
  ('csc_csw_2', 'ccat_casual_shoes', 'Sandals', '🩴', false, false, 5, NOW()),
  ('csc_csw_3', 'ccat_casual_shoes', 'Flats',   '🥿', false, false, 6, NOW()),
  -- Footwear: Formal Shoes (ccat_formal_shoes) — existing: Dress Shoes, Heels & Pumps
  ('csc_fsw_1', 'ccat_formal_shoes', 'Heels',  '👠', false, false, 3, NOW()),
  ('csc_fsw_2', 'ccat_formal_shoes', 'Loafers','🥿', false, false, 4, NOW()),
  ('csc_fsw_3', 'ccat_formal_shoes', 'Oxfords','👞', false, false, 5, NOW()),
  -- Footwear: Sports Shoes (ccat_sports_shoes) — all missing
  ('csc_ssw_1', 'ccat_sports_shoes', 'Running Shoes',   '👟', false, false, 1, NOW()),
  ('csc_ssw_2', 'ccat_sports_shoes', 'Basketball Shoes','🏀', false, false, 2, NOW()),
  ('csc_ssw_3', 'ccat_sports_shoes', 'Training Shoes',  '⚽', false, false, 3, NOW()),
  ('csc_ssw_4', 'ccat_sports_shoes', 'Hiking Shoes',    '🥾', false, false, 4, NOW()),
  -- Accessories: Headwear (ccat_headwear) — existing: Beanies & Bobs, Caps & Snapbacks
  ('csc_hdw_1', 'ccat_headwear', 'Caps',       '🧢', false, false, 3, NOW()),
  ('csc_hdw_2', 'ccat_headwear', 'Hats',       '🎩', false, false, 4, NOW()),
  ('csc_hdw_3', 'ccat_headwear', 'Beanies',    '🪖', false, false, 5, NOW()),
  ('csc_hdw_4', 'ccat_headwear', 'Headscarves','🧕', false, false, 6, NOW()),
  -- Accessories: Wearable Accessories (ccat_wearable_acc) — all missing
  ('csc_wac_1', 'ccat_wearable_acc', 'Gloves', '🧤', false, false, 1, NOW()),
  ('csc_wac_2', 'ccat_wearable_acc', 'Scarves','🧣', false, false, 2, NOW()),
  ('csc_wac_3', 'ccat_wearable_acc', 'Socks',  '🧦', false, false, 3, NOW()),
  ('csc_wac_4', 'ccat_wearable_acc', 'Shawls', '🧣', false, false, 4, NOW()),
  ('csc_wac_5', 'ccat_wearable_acc', 'Tights', '🧦', false, false, 5, NOW()),
  -- Accessories: Bags (ccat_bags) — existing: Backpacks, Clutches & Evening Bags, Handbags
  ('csc_bag_1', 'ccat_bags', 'Travel Bags','🧳', false, false, 4, NOW()),
  ('csc_bag_2', 'ccat_bags', 'Clutches',   '👝', false, false, 5, NOW()),
  ('csc_bag_3', 'ccat_bags', 'Tote Bags',  '🛍️', false, false, 6, NOW()),
  -- Accessories: Fashion Accessories (ccat_fashion_acc) — all missing
  ('csc_fac_1', 'ccat_fashion_acc', 'Sunglasses','👓', false, false, 1, NOW()),
  ('csc_fac_2', 'ccat_fashion_acc', 'Watches',   '⌚', false, false, 2, NOW()),
  ('csc_fac_3', 'ccat_fashion_acc', 'Jewelry',   '💍', false, false, 3, NOW()),
  ('csc_fac_4', 'ccat_fashion_acc', 'Belts',     '🪢', false, false, 4, NOW()),
  ('csc_fac_5', 'ccat_fashion_acc', 'Brooches',  '🧷', false, false, 5, NOW()),
  -- Intimates: Underwear (ccat_underwear) — existing: Bras & Bralettes, Briefs & Boxers
  ('csc_und_1', 'ccat_underwear', 'Briefs',     '🩲', false, false, 3, NOW()),
  ('csc_und_2', 'ccat_underwear', 'Boxers',     '🩳', false, false, 4, NOW()),
  ('csc_und_3', 'ccat_underwear', 'Bras',       '👙', false, false, 5, NOW()),
  ('csc_und_4', 'ccat_underwear', 'Undershirts','🩱', false, false, 6, NOW()),
  ('csc_und_5', 'ccat_underwear', 'Socks',      '🧦', false, false, 7, NOW()),
  -- Intimates: Sleepwear (ccat_sleepwear) — all missing
  ('csc_slp_1', 'ccat_sleepwear', 'Pajamas',    '😴', false, false, 1, NOW()),
  ('csc_slp_2', 'ccat_sleepwear', 'Nightgowns', '🛌', false, false, 2, NOW()),
  ('csc_slp_3', 'ccat_sleepwear', 'Sleep socks','🧦', false, false, 3, NOW()),
  ('csc_slp_4', 'ccat_sleepwear', 'Robes',      '🧥', false, false, 4, NOW()),
  ('csc_slp_5', 'ccat_sleepwear', 'Lounge sets','🩳', false, false, 5, NOW()),
  -- Activewear: Sportswear (ccat_sportswear) — existing: Gym Shorts, Track Pants & Joggers, Training Shirts
  ('csc_spt_1', 'ccat_sportswear', 'Track Pants',  '👖', false, false, 4, NOW()),
  ('csc_spt_2', 'ccat_sportswear', 'Track Jackets','🧥', false, false, 5, NOW()),
  ('csc_spt_3', 'ccat_sportswear', 'Sports Socks', '🧦', false, false, 6, NOW()),
  -- Activewear: Athleisure (ccat_athleisure) — all missing
  ('csc_ath_1', 'ccat_athleisure', 'Joggers',   '🩳', false, false, 1, NOW()),
  ('csc_ath_2', 'ccat_athleisure', 'Sweat Tees','👕', false, false, 2, NOW()),
  ('csc_ath_3', 'ccat_athleisure', 'Hoodies',   '🧥', false, false, 3, NOW()),
  ('csc_ath_4', 'ccat_athleisure', 'Leggings',  '👖', false, false, 4, NOW()),
  ('csc_ath_5', 'ccat_athleisure', 'Caps',       '🧢', false, false, 5, NOW()),
  -- Specialty: Cultural Wear (ccat_cultural_wear) — all missing
  ('csc_clt_1', 'ccat_cultural_wear', 'Hijabs',              '🧕', false, false, 1, NOW()),
  ('csc_clt_2', 'ccat_cultural_wear', 'Traditional garments','👘', false, false, 2, NOW()),
  ('csc_clt_3', 'ccat_cultural_wear', 'Embroidered wear',    '🪡', false, false, 3, NOW()),
  ('csc_clt_4', 'ccat_cultural_wear', 'Long tunics',         '🧥', false, false, 4, NOW()),
  -- Specialty: Workwear (ccat_workwear) — existing: Aprons, Uniforms
  ('csc_wrk_1', 'ccat_workwear', 'Work pants',    '👖', false, false, 3, NOW()),
  ('csc_wrk_2', 'ccat_workwear', 'Safety boots',  '🥾', false, false, 4, NOW()),
  ('csc_wrk_3', 'ccat_workwear', 'Reflective wear','🦺', false, false, 5, NOW()),
  -- Specialty: Formal & Event Wear (ccat_formal_wear) — existing: Evening Gowns, Suits & Blazers
  ('csc_frm_1', 'ccat_formal_wear', 'Suits',       '🤵', false, false, 3, NOW()),
  ('csc_frm_2', 'ccat_formal_wear', 'Evening gowns','👗', false, false, 4, NOW()),
  ('csc_frm_3', 'ccat_formal_wear', 'Dress shirts', '👔', false, false, 5, NOW()),
  ('csc_frm_4', 'ccat_formal_wear', 'Formal shoes', '👠', false, false, 6, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;
