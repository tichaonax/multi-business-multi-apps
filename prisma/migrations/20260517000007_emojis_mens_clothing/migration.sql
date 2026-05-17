-- Add emojis to Men's Clothing subcategories
-- Source: 👔 Men's Clothing Categories.md, undewear.md
-- IDEMPOTENT: safe to re-run

-- MEN'S TOPS (ccat_mens_tops)
UPDATE inventory_subcategories SET emoji = '👕' WHERE id = 'sub_mc_top_graphic';
UPDATE inventory_subcategories SET emoji = '👕' WHERE id = 'sub_mc_top_plain';
UPDATE inventory_subcategories SET emoji = '👕' WHERE id = 'sub_mc_top_longsleeve';
UPDATE inventory_subcategories SET emoji = '👔' WHERE id = 'sub_mc_top_casual_btn';
UPDATE inventory_subcategories SET emoji = '🧶' WHERE id = 'sub_mc_top_knit';
UPDATE inventory_subcategories SET emoji = '🎽' WHERE id = 'sub_mc_top_tank';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_mc_top_henley';
UPDATE inventory_subcategories SET emoji = '👕' WHERE id = 'sub_mc_top_thermal';
UPDATE inventory_subcategories SET emoji = '👕' WHERE id = 'sub_mc_top_undershirt';
UPDATE inventory_subcategories SET emoji = '👔' WHERE id = 'sub_mc_top_slim';
UPDATE inventory_subcategories SET emoji = '👔' WHERE id = 'sub_mc_top_printed';
UPDATE inventory_subcategories SET emoji = '👔' WHERE id = 'sub_mc_top_cuban';
UPDATE inventory_subcategories SET emoji = '👔' WHERE id = 'sub_mc_top_overshirt';
UPDATE inventory_subcategories SET emoji = '👔' WHERE id = 'sub_mc_top_statement';
UPDATE inventory_subcategories SET emoji = '👔' WHERE id = 'sub_mc_top_satin';
UPDATE inventory_subcategories SET emoji = '👔' WHERE id = 'sub_mc_top_streetwear';
UPDATE inventory_subcategories SET emoji = '👕' WHERE id = 'sub_mc_top_designer';

-- MEN'S OUTERWEAR (ccat_mens_outerwear)
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_mc_out_lightweight';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_mc_out_windbreaker';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_mc_out_denim';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_mc_out_bomber';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_mc_out_hooded';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_mc_out_fleece';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_mc_out_track';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_mc_out_parka';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_mc_out_puffer';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_mc_out_wool';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_mc_out_trench';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_mc_out_overcoat';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_mc_out_peacoat';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_mc_out_leather';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_mc_out_suede';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_mc_out_designer';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_mc_out_statement';

-- MEN'S BOTTOMS (ccat_mens_bottoms)
UPDATE inventory_subcategories SET emoji = '👖' WHERE id = 'sub_mc_bot_slim_jeans';
UPDATE inventory_subcategories SET emoji = '👖' WHERE id = 'sub_mc_bot_str_jeans';
UPDATE inventory_subcategories SET emoji = '👖' WHERE id = 'sub_mc_bot_rel_jeans';
UPDATE inventory_subcategories SET emoji = '👖' WHERE id = 'sub_mc_bot_chinos';
UPDATE inventory_subcategories SET emoji = '👖' WHERE id = 'sub_mc_bot_cargo';
UPDATE inventory_subcategories SET emoji = '👖' WHERE id = 'sub_mc_bot_sweatpants';
UPDATE inventory_subcategories SET emoji = '🩳' WHERE id = 'sub_mc_bot_denim_shorts';
UPDATE inventory_subcategories SET emoji = '🩳' WHERE id = 'sub_mc_bot_cargo_shorts';
UPDATE inventory_subcategories SET emoji = '🩳' WHERE id = 'sub_mc_bot_ath_shorts';
UPDATE inventory_subcategories SET emoji = '🩳' WHERE id = 'sub_mc_bot_swimtrunks';
UPDATE inventory_subcategories SET emoji = '👖' WHERE id = 'sub_mc_bot_tailored';
UPDATE inventory_subcategories SET emoji = '👖' WHERE id = 'sub_mc_bot_cropped';

-- MEN'S SUITS & FORMALWEAR (cat_mc_suits)
UPDATE inventory_subcategories SET emoji = '👔' WHERE id = 'sub_mc_suit_jacket';
UPDATE inventory_subcategories SET emoji = '👔' WHERE id = 'sub_mc_suit_pants';
UPDATE inventory_subcategories SET emoji = '👔' WHERE id = 'sub_mc_suit_full';
UPDATE inventory_subcategories SET emoji = '👔' WHERE id = 'sub_mc_suit_blazer';
UPDATE inventory_subcategories SET emoji = '👔' WHERE id = 'sub_mc_suit_sport';
UPDATE inventory_subcategories SET emoji = '👔' WHERE id = 'sub_mc_suit_vest';
UPDATE inventory_subcategories SET emoji = '🎩' WHERE id = 'sub_mc_suit_tux';
UPDATE inventory_subcategories SET emoji = '🎩' WHERE id = 'sub_mc_suit_dinner';
UPDATE inventory_subcategories SET emoji = '🎩' WHERE id = 'sub_mc_suit_formal_tr';
UPDATE inventory_subcategories SET emoji = '🎩' WHERE id = 'sub_mc_suit_waistcoat';

-- MEN'S SWEATERS & KNITS (cat_mc_knitwear)
UPDATE inventory_subcategories SET emoji = '🧶' WHERE id = 'sub_mc_knit_crewneck';
UPDATE inventory_subcategories SET emoji = '🧶' WHERE id = 'sub_mc_knit_vneck';
UPDATE inventory_subcategories SET emoji = '🧶' WHERE id = 'sub_mc_knit_cardigan';
UPDATE inventory_subcategories SET emoji = '🧶' WHERE id = 'sub_mc_knit_turtle';
UPDATE inventory_subcategories SET emoji = '🧶' WHERE id = 'sub_mc_knit_quartzip';
UPDATE inventory_subcategories SET emoji = '🧶' WHERE id = 'sub_mc_knit_pullover';
UPDATE inventory_subcategories SET emoji = '🧶' WHERE id = 'sub_mc_knit_hoodie';

-- MEN'S ACTIVEWEAR (cat_mc_activewear)
UPDATE inventory_subcategories SET emoji = '🏋️' WHERE id = 'sub_mc_act_perf_tee';
UPDATE inventory_subcategories SET emoji = '🏋️' WHERE id = 'sub_mc_act_compress';
UPDATE inventory_subcategories SET emoji = '🏋️' WHERE id = 'sub_mc_act_shorts';
UPDATE inventory_subcategories SET emoji = '🏋️' WHERE id = 'sub_mc_act_joggers';
UPDATE inventory_subcategories SET emoji = '🏋️' WHERE id = 'sub_mc_act_trackpants';
UPDATE inventory_subcategories SET emoji = '🏋️' WHERE id = 'sub_mc_act_hoodie';
UPDATE inventory_subcategories SET emoji = '🏋️' WHERE id = 'sub_mc_act_sweatshirt';
UPDATE inventory_subcategories SET emoji = '🏋️' WHERE id = 'sub_mc_act_jacket';

-- MEN'S UNDERWEAR & LOUNGEWEAR (cat_mc_underwear)
UPDATE inventory_subcategories SET emoji = '🧦' WHERE id = 'sub_mc_uw_boxers';
UPDATE inventory_subcategories SET emoji = '🧦' WHERE id = 'sub_mc_uw_briefs';
UPDATE inventory_subcategories SET emoji = '🧦' WHERE id = 'sub_mc_uw_boxbrief';
UPDATE inventory_subcategories SET emoji = '🧦' WHERE id = 'sub_mc_uw_trunks';
UPDATE inventory_subcategories SET emoji = '🧦' WHERE id = 'sub_mc_uw_undershirt';
UPDATE inventory_subcategories SET emoji = '🛌' WHERE id = 'sub_mc_uw_pjset';
UPDATE inventory_subcategories SET emoji = '🛌' WHERE id = 'sub_mc_uw_loungepants';
UPDATE inventory_subcategories SET emoji = '🛌' WHERE id = 'sub_mc_uw_sleepshorts';
UPDATE inventory_subcategories SET emoji = '🛌' WHERE id = 'sub_mc_uw_robes';
UPDATE inventory_subcategories SET emoji = '🧦' WHERE id = 'sub_mc_uw_thermal';
UPDATE inventory_subcategories SET emoji = '🩳' WHERE id = 'sub_mc_uw_loungesh';
UPDATE inventory_subcategories SET emoji = '🏃' WHERE id = 'sub_mc_uw_sports';
UPDATE inventory_subcategories SET emoji = '🧘' WHERE id = 'sub_mc_uw_seamless';
UPDATE inventory_subcategories SET emoji = '🧺' WHERE id = 'sub_mc_uw_cotton';

-- MEN'S ACCESSORIES (cat_mc_accessories)
UPDATE inventory_subcategories SET emoji = '🧢' WHERE id = 'sub_mc_acc_hats';
UPDATE inventory_subcategories SET emoji = '🧣' WHERE id = 'sub_mc_acc_scarves';
UPDATE inventory_subcategories SET emoji = '🧤' WHERE id = 'sub_mc_acc_gloves';
UPDATE inventory_subcategories SET emoji = '🧦' WHERE id = 'sub_mc_acc_socks';
UPDATE inventory_subcategories SET emoji = '👔' WHERE id = 'sub_mc_acc_ties';
UPDATE inventory_subcategories SET emoji = '👔' WHERE id = 'sub_mc_acc_bowtie';
UPDATE inventory_subcategories SET emoji = '👔' WHERE id = 'sub_mc_acc_pocket';
UPDATE inventory_subcategories SET emoji = '🧵' WHERE id = 'sub_mc_acc_belts';
UPDATE inventory_subcategories SET emoji = '🎒' WHERE id = 'sub_mc_acc_bags';
UPDATE inventory_subcategories SET emoji = '⌚' WHERE id = 'sub_mc_acc_watches';
UPDATE inventory_subcategories SET emoji = '🕶️' WHERE id = 'sub_mc_acc_sunglasses';

-- MEN'S FOOTWEAR (ccat_mens_footwear)
UPDATE inventory_subcategories SET emoji = '👟' WHERE id = 'sub_mc_fw_slipon';
UPDATE inventory_subcategories SET emoji = '👟' WHERE id = 'sub_mc_fw_loafers';
UPDATE inventory_subcategories SET emoji = '👟' WHERE id = 'sub_mc_fw_boatshoes';
UPDATE inventory_subcategories SET emoji = '👞' WHERE id = 'sub_mc_fw_oxfords';
UPDATE inventory_subcategories SET emoji = '👞' WHERE id = 'sub_mc_fw_derbies';
UPDATE inventory_subcategories SET emoji = '👞' WHERE id = 'sub_mc_fw_monk';
UPDATE inventory_subcategories SET emoji = '👞' WHERE id = 'sub_mc_fw_dressloafer';
UPDATE inventory_subcategories SET emoji = '🥾' WHERE id = 'sub_mc_fw_chelsea';
UPDATE inventory_subcategories SET emoji = '🥾' WHERE id = 'sub_mc_fw_chukka';
UPDATE inventory_subcategories SET emoji = '🥾' WHERE id = 'sub_mc_fw_workboots';
UPDATE inventory_subcategories SET emoji = '🥾' WHERE id = 'sub_mc_fw_hiking';
UPDATE inventory_subcategories SET emoji = '🩴' WHERE id = 'sub_mc_fw_slides';
UPDATE inventory_subcategories SET emoji = '🩴' WHERE id = 'sub_mc_fw_flipflops';

-- MEN'S SPECIALTY & SEASONAL (cat_mc_specialty)
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_mc_sp_rainwear';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_mc_sp_snow';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_mc_sp_workwear';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_mc_sp_uniforms';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_mc_sp_safety';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_mc_sp_bigtall';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_mc_sp_adaptive';
