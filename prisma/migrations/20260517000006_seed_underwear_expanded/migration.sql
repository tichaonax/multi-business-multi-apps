-- Seed Underwear Expanded Categories
-- Source: undewear.md
--
-- IDEMPOTENT: Uses ON CONFLICT DO NOTHING — safe to re-run
--
-- Adds new subcategories to existing underwear categories:
--   cat_mc_underwear ("Underwear & Loungewear") under cdom_mens
--   cat_wc_intimates ("Intimates & Shapewear") under cdom_womens

-- =============================================================================
-- MEN'S UNDERWEAR — expand existing cat_mc_underwear
-- Existing: Boxer briefs, Boxers, Briefs, Lounge pants, Pajama sets,
--           Robes, Sleep shorts, Trunks, Undershirts
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_mc_uw_thermal',    'Thermal underwear', 'cat_mc_underwear', NULL, 'Warm thermal base-layer underwear',   10, NOW()),
  ('sub_mc_uw_loungesh',   'Lounge shorts',     'cat_mc_underwear', NULL, 'Relaxed casual lounge shorts',        11, NOW()),
  ('sub_mc_uw_sports',     'Sports underwear',  'cat_mc_underwear', NULL, 'Supportive athletic underwear',       12, NOW()),
  ('sub_mc_uw_seamless',   'Seamless underwear','cat_mc_underwear', NULL, 'No-show seamless underwear',          13, NOW()),
  ('sub_mc_uw_cotton',     'Cotton underwear',  'cat_mc_underwear', NULL, 'Breathable everyday cotton underwear',14, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- WOMEN'S INTIMATES — expand existing cat_wc_intimates
-- Existing: Bodysuits, Bras, Camisoles, Hosiery, Panties,
--           Seamless underwear, Shapewear, Slips, Socks, Tights
-- =============================================================================

INSERT INTO inventory_subcategories (id, name, "categoryId", emoji, description, "displayOrder", "createdAt") VALUES
  ('sub_wc_int_briefs',    'Briefs',           'cat_wc_intimates', NULL, 'Full-coverage brief underwear',        11, NOW()),
  ('sub_wc_int_boyshorts', 'Boyshorts',        'cat_wc_intimates', NULL, 'Low-rise boyshort cut underwear',      12, NOW()),
  ('sub_wc_int_hipsters',  'Hipsters',         'cat_wc_intimates', NULL, 'Hip-hugging hipster underwear',        13, NOW()),
  ('sub_wc_int_bralettes', 'Bralettes',        'cat_wc_intimates', NULL, 'Unstructured soft bralettes',          14, NOW()),
  ('sub_wc_int_undershirt','Undershirts',       'cat_wc_intimates', NULL, 'Thin crew and tank undershirts',       15, NOW()),
  ('sub_wc_int_thermal',   'Thermal underwear','cat_wc_intimates', NULL, 'Warm thermal base-layer underwear',    16, NOW()),
  ('sub_wc_int_sportsbra', 'Sports bras',      'cat_wc_intimates', NULL, 'Low, medium and high-support sports bras', 17, NOW()),
  ('sub_wc_int_cotton',    'Cotton underwear', 'cat_wc_intimates', NULL, 'Breathable everyday cotton underwear', 18, NOW())
ON CONFLICT (id) DO NOTHING;
