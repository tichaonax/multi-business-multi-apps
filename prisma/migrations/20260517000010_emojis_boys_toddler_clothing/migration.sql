-- Add emojis to Boys' and Toddler clothing subcategories
-- Source: Mixed baby boys, girls and boys too.md, 🧸 Toddler Clothing Categories.md,
--         🧸 Toddlers' Clothing Categories.md
-- IDEMPOTENT: safe to re-run

-- BOYS TOPS (cat_boy_tops)
UPDATE inventory_subcategories SET emoji = '👕' WHERE id = 'sub_boy_top_tshirts';
UPDATE inventory_subcategories SET emoji = '👕' WHERE id = 'sub_boy_top_longsleeve';
UPDATE inventory_subcategories SET emoji = '👕' WHERE id = 'sub_boy_top_graphic';
UPDATE inventory_subcategories SET emoji = '👕' WHERE id = 'sub_boy_top_polo';
UPDATE inventory_subcategories SET emoji = '👔' WHERE id = 'sub_boy_top_button';
UPDATE inventory_subcategories SET emoji = '🧶' WHERE id = 'sub_boy_top_sweater';

-- BOYS BOTTOMS (cat_boy_bottoms)
UPDATE inventory_subcategories SET emoji = '👖' WHERE id = 'sub_boy_bot_pullon';
UPDATE inventory_subcategories SET emoji = '🩳' WHERE id = 'sub_boy_bot_shorts';
UPDATE inventory_subcategories SET emoji = '👖' WHERE id = 'sub_boy_bot_joggers';
UPDATE inventory_subcategories SET emoji = '👖' WHERE id = 'sub_boy_bot_jeans';

-- BOYS SLEEPWEAR (cat_boy_sleep)
UPDATE inventory_subcategories SET emoji = '🌙' WHERE id = 'sub_boy_sl_pjset';
UPDATE inventory_subcategories SET emoji = '🛌' WHERE id = 'sub_boy_sl_footed';
UPDATE inventory_subcategories SET emoji = '👕' WHERE id = 'sub_boy_sl_shirt';
UPDATE inventory_subcategories SET emoji = '🧦' WHERE id = 'sub_boy_sl_socks';

-- BOYS OUTERWEAR (cat_boy_outer)
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_boy_ow_jacket';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_boy_ow_hoodie';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_boy_ow_coat';
UPDATE inventory_subcategories SET emoji = '🌧️' WHERE id = 'sub_boy_ow_rain';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_boy_ow_puffer';
UPDATE inventory_subcategories SET emoji = '🧤' WHERE id = 'sub_boy_ow_gloves';
UPDATE inventory_subcategories SET emoji = '🧣' WHERE id = 'sub_boy_ow_scarves';

-- BOYS FOOTWEAR (cat_boy_footwear)
UPDATE inventory_subcategories SET emoji = '👟' WHERE id = 'sub_boy_fw_sneakers';
UPDATE inventory_subcategories SET emoji = '👟' WHERE id = 'sub_boy_fw_firstwalker';
UPDATE inventory_subcategories SET emoji = '🥾' WHERE id = 'sub_boy_fw_boots';
UPDATE inventory_subcategories SET emoji = '🩴' WHERE id = 'sub_boy_fw_sandals';
UPDATE inventory_subcategories SET emoji = '👟' WHERE id = 'sub_boy_fw_soft';
UPDATE inventory_subcategories SET emoji = '👞' WHERE id = 'sub_boy_fw_dress';

-- BOYS ACCESSORIES (cat_boy_acc)
UPDATE inventory_subcategories SET emoji = '🧢' WHERE id = 'sub_boy_acc_hats';
UPDATE inventory_subcategories SET emoji = '🧣' WHERE id = 'sub_boy_acc_bibs';
UPDATE inventory_subcategories SET emoji = '🧦' WHERE id = 'sub_boy_acc_socks';
UPDATE inventory_subcategories SET emoji = '🎒' WHERE id = 'sub_boy_acc_bags';

-- TODDLER BABY BASICS (cat_td_baby_basics)
UPDATE inventory_subcategories SET emoji = '👕' WHERE id = 'sub_td_bb_onesies';
UPDATE inventory_subcategories SET emoji = '🛌' WHERE id = 'sub_td_bb_sleepers';
UPDATE inventory_subcategories SET emoji = '👖' WHERE id = 'sub_td_bb_pants';
UPDATE inventory_subcategories SET emoji = '🧣' WHERE id = 'sub_td_bb_bibs';
UPDATE inventory_subcategories SET emoji = '👒' WHERE id = 'sub_td_bb_hats';
UPDATE inventory_subcategories SET emoji = '🧤' WHERE id = 'sub_td_bb_mittens';
UPDATE inventory_subcategories SET emoji = '🧦' WHERE id = 'sub_td_bb_socks';
UPDATE inventory_subcategories SET emoji = '👟' WHERE id = 'sub_td_bb_shoes';
UPDATE inventory_subcategories SET emoji = '🧣' WHERE id = 'sub_td_bb_swaddle';

-- TODDLER TOPS (cat_td_tops)
UPDATE inventory_subcategories SET emoji = '👕' WHERE id = 'sub_td_top_tshirts';
UPDATE inventory_subcategories SET emoji = '👕' WHERE id = 'sub_td_top_longsleeve';
UPDATE inventory_subcategories SET emoji = '👕' WHERE id = 'sub_td_top_graphic';
UPDATE inventory_subcategories SET emoji = '👕' WHERE id = 'sub_td_top_play';
UPDATE inventory_subcategories SET emoji = '👕' WHERE id = 'sub_td_top_polo';
UPDATE inventory_subcategories SET emoji = '👔' WHERE id = 'sub_td_top_button';

-- TODDLER BOTTOMS (cat_td_bottoms)
UPDATE inventory_subcategories SET emoji = '👖' WHERE id = 'sub_td_bot_pullon';
UPDATE inventory_subcategories SET emoji = '👖' WHERE id = 'sub_td_bot_joggers';
UPDATE inventory_subcategories SET emoji = '🩳' WHERE id = 'sub_td_bot_shorts';
UPDATE inventory_subcategories SET emoji = '👖' WHERE id = 'sub_td_bot_jeans';
UPDATE inventory_subcategories SET emoji = '👖' WHERE id = 'sub_td_bot_dress';
UPDATE inventory_subcategories SET emoji = '👖' WHERE id = 'sub_td_bot_reinforced';
UPDATE inventory_subcategories SET emoji = '👖' WHERE id = 'sub_td_bot_overalls';
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_td_bot_skirts';

-- TODDLER DRESSES & ROMPERS (cat_td_dresses)
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_td_dr_casual';
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_td_dr_rompers';
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_td_dr_jumpsuits';
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_td_dr_party';
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_td_dr_neutral';

-- TODDLER KNITWEAR (cat_td_knitwear)
UPDATE inventory_subcategories SET emoji = '🧶' WHERE id = 'sub_td_kn_sweaters';
UPDATE inventory_subcategories SET emoji = '🧶' WHERE id = 'sub_td_kn_cardigans';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_td_kn_hoodies';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_td_kn_fleece';

-- TODDLER SLEEPWEAR (cat_td_sleepwear)
UPDATE inventory_subcategories SET emoji = '🛌' WHERE id = 'sub_td_sl_footed';
UPDATE inventory_subcategories SET emoji = '🌙' WHERE id = 'sub_td_sl_set';
UPDATE inventory_subcategories SET emoji = '👕' WHERE id = 'sub_td_sl_shirt';
UPDATE inventory_subcategories SET emoji = '🩳' WHERE id = 'sub_td_sl_shorts';
UPDATE inventory_subcategories SET emoji = '🧣' WHERE id = 'sub_td_sl_sacks';
UPDATE inventory_subcategories SET emoji = '🧦' WHERE id = 'sub_td_sl_socks';

-- TODDLER TRAINING & UNDERWEAR (cat_td_underwear)
UPDATE inventory_subcategories SET emoji = '🩲' WHERE id = 'sub_td_uw_training';
UPDATE inventory_subcategories SET emoji = '🩲' WHERE id = 'sub_td_uw_pullups';
UPDATE inventory_subcategories SET emoji = '🩲' WHERE id = 'sub_td_uw_underwear';
UPDATE inventory_subcategories SET emoji = '🧴' WHERE id = 'sub_td_uw_undershirts';
UPDATE inventory_subcategories SET emoji = '🩳' WHERE id = 'sub_td_uw_swimdiapers';
UPDATE inventory_subcategories SET emoji = '🧦' WHERE id = 'sub_td_uw_socks';

-- TODDLER ACTIVE & PLAYWEAR (cat_td_activewear)
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_td_ac_smocks';
UPDATE inventory_subcategories SET emoji = '🧢' WHERE id = 'sub_td_ac_upf';
UPDATE inventory_subcategories SET emoji = '🧢' WHERE id = 'sub_td_ac_rashguards';
UPDATE inventory_subcategories SET emoji = '👕' WHERE id = 'sub_td_ac_sets';
UPDATE inventory_subcategories SET emoji = '👟' WHERE id = 'sub_td_ac_sneakers';

-- TODDLER OUTERWEAR (cat_td_outerwear)
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_td_ow_jackets';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_td_ow_puffer';
UPDATE inventory_subcategories SET emoji = '🌧️' WHERE id = 'sub_td_ow_rain';
UPDATE inventory_subcategories SET emoji = '🧤' WHERE id = 'sub_td_ow_gloves';
UPDATE inventory_subcategories SET emoji = '🧣' WHERE id = 'sub_td_ow_scarves';
UPDATE inventory_subcategories SET emoji = '🥾' WHERE id = 'sub_td_ow_boots';

-- TODDLER FOOTWEAR (cat_td_footwear)
UPDATE inventory_subcategories SET emoji = '👶' WHERE id = 'sub_td_fw_crib';
UPDATE inventory_subcategories SET emoji = '👟' WHERE id = 'sub_td_fw_firstwalker';
UPDATE inventory_subcategories SET emoji = '🥾' WHERE id = 'sub_td_fw_boots';
UPDATE inventory_subcategories SET emoji = '🩴' WHERE id = 'sub_td_fw_sandals';
UPDATE inventory_subcategories SET emoji = '🥿' WHERE id = 'sub_td_fw_velcro';
UPDATE inventory_subcategories SET emoji = '🥾' WHERE id = 'sub_td_fw_rainboots';

-- TODDLER ACCESSORIES (cat_td_accessories)
UPDATE inventory_subcategories SET emoji = '🎀' WHERE id = 'sub_td_acc_headbands';
UPDATE inventory_subcategories SET emoji = '🧢' WHERE id = 'sub_td_acc_hats';
UPDATE inventory_subcategories SET emoji = '🧣' WHERE id = 'sub_td_acc_bibs';
UPDATE inventory_subcategories SET emoji = '🎒' WHERE id = 'sub_td_acc_bags';
UPDATE inventory_subcategories SET emoji = '🧦' WHERE id = 'sub_td_acc_socks';
UPDATE inventory_subcategories SET emoji = '🎀' WHERE id = 'sub_td_acc_hair';

-- TODDLER SPECIAL OCCASION (cat_td_occasion)
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_td_oc_party';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_td_oc_blazers';
UPDATE inventory_subcategories SET emoji = '👖' WHERE id = 'sub_td_oc_dresspants';
UPDATE inventory_subcategories SET emoji = '🎀' WHERE id = 'sub_td_oc_accessories';
UPDATE inventory_subcategories SET emoji = '👞' WHERE id = 'sub_td_oc_shoes';
