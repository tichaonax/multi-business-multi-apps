-- Add emojis to Girls' Clothing subcategories
-- Source: 🎀 Girls' Clothing Categories.md
-- IDEMPOTENT: safe to re-run

-- GIRLS TOPS (cat_girl_tops)
UPDATE inventory_subcategories SET emoji = '👕' WHERE id = 'sub_girl_top_tshirts';
UPDATE inventory_subcategories SET emoji = '👚' WHERE id = 'sub_gt_top_blouses';
UPDATE inventory_subcategories SET emoji = '🎽' WHERE id = 'sub_gt_top_tank';
UPDATE inventory_subcategories SET emoji = '👕' WHERE id = 'sub_girl_top_longsleeve';
UPDATE inventory_subcategories SET emoji = '🧵' WHERE id = 'sub_gt_top_cami';
UPDATE inventory_subcategories SET emoji = '👕' WHERE id = 'sub_girl_top_graphic';
UPDATE inventory_subcategories SET emoji = '🧶' WHERE id = 'sub_gt_top_knit';
UPDATE inventory_subcategories SET emoji = '🧶' WHERE id = 'sub_girl_top_cardigan';
UPDATE inventory_subcategories SET emoji = '👕' WHERE id = 'sub_gt_top_polo';
UPDATE inventory_subcategories SET emoji = '👚' WHERE id = 'sub_gt_top_tunic';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_gt_top_layer';
UPDATE inventory_subcategories SET emoji = '👚' WHERE id = 'sub_gt_top_peplum';
UPDATE inventory_subcategories SET emoji = '👚' WHERE id = 'sub_gt_top_ruffle';
UPDATE inventory_subcategories SET emoji = '👚' WHERE id = 'sub_gt_top_offshoulder';
UPDATE inventory_subcategories SET emoji = '👚' WHERE id = 'sub_gt_top_crop';
UPDATE inventory_subcategories SET emoji = '👚' WHERE id = 'sub_gt_top_halter';
UPDATE inventory_subcategories SET emoji = '👚' WHERE id = 'sub_gt_top_sequin';
UPDATE inventory_subcategories SET emoji = '👚' WHERE id = 'sub_gt_top_lace';
UPDATE inventory_subcategories SET emoji = '👚' WHERE id = 'sub_gt_top_embellished';
UPDATE inventory_subcategories SET emoji = '👚' WHERE id = 'sub_gt_top_statement';

-- GIRLS DRESSES (cat_girl_dresses)
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_gt_dr_tshirt';
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_girl_dr_baby';
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_girl_dr_casual';
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_gt_dr_cotton';
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_gt_dr_play';
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_girl_dr_party';
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_gt_dr_sundress';
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_girl_dr_rompers';
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_gt_dr_holiday';
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_gt_dr_birthday';
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_gt_dr_flowergirl';
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_gt_dr_formal';
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_gt_dr_maxi';
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_gt_dr_midi';
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_gt_dr_skater';
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_gt_dr_tiered';
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_gt_dr_tutu';

-- GIRLS BOTTOMS (cat_girl_bottoms)
UPDATE inventory_subcategories SET emoji = '👖' WHERE id = 'sub_gt_bot_jeggings';
UPDATE inventory_subcategories SET emoji = '👖' WHERE id = 'sub_girl_bot_pullon';
UPDATE inventory_subcategories SET emoji = '🩳' WHERE id = 'sub_girl_bot_shorts';
UPDATE inventory_subcategories SET emoji = '👖' WHERE id = 'sub_gt_bot_casual';
UPDATE inventory_subcategories SET emoji = '👖' WHERE id = 'sub_gt_bot_chinos';
UPDATE inventory_subcategories SET emoji = '👖' WHERE id = 'sub_girl_bot_leggings';
UPDATE inventory_subcategories SET emoji = '👖' WHERE id = 'sub_girl_bot_jeans';
UPDATE inventory_subcategories SET emoji = '👖' WHERE id = 'sub_gt_bot_joggers';
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_girl_bot_skirts';
UPDATE inventory_subcategories SET emoji = '👖' WHERE id = 'sub_gt_bot_sweatpants';
UPDATE inventory_subcategories SET emoji = '🩳' WHERE id = 'sub_gt_bot_denim_sh';
UPDATE inventory_subcategories SET emoji = '🩳' WHERE id = 'sub_gt_bot_ath_sh';
UPDATE inventory_subcategories SET emoji = '🩳' WHERE id = 'sub_gt_bot_bike_sh';
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_gt_bot_skorts';
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_gt_bot_denim_sk';
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_gt_bot_pleated';
UPDATE inventory_subcategories SET emoji = '👗' WHERE id = 'sub_gt_bot_tulle';

-- GIRLS OUTERWEAR (cat_girl_outer)
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_gt_ow_denim';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_girl_ow_jacket';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_gt_ow_bomber';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_girl_ow_hoodie';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_gt_ow_zipup';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_girl_ow_coat';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_gt_ow_fleece';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_girl_ow_rain';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_gt_ow_parka';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_girl_ow_puffer';
UPDATE inventory_subcategories SET emoji = '🧤' WHERE id = 'sub_girl_ow_gloves';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_gt_ow_wool';
UPDATE inventory_subcategories SET emoji = '🧣' WHERE id = 'sub_girl_ow_scarves';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_gt_ow_snow';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_gt_ow_fauxfur';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_gt_ow_sequin';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_gt_ow_statement';

-- GIRLS SWEATERS & HOODIES (cat_girl_knitwear)
UPDATE inventory_subcategories SET emoji = '🧶' WHERE id = 'sub_gt_kn_sweaters';
UPDATE inventory_subcategories SET emoji = '🧶' WHERE id = 'sub_gt_kn_cardigans';
UPDATE inventory_subcategories SET emoji = '🧶' WHERE id = 'sub_gt_kn_pullovers';
UPDATE inventory_subcategories SET emoji = '🧶' WHERE id = 'sub_gt_kn_turtleneck';
UPDATE inventory_subcategories SET emoji = '🧶' WHERE id = 'sub_gt_kn_knithood';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_gt_kn_hoodies';
UPDATE inventory_subcategories SET emoji = '🧥' WHERE id = 'sub_gt_kn_sweatshirt';

-- GIRLS SCHOOL WEAR (cat_girl_schoolwear)
UPDATE inventory_subcategories SET emoji = '🏫' WHERE id = 'sub_gt_sc_uni_top';
UPDATE inventory_subcategories SET emoji = '🏫' WHERE id = 'sub_gt_sc_uni_skirt';
UPDATE inventory_subcategories SET emoji = '🏫' WHERE id = 'sub_gt_sc_uni_pants';
UPDATE inventory_subcategories SET emoji = '🏫' WHERE id = 'sub_gt_sc_polo';
UPDATE inventory_subcategories SET emoji = '🏫' WHERE id = 'sub_gt_sc_blazer';
UPDATE inventory_subcategories SET emoji = '🏫' WHERE id = 'sub_gt_sc_sweater';
UPDATE inventory_subcategories SET emoji = '🏫' WHERE id = 'sub_gt_sc_jumper';

-- GIRLS ACTIVEWEAR (cat_girl_activewear)
UPDATE inventory_subcategories SET emoji = '🏃' WHERE id = 'sub_gt_act_tops';
UPDATE inventory_subcategories SET emoji = '🏃' WHERE id = 'sub_gt_act_sportsbra';
UPDATE inventory_subcategories SET emoji = '🏃' WHERE id = 'sub_gt_act_leggings';
UPDATE inventory_subcategories SET emoji = '🏃' WHERE id = 'sub_gt_act_joggers';
UPDATE inventory_subcategories SET emoji = '🏃' WHERE id = 'sub_gt_act_shorts';
UPDATE inventory_subcategories SET emoji = '🏃' WHERE id = 'sub_gt_act_tracksuit';
UPDATE inventory_subcategories SET emoji = '🏃' WHERE id = 'sub_gt_act_jacket';

-- GIRLS SLEEPWEAR (cat_girl_sleep)
UPDATE inventory_subcategories SET emoji = '💤' WHERE id = 'sub_girl_sl_pjset';
UPDATE inventory_subcategories SET emoji = '💤' WHERE id = 'sub_gt_sl_onesies';
UPDATE inventory_subcategories SET emoji = '🛋️' WHERE id = 'sub_gt_sl_loungeset';
UPDATE inventory_subcategories SET emoji = '💤' WHERE id = 'sub_girl_sl_nightgown';
UPDATE inventory_subcategories SET emoji = '🛋️' WHERE id = 'sub_gt_sl_loungepan';
UPDATE inventory_subcategories SET emoji = '💤' WHERE id = 'sub_girl_sl_shirt';
UPDATE inventory_subcategories SET emoji = '🧦' WHERE id = 'sub_girl_sl_socks';
UPDATE inventory_subcategories SET emoji = '🛋️' WHERE id = 'sub_gt_sl_cozytop';
UPDATE inventory_subcategories SET emoji = '🛋️' WHERE id = 'sub_gt_sl_robes';

-- GIRLS UNDERWEAR & ESSENTIALS (cat_girl_underwear)
UPDATE inventory_subcategories SET emoji = '🧦' WHERE id = 'sub_gt_uw_underwear';
UPDATE inventory_subcategories SET emoji = '🧦' WHERE id = 'sub_gt_uw_trainingbra';
UPDATE inventory_subcategories SET emoji = '🧦' WHERE id = 'sub_gt_uw_socks';
UPDATE inventory_subcategories SET emoji = '🧦' WHERE id = 'sub_gt_uw_tights';
UPDATE inventory_subcategories SET emoji = '🧦' WHERE id = 'sub_gt_uw_legwarmers';
UPDATE inventory_subcategories SET emoji = '🧦' WHERE id = 'sub_gt_uw_undershirt';

-- GIRLS FOOTWEAR (cat_girl_footwear)
UPDATE inventory_subcategories SET emoji = '👟' WHERE id = 'sub_gt_fw_slipon';
UPDATE inventory_subcategories SET emoji = '👟' WHERE id = 'sub_girl_fw_sneakers';
UPDATE inventory_subcategories SET emoji = '👟' WHERE id = 'sub_girl_fw_firstwalker';
UPDATE inventory_subcategories SET emoji = '👟' WHERE id = 'sub_gt_fw_canvas';
UPDATE inventory_subcategories SET emoji = '🎀' WHERE id = 'sub_gt_fw_ballet';
UPDATE inventory_subcategories SET emoji = '🥾' WHERE id = 'sub_girl_fw_boots';
UPDATE inventory_subcategories SET emoji = '🎀' WHERE id = 'sub_gt_fw_maryjane';
UPDATE inventory_subcategories SET emoji = '🩴' WHERE id = 'sub_girl_fw_sandals';
UPDATE inventory_subcategories SET emoji = '🎀' WHERE id = 'sub_gt_fw_dresssand';
UPDATE inventory_subcategories SET emoji = '👟' WHERE id = 'sub_girl_fw_flats';
UPDATE inventory_subcategories SET emoji = '🥾' WHERE id = 'sub_gt_fw_ankle';
UPDATE inventory_subcategories SET emoji = '🥾' WHERE id = 'sub_gt_fw_winter';
UPDATE inventory_subcategories SET emoji = '🥾' WHERE id = 'sub_gt_fw_rain';
UPDATE inventory_subcategories SET emoji = '🩴' WHERE id = 'sub_gt_fw_flipflops';
UPDATE inventory_subcategories SET emoji = '🩴' WHERE id = 'sub_gt_fw_slides';

-- GIRLS ACCESSORIES (cat_girl_acc)
UPDATE inventory_subcategories SET emoji = '🎀' WHERE id = 'sub_girl_acc_headbands';
UPDATE inventory_subcategories SET emoji = '🎀' WHERE id = 'sub_gt_acc_hairbows';
UPDATE inventory_subcategories SET emoji = '🧢' WHERE id = 'sub_girl_acc_hats';
UPDATE inventory_subcategories SET emoji = '🧣' WHERE id = 'sub_gt_acc_scarves';
UPDATE inventory_subcategories SET emoji = '🧣' WHERE id = 'sub_girl_acc_bibs';
UPDATE inventory_subcategories SET emoji = '🧤' WHERE id = 'sub_gt_acc_gloves';
UPDATE inventory_subcategories SET emoji = '👜' WHERE id = 'sub_gt_acc_bags';
UPDATE inventory_subcategories SET emoji = '🧦' WHERE id = 'sub_girl_acc_socks';
UPDATE inventory_subcategories SET emoji = '🎒' WHERE id = 'sub_gt_acc_backpacks';
UPDATE inventory_subcategories SET emoji = '🎒' WHERE id = 'sub_girl_acc_bags';
UPDATE inventory_subcategories SET emoji = '💍' WHERE id = 'sub_girl_acc_jewelry';
UPDATE inventory_subcategories SET emoji = '🕶️' WHERE id = 'sub_gt_acc_sunnies';
UPDATE inventory_subcategories SET emoji = '⌚' WHERE id = 'sub_gt_acc_watches';

-- GIRLS SPECIALTY & SEASONAL (cat_girl_specialty)
UPDATE inventory_subcategories SET emoji = '🧸' WHERE id = 'sub_gt_sp_costumes';
UPDATE inventory_subcategories SET emoji = '🎃' WHERE id = 'sub_gt_sp_halloween';
UPDATE inventory_subcategories SET emoji = '🎄' WHERE id = 'sub_gt_sp_holiday';
UPDATE inventory_subcategories SET emoji = '🌸' WHERE id = 'sub_gt_sp_easter';
UPDATE inventory_subcategories SET emoji = '🏖️' WHERE id = 'sub_gt_sp_swimwear';
UPDATE inventory_subcategories SET emoji = '🏖️' WHERE id = 'sub_gt_sp_coverup';
UPDATE inventory_subcategories SET emoji = '❄️' WHERE id = 'sub_gt_sp_snowsuit';
UPDATE inventory_subcategories SET emoji = '🌧️' WHERE id = 'sub_gt_sp_raingear';
UPDATE inventory_subcategories SET emoji = '📏' WHERE id = 'sub_gt_sp_plussize';
UPDATE inventory_subcategories SET emoji = '🧵' WHERE id = 'sub_gt_sp_adaptive';
