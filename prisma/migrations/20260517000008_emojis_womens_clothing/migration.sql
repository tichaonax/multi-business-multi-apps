-- Add emojis to Women's Clothing subcategories
-- Source: 👗 Women's Clothing Categories.md, undewear.md
-- IDEMPOTENT: safe to re-run

-- WOMEN'S TOPS (ccat_womens_tops)
UPDATE inventory_subcategories SET emoji = '👕' WHERE id = 'sub_wc_tops_tshirts';
UPDATE inventory_subcategories SET emoji = '👔' WHERE id = 'sub_wc_tops_button_down';
UPDATE inventory_subcategories SET emoji = '👒' WHERE id = 'sub_wc_tops_tunics';
UPDATE inventory_subcategories SET emoji = '🧶' WHERE id = 'sub_wc_tops_knit_tops';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_wc_tops_layer';
UPDATE inventory_subcategories SET emoji = '🎽' WHERE id = 'sub_wc_tops_tanks';
UPDATE inventory_subcategories SET emoji = '👕' WHERE id = 'sub_wc_tops_camis';
UPDATE inventory_subcategories SET emoji = '🧵' WHERE id = 'sub_wc_tops_bodysuits';
UPDATE inventory_subcategories SET emoji = '👚' WHERE id = 'sub_wc_tops_peplum';
UPDATE inventory_subcategories SET emoji = '👚' WHERE id = 'sub_wc_tops_wrap';
UPDATE inventory_subcategories SET emoji = '👚' WHERE id = 'sub_wc_tops_off_shoulder';
UPDATE inventory_subcategories SET emoji = '👚' WHERE id = 'sub_wc_tops_crop';
UPDATE inventory_subcategories SET emoji = '👚' WHERE id = 'sub_wc_tops_halter';
UPDATE inventory_subcategories SET emoji = '👚' WHERE id = 'sub_wc_tops_asymmetrical';
UPDATE inventory_subcategories SET emoji = '👚' WHERE id = 'sub_wc_tops_statement';
UPDATE inventory_subcategories SET emoji = '👚' WHERE id = 'sub_wc_tops_dressy';

-- WOMEN'S BOTTOMS (ccat_womens_bottoms)
UPDATE inventory_subcategories SET emoji = '👖' WHERE id = 'sub_wc_bot_wide_leg';
UPDATE inventory_subcategories SET emoji = '👖' WHERE id = 'sub_wc_bot_straight_leg';
UPDATE inventory_subcategories SET emoji = '👖' WHERE id = 'sub_wc_bot_skinny';
UPDATE inventory_subcategories SET emoji = '👖' WHERE id = 'sub_wc_bot_slacks';
UPDATE inventory_subcategories SET emoji = '👖' WHERE id = 'sub_wc_bot_trousers';
UPDATE inventory_subcategories SET emoji = '👖' WHERE id = 'sub_wc_bot_dress_pants';
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_wc_bot_pencil_skirt';
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_wc_bot_midi_skirt';

-- WOMEN'S DRESSES (cat_wc_dresses)
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_wc_dress_casual';
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_wc_dress_midi';
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_wc_dress_maxi';
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_wc_dress_mini';
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_wc_dress_bodycon';
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_wc_dress_wrap';
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_wc_dress_shift';
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_wc_dress_shirt';
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_wc_dress_sundress';
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_wc_dress_evening';
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_wc_dress_party';
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_wc_dress_cocktail';
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_wc_dress_gown';

-- WOMEN'S OUTERWEAR (cat_wc_outerwear)
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_wc_out_jacket';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_wc_out_blazer';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_wc_out_denim';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_wc_out_leather';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_wc_out_cardigan';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_wc_out_trench';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_wc_out_wool';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_wc_out_puffer';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_wc_out_raincoat';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_wc_out_parka';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_wc_out_vest';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_wc_out_bomber';

-- WOMEN'S KNITWEAR (cat_wc_knitwear)
UPDATE inventory_subcategories SET emoji = '🧶' WHERE id = 'sub_wc_knit_sweater';
UPDATE inventory_subcategories SET emoji = '🧶' WHERE id = 'sub_wc_knit_pullover';
UPDATE inventory_subcategories SET emoji = '🧶' WHERE id = 'sub_wc_knit_cardigan';
UPDATE inventory_subcategories SET emoji = '🧶' WHERE id = 'sub_wc_knit_turtle';
UPDATE inventory_subcategories SET emoji = '🧶' WHERE id = 'sub_wc_knit_chunky';
UPDATE inventory_subcategories SET emoji = '🧶' WHERE id = 'sub_wc_knit_vest';
UPDATE inventory_subcategories SET emoji = '🧶' WHERE id = 'sub_wc_knit_hooded';

-- WOMEN'S SWIMWEAR (cat_wc_swimwear)
UPDATE inventory_subcategories SET emoji = '🩱' WHERE id = 'sub_wc_swim_onepiece';
UPDATE inventory_subcategories SET emoji = '👙' WHERE id = 'sub_wc_swim_bikini';
UPDATE inventory_subcategories SET emoji = '🩱' WHERE id = 'sub_wc_swim_tankini';
UPDATE inventory_subcategories SET emoji = '👙' WHERE id = 'sub_wc_swim_bra';
UPDATE inventory_subcategories SET emoji = '👙' WHERE id = 'sub_wc_swim_bottom';
UPDATE inventory_subcategories SET emoji = '🩳' WHERE id = 'sub_wc_swim_shorts';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_wc_swim_coverup';
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_wc_swim_beach';
UPDATE inventory_subcategories SET emoji = '🩲' WHERE id = 'sub_wc_swim_rash';

-- WOMEN'S SLEEPWEAR & LOUNGEWEAR (cat_wc_sleepwear)
UPDATE inventory_subcategories SET emoji = '🌙' WHERE id = 'sub_wc_sleep_pyjamas';
UPDATE inventory_subcategories SET emoji = '👕' WHERE id = 'sub_wc_sleep_shirt';
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_wc_sleep_gown';
UPDATE inventory_subcategories SET emoji = '🩳' WHERE id = 'sub_wc_sleep_shorts';
UPDATE inventory_subcategories SET emoji = '👖' WHERE id = 'sub_wc_sleep_lounge';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_wc_sleep_robe';
UPDATE inventory_subcategories SET emoji = '🧦' WHERE id = 'sub_wc_sleep_socks';
UPDATE inventory_subcategories SET emoji = '👚' WHERE id = 'sub_wc_sleep_top';
UPDATE inventory_subcategories SET emoji = '👖' WHERE id = 'sub_wc_sleep_set';

-- WOMEN'S INTIMATES & SHAPEWEAR (cat_wc_intimates)
UPDATE inventory_subcategories SET emoji = '👙' WHERE id = 'sub_wc_int_bras';
UPDATE inventory_subcategories SET emoji = '🩲' WHERE id = 'sub_wc_int_panties';
UPDATE inventory_subcategories SET emoji = '🧷' WHERE id = 'sub_wc_int_cami';
UPDATE inventory_subcategories SET emoji = '🧷' WHERE id = 'sub_wc_int_slips';
UPDATE inventory_subcategories SET emoji = '🧷' WHERE id = 'sub_wc_int_bodysuit';
UPDATE inventory_subcategories SET emoji = '🧴' WHERE id = 'sub_wc_int_shapewear';
UPDATE inventory_subcategories SET emoji = '🧦' WHERE id = 'sub_wc_int_hosiery';
UPDATE inventory_subcategories SET emoji = '🧦' WHERE id = 'sub_wc_int_tights';
UPDATE inventory_subcategories SET emoji = '🧦' WHERE id = 'sub_wc_int_socks';
UPDATE inventory_subcategories SET emoji = '🧦' WHERE id = 'sub_wc_int_seamless';
UPDATE inventory_subcategories SET emoji = '🩲' WHERE id = 'sub_wc_int_briefs';
UPDATE inventory_subcategories SET emoji = '🩳' WHERE id = 'sub_wc_int_boyshorts';
UPDATE inventory_subcategories SET emoji = '🩲' WHERE id = 'sub_wc_int_hipsters';
UPDATE inventory_subcategories SET emoji = '👙' WHERE id = 'sub_wc_int_bralettes';
UPDATE inventory_subcategories SET emoji = '🧦' WHERE id = 'sub_wc_int_undershirt';
UPDATE inventory_subcategories SET emoji = '🧘' WHERE id = 'sub_wc_int_thermal';
UPDATE inventory_subcategories SET emoji = '🏃' WHERE id = 'sub_wc_int_sportsbra';
UPDATE inventory_subcategories SET emoji = '🧺' WHERE id = 'sub_wc_int_cotton';

-- WOMEN'S FOOTWEAR (cat_wc_footwear)
UPDATE inventory_subcategories SET emoji = '👠' WHERE id = 'sub_wc_shoe_heels';
UPDATE inventory_subcategories SET emoji = '🥿' WHERE id = 'sub_wc_shoe_flats';
UPDATE inventory_subcategories SET emoji = '👟' WHERE id = 'sub_wc_shoe_sneakers';
UPDATE inventory_subcategories SET emoji = '🩴' WHERE id = 'sub_wc_shoe_sandals';
UPDATE inventory_subcategories SET emoji = '🥾' WHERE id = 'sub_wc_shoe_boots';
UPDATE inventory_subcategories SET emoji = '👡' WHERE id = 'sub_wc_shoe_wedges';
UPDATE inventory_subcategories SET emoji = '🥿' WHERE id = 'sub_wc_shoe_loafers';
UPDATE inventory_subcategories SET emoji = '👠' WHERE id = 'sub_wc_shoe_pumps';
UPDATE inventory_subcategories SET emoji = '👢' WHERE id = 'sub_wc_shoe_ankle';
UPDATE inventory_subcategories SET emoji = '👢' WHERE id = 'sub_wc_shoe_knee';

-- WOMEN'S ACCESSORIES (cat_wc_accessories)
UPDATE inventory_subcategories SET emoji = '👜' WHERE id = 'sub_wc_acc_handbag';
UPDATE inventory_subcategories SET emoji = '👜' WHERE id = 'sub_wc_acc_tote';
UPDATE inventory_subcategories SET emoji = '👜' WHERE id = 'sub_wc_acc_crossbody';
UPDATE inventory_subcategories SET emoji = '👛' WHERE id = 'sub_wc_acc_clutch';
UPDATE inventory_subcategories SET emoji = '🧣' WHERE id = 'sub_wc_acc_scarf';
UPDATE inventory_subcategories SET emoji = '🧢' WHERE id = 'sub_wc_acc_hat';
UPDATE inventory_subcategories SET emoji = '🧤' WHERE id = 'sub_wc_acc_gloves';
UPDATE inventory_subcategories SET emoji = '🕶️' WHERE id = 'sub_wc_acc_sunglasses';
UPDATE inventory_subcategories SET emoji = '💍' WHERE id = 'sub_wc_acc_jewelry';
UPDATE inventory_subcategories SET emoji = '⌚' WHERE id = 'sub_wc_acc_watches';
UPDATE inventory_subcategories SET emoji = '🎀' WHERE id = 'sub_wc_acc_hair';
UPDATE inventory_subcategories SET emoji = '🧦' WHERE id = 'sub_wc_acc_hosiery';
UPDATE inventory_subcategories SET emoji = '💼' WHERE id = 'sub_wc_acc_belt';

-- WOMEN'S OUTFIT SETS (cat_wc_outfit_sets)
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_wc_set_ladies';
UPDATE inventory_subcategories SET emoji = '👚' WHERE id = 'sub_wc_set_matching';
UPDATE inventory_subcategories SET emoji = '👚' WHERE id = 'sub_wc_set_coords';
UPDATE inventory_subcategories SET emoji = '👖' WHERE id = 'sub_wc_set_two_piece';
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_wc_set_dress';
UPDATE inventory_subcategories SET emoji = '🧶' WHERE id = 'sub_wc_set_knit';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_wc_set_lounge';
UPDATE inventory_subcategories SET emoji = '🩳' WHERE id = 'sub_wc_set_shorts';
UPDATE inventory_subcategories SET emoji = '👖' WHERE id = 'sub_wc_set_pants';

-- WOMEN'S ACTIVEWEAR (cat_wc_activewear)
UPDATE inventory_subcategories SET emoji = '🧘' WHERE id = 'sub_wc_act_leggings';
UPDATE inventory_subcategories SET emoji = '🎽' WHERE id = 'sub_wc_act_sports_bra';
UPDATE inventory_subcategories SET emoji = '👕' WHERE id = 'sub_wc_act_tops';
UPDATE inventory_subcategories SET emoji = '🩳' WHERE id = 'sub_wc_act_shorts';
UPDATE inventory_subcategories SET emoji = '👖' WHERE id = 'sub_wc_act_joggers';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_wc_act_hoodie';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_wc_act_track';
UPDATE inventory_subcategories SET emoji = '🩳' WHERE id = 'sub_wc_act_tennis';
UPDATE inventory_subcategories SET emoji = '👟' WHERE id = 'sub_wc_act_shoes';

-- WOMEN'S WORKWEAR (cat_wc_workwear)
UPDATE inventory_subcategories SET emoji = '👚' WHERE id = 'sub_wc_work_blouse';
UPDATE inventory_subcategories SET emoji = '👔' WHERE id = 'sub_wc_work_shirt';
UPDATE inventory_subcategories SET emoji = '👖' WHERE id = 'sub_wc_work_pants';
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_wc_work_dress';
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_wc_work_skirt';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_wc_work_blazer';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_wc_work_set';
UPDATE inventory_subcategories SET emoji = '👠' WHERE id = 'sub_wc_work_shoes';

-- WOMEN'S OCCASION WEAR (cat_wc_occasion)
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_wc_occ_formal';
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_wc_occ_cocktail';
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_wc_occ_wedding';
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_wc_occ_bridesmaid';
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_wc_occ_graduation';
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_wc_occ_party';
UPDATE inventory_subcategories SET emoji = '👠' WHERE id = 'sub_wc_occ_shoes';
UPDATE inventory_subcategories SET emoji = '👜' WHERE id = 'sub_wc_occ_bag';
