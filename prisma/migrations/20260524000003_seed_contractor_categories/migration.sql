-- Seed Contractor Category Groups (Level 1) and Contractor Categories (Level 2)

-- ============================================================
-- GROUPS
-- ============================================================
INSERT INTO "public"."contractor_category_groups" ("id", "name", "emoji", "displayOrder", "isActive", "createdAt") VALUES
  ('ccg_general',    'General Construction',        '🧱', 1,  true, NOW()),
  ('ccg_carpentry',  'Carpentry Services',           '🔨', 2,  true, NOW()),
  ('ccg_masonry',    'Masonry Services',             '🪨', 3,  true, NOW()),
  ('ccg_plumbing',   'Plumbing Services',            '🚿', 4,  true, NOW()),
  ('ccg_electrical', 'Electrical Services',          '⚡', 5,  true, NOW()),
  ('ccg_hvac',       'HVAC Services',                '❄️', 6,  true, NOW()),
  ('ccg_roofing',    'Roofing Services',             '🪚', 7,  true, NOW()),
  ('ccg_painting',   'Painting Services',            '🎨', 8,  true, NOW()),
  ('ccg_flooring',   'Flooring & Surface Services',  '🪟', 9,  true, NOW()),
  ('ccg_doors',      'Door & Window Services',       '🚪', 10, true, NOW()),
  ('ccg_remodeling', 'Remodeling Services',          '🏠', 11, true, NOW()),
  ('ccg_site',       'Site & Utility Services',      '🛠️', 12, true, NOW()),
  ('ccg_safety',     'Safety & Compliance Services', '🦺', 13, true, NOW()),
  ('ccg_specialty',  'Specialty Contractor Services','🧰', 14, true, NOW());

-- ============================================================
-- CATEGORIES — General Construction
-- ============================================================
INSERT INTO "public"."contractor_categories" ("id", "groupId", "name", "emoji", "displayOrder", "isActive", "createdAt") VALUES
  ('cc_gen_new',        'ccg_general', 'New Construction',     '🏠', 1, true, NOW()),
  ('cc_gen_remodel',    'ccg_general', 'Remodeling',           '🏚️', 2, true, NOW()),
  ('cc_gen_renovation', 'ccg_general', 'Renovation',           '🛠️', 3, true, NOW()),
  ('cc_gen_additions',  'ccg_general', 'Additions',            '➕', 4, true, NOW()),
  ('cc_gen_tenant',     'ccg_general', 'Tenant Improvements',  '🏢', 5, true, NOW()),
  ('cc_gen_turnkey',    'ccg_general', 'Turnkey Construction', '🔑', 6, true, NOW()),
  ('cc_gen_buildouts',  'ccg_general', 'Build-Outs',           '🧱', 7, true, NOW()),
  ('cc_gen_custom',     'ccg_general', 'Custom Builds',        '🧾', 8, true, NOW());

-- ============================================================
-- CATEGORIES — Carpentry Services
-- ============================================================
INSERT INTO "public"."contractor_categories" ("id", "groupId", "name", "emoji", "displayOrder", "isActive", "createdAt") VALUES
  ('cc_carp_framing',   'ccg_carpentry', 'Framing',            '🪚', 1,  true, NOW()),
  ('cc_carp_finish',    'ccg_carpentry', 'Finish Carpentry',   '🪵', 2,  true, NOW()),
  ('cc_carp_trim',      'ccg_carpentry', 'Trim Work',          '📏', 3,  true, NOW()),
  ('cc_carp_doors',     'ccg_carpentry', 'Door Installation',  '🚪', 4,  true, NOW()),
  ('cc_carp_windows',   'ccg_carpentry', 'Window Installation','🪟', 5,  true, NOW()),
  ('cc_carp_cabinets',  'ccg_carpentry', 'Cabinet Installation','🗄️', 6,  true, NOW()),
  ('cc_carp_stairs',    'ccg_carpentry', 'Stair Building',     '🪜', 7,  true, NOW()),
  ('cc_carp_wood',      'ccg_carpentry', 'Custom Woodwork',    '🪑', 8,  true, NOW()),
  ('cc_carp_deck',      'ccg_carpentry', 'Deck Building',      '🌳', 9,  true, NOW()),
  ('cc_carp_fence',     'ccg_carpentry', 'Fence Building',     '🚧', 10, true, NOW());

-- ============================================================
-- CATEGORIES — Masonry Services
-- ============================================================
INSERT INTO "public"."contractor_categories" ("id", "groupId", "name", "emoji", "displayOrder", "isActive", "createdAt") VALUES
  ('cc_mas_brick',       'ccg_masonry', 'Brickwork',           '🧱', 1,  true, NOW()),
  ('cc_mas_block',       'ccg_masonry', 'Block Work',          '🧱', 2,  true, NOW()),
  ('cc_mas_stone',       'ccg_masonry', 'Stone Work',          '🪨', 3,  true, NOW()),
  ('cc_mas_concrete',    'ccg_masonry', 'Concrete Work',       '🏗️', 4,  true, NOW()),
  ('cc_mas_foundation',  'ccg_masonry', 'Foundation Work',     '🧱', 5,  true, NOW()),
  ('cc_mas_retaining',   'ccg_masonry', 'Retaining Walls',     '🧱', 6,  true, NOW()),
  ('cc_mas_chimney',     'ccg_masonry', 'Chimney Work',        '🏚️', 7,  true, NOW()),
  ('cc_mas_patio',       'ccg_masonry', 'Patio Installation',  '🏡', 8,  true, NOW()),
  ('cc_mas_walkway',     'ccg_masonry', 'Walkway Installation','🚶', 9,  true, NOW()),
  ('cc_mas_stucco',      'ccg_masonry', 'Stucco Work',         '🧱', 10, true, NOW());

-- ============================================================
-- CATEGORIES — Plumbing Services
-- ============================================================
INSERT INTO "public"."contractor_categories" ("id", "groupId", "name", "emoji", "displayOrder", "isActive", "createdAt") VALUES
  ('cc_plumb_roughin',   'ccg_plumbing', 'Rough-In Plumbing',        '🚰', 1,  true, NOW()),
  ('cc_plumb_pipes',     'ccg_plumbing', 'Pipe Installation',         '🔧', 2,  true, NOW()),
  ('cc_plumb_piperepair','ccg_plumbing', 'Pipe Repair',               '🔍', 3,  true, NOW()),
  ('cc_plumb_leak',      'ccg_plumbing', 'Leak Repair',               '💧', 4,  true, NOW()),
  ('cc_plumb_drain',     'ccg_plumbing', 'Drain Cleaning',            '🧼', 5,  true, NOW()),
  ('cc_plumb_hwinstall', 'ccg_plumbing', 'Water Heater Installation', '♨️', 6,  true, NOW()),
  ('cc_plumb_hwrepair',  'ccg_plumbing', 'Water Heater Repair',       '♨️', 7,  true, NOW()),
  ('cc_plumb_fixture',   'ccg_plumbing', 'Fixture Installation',      '🚽', 8,  true, NOW()),
  ('cc_plumb_sewer',     'ccg_plumbing', 'Sewer Line Repair',         '🕳️', 9,  true, NOW()),
  ('cc_plumb_bathroom',  'ccg_plumbing', 'Bathroom Plumbing',         '🛁', 10, true, NOW());

-- ============================================================
-- CATEGORIES — Electrical Services
-- ============================================================
INSERT INTO "public"."contractor_categories" ("id", "groupId", "name", "emoji", "displayOrder", "isActive", "createdAt") VALUES
  ('cc_elec_wiring',     'ccg_electrical', 'Electrical Wiring',       '🔌', 1,  true, NOW()),
  ('cc_elec_rewire',     'ccg_electrical', 'Rewiring',                '🔁', 2,  true, NOW()),
  ('cc_elec_panel',      'ccg_electrical', 'Panel Upgrades',          '🧯', 3,  true, NOW()),
  ('cc_elec_outlet',     'ccg_electrical', 'Outlet Installation',     '💡', 4,  true, NOW()),
  ('cc_elec_switch',     'ccg_electrical', 'Switch Installation',     '⏺️', 5,  true, NOW()),
  ('cc_elec_lighting',   'ccg_electrical', 'Lighting Installation',   '💡', 6,  true, NOW()),
  ('cc_elec_fan',        'ccg_electrical', 'Ceiling Fan Installation','🌀', 7,  true, NOW()),
  ('cc_elec_generator',  'ccg_electrical', 'Generator Installation',  '🔋', 8,  true, NOW()),
  ('cc_elec_trouble',    'ccg_electrical', 'Troubleshooting',         '🛠️', 9,  true, NOW()),
  ('cc_elec_repairs',    'ccg_electrical', 'Electrical Repairs',      '🔧', 10, true, NOW());

-- ============================================================
-- CATEGORIES — HVAC Services
-- ============================================================
INSERT INTO "public"."contractor_categories" ("id", "groupId", "name", "emoji", "displayOrder", "isActive", "createdAt") VALUES
  ('cc_hvac_acinstall',   'ccg_hvac', 'AC Installation',        '❄️', 1,  true, NOW()),
  ('cc_hvac_acrepair',    'ccg_hvac', 'AC Repair',              '🧊', 2,  true, NOW()),
  ('cc_hvac_heatinstall', 'ccg_hvac', 'Heating Installation',   '🔥', 3,  true, NOW()),
  ('cc_hvac_heatrepair',  'ccg_hvac', 'Heating Repair',         '🔥', 4,  true, NOW()),
  ('cc_hvac_furninstall', 'ccg_hvac', 'Furnace Installation',   '🌬️', 5,  true, NOW()),
  ('cc_hvac_furnrepair',  'ccg_hvac', 'Furnace Repair',         '🌬️', 6,  true, NOW()),
  ('cc_hvac_duct',        'ccg_hvac', 'Ductwork Installation',  '🌀', 7,  true, NOW()),
  ('cc_hvac_vent',        'ccg_hvac', 'Ventilation Services',   '🌬️', 8,  true, NOW()),
  ('cc_hvac_thermo',      'ccg_hvac', 'Thermostat Installation','🌡️', 9,  true, NOW()),
  ('cc_hvac_maint',       'ccg_hvac', 'HVAC Maintenance',       '🧰', 10, true, NOW());

-- ============================================================
-- CATEGORIES — Roofing Services
-- ============================================================
INSERT INTO "public"."contractor_categories" ("id", "groupId", "name", "emoji", "displayOrder", "isActive", "createdAt") VALUES
  ('cc_roof_install',    'ccg_roofing', 'Roof Installation',  '🏠', 1,  true, NOW()),
  ('cc_roof_repair',     'ccg_roofing', 'Roof Repair',        '🛠️', 2,  true, NOW()),
  ('cc_roof_replace',    'ccg_roofing', 'Roof Replacement',   '🔁', 3,  true, NOW()),
  ('cc_roof_shingle',    'ccg_roofing', 'Shingle Installation','🧱', 4,  true, NOW()),
  ('cc_roof_leak',       'ccg_roofing', 'Leak Repair',        '💧', 5,  true, NOW()),
  ('cc_roof_inspect',    'ccg_roofing', 'Roof Inspection',    '🔍', 6,  true, NOW()),
  ('cc_roof_gutinstall', 'ccg_roofing', 'Gutter Installation','🌧️', 7,  true, NOW()),
  ('cc_roof_gutrepair',  'ccg_roofing', 'Gutter Repair',      '🌧️', 8,  true, NOW()),
  ('cc_roof_water',      'ccg_roofing', 'Waterproofing',      '🛡️', 9,  true, NOW()),
  ('cc_roof_storm',      'ccg_roofing', 'Storm Damage Repair','⛈️', 10, true, NOW());

-- ============================================================
-- CATEGORIES — Painting Services
-- ============================================================
INSERT INTO "public"."contractor_categories" ("id", "groupId", "name", "emoji", "displayOrder", "isActive", "createdAt") VALUES
  ('cc_paint_interior',    'ccg_painting', 'Interior Painting',  '🖌️', 1,  true, NOW()),
  ('cc_paint_exterior',    'ccg_painting', 'Exterior Painting',  '🏡', 2,  true, NOW()),
  ('cc_paint_commercial',  'ccg_painting', 'Commercial Painting','🏢', 3,  true, NOW()),
  ('cc_paint_residential', 'ccg_painting', 'Residential Painting','🏠', 4,  true, NOW()),
  ('cc_paint_drywall',     'ccg_painting', 'Drywall Patching',   '🧱', 5,  true, NOW()),
  ('cc_paint_prep',        'ccg_painting', 'Surface Prep',       '🧹', 6,  true, NOW()),
  ('cc_paint_cabinet',     'ccg_painting', 'Cabinet Painting',   '🎨', 7,  true, NOW()),
  ('cc_paint_deck',        'ccg_painting', 'Deck Staining',      '🌳', 8,  true, NOW()),
  ('cc_paint_pressure',    'ccg_painting', 'Pressure Washing',   '🚿', 9,  true, NOW()),
  ('cc_paint_finish',      'ccg_painting', 'Wall Finishing',     '✨', 10, true, NOW());

-- ============================================================
-- CATEGORIES — Flooring & Surface Services
-- ============================================================
INSERT INTO "public"."contractor_categories" ("id", "groupId", "name", "emoji", "displayOrder", "isActive", "createdAt") VALUES
  ('cc_floor_tile',      'ccg_flooring', 'Tile Installation',        '🧩', 1,  true, NOW()),
  ('cc_floor_hardwood',  'ccg_flooring', 'Hardwood Installation',    '🌲', 2,  true, NOW()),
  ('cc_floor_laminate',  'ccg_flooring', 'Laminate Installation',    '📄', 3,  true, NOW()),
  ('cc_floor_vinyl',     'ccg_flooring', 'Vinyl Installation',       '🧻', 4,  true, NOW()),
  ('cc_floor_carpet',    'ccg_flooring', 'Carpet Installation',      '🧶', 5,  true, NOW()),
  ('cc_floor_repair',    'ccg_flooring', 'Floor Repair',             '🔧', 6,  true, NOW()),
  ('cc_floor_refinish',  'ccg_flooring', 'Floor Refinishing',        '✨', 7,  true, NOW()),
  ('cc_floor_concrete',  'ccg_flooring', 'Concrete Polishing',       '🪨', 8,  true, NOW()),
  ('cc_floor_epoxy',     'ccg_flooring', 'Epoxy Flooring',           '🧪', 9,  true, NOW()),
  ('cc_floor_under',     'ccg_flooring', 'Underlayment Installation','🪟', 10, true, NOW());

-- ============================================================
-- CATEGORIES — Door & Window Services
-- ============================================================
INSERT INTO "public"."contractor_categories" ("id", "groupId", "name", "emoji", "displayOrder", "isActive", "createdAt") VALUES
  ('cc_dw_doorinstall', 'ccg_doors', 'Door Installation',          '🚪', 1,  true, NOW()),
  ('cc_dw_doorrepair',  'ccg_doors', 'Door Repair',                '🔧', 2,  true, NOW()),
  ('cc_dw_wininstall',  'ccg_doors', 'Window Installation',        '🪟', 3,  true, NOW()),
  ('cc_dw_winrepair',   'ccg_doors', 'Window Repair',              '🪛', 4,  true, NOW()),
  ('cc_dw_glass',       'ccg_doors', 'Glass Replacement',          '🪞', 5,  true, NOW()),
  ('cc_dw_screen',      'ccg_doors', 'Screen Repair',              '🕸️', 6,  true, NOW()),
  ('cc_dw_lock',        'ccg_doors', 'Lock Installation',          '🔒', 7,  true, NOW()),
  ('cc_dw_hardware',    'ccg_doors', 'Hardware Installation',      '🧰', 8,  true, NOW()),
  ('cc_dw_weather',     'ccg_doors', 'Weatherproofing',            '🍃', 9,  true, NOW()),
  ('cc_dw_energy',      'ccg_doors', 'Energy Efficiency Upgrades', '⚡', 10, true, NOW());

-- ============================================================
-- CATEGORIES — Remodeling Services
-- ============================================================
INSERT INTO "public"."contractor_categories" ("id", "groupId", "name", "emoji", "displayOrder", "isActive", "createdAt") VALUES
  ('cc_rem_kitchen',   'ccg_remodeling', 'Kitchen Remodeling',    '🍳', 1,  true, NOW()),
  ('cc_rem_bathroom',  'ccg_remodeling', 'Bathroom Remodeling',   '🛁', 2,  true, NOW()),
  ('cc_rem_basement',  'ccg_remodeling', 'Basement Finishing',    '🧱', 3,  true, NOW()),
  ('cc_rem_additions', 'ccg_remodeling', 'Home Additions',        '➕', 4,  true, NOW()),
  ('cc_rem_garage',    'ccg_remodeling', 'Garage Conversions',    '🚗', 5,  true, NOW()),
  ('cc_rem_whole',     'ccg_remodeling', 'Whole-Home Renovation', '🏡', 6,  true, NOW()),
  ('cc_rem_interior',  'ccg_remodeling', 'Interior Redesign',     '🪞', 7,  true, NOW()),
  ('cc_rem_exterior',  'ccg_remodeling', 'Exterior Renovation',   '🏚️', 8,  true, NOW()),
  ('cc_rem_access',    'ccg_remodeling', 'Accessibility Upgrades','♿', 9,  true, NOW()),
  ('cc_rem_custom',    'ccg_remodeling', 'Custom Remodeling',     '✨', 10, true, NOW());

-- ============================================================
-- CATEGORIES — Site & Utility Services
-- ============================================================
INSERT INTO "public"."contractor_categories" ("id", "groupId", "name", "emoji", "displayOrder", "isActive", "createdAt") VALUES
  ('cc_site_demo',     'ccg_site', 'Demolition',           '🧨', 1,  true, NOW()),
  ('cc_site_prep',     'ccg_site', 'Site Preparation',     '📍', 2,  true, NOW()),
  ('cc_site_excav',    'ccg_site', 'Excavation',           '⛏️', 3,  true, NOW()),
  ('cc_site_grade',    'ccg_site', 'Grading',              '📐', 4,  true, NOW()),
  ('cc_site_drain',    'ccg_site', 'Drainage Installation','🌊', 5,  true, NOW()),
  ('cc_site_utility',  'ccg_site', 'Utility Installation', '🔌', 6,  true, NOW()),
  ('cc_site_concrete', 'ccg_site', 'Concrete Pouring',     '🏗️', 7,  true, NOW()),
  ('cc_site_found',    'ccg_site', 'Foundation Repair',    '🧱', 8,  true, NOW()),
  ('cc_site_land',     'ccg_site', 'Landscaping Prep',     '🌿', 9,  true, NOW()),
  ('cc_site_clean',    'ccg_site', 'Cleanup Services',     '🧹', 10, true, NOW());

-- ============================================================
-- CATEGORIES — Safety & Compliance Services
-- ============================================================
INSERT INTO "public"."contractor_categories" ("id", "groupId", "name", "emoji", "displayOrder", "isActive", "createdAt") VALUES
  ('cc_safe_jobsite', 'ccg_safety', 'Jobsite Safety',          '🦺', 1,  true, NOW()),
  ('cc_safe_code',    'ccg_safety', 'Code Compliance',         '📋', 2,  true, NOW()),
  ('cc_safe_inspect', 'ccg_safety', 'Inspections',             '🔍', 3,  true, NOW()),
  ('cc_safe_permit',  'ccg_safety', 'Permitting Support',      '🧾', 4,  true, NOW()),
  ('cc_safe_osha',    'ccg_safety', 'OSHA Compliance',         '🪖', 5,  true, NOW()),
  ('cc_safe_fire',    'ccg_safety', 'Fire Safety Upgrades',    '🔥', 6,  true, NOW()),
  ('cc_safe_struct',  'ccg_safety', 'Structural Assessments',  '🧱', 7,  true, NOW()),
  ('cc_safe_ada',     'ccg_safety', 'Accessibility Compliance','♿', 8,  true, NOW()),
  ('cc_safe_risk',    'ccg_safety', 'Risk Assessments',        '⚠️', 9,  true, NOW()),
  ('cc_safe_qc',      'ccg_safety', 'Quality Control',         '✅', 10, true, NOW());

-- ============================================================
-- CATEGORIES — Specialty Contractor Services
-- ============================================================
INSERT INTO "public"."contractor_categories" ("id", "groupId", "name", "emoji", "displayOrder", "isActive", "createdAt") VALUES
  ('cc_spec_water',    'ccg_specialty', 'Waterproofing',             '💧', 1,  true, NOW()),
  ('cc_spec_insul',    'ccg_specialty', 'Insulation Installation',   '🧊', 2,  true, NOW()),
  ('cc_spec_drywall',  'ccg_specialty', 'Drywall Installation',      '🧱', 3,  true, NOW()),
  ('cc_spec_stucco',   'ccg_specialty', 'Stucco Repair',             '🧱', 4,  true, NOW()),
  ('cc_spec_fence',    'ccg_specialty', 'Fence Installation',        '🚧', 5,  true, NOW()),
  ('cc_spec_gate',     'ccg_specialty', 'Gate Installation',         '🚪', 6,  true, NOW()),
  ('cc_spec_garage',   'ccg_specialty', 'Garage Door Services',      '🚪', 7,  true, NOW()),
  ('cc_spec_pressure', 'ccg_specialty', 'Pressure Washing',          '🚿', 8,  true, NOW()),
  ('cc_spec_solar',    'ccg_specialty', 'Solar Panel Installation',  '☀️', 9,  true, NOW()),
  ('cc_spec_disaster', 'ccg_specialty', 'Disaster Restoration',      '🌀', 10, true, NOW());
