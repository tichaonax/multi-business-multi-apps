-- Migration 00015: Construction full taxonomy
-- Source: Construction-Business-Domains.md
-- DB had 0 domains/categories for construction. Adds complete taxonomy.
-- 11 domains, 33 categories (3 per domain), 165 subcategories (5 per category)

-- ─────────────────────────────────────────
-- STEP 1: Construction domains (11)
-- ─────────────────────────────────────────
INSERT INTO inventory_domains (id, name, emoji, description, "businessType", "isActive", "isSystemTemplate", "createdAt")
VALUES
  ('cstdom_general',    'General Construction',              '🏗️', 'Building construction, renovation, and site preparation',   'construction', true, true, NOW()),
  ('cstdom_structural', 'Structural Work',                   '🧱', 'Foundations, framing, and masonry work',                   'construction', true, true, NOW()),
  ('cstdom_plumb_hvac', 'Plumbing and HVAC',                 '🚿', 'Plumbing, HVAC systems, and mechanical work',              'construction', true, true, NOW()),
  ('cstdom_electrical', 'Electrical Work',                   '⚡', 'Rough-in wiring, fixtures, and electrical service',        'construction', true, true, NOW()),
  ('cstdom_finish',     'Finish Work',                       '🚪', 'Carpentry, painting, and drywall finishing',               'construction', true, true, NOW()),
  ('cstdom_civil',      'Civil Construction',                '🛣️', 'Roadwork, infrastructure, and drainage utilities',         'construction', true, true, NOW()),
  ('cstdom_equipment',  'Equipment and Machinery',           '🧰', 'Heavy equipment, tooling, and equipment services',         'construction', true, true, NOW()),
  ('cstdom_safety',     'Safety and Compliance',             '🧯', 'Jobsite safety, compliance, and risk control',             'construction', true, true, NOW()),
  ('cstdom_roofing',    'Roofing and Exterior',              '🪟', 'Roofing, exterior finishes, and waterproofing',            'construction', true, true, NOW()),
  ('cstdom_proj_mgmt',  'Project Management and Estimating', '🏢', 'Pre-construction planning, project control, procurement',  'construction', true, true, NOW()),
  ('cstdom_specialty',  'Specialty Construction',            '🏠', 'Pools, industrial builds, and institutional work',         'construction', true, true, NOW())
ON CONFLICT (name, "businessType") DO NOTHING;

-- ─────────────────────────────────────────
-- STEP 2: Categories (33)
-- ─────────────────────────────────────────
INSERT INTO business_categories (id, name, emoji, "businessType", "domainId", "businessId", "updatedAt", "createdAt")
VALUES
  -- General Construction (3)
  ('cstcat_gen_bldg',  'Building Construction',    '🏠', 'construction', 'cstdom_general',    NULL, NOW(), NOW()),
  ('cstcat_gen_reno',  'Renovation and Remodeling','🔨', 'construction', 'cstdom_general',    NULL, NOW(), NOW()),
  ('cstcat_gen_site',  'Site Preparation',         '🚜', 'construction', 'cstdom_general',    NULL, NOW(), NOW()),
  -- Structural Work (3)
  ('cstcat_str_found', 'Foundations','🏛️', 'construction', 'cstdom_structural', NULL, NOW(), NOW()),
  ('cstcat_str_frame', 'Framing',    '🪵', 'construction', 'cstdom_structural', NULL, NOW(), NOW()),
  ('cstcat_str_mason', 'Masonry',    '🧱', 'construction', 'cstdom_structural', NULL, NOW(), NOW()),
  -- Plumbing and HVAC (3)
  ('cstcat_ph_plumb',  'Plumbing',  '🚰', 'construction', 'cstdom_plumb_hvac', NULL, NOW(), NOW()),
  ('cstcat_ph_hvac',   'HVAC',      '❄️', 'construction', 'cstdom_plumb_hvac', NULL, NOW(), NOW()),
  ('cstcat_ph_mech',   'Mechanical','🔧', 'construction', 'cstdom_plumb_hvac', NULL, NOW(), NOW()),
  -- Electrical Work (3)
  ('cstcat_el_rough',  'Rough-In',          '🔌', 'construction', 'cstdom_electrical', NULL, NOW(), NOW()),
  ('cstcat_el_fix',    'Fixtures',          '💡', 'construction', 'cstdom_electrical', NULL, NOW(), NOW()),
  ('cstcat_el_svc',    'Electrical Service','🛡️', 'construction', 'cstdom_electrical', NULL, NOW(), NOW()),
  -- Finish Work (3)
  ('cstcat_fw_carp',   'Carpentry','🪚', 'construction', 'cstdom_finish', NULL, NOW(), NOW()),
  ('cstcat_fw_paint',  'Painting', '🎨', 'construction', 'cstdom_finish', NULL, NOW(), NOW()),
  ('cstcat_fw_dry',    'Drywall',  '🧱', 'construction', 'cstdom_finish', NULL, NOW(), NOW()),
  -- Civil Construction (3)
  ('cstcat_cv_road',   'Roadwork',            '🚧', 'construction', 'cstdom_civil', NULL, NOW(), NOW()),
  ('cstcat_cv_infra',  'Infrastructure',      '🌉', 'construction', 'cstdom_civil', NULL, NOW(), NOW()),
  ('cstcat_cv_drain',  'Drainage and Utilities','💧','construction','cstdom_civil', NULL, NOW(), NOW()),
  -- Equipment and Machinery (3)
  ('cstcat_eq_heavy',  'Heavy Equipment',   '🚜', 'construction', 'cstdom_equipment', NULL, NOW(), NOW()),
  ('cstcat_eq_svc',    'Equipment Services','🔧', 'construction', 'cstdom_equipment', NULL, NOW(), NOW()),
  ('cstcat_eq_tool',   'Tooling',           '📦', 'construction', 'cstdom_equipment', NULL, NOW(), NOW()),
  -- Safety and Compliance (3)
  ('cstcat_sf_jsite',  'Jobsite Safety','🦺', 'construction', 'cstdom_safety', NULL, NOW(), NOW()),
  ('cstcat_sf_comp',   'Compliance',    '📋', 'construction', 'cstdom_safety', NULL, NOW(), NOW()),
  ('cstcat_sf_risk',   'Risk Control',  '🚨', 'construction', 'cstdom_safety', NULL, NOW(), NOW()),
  -- Roofing and Exterior (3)
  ('cstcat_rf_roof',   'Roofing',           '🏠', 'construction', 'cstdom_roofing', NULL, NOW(), NOW()),
  ('cstcat_rf_ext',    'Exterior Finishes', '🧱', 'construction', 'cstdom_roofing', NULL, NOW(), NOW()),
  ('cstcat_rf_wp',     'Waterproofing',     '🌧️','construction', 'cstdom_roofing', NULL, NOW(), NOW()),
  -- Project Management (3)
  ('cstcat_pm_pre',    'Pre-Construction','📋', 'construction', 'cstdom_proj_mgmt', NULL, NOW(), NOW()),
  ('cstcat_pm_ctrl',   'Project Control', '📅', 'construction', 'cstdom_proj_mgmt', NULL, NOW(), NOW()),
  ('cstcat_pm_proc',   'Procurement',     '📦', 'construction', 'cstdom_proj_mgmt', NULL, NOW(), NOW()),
  -- Specialty Construction (3)
  ('cstcat_sp_pool',   'Pools and Outdoor Living','🏊', 'construction', 'cstdom_specialty', NULL, NOW(), NOW()),
  ('cstcat_sp_indus',  'Industrial Builds',       '🏭', 'construction', 'cstdom_specialty', NULL, NOW(), NOW()),
  ('cstcat_sp_inst',   'Institutional Work',      '🏥', 'construction', 'cstdom_specialty', NULL, NOW(), NOW())
ON CONFLICT ("businessType", "domainId", name) DO NOTHING;

-- ─────────────────────────────────────────
-- STEP 3: Subcategories (165)
-- ─────────────────────────────────────────
INSERT INTO inventory_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "displayOrder", "createdAt")
VALUES
  -- Building Construction (5)
  ('csc_gen_b1','cstcat_gen_bldg','Residential construction','🏠',false,false,1,NOW()),
  ('csc_gen_b2','cstcat_gen_bldg','Commercial construction', '🏢',false,false,2,NOW()),
  ('csc_gen_b3','cstcat_gen_bldg','Industrial construction', '🏭',false,false,3,NOW()),
  ('csc_gen_b4','cstcat_gen_bldg','Mixed-use construction',  '🏬',false,false,4,NOW()),
  ('csc_gen_b5','cstcat_gen_bldg','New builds',              '🏗️',false,false,5,NOW()),
  -- Renovation and Remodeling (5)
  ('csc_gen_r1','cstcat_gen_reno','Remodeling',         '🛠️',false,false,1,NOW()),
  ('csc_gen_r2','cstcat_gen_reno','Additions',          '🧱',false,false,2,NOW()),
  ('csc_gen_r3','cstcat_gen_reno','Interior renovation','🏠',false,false,3,NOW()),
  ('csc_gen_r4','cstcat_gen_reno','Exterior renovation','🚪',false,false,4,NOW()),
  ('csc_gen_r5','cstcat_gen_reno','Tenant improvements','🪟',false,false,5,NOW()),
  -- Site Preparation (5)
  ('csc_gen_s1','cstcat_gen_site','Clearing',         '🪏',false,false,1,NOW()),
  ('csc_gen_s2','cstcat_gen_site','Grading',          '🧱',false,false,2,NOW()),
  ('csc_gen_s3','cstcat_gen_site','Excavation',       '🚜',false,false,3,NOW()),
  ('csc_gen_s4','cstcat_gen_site','Backfill',         '🪨',false,false,4,NOW()),
  ('csc_gen_s5','cstcat_gen_site','Layout and staking','🧭',false,false,5,NOW()),
  -- Foundations (5)
  ('csc_str_f1','cstcat_str_found','Slab foundations',    '🧱',false,false,1,NOW()),
  ('csc_str_f2','cstcat_str_found','Footings',            '🪨',false,false,2,NOW()),
  ('csc_str_f3','cstcat_str_found','Crawl spaces',        '🧱',false,false,3,NOW()),
  ('csc_str_f4','cstcat_str_found','Basement foundations','🏗️',false,false,4,NOW()),
  ('csc_str_f5','cstcat_str_found','Foundation repair',   '🧰',false,false,5,NOW()),
  -- Framing (5)
  ('csc_str_fr1','cstcat_str_frame','Wood framing', '🪵',false,false,1,NOW()),
  ('csc_str_fr2','cstcat_str_frame','Steel framing','🧱',false,false,2,NOW()),
  ('csc_str_fr3','cstcat_str_frame','Wall framing', '🏠',false,false,3,NOW()),
  ('csc_str_fr4','cstcat_str_frame','Roof framing', '🏚️',false,false,4,NOW()),
  ('csc_str_fr5','cstcat_str_frame','Floor framing','🪟',false,false,5,NOW()),
  -- Masonry (5)
  ('csc_str_m1','cstcat_str_mason','Brickwork',          '🧱',false,false,1,NOW()),
  ('csc_str_m2','cstcat_str_mason','Blockwork',          '🪨',false,false,2,NOW()),
  ('csc_str_m3','cstcat_str_mason','Stonework',          '🧱',false,false,3,NOW()),
  ('csc_str_m4','cstcat_str_mason','Concrete block walls','🧱',false,false,4,NOW()),
  ('csc_str_m5','cstcat_str_mason','Retaining walls',    '🧱',false,false,5,NOW()),
  -- Plumbing (5)
  ('csc_ph_p1','cstcat_ph_plumb','Pipe installation','🚰',false,false,1,NOW()),
  ('csc_ph_p2','cstcat_ph_plumb','Fixtures',         '🚽',false,false,2,NOW()),
  ('csc_ph_p3','cstcat_ph_plumb','Showers and tubs', '🚿',false,false,3,NOW()),
  ('csc_ph_p4','cstcat_ph_plumb','Drainage systems', '🧼',false,false,4,NOW()),
  ('csc_ph_p5','cstcat_ph_plumb','Water supply lines','💧',false,false,5,NOW()),
  -- HVAC (5)
  ('csc_ph_h1','cstcat_ph_hvac','Air conditioning','❄️',false,false,1,NOW()),
  ('csc_ph_h2','cstcat_ph_hvac','Heating systems', '🔥',false,false,2,NOW()),
  ('csc_ph_h3','cstcat_ph_hvac','Ventilation',     '🌬️',false,false,3,NOW()),
  ('csc_ph_h4','cstcat_ph_hvac','Ductwork',        '🧰',false,false,4,NOW()),
  ('csc_ph_h5','cstcat_ph_hvac','System testing',  '🧪',false,false,5,NOW()),
  -- Mechanical (5)
  ('csc_ph_m1','cstcat_ph_mech','Equipment installation',  '🛠️',false,false,1,NOW()),
  ('csc_ph_m2','cstcat_ph_mech','Pump systems',            '⚙️',false,false,2,NOW()),
  ('csc_ph_m3','cstcat_ph_mech','Fire suppression support','🧯',false,false,3,NOW()),
  ('csc_ph_m4','cstcat_ph_mech','Pressure testing',        '🧪',false,false,4,NOW()),
  ('csc_ph_m5','cstcat_ph_mech','Maintenance',             '🧰',false,false,5,NOW()),
  -- Rough-In (5)
  ('csc_el_r1','cstcat_el_rough','Wiring',             '🔌',false,false,1,NOW()),
  ('csc_el_r2','cstcat_el_rough','Conduit installation','🧰',false,false,2,NOW()),
  ('csc_el_r3','cstcat_el_rough','Boxes and fittings', '🧷',false,false,3,NOW()),
  ('csc_el_r4','cstcat_el_rough','Panel setup',        '⚡',false,false,4,NOW()),
  ('csc_el_r5','cstcat_el_rough','Circuit prep',       '🧪',false,false,5,NOW()),
  -- Fixtures (5)
  ('csc_el_f1','cstcat_el_fix','Lighting installation','💡',false,false,1,NOW()),
  ('csc_el_f2','cstcat_el_fix','Exterior lighting',   '🔦',false,false,2,NOW()),
  ('csc_el_f3','cstcat_el_fix','Decorative lighting', '🛋️',false,false,3,NOW()),
  ('csc_el_f4','cstcat_el_fix','Emergency lighting',  '🚨',false,false,4,NOW()),
  ('csc_el_f5','cstcat_el_fix','Sensor systems',      '🧭',false,false,5,NOW()),
  -- Electrical Service (5)
  ('csc_el_s1','cstcat_el_svc','Service upgrades',  '⚡',false,false,1,NOW()),
  ('csc_el_s2','cstcat_el_svc','Backup power',      '🔋',false,false,2,NOW()),
  ('csc_el_s3','cstcat_el_svc','Surge protection',  '🧯',false,false,3,NOW()),
  ('csc_el_s4','cstcat_el_svc','Repairs',           '🧰',false,false,4,NOW()),
  ('csc_el_s5','cstcat_el_svc','Testing and inspection','🧪',false,false,5,NOW()),
  -- Carpentry (5)
  ('csc_fw_c1','cstcat_fw_carp','Trim work','🪵',false,false,1,NOW()),
  ('csc_fw_c2','cstcat_fw_carp','Doors',    '🚪',false,false,2,NOW()),
  ('csc_fw_c3','cstcat_fw_carp','Windows',  '🪟',false,false,3,NOW()),
  ('csc_fw_c4','cstcat_fw_carp','Stairs',   '🪜',false,false,4,NOW()),
  ('csc_fw_c5','cstcat_fw_carp','Cabinets', '🧱',false,false,5,NOW()),
  -- Painting (5)
  ('csc_fw_p1','cstcat_fw_paint','Interior painting',   '🎨',false,false,1,NOW()),
  ('csc_fw_p2','cstcat_fw_paint','Exterior painting',   '🎨',false,false,2,NOW()),
  ('csc_fw_p3','cstcat_fw_paint','Trim painting',       '🪟',false,false,3,NOW()),
  ('csc_fw_p4','cstcat_fw_paint','Surface preparation', '🧽',false,false,4,NOW()),
  ('csc_fw_p5','cstcat_fw_paint','Coating and sealing', '🧴',false,false,5,NOW()),
  -- Drywall (5)
  ('csc_fw_d1','cstcat_fw_dry','Hanging drywall',   '🧱',false,false,1,NOW()),
  ('csc_fw_d2','cstcat_fw_dry','Taping and mudding','🧽',false,false,2,NOW()),
  ('csc_fw_d3','cstcat_fw_dry','Wall finishing',    '🎨',false,false,3,NOW()),
  ('csc_fw_d4','cstcat_fw_dry','Repairs',           '🪚',false,false,4,NOW()),
  ('csc_fw_d5','cstcat_fw_dry','Texture matching',  '🧰',false,false,5,NOW()),
  -- Roadwork (5)
  ('csc_cv_r1','cstcat_cv_road','Road paving',   '🛣️',false,false,1,NOW()),
  ('csc_cv_r2','cstcat_cv_road','Road grading',  '🚜',false,false,2,NOW()),
  ('csc_cv_r3','cstcat_cv_road','Asphalt work',  '🧱',false,false,3,NOW()),
  ('csc_cv_r4','cstcat_cv_road','Lane striping', '🚧',false,false,4,NOW()),
  ('csc_cv_r5','cstcat_cv_road','Road base work','🪨',false,false,5,NOW()),
  -- Infrastructure (5)
  ('csc_cv_i1','cstcat_cv_infra','Bridges',          '🌉',false,false,1,NOW()),
  ('csc_cv_i2','cstcat_cv_infra','Utility tunnels',  '🚇',false,false,2,NOW()),
  ('csc_cv_i3','cstcat_cv_infra','Culverts',         '🧱',false,false,3,NOW()),
  ('csc_cv_i4','cstcat_cv_infra','Sidewalks',        '🛣️',false,false,4,NOW()),
  ('csc_cv_i5','cstcat_cv_infra','Traffic structures','🚦',false,false,5,NOW()),
  -- Drainage and Utilities (5)
  ('csc_cv_d1','cstcat_cv_drain','Storm drainage', '🌊',false,false,1,NOW()),
  ('csc_cv_d2','cstcat_cv_drain','Water lines',    '🚰',false,false,2,NOW()),
  ('csc_cv_d3','cstcat_cv_drain','Sewer lines',    '🚽',false,false,3,NOW()),
  ('csc_cv_d4','cstcat_cv_drain','Utility trenches','⚡',false,false,4,NOW()),
  ('csc_cv_d5','cstcat_cv_drain','Site drainage',  '🧭',false,false,5,NOW()),
  -- Heavy Equipment (5)
  ('csc_eq_h1','cstcat_eq_heavy','Excavators','🚜',false,false,1,NOW()),
  ('csc_eq_h2','cstcat_eq_heavy','Dump trucks','🚚',false,false,2,NOW()),
  ('csc_eq_h3','cstcat_eq_heavy','Cranes',    '🏗️',false,false,3,NOW()),
  ('csc_eq_h4','cstcat_eq_heavy','Loaders',   '🛞',false,false,4,NOW()),
  ('csc_eq_h5','cstcat_eq_heavy','Bulldozers','🪨',false,false,5,NOW()),
  -- Equipment Services (5)
  ('csc_eq_s1','cstcat_eq_svc','Repairs',        '🛠️',false,false,1,NOW()),
  ('csc_eq_s2','cstcat_eq_svc','Fueling',        '⛽',false,false,2,NOW()),
  ('csc_eq_s3','cstcat_eq_svc','Lubrication',    '🧴',false,false,3,NOW()),
  ('csc_eq_s4','cstcat_eq_svc','Battery service','🔋',false,false,4,NOW()),
  ('csc_eq_s5','cstcat_eq_svc','Inspections',    '🧪',false,false,5,NOW()),
  -- Tooling (5)
  ('csc_eq_t1','cstcat_eq_tool','Hand tools',  '🧰',false,false,1,NOW()),
  ('csc_eq_t2','cstcat_eq_tool','Power tools', '⚡',false,false,2,NOW()),
  ('csc_eq_t3','cstcat_eq_tool','Fasteners',   '🪛',false,false,3,NOW()),
  ('csc_eq_t4','cstcat_eq_tool','Accessories', '🧷',false,false,4,NOW()),
  ('csc_eq_t5','cstcat_eq_tool','Consumables', '🧾',false,false,5,NOW()),
  -- Jobsite Safety (5)
  ('csc_sf_j1','cstcat_sf_jsite','Hard hats',      '🪖',false,false,1,NOW()),
  ('csc_sf_j2','cstcat_sf_jsite','Safety glasses',  '🥽',false,false,2,NOW()),
  ('csc_sf_j3','cstcat_sf_jsite','Gloves',          '🧤',false,false,3,NOW()),
  ('csc_sf_j4','cstcat_sf_jsite','Steel-toe boots', '👢',false,false,4,NOW()),
  ('csc_sf_j5','cstcat_sf_jsite','Vests',           '🦺',false,false,5,NOW()),
  -- Compliance (5)
  ('csc_sf_c1','cstcat_sf_comp','Permits',         '📑',false,false,1,NOW()),
  ('csc_sf_c2','cstcat_sf_comp','Inspections',     '🧾',false,false,2,NOW()),
  ('csc_sf_c3','cstcat_sf_comp','Code compliance', '🏛️',false,false,3,NOW()),
  ('csc_sf_c4','cstcat_sf_comp','Testing reports', '🧪',false,false,4,NOW()),
  ('csc_sf_c5','cstcat_sf_comp','Documentation',   '🧭',false,false,5,NOW()),
  -- Risk Control (5)
  ('csc_sf_r1','cstcat_sf_risk','Fire prevention', '🧯',false,false,1,NOW()),
  ('csc_sf_r2','cstcat_sf_risk','Hazard control',  '🛑',false,false,2,NOW()),
  ('csc_sf_r3','cstcat_sf_risk','Warning signage',  '📣',false,false,3,NOW()),
  ('csc_sf_r4','cstcat_sf_risk','Site monitoring',  '🧭',false,false,4,NOW()),
  ('csc_sf_r5','cstcat_sf_risk','Emergency kits',   '🧰',false,false,5,NOW()),
  -- Roofing (5)
  ('csc_rf_r1','cstcat_rf_roof','Roof installation','🧱',false,false,1,NOW()),
  ('csc_rf_r2','cstcat_rf_roof','Roof framing',     '🪵',false,false,2,NOW()),
  ('csc_rf_r3','cstcat_rf_roof','Waterproofing',    '🧴',false,false,3,NOW()),
  ('csc_rf_r4','cstcat_rf_roof','Repairs',          '🧰',false,false,4,NOW()),
  ('csc_rf_r5','cstcat_rf_roof','Gutters',          '🪟',false,false,5,NOW()),
  -- Exterior Finishes (5)
  ('csc_rf_e1','cstcat_rf_ext','Siding',          '🧱',false,false,1,NOW()),
  ('csc_rf_e2','cstcat_rf_ext','Exterior coating','🎨',false,false,2,NOW()),
  ('csc_rf_e3','cstcat_rf_ext','Windows',         '🪟',false,false,3,NOW()),
  ('csc_rf_e4','cstcat_rf_ext','Doors',           '🚪',false,false,4,NOW()),
  ('csc_rf_e5','cstcat_rf_ext','Fascia and soffit','🪵',false,false,5,NOW()),
  -- Waterproofing (5)
  ('csc_rf_w1','cstcat_rf_wp','Sealants',       '🧴',false,false,1,NOW()),
  ('csc_rf_w2','cstcat_rf_wp','Membranes',       '🧱',false,false,2,NOW()),
  ('csc_rf_w3','cstcat_rf_wp','Drainage',        '🌊',false,false,3,NOW()),
  ('csc_rf_w4','cstcat_rf_wp','Leak repair',     '🪚',false,false,4,NOW()),
  ('csc_rf_w5','cstcat_rf_wp','Moisture control','🧰',false,false,5,NOW()),
  -- Pre-Construction (5)
  ('csc_pm_p1','cstcat_pm_pre','Estimating',        '🧾',false,false,1,NOW()),
  ('csc_pm_p2','cstcat_pm_pre','Takeoffs',          '📐',false,false,2,NOW()),
  ('csc_pm_p3','cstcat_pm_pre','Planning',          '🗺️',false,false,3,NOW()),
  ('csc_pm_p4','cstcat_pm_pre','Subcontractor bids','🧑‍🤝‍🧑',false,false,4,NOW()),
  ('csc_pm_p5','cstcat_pm_pre','Permitting',        '🪪',false,false,5,NOW()),
  -- Project Control (5)
  ('csc_pm_c1','cstcat_pm_ctrl','Scheduling',       '🗓️',false,false,1,NOW()),
  ('csc_pm_c2','cstcat_pm_ctrl','Budget tracking',  '🧮',false,false,2,NOW()),
  ('csc_pm_c3','cstcat_pm_ctrl','Change orders',    '🧾',false,false,3,NOW()),
  ('csc_pm_c4','cstcat_pm_ctrl','Progress reporting','📊',false,false,4,NOW()),
  ('csc_pm_c5','cstcat_pm_ctrl','Labor tracking',   '👷',false,false,5,NOW()),
  -- Procurement (5)
  ('csc_pm_pr1','cstcat_pm_proc','Material ordering',   '🚚',false,false,1,NOW()),
  ('csc_pm_pr2','cstcat_pm_proc','Vendor management',   '🧾',false,false,2,NOW()),
  ('csc_pm_pr3','cstcat_pm_proc','Delivery coordination','📦',false,false,3,NOW()),
  ('csc_pm_pr4','cstcat_pm_proc','Cost control',        '🪙',false,false,4,NOW()),
  ('csc_pm_pr5','cstcat_pm_proc','Inventory tracking',  '🔄',false,false,5,NOW()),
  -- Pools and Outdoor Living (5)
  ('csc_sp_p1','cstcat_sp_pool','Pool construction',  '🏊',false,false,1,NOW()),
  ('csc_sp_p2','cstcat_sp_pool','Decks',              '🪵',false,false,2,NOW()),
  ('csc_sp_p3','cstcat_sp_pool','Patios',             '⛱️',false,false,3,NOW()),
  ('csc_sp_p4','cstcat_sp_pool','Outdoor kitchens',   '🔥',false,false,4,NOW()),
  ('csc_sp_p5','cstcat_sp_pool','Landscaping support','🌿',false,false,5,NOW()),
  -- Industrial Builds (5)
  ('csc_sp_i1','cstcat_sp_indus','Plant construction', '⚙️',false,false,1,NOW()),
  ('csc_sp_i2','cstcat_sp_indus','Facility upgrades',  '🧯',false,false,2,NOW()),
  ('csc_sp_i3','cstcat_sp_indus','Steel structures',   '🏗️',false,false,3,NOW()),
  ('csc_sp_i4','cstcat_sp_indus','Utility installation','🚧',false,false,4,NOW()),
  ('csc_sp_i5','cstcat_sp_indus','Maintenance projects','🧰',false,false,5,NOW()),
  -- Institutional Work (5)
  ('csc_sp_in1','cstcat_sp_inst','Schools',           '🏫',false,false,1,NOW()),
  ('csc_sp_in2','cstcat_sp_inst','Hospitals',         '🏥',false,false,2,NOW()),
  ('csc_sp_in3','cstcat_sp_inst','Government buildings','🏛️',false,false,3,NOW()),
  ('csc_sp_in4','cstcat_sp_inst','Libraries',         '📚',false,false,4,NOW()),
  ('csc_sp_in5','cstcat_sp_inst','Public facilities', '🏟️',false,false,5,NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;
