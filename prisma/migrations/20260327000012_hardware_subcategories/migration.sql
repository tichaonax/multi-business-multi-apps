-- Migration 00012: Fill missing hardware subcategories
-- Source: Hardware Domains.md
-- Uses ON CONFLICT (categoryId, name) DO NOTHING to skip existing entries

INSERT INTO inventory_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "displayOrder", "createdAt")
VALUES
  -- Hand Tools (cat_hardware_hand_tools_001) — existing: Hammers, Measuring Tools, Screwdrivers, Wrenches
  ('hsc_ht_1', 'cat_hardware_hand_tools_001', 'Saws',  '🪚', false, false, 5, NOW()),
  ('hsc_ht_2', 'cat_hardware_hand_tools_001', 'Pliers','🗜️', false, false, 6, NOW()),
  -- Cutting Tools (cat_hw_cutting) — all missing
  ('hsc_ct_1', 'cat_hw_cutting', 'Drill bits',       '🪛', false, false, 1, NOW()),
  ('hsc_ct_2', 'cat_hw_cutting', 'Saw blades',       '🪚', false, false, 2, NOW()),
  ('hsc_ct_3', 'cat_hw_cutting', 'Tool belts',       '🧷', false, false, 3, NOW()),
  ('hsc_ct_4', 'cat_hw_cutting', 'Magnetic holders', '🧲', false, false, 4, NOW()),
  ('hsc_ct_5', 'cat_hw_cutting', 'Storage cases',    '🧰', false, false, 5, NOW()),
  -- Power Tools (cat_hardware_power_tools_001) — existing: Drills, Sanders, Saws
  ('hsc_pt_1', 'cat_hardware_power_tools_001', 'Impact drivers','🪛', false, false, 4, NOW()),
  ('hsc_pt_2', 'cat_hardware_power_tools_001', 'Grinders',      '🔩', false, false, 5, NOW()),
  ('hsc_pt_3', 'cat_hardware_power_tools_001', 'Rotary tools',  '🛠️', false, false, 6, NOW()),
  -- Screws & Nails (cat_hw_screws_nails) — existing: Drywall Screws, Nails, Wood Screws
  ('hsc_sn_1', 'cat_hw_screws_nails', 'Machine screws',       '🔩', false, false, 4, NOW()),
  ('hsc_sn_2', 'cat_hw_screws_nails', 'Sheet metal screws',   '🔩', false, false, 5, NOW()),
  ('hsc_sn_3', 'cat_hw_screws_nails', 'Self-tapping screws',  '🔩', false, false, 6, NOW()),
  ('hsc_sn_4', 'cat_hw_screws_nails', 'Finishing nails',      '🪙', false, false, 7, NOW()),
  ('hsc_sn_5', 'cat_hw_screws_nails', 'Roofing nails',        '🪙', false, false, 8, NOW()),
  ('hsc_sn_6', 'cat_hw_screws_nails', 'Brad nails',           '🪙', false, false, 9, NOW()),
  ('hsc_sn_7', 'cat_hw_screws_nails', 'Masonry nails',        '🪙', false, false, 10, NOW()),
  -- Bolts & Nuts (cat_hw_bolts_nuts) — existing: Coach Bolts & Washers, Hex Bolts & Nuts
  ('hsc_bn_1', 'cat_hw_bolts_nuts', 'Bolts',   '🔩', false, false, 3, NOW()),
  ('hsc_bn_2', 'cat_hw_bolts_nuts', 'Nuts',    '🔩', false, false, 4, NOW()),
  ('hsc_bn_3', 'cat_hw_bolts_nuts', 'Washers', '🧷', false, false, 5, NOW()),
  ('hsc_bn_4', 'cat_hw_bolts_nuts', 'Anchors', '🔩', false, false, 6, NOW()),
  ('hsc_bn_5', 'cat_hw_bolts_nuts', 'Rivets',  '🧲', false, false, 7, NOW()),
  -- Anchors & Adhesives (cat_hw_anchors) — existing: Construction Adhesive, Wall Plugs & Rawl Bolts
  ('hsc_an_1', 'cat_hw_anchors', 'Glue',              '🧴', false, false, 3, NOW()),
  ('hsc_an_2', 'cat_hw_anchors', 'Silicone sealant',  '🧴', false, false, 4, NOW()),
  ('hsc_an_3', 'cat_hw_anchors', 'Caulk',             '🧴', false, false, 5, NOW()),
  ('hsc_an_4', 'cat_hw_anchors', 'Epoxy',             '🧴', false, false, 6, NOW()),
  ('hsc_an_5', 'cat_hw_anchors', 'Toggle bolts',      '🪵', false, false, 7, NOW()),
  ('hsc_an_6', 'cat_hw_anchors', 'Concrete anchors',  '🧱', false, false, 8, NOW()),
  -- Timber & Board (cat_hw_timber) — existing: MDF & Chipboard, Plywood, Timber Planks
  ('hsc_tm_1', 'cat_hw_timber', 'Particle board',  '🪵', false, false, 4, NOW()),
  ('hsc_tm_2', 'cat_hw_timber', 'Treated lumber',  '🪵', false, false, 5, NOW()),
  ('hsc_tm_3', 'cat_hw_timber', 'OSB',             '🪵', false, false, 6, NOW()),
  ('hsc_tm_4', 'cat_hw_timber', 'Drywall sheets',  '🪵', false, false, 7, NOW()),
  ('hsc_tm_5', 'cat_hw_timber', 'Backer board',    '🪵', false, false, 8, NOW()),
  -- Cables & Wiring (cat_hw_cables) — existing: Conduit & Trunking, Single Core Cable, Twin & Earth Cable
  ('hsc_cw_1', 'cat_hw_cables', 'Extension cords',      '🔌', false, false, 4, NOW()),
  ('hsc_cw_2', 'cat_hw_cables', 'Cable reels',          '🔌', false, false, 5, NOW()),
  ('hsc_cw_3', 'cat_hw_cables', 'Wire connectors',      '🔌', false, false, 6, NOW()),
  -- Lighting (cat_hw_lighting) — existing: Fluorescent & Tubes, LED Bulbs
  ('hsc_lt_1', 'cat_hw_lighting', 'Floodlights',  '💡', false, false, 3, NOW()),
  ('hsc_lt_2', 'cat_hw_lighting', 'Work lights',  '💡', false, false, 4, NOW()),
  ('hsc_lt_3', 'cat_hw_lighting', 'Fixtures',     '💡', false, false, 5, NOW()),
  -- Switches & Sockets (cat_hw_switches) — all missing
  ('hsc_sw_1', 'cat_hw_switches', 'Junction boxes',  '🪛', false, false, 1, NOW()),
  ('hsc_sw_2', 'cat_hw_switches', 'Wire nuts',       '🔩', false, false, 2, NOW()),
  ('hsc_sw_3', 'cat_hw_switches', 'Cable ties',      '🧷', false, false, 3, NOW()),
  ('hsc_sw_4', 'cat_hw_switches', 'Circuit breakers','🧲', false, false, 4, NOW()),
  ('hsc_sw_5', 'cat_hw_switches', 'Panels',          '⚡', false, false, 5, NOW()),
  ('hsc_sw_6', 'cat_hw_switches', 'Batteries',       '🔋', false, false, 6, NOW()),
  ('hsc_sw_7', 'cat_hw_switches', 'Surge protectors','🧯', false, false, 7, NOW()),
  -- Pipes & Fittings (cat_hw_pipes) — existing: Galvanised Pipes, PVC Pipes & Fittings
  ('hsc_pf_1', 'cat_hw_pipes', 'Copper pipes', '🚰', false, false, 3, NOW()),
  ('hsc_pf_2', 'cat_hw_pipes', 'PEX pipes',    '🚰', false, false, 4, NOW()),
  ('hsc_pf_3', 'cat_hw_pipes', 'Elbows',       '🚰', false, false, 5, NOW()),
  ('hsc_pf_4', 'cat_hw_pipes', 'Couplings',    '🚰', false, false, 6, NOW()),
  ('hsc_pf_5', 'cat_hw_pipes', 'Valves',       '🚰', false, false, 7, NOW()),
  -- Taps & Valves (cat_hw_taps) — existing: Ball & Gate Valves, Basin & Sink Taps
  ('hsc_tv_1', 'cat_hw_taps', 'Shower heads', '🚿', false, false, 3, NOW()),
  ('hsc_tv_2', 'cat_hw_taps', 'Faucets',      '🚰', false, false, 4, NOW()),
  ('hsc_tv_3', 'cat_hw_taps', 'Sink drains',  '🧼', false, false, 5, NOW()),
  ('hsc_tv_4', 'cat_hw_taps', 'Plungers',     '🪠', false, false, 6, NOW()),
  ('hsc_tv_5', 'cat_hw_taps', 'Drain snakes', '🧰', false, false, 7, NOW()),
  -- Plumbing (cat_hardware_plumbing_001) — existing: Fittings, Pipes
  ('hsc_pl_1', 'cat_hardware_plumbing_001', 'Pipe cement',    '🧴', false, false, 3, NOW()),
  ('hsc_pl_2', 'cat_hardware_plumbing_001', 'Thread sealant', '🧴', false, false, 4, NOW()),
  ('hsc_pl_3', 'cat_hardware_plumbing_001', 'Gaskets',        '🧽', false, false, 5, NOW()),
  ('hsc_pl_4', 'cat_hardware_plumbing_001', 'O-rings',        '🧲', false, false, 6, NOW()),
  ('hsc_pl_5', 'cat_hardware_plumbing_001', 'Repair kits',    '🧰', false, false, 7, NOW()),
  -- Interior Paint (cat_hw_int_paint) — existing: Emulsion & Matt Paint, Enamel & Gloss
  ('hsc_ip_1', 'cat_hw_int_paint', 'Primer',         '🎨', false, false, 3, NOW()),
  ('hsc_ip_2', 'cat_hw_int_paint', 'Spray paint',    '🎨', false, false, 4, NOW()),
  ('hsc_ip_3', 'cat_hw_int_paint', 'Touch-up paint', '🎨', false, false, 5, NOW()),
  -- Exterior Paint (cat_hw_ext_paint) — existing: Masonry Paint, Roof Paint
  ('hsc_ep_1', 'cat_hw_ext_paint', 'Primer',        '🎨', false, false, 3, NOW()),
  ('hsc_ep_2', 'cat_hw_ext_paint', 'Spray paint',   '🎨', false, false, 4, NOW()),
  -- Primers & Undercoats (cat_hw_primers) — all missing
  ('hsc_pr_1', 'cat_hw_primers', 'Brushes',         '🖌️', false, false, 1, NOW()),
  ('hsc_pr_2', 'cat_hw_primers', 'Rollers',         '🧽', false, false, 2, NOW()),
  ('hsc_pr_3', 'cat_hw_primers', 'Drop cloths',     '🧻', false, false, 3, NOW()),
  ('hsc_pr_4', 'cat_hw_primers', 'Paint trays',     '🧪', false, false, 4, NOW()),
  ('hsc_pr_5', 'cat_hw_primers', 'Painter''s tape', '🩹', false, false, 5, NOW()),
  ('hsc_pr_6', 'cat_hw_primers', 'Varnish',         '✨', false, false, 6, NOW()),
  ('hsc_pr_7', 'cat_hw_primers', 'Stain',           '✨', false, false, 7, NOW()),
  ('hsc_pr_8', 'cat_hw_primers', 'Lacquer',         '✨', false, false, 8, NOW()),
  ('hsc_pr_9', 'cat_hw_primers', 'Sealers',         '✨', false, false, 9, NOW()),
  ('hsc_pr_10','cat_hw_primers', 'Putty',           '✨', false, false, 10, NOW()),
  -- Locks & Access (cat_hw_locks) — existing: Door Locks & Deadbolts, Padlocks
  ('hsc_lk_1', 'cat_hw_locks', 'Hinges',          '🚪', false, false, 3, NOW()),
  ('hsc_lk_2', 'cat_hw_locks', 'Door handles',    '🚪', false, false, 4, NOW()),
  ('hsc_lk_3', 'cat_hw_locks', 'Latches',         '🧷', false, false, 5, NOW()),
  ('hsc_lk_4', 'cat_hw_locks', 'Door closers',    '🪛', false, false, 6, NOW()),
  ('hsc_lk_5', 'cat_hw_locks', 'Window locks',    '🪟', false, false, 7, NOW()),
  ('hsc_lk_6', 'cat_hw_locks', 'Weather stripping','🪟', false, false, 8, NOW()),
  -- Personal Protective Equipment (cat_hw_ppe) — existing: Gloves, Hard Hats & Helmets, Safety Boots
  ('hsc_pe_1', 'cat_hw_ppe', 'Safety glasses',  '🥽', false, false, 4, NOW()),
  ('hsc_pe_2', 'cat_hw_ppe', 'Masks',            '😷', false, false, 5, NOW()),
  ('hsc_pe_3', 'cat_hw_ppe', 'Reflective vests', '🦺', false, false, 6, NOW()),
  ('hsc_pe_4', 'cat_hw_ppe', 'Lubricants',       '🧴', false, false, 7, NOW()),
  ('hsc_pe_5', 'cat_hw_ppe', 'Oils',             '🧴', false, false, 8, NOW()),
  -- Lawn & Garden Care (cat_hw_garden_care) — all missing
  ('hsc_gc_1', 'cat_hw_garden_care', 'Shovels',       '🪴', false, false, 1, NOW()),
  ('hsc_gc_2', 'cat_hw_garden_care', 'Rakes',         '🪴', false, false, 2, NOW()),
  ('hsc_gc_3', 'cat_hw_garden_care', 'Hoes',          '🪴', false, false, 3, NOW()),
  ('hsc_gc_4', 'cat_hw_garden_care', 'Pruners',       '🪴', false, false, 4, NOW()),
  ('hsc_gc_5', 'cat_hw_garden_care', 'Watering cans', '🪴', false, false, 5, NOW()),
  ('hsc_gc_6', 'cat_hw_garden_care', 'Fertilizer',    '🧴', false, false, 6, NOW()),
  ('hsc_gc_7', 'cat_hw_garden_care', 'Soil',          '🪣', false, false, 7, NOW()),
  ('hsc_gc_8', 'cat_hw_garden_care', 'Mulch',         '🪵', false, false, 8, NOW()),
  ('hsc_gc_9', 'cat_hw_garden_care', 'Garden stakes', '🪵', false, false, 9, NOW()),
  ('hsc_gc_10','cat_hw_garden_care', 'Plant ties',    '🧷', false, false, 10, NOW()),
  -- Irrigation (cat_hw_irrig) — all missing
  ('hsc_ir_1', 'cat_hw_irrig', 'Sprinkler heads',  '🚰', false, false, 1, NOW()),
  ('hsc_ir_2', 'cat_hw_irrig', 'Drip systems',     '💧', false, false, 2, NOW()),
  ('hsc_ir_3', 'cat_hw_irrig', 'Garden hoses',     '🪴', false, false, 3, NOW()),
  ('hsc_ir_4', 'cat_hw_irrig', 'Hose fittings',    '🔧', false, false, 4, NOW()),
  ('hsc_ir_5', 'cat_hw_irrig', 'Water timers',     '🕒', false, false, 5, NOW()),
  -- Roofing Sheets (cat_hw_roofing) — existing: Gutters & Fascia, IBR Roofing Sheets
  ('hsc_rf_1', 'cat_hw_roofing', 'Corrugated sheets',  '🏠', false, false, 3, NOW()),
  ('hsc_rf_2', 'cat_hw_roofing', 'Roof screws',        '🔩', false, false, 4, NOW()),
  ('hsc_rf_3', 'cat_hw_roofing', 'Ridge caps',         '🏠', false, false, 5, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;
