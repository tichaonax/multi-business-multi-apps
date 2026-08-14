-- MBM-261: Vehicle Repair & Service business type — category taxonomy seed
-- Source: 🚗 Vehicle Service Business Categories.md
-- Adds 4 domains + 21 categories + 168 subcategories, businessType = 'vehicle_service'

-- ─────────────────────────────────────────
-- STEP 1: Domains (4)
-- ─────────────────────────────────────────
INSERT INTO inventory_domains (id, name, emoji, description, "businessType", "isActive", "isSystemTemplate", "createdAt")
VALUES
  ('vsdom_services', 'Vehicle Services',             '🛠️', 'Repair, maintenance, and mechanical services',        'vehicle_service', true, true, NOW()),
  ('vsdom_parts',    'Parts and Accessories Sales',  '🧰', 'Vehicle parts, fluids, and accessories sold in-store', 'vehicle_service', true, true, NOW()),
  ('vsdom_care',     'Vehicle Care Services',        '🧽', 'Cleaning, detailing, and inspection services',        'vehicle_service', true, true, NOW()),
  ('vsdom_fleet',    'Business and Fleet Services',  '🚚', 'Commercial fleet maintenance and roadside assistance', 'vehicle_service', true, true, NOW())
ON CONFLICT (name, "businessType") DO NOTHING;

-- ─────────────────────────────────────────
-- STEP 2: Categories (21)
-- ─────────────────────────────────────────
INSERT INTO business_categories (id, name, emoji, "businessType", "domainId", "businessId", "updatedAt", "createdAt")
VALUES
  -- Vehicle Services (10)
  ('vscat_oil',     'Oil Change and Lubrication',    '🛢️', 'vehicle_service', 'vsdom_services', NULL, NOW(), NOW()),
  ('vscat_tire',    'Tire Services',                 '🛞', 'vehicle_service', 'vsdom_services', NULL, NOW(), NOW()),
  ('vscat_brake',   'Brake Services',                '🛑', 'vehicle_service', 'vsdom_services', NULL, NOW(), NOW()),
  ('vscat_engine',  'Engine and Mechanical Repairs',  '⚙️', 'vehicle_service', 'vsdom_services', NULL, NOW(), NOW()),
  ('vscat_trans',   'Transmission and Drivetrain',   '🔄', 'vehicle_service', 'vsdom_services', NULL, NOW(), NOW()),
  ('vscat_steer',   'Steering and Suspension',       '🧭', 'vehicle_service', 'vsdom_services', NULL, NOW(), NOW()),
  ('vscat_cool',    'Cooling and Air Conditioning',  '❄️', 'vehicle_service', 'vsdom_services', NULL, NOW(), NOW()),
  ('vscat_elec',    'Electrical and Diagnostics',    '🔌', 'vehicle_service', 'vsdom_services', NULL, NOW(), NOW()),
  ('vscat_exhaust', 'Exhaust and Fuel Systems',      '💨', 'vehicle_service', 'vsdom_services', NULL, NOW(), NOW()),
  ('vscat_body',    'Body, Glass, and Interior',     '🪟', 'vehicle_service', 'vsdom_services', NULL, NOW(), NOW()),
  -- Parts and Accessories Sales (7)
  ('vscat_pfluid',  'Fluids and Filters',            '🛢️', 'vehicle_service', 'vsdom_parts', NULL, NOW(), NOW()),
  ('vscat_ptire',   'Tires and Wheel Parts',         '🛞', 'vehicle_service', 'vsdom_parts', NULL, NOW(), NOW()),
  ('vscat_pbrake',  'Brake Parts',                   '🛑', 'vehicle_service', 'vsdom_parts', NULL, NOW(), NOW()),
  ('vscat_pengine', 'Engine and Mechanical Parts',   '⚙️', 'vehicle_service', 'vsdom_parts', NULL, NOW(), NOW()),
  ('vscat_pelec',   'Electrical Parts',              '🔋', 'vehicle_service', 'vsdom_parts', NULL, NOW(), NOW()),
  ('vscat_pcool',   'Cooling and AC Parts',          '❄️', 'vehicle_service', 'vsdom_parts', NULL, NOW(), NOW()),
  ('vscat_pacc',    'Accessories',                   '🚘', 'vehicle_service', 'vsdom_parts', NULL, NOW(), NOW()),
  -- Vehicle Care Services (2)
  ('vscat_clean',   'Cleaning and Detailing',        '✨', 'vehicle_service', 'vsdom_care', NULL, NOW(), NOW()),
  ('vscat_inspect', 'Inspection and Safety',         '🛡️', 'vehicle_service', 'vsdom_care', NULL, NOW(), NOW()),
  -- Business and Fleet Services (2)
  ('vscat_fleetm',  'Fleet Maintenance',             '🚛', 'vehicle_service', 'vsdom_fleet', NULL, NOW(), NOW()),
  ('vscat_road',    'Roadside Assistance',           '🆘', 'vehicle_service', 'vsdom_fleet', NULL, NOW(), NOW())
ON CONFLICT ("businessType", "domainId", name) DO NOTHING;

-- ─────────────────────────────────────────
-- STEP 3: Subcategories (168 = 21 categories × 8)
-- ─────────────────────────────────────────
INSERT INTO inventory_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "displayOrder", "createdAt")
VALUES
  -- Oil Change and Lubrication (8)
  ('vssc_oil1','vscat_oil','Standard oil change',            '🛢️',false,false,1,NOW()),
  ('vssc_oil2','vscat_oil','Synthetic oil change',           '🛢️',false,false,2,NOW()),
  ('vssc_oil3','vscat_oil','Oil filter replacement',         '🧽',false,false,3,NOW()),
  ('vssc_oil4','vscat_oil','Engine flush',                   '🧴',false,false,4,NOW()),
  ('vssc_oil5','vscat_oil','Transmission fluid change',      '🧴',false,false,5,NOW()),
  ('vssc_oil6','vscat_oil','Brake fluid change',              '🧴',false,false,6,NOW()),
  ('vssc_oil7','vscat_oil','Coolant flush',                  '❄️',false,false,7,NOW()),
  ('vssc_oil8','vscat_oil','Power steering fluid service',   '💨',false,false,8,NOW()),
  -- Tire Services (8)
  ('vssc_tir1','vscat_tire','Tire repair',                   '🛞',false,false,1,NOW()),
  ('vssc_tir2','vscat_tire','Puncture repair',                '🩹',false,false,2,NOW()),
  ('vssc_tir3','vscat_tire','Tire replacement',               '🛞',false,false,3,NOW()),
  ('vssc_tir4','vscat_tire','Tire installation',              '🛞',false,false,4,NOW()),
  ('vssc_tir5','vscat_tire','Tire rotation',                  '🔄',false,false,5,NOW()),
  ('vssc_tir6','vscat_tire','Wheel balancing',                '⚖️',false,false,6,NOW()),
  ('vssc_tir7','vscat_tire','Wheel alignment',                '🧭',false,false,7,NOW()),
  ('vssc_tir8','vscat_tire','Tire pressure check',            '🛞',false,false,8,NOW()),
  -- Brake Services (8)
  ('vssc_brk1','vscat_brake','Brake inspection',              '🛑',false,false,1,NOW()),
  ('vssc_brk2','vscat_brake','Brake pad replacement',         '🧩',false,false,2,NOW()),
  ('vssc_brk3','vscat_brake','Brake shoe replacement',        '🧱',false,false,3,NOW()),
  ('vssc_brk4','vscat_brake','Brake disc or rotor replacement','⚙️',false,false,4,NOW()),
  ('vssc_brk5','vscat_brake','Brake fluid replacement',       '🛢️',false,false,5,NOW()),
  ('vssc_brk6','vscat_brake','Brake caliper repair',          '🧰',false,false,6,NOW()),
  ('vssc_brk7','vscat_brake','ABS diagnostics',               '🚨',false,false,7,NOW()),
  ('vssc_brk8','vscat_brake','Handbrake repair',              '🅿️',false,false,8,NOW()),
  -- Engine and Mechanical Repairs (8)
  ('vssc_eng1','vscat_engine','General vehicle repair',       '🔧',false,false,1,NOW()),
  ('vssc_eng2','vscat_engine','Engine repair',                '⚙️',false,false,2,NOW()),
  ('vssc_eng3','vscat_engine','Engine diagnostics',           '🔍',false,false,3,NOW()),
  ('vssc_eng4','vscat_engine','Check-engine-light scan',      '🚨',false,false,4,NOW()),
  ('vssc_eng5','vscat_engine','Timing belt replacement',      '🔩',false,false,5,NOW()),
  ('vssc_eng6','vscat_engine','Drive belt replacement',       '🪢',false,false,6,NOW()),
  ('vssc_eng7','vscat_engine','Spark plug replacement',       '⚙️',false,false,7,NOW()),
  ('vssc_eng8','vscat_engine','Engine overhaul',              '🛢️',false,false,8,NOW()),
  -- Transmission and Drivetrain (8)
  ('vssc_trn1','vscat_trans','Transmission diagnostics',      '⚙️',false,false,1,NOW()),
  ('vssc_trn2','vscat_trans','Transmission service',          '🔄',false,false,2,NOW()),
  ('vssc_trn3','vscat_trans','Transmission fluid change',     '🛢️',false,false,3,NOW()),
  ('vssc_trn4','vscat_trans','Clutch repair',                 '⚙️',false,false,4,NOW()),
  ('vssc_trn5','vscat_trans','Clutch replacement',            '🧩',false,false,5,NOW()),
  ('vssc_trn6','vscat_trans','Driveshaft repair',              '🛞',false,false,6,NOW()),
  ('vssc_trn7','vscat_trans','Differential repair',           '⚙️',false,false,7,NOW()),
  ('vssc_trn8','vscat_trans','CV joint repair',                '🧰',false,false,8,NOW()),
  -- Steering and Suspension (8)
  ('vssc_str1','vscat_steer','Steering repair',               '🧭',false,false,1,NOW()),
  ('vssc_str2','vscat_steer','Suspension repair',             '🛞',false,false,2,NOW()),
  ('vssc_str3','vscat_steer','Shock absorber replacement',    '🪜',false,false,3,NOW()),
  ('vssc_str4','vscat_steer','Strut replacement',             '🧩',false,false,4,NOW()),
  ('vssc_str5','vscat_steer','Ball-joint replacement',        '⚙️',false,false,5,NOW()),
  ('vssc_str6','vscat_steer','Tie-rod replacement',           '🪢',false,false,6,NOW()),
  ('vssc_str7','vscat_steer','Wheel bearing replacement',     '🔧',false,false,7,NOW()),
  ('vssc_str8','vscat_steer','Alignment adjustment',          '🧭',false,false,8,NOW()),
  -- Cooling and Air Conditioning (8)
  ('vssc_col1','vscat_cool','AC diagnostics',                 '❄️',false,false,1,NOW()),
  ('vssc_col2','vscat_cool','AC recharge',                    '🧊',false,false,2,NOW()),
  ('vssc_col3','vscat_cool','AC leak repair',                 '💨',false,false,3,NOW()),
  ('vssc_col4','vscat_cool','Compressor replacement',         '⚙️',false,false,4,NOW()),
  ('vssc_col5','vscat_cool','Condenser replacement',          '🧊',false,false,5,NOW()),
  ('vssc_col6','vscat_cool','Thermostat replacement',         '🌡️',false,false,6,NOW()),
  ('vssc_col7','vscat_cool','Radiator repair',                '🚰',false,false,7,NOW()),
  ('vssc_col8','vscat_cool','Cooling-system flush',           '❄️',false,false,8,NOW()),
  -- Electrical and Diagnostics (8)
  ('vssc_ele1','vscat_elec','Battery testing',                '🔋',false,false,1,NOW()),
  ('vssc_ele2','vscat_elec','Battery replacement',            '🔋',false,false,2,NOW()),
  ('vssc_ele3','vscat_elec','Alternator repair',              '🔌',false,false,3,NOW()),
  ('vssc_ele4','vscat_elec','Starter-motor repair',           '⚡',false,false,4,NOW()),
  ('vssc_ele5','vscat_elec','Headlight replacement',          '💡',false,false,5,NOW()),
  ('vssc_ele6','vscat_elec','Tail-light replacement',         '🔦',false,false,6,NOW()),
  ('vssc_ele7','vscat_elec','Wiring repair',                  '🔌',false,false,7,NOW()),
  ('vssc_ele8','vscat_elec','Computer diagnostics',           '🖥️',false,false,8,NOW()),
  -- Exhaust and Fuel Systems (8)
  ('vssc_exh1','vscat_exhaust','Exhaust repair',              '💨',false,false,1,NOW()),
  ('vssc_exh2','vscat_exhaust','Muffler replacement',         '🔇',false,false,2,NOW()),
  ('vssc_exh3','vscat_exhaust','Catalytic converter replacement','🧩',false,false,3,NOW()),
  ('vssc_exh4','vscat_exhaust','Fuel-pump repair',            '⛽',false,false,4,NOW()),
  ('vssc_exh5','vscat_exhaust','Fuel-injector cleaning',      '🧴',false,false,5,NOW()),
  ('vssc_exh6','vscat_exhaust','Fuel-filter replacement',     '🛢️',false,false,6,NOW()),
  ('vssc_exh7','vscat_exhaust','Fuel-line repair',            '🪢',false,false,7,NOW()),
  ('vssc_exh8','vscat_exhaust','Emissions testing',           '🧪',false,false,8,NOW()),
  -- Body, Glass, and Interior (8)
  ('vssc_bdy1','vscat_body','Windshield repair',              '🪟',false,false,1,NOW()),
  ('vssc_bdy2','vscat_body','Windshield replacement',         '🪟',false,false,2,NOW()),
  ('vssc_bdy3','vscat_body','Mirror replacement',             '🪞',false,false,3,NOW()),
  ('vssc_bdy4','vscat_body','Door repair',                    '🚪',false,false,4,NOW()),
  ('vssc_bdy5','vscat_body','Body-panel repair',               '🛻',false,false,5,NOW()),
  ('vssc_bdy6','vscat_body','Paint touch-up',                 '🎨',false,false,6,NOW()),
  ('vssc_bdy7','vscat_body','Seat repair',                    '🪑',false,false,7,NOW()),
  ('vssc_bdy8','vscat_body','Interior detailing',             '🧼',false,false,8,NOW()),
  -- Fluids and Filters (8)
  ('vssc_pfl1','vscat_pfluid','Engine oil',                   '🛢️',false,false,1,NOW()),
  ('vssc_pfl2','vscat_pfluid','Transmission fluid',           '🧴',false,false,2,NOW()),
  ('vssc_pfl3','vscat_pfluid','Brake fluid',                  '🧴',false,false,3,NOW()),
  ('vssc_pfl4','vscat_pfluid','Coolant',                      '❄️',false,false,4,NOW()),
  ('vssc_pfl5','vscat_pfluid','Power steering fluid',         '🧴',false,false,5,NOW()),
  ('vssc_pfl6','vscat_pfluid','Oil filters',                  '🧽',false,false,6,NOW()),
  ('vssc_pfl7','vscat_pfluid','Air filters',                  '🧽',false,false,7,NOW()),
  ('vssc_pfl8','vscat_pfluid','Fuel filters',                 '⛽',false,false,8,NOW()),
  -- Tires and Wheel Parts (8)
  ('vssc_ptr1','vscat_ptire','New tires',                     '🛞',false,false,1,NOW()),
  ('vssc_ptr2','vscat_ptire','Used tires',                    '♻️',false,false,2,NOW()),
  ('vssc_ptr3','vscat_ptire','Spare tires',                   '🛞',false,false,3,NOW()),
  ('vssc_ptr4','vscat_ptire','Rims',                          '⚙️',false,false,4,NOW()),
  ('vssc_ptr5','vscat_ptire','Wheel covers',                  '🧩',false,false,5,NOW()),
  ('vssc_ptr6','vscat_ptire','Wheel nuts',                    '🔩',false,false,6,NOW()),
  ('vssc_ptr7','vscat_ptire','Tire repair kits',               '🩹',false,false,7,NOW()),
  ('vssc_ptr8','vscat_ptire','Tire valves',                   '💨',false,false,8,NOW()),
  -- Brake Parts (8)
  ('vssc_pbk1','vscat_pbrake','Brake pads',                   '🧩',false,false,1,NOW()),
  ('vssc_pbk2','vscat_pbrake','Brake shoes',                  '🧱',false,false,2,NOW()),
  ('vssc_pbk3','vscat_pbrake','Brake rotors',                 '⚙️',false,false,3,NOW()),
  ('vssc_pbk4','vscat_pbrake','Brake drums',                  '🛞',false,false,4,NOW()),
  ('vssc_pbk5','vscat_pbrake','Brake calipers',               '🧰',false,false,5,NOW()),
  ('vssc_pbk6','vscat_pbrake','Brake hoses',                  '🪢',false,false,6,NOW()),
  ('vssc_pbk7','vscat_pbrake','Brake fluid',                  '🧴',false,false,7,NOW()),
  ('vssc_pbk8','vscat_pbrake','ABS sensors',                  '🚨',false,false,8,NOW()),
  -- Engine and Mechanical Parts (8)
  ('vssc_pen1','vscat_pengine','Spark plugs',                 '⚙️',false,false,1,NOW()),
  ('vssc_pen2','vscat_pengine','Drive belts',                 '🪢',false,false,2,NOW()),
  ('vssc_pen3','vscat_pengine','Timing belts',                '🔩',false,false,3,NOW()),
  ('vssc_pen4','vscat_pengine','Gaskets',                     '🧩',false,false,4,NOW()),
  ('vssc_pen5','vscat_pengine','Engine mounts',                '⚙️',false,false,5,NOW()),
  ('vssc_pen6','vscat_pengine','Water pumps',                 '🌀',false,false,6,NOW()),
  ('vssc_pen7','vscat_pengine','Thermostats',                 '🌡️',false,false,7,NOW()),
  ('vssc_pen8','vscat_pengine','Engine filters',               '🧽',false,false,8,NOW()),
  -- Electrical Parts (8)
  ('vssc_pel1','vscat_pelec','Batteries',                     '🔋',false,false,1,NOW()),
  ('vssc_pel2','vscat_pelec','Alternators',                   '🔌',false,false,2,NOW()),
  ('vssc_pel3','vscat_pelec','Starter motors',                '⚡',false,false,3,NOW()),
  ('vssc_pel4','vscat_pelec','Headlights',                    '💡',false,false,4,NOW()),
  ('vssc_pel5','vscat_pelec','Tail lights',                   '🔦',false,false,5,NOW()),
  ('vssc_pel6','vscat_pelec','Fuses',                         '🔌',false,false,6,NOW()),
  ('vssc_pel7','vscat_pelec','Sensors',                       '⚙️',false,false,7,NOW()),
  ('vssc_pel8','vscat_pelec','Switches',                      '🎛️',false,false,8,NOW()),
  -- Cooling and AC Parts (8)
  ('vssc_pco1','vscat_pcool','AC compressors',                '❄️',false,false,1,NOW()),
  ('vssc_pco2','vscat_pcool','AC condensers',                 '🧊',false,false,2,NOW()),
  ('vssc_pco3','vscat_pcool','Radiators',                     '🌡️',false,false,3,NOW()),
  ('vssc_pco4','vscat_pcool','Cooling fans',                  '🌀',false,false,4,NOW()),
  ('vssc_pco5','vscat_pcool','Radiator hoses',                '🚿',false,false,5,NOW()),
  ('vssc_pco6','vscat_pcool','Refrigerant',                   '🧴',false,false,6,NOW()),
  ('vssc_pco7','vscat_pcool','AC filters',                    '🧩',false,false,7,NOW()),
  ('vssc_pco8','vscat_pcool','Temperature sensors',           '🌡️',false,false,8,NOW()),
  -- Accessories (8)
  ('vssc_acc1','vscat_pacc','Floor mats',                     '🧭',false,false,1,NOW()),
  ('vssc_acc2','vscat_pacc','Seat covers',                    '🪑',false,false,2,NOW()),
  ('vssc_acc3','vscat_pacc','Phone holders',                  '📱',false,false,3,NOW()),
  ('vssc_acc4','vscat_pacc','Dash cameras',                   '📡',false,false,4,NOW()),
  ('vssc_acc5','vscat_pacc','USB chargers',                   '🔌',false,false,5,NOW()),
  ('vssc_acc6','vscat_pacc','Window tint supplies',           '🪟',false,false,6,NOW()),
  ('vssc_acc7','vscat_pacc','Steering locks',                 '🔒',false,false,7,NOW()),
  ('vssc_acc8','vscat_pacc','Emergency kits',                 '🧰',false,false,8,NOW()),
  -- Cleaning and Detailing (8)
  ('vssc_cln1','vscat_clean','Exterior wash',                 '🧽',false,false,1,NOW()),
  ('vssc_cln2','vscat_clean','Interior vacuuming',            '🧹',false,false,2,NOW()),
  ('vssc_cln3','vscat_clean','Waxing and polishing',          '✨',false,false,3,NOW()),
  ('vssc_cln4','vscat_clean','Window cleaning',               '🪟',false,false,4,NOW()),
  ('vssc_cln5','vscat_clean','Seat cleaning',                 '🪑',false,false,5,NOW()),
  ('vssc_cln6','vscat_clean','Upholstery cleaning',           '🧼',false,false,6,NOW()),
  ('vssc_cln7','vscat_clean','Tire shine',                    '🛞',false,false,7,NOW()),
  ('vssc_cln8','vscat_clean','Odor removal',                  '💨',false,false,8,NOW()),
  -- Inspection and Safety (8)
  ('vssc_ins1','vscat_inspect','Vehicle inspection',          '🔍',false,false,1,NOW()),
  ('vssc_ins2','vscat_inspect','Brake safety check',          '🛑',false,false,2,NOW()),
  ('vssc_ins3','vscat_inspect','Tire safety check',           '🛞',false,false,3,NOW()),
  ('vssc_ins4','vscat_inspect','Light inspection',            '💡',false,false,4,NOW()),
  ('vssc_ins5','vscat_inspect','Battery inspection',          '🔋',false,false,5,NOW()),
  ('vssc_ins6','vscat_inspect','Emergency-kit check',         '🧯',false,false,6,NOW()),
  ('vssc_ins7','vscat_inspect','Roadworthiness inspection',   '📄',false,false,7,NOW()),
  ('vssc_ins8','vscat_inspect','Pre-purchase inspection',     '🧾',false,false,8,NOW()),
  -- Fleet Maintenance (8)
  ('vssc_flt1','vscat_fleetm','Fleet oil changes',            '🚚',false,false,1,NOW()),
  ('vssc_flt2','vscat_fleetm','Fleet tire service',           '🛞',false,false,2,NOW()),
  ('vssc_flt3','vscat_fleetm','Fleet repairs',                '🛠️',false,false,3,NOW()),
  ('vssc_flt4','vscat_fleetm','Fleet inspections',            '🔍',false,false,4,NOW()),
  ('vssc_flt5','vscat_fleetm','Maintenance schedules',        '📋',false,false,5,NOW()),
  ('vssc_flt6','vscat_fleetm','Service records',              '🧾',false,false,6,NOW()),
  ('vssc_flt7','vscat_fleetm','Breakdown support',            '🚨',false,false,7,NOW()),
  ('vssc_flt8','vscat_fleetm','Commercial-vehicle service',   '🚛',false,false,8,NOW()),
  -- Roadside Assistance (8)
  ('vssc_rda1','vscat_road','Flat-tire support',              '🛞',false,false,1,NOW()),
  ('vssc_rda2','vscat_road','Battery jump-start',              '🔋',false,false,2,NOW()),
  ('vssc_rda3','vscat_road','Emergency fuel delivery',        '⛽',false,false,3,NOW()),
  ('vssc_rda4','vscat_road','Lockout assistance',             '🔑',false,false,4,NOW()),
  ('vssc_rda5','vscat_road','Vehicle towing',                 '🚚',false,false,5,NOW()),
  ('vssc_rda6','vscat_road','Minor roadside repair',          '🧰',false,false,6,NOW()),
  ('vssc_rda7','vscat_road','Breakdown response',              '🚨',false,false,7,NOW()),
  ('vssc_rda8','vscat_road','Vehicle recovery',                '🧭',false,false,8,NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;
