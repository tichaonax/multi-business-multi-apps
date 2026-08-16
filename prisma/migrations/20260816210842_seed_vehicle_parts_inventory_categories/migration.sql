-- MBM-268: Vehicle Parts Inventory System — category taxonomy seed
-- Source: 🚗 Vehicle Parts Inventory System Requ.md
-- Extends the existing 'vsdom_parts' domain (only 2 real, test-only products
-- reference it today — safe to extend) and adds a new 'vsdom_workshop'
-- domain for internal-use-only tools/consumables (never sold to customers).
--
-- Reuse rule: an existing vsdom_parts category is only reused where it maps
-- cleanly to exactly one requirements-doc category (Brake Parts, Tires and
-- Wheel Parts, Accessories). Everywhere an existing category already mixes
-- concepts the doc treats as separate (e.g. today's single "Electrical
-- Parts" spans starting/charging + lighting + general components), that
-- category is left untouched and the doc's finer categories are created
-- fresh instead — all inserts are idempotent (ON CONFLICT DO NOTHING), so
-- this is safe to re-run.

-- ─────────────────────────────────────────
-- STEP 1: New domain (1) — Workshop Inventory
-- ─────────────────────────────────────────
INSERT INTO inventory_domains (id, name, emoji, description, "businessType", "isActive", "isSystemTemplate", "createdAt")
VALUES
  ('vsdom_workshop', 'Workshop Inventory', '🔧', 'Hand tools, equipment, and consumables used internally — never sold to customers', 'vehicle_service', true, true, NOW())
ON CONFLICT (name, "businessType") DO NOTHING;

-- ─────────────────────────────────────────
-- STEP 2: New categories (23) — 20 under vsdom_parts, 3 under vsdom_workshop
-- ─────────────────────────────────────────
INSERT INTO business_categories (id, name, emoji, "businessType", "domainId", "businessId", "updatedAt", "createdAt")
VALUES
  -- vsdom_parts (20 new — see reuse rule above; existing vscat_pbrake/vscat_ptire/vscat_pacc are reused as-is, not recreated)
  ('vscat_pfilt',  'Filters',                   '🧽', 'vehicle_service', 'vsdom_parts', NULL, NOW(), NOW()),
  ('vscat_poil',   'Oils and Fluids',           '🧴', 'vehicle_service', 'vsdom_parts', NULL, NOW(), NOW()),
  ('vscat_pchem',  'Chemicals and Additives',   '🧪', 'vehicle_service', 'vsdom_parts', NULL, NOW(), NOW()),
  ('vscat_pengp',  'Engine Parts',              '⚙️', 'vehicle_service', 'vsdom_parts', NULL, NOW(), NOW()),
  ('vscat_pbelt',  'Belts and Timing',          '⏱️', 'vehicle_service', 'vsdom_parts', NULL, NOW(), NOW()),
  ('vscat_pfuel',  'Fuel System',               '⛽', 'vehicle_service', 'vsdom_parts', NULL, NOW(), NOW()),
  ('vscat_pign',   'Ignition and Sensors',      '🔥', 'vehicle_service', 'vsdom_parts', NULL, NOW(), NOW()),
  ('vscat_pcsys',  'Cooling System',            '🌡️', 'vehicle_service', 'vsdom_parts', NULL, NOW(), NOW()),
  ('vscat_pac',    'Air Conditioning',          '🧊', 'vehicle_service', 'vsdom_parts', NULL, NOW(), NOW()),
  ('vscat_pheat',  'Heating System',            '🔥', 'vehicle_service', 'vsdom_parts', NULL, NOW(), NOW()),
  ('vscat_pstart', 'Starting and Charging',     '🔋', 'vehicle_service', 'vsdom_parts', NULL, NOW(), NOW()),
  ('vscat_pelcm',  'Electrical Components',     '🔌', 'vehicle_service', 'vsdom_parts', NULL, NOW(), NOW()),
  ('vscat_plight', 'Lighting and Visibility',   '💡', 'vehicle_service', 'vsdom_parts', NULL, NOW(), NOW()),
  ('vscat_psteer', 'Steering Parts',            '🧭', 'vehicle_service', 'vsdom_parts', NULL, NOW(), NOW()),
  ('vscat_psusp',  'Suspension Parts',          '🛞', 'vehicle_service', 'vsdom_parts', NULL, NOW(), NOW()),
  ('vscat_ptirer', 'Tire Repair Supplies',      '🩹', 'vehicle_service', 'vsdom_parts', NULL, NOW(), NOW()),
  ('vscat_ptrans', 'Transmission and Clutch',   '🔄', 'vehicle_service', 'vsdom_parts', NULL, NOW(), NOW()),
  ('vscat_paxle',  'Axles and Driveline',       '🛻', 'vehicle_service', 'vsdom_parts', NULL, NOW(), NOW()),
  ('vscat_pexh',   'Exhaust and Emissions',     '💨', 'vehicle_service', 'vsdom_parts', NULL, NOW(), NOW()),
  ('vscat_pbody',  'Body and Exterior',         '🚪', 'vehicle_service', 'vsdom_parts', NULL, NOW(), NOW()),
  -- vsdom_workshop (3 new)
  ('vscat_whand',  'Hand Tools',                '🔧', 'vehicle_service', 'vsdom_workshop', NULL, NOW(), NOW()),
  ('vscat_wequip', 'Workshop Equipment',        '⚡', 'vehicle_service', 'vsdom_workshop', NULL, NOW(), NOW()),
  ('vscat_wcons',  'Workshop Consumables',      '🧤', 'vehicle_service', 'vsdom_workshop', NULL, NOW(), NOW())
ON CONFLICT ("businessType", "domainId", name) DO NOTHING;

-- ─────────────────────────────────────────
-- STEP 3: Subcategories — one INSERT per requirements-doc bullet list.
-- Exact-name duplicates against the existing 56 vsdom_parts subcategories
-- (e.g. "Brake pads" already under vscat_pbrake) are skipped automatically.
-- ─────────────────────────────────────────
INSERT INTO inventory_subcategories (id, "categoryId", name, emoji, "isDefault", "isUserCreated", "displayOrder", "createdAt")
VALUES
  -- Filters (5)
  ('vssc_filt1','vscat_pfilt','Oil filters',              '🛢️',false,false,1,NOW()),
  ('vssc_filt2','vscat_pfilt','Engine air filters',       '🌬️',false,false,2,NOW()),
  ('vssc_filt3','vscat_pfilt','Cabin air filters',        '🏠',false,false,3,NOW()),
  ('vssc_filt4','vscat_pfilt','Fuel filters',             '⛽',false,false,4,NOW()),
  ('vssc_filt5','vscat_pfilt','Transmission filters',     '🔄',false,false,5,NOW()),
  -- Oils and Fluids (7)
  ('vssc_oilf1','vscat_poil','Engine oil',                '🛢️',false,false,1,NOW()),
  ('vssc_oilf2','vscat_poil','Gear oil',                  '⚙️',false,false,2,NOW()),
  ('vssc_oilf3','vscat_poil','Transmission fluid',        '🔄',false,false,3,NOW()),
  ('vssc_oilf4','vscat_poil','Brake fluid',                '🛑',false,false,4,NOW()),
  ('vssc_oilf5','vscat_poil','Coolant',                    '❄️',false,false,5,NOW()),
  ('vssc_oilf6','vscat_poil','Power-steering fluid',       '🧭',false,false,6,NOW()),
  ('vssc_oilf7','vscat_poil','Washer fluid',               '🪟',false,false,7,NOW()),
  -- Chemicals and Additives (8)
  ('vssc_chem1','vscat_pchem','Fuel-injector cleaner',    '🧪',false,false,1,NOW()),
  ('vssc_chem2','vscat_pchem','Brake cleaner',             '🧴',false,false,2,NOW()),
  ('vssc_chem3','vscat_pchem','Engine degreaser',          '🧴',false,false,3,NOW()),
  ('vssc_chem4','vscat_pchem','Grease',                    '🧴',false,false,4,NOW()),
  ('vssc_chem5','vscat_pchem','Sealants',                  '🧴',false,false,5,NOW()),
  ('vssc_chem6','vscat_pchem','Gasket maker',              '🧴',false,false,6,NOW()),
  ('vssc_chem7','vscat_pchem','Rust remover',              '🧴',false,false,7,NOW()),
  ('vssc_chem8','vscat_pchem','Tire sealant',              '🧴',false,false,8,NOW()),
  -- Engine Parts (8)
  ('vssc_engp1','vscat_pengp','Engine mounts',             '🔩',false,false,1,NOW()),
  ('vssc_engp2','vscat_pengp','Pistons',                   '🧱',false,false,2,NOW()),
  ('vssc_engp3','vscat_pengp','Crankshafts',                '⚙️',false,false,3,NOW()),
  ('vssc_engp4','vscat_pengp','Camshafts',                  '⚙️',false,false,4,NOW()),
  ('vssc_engp5','vscat_pengp','Valves',                     '🧩',false,false,5,NOW()),
  ('vssc_engp6','vscat_pengp','Oil pumps',                  '🛢️',false,false,6,NOW()),
  ('vssc_engp7','vscat_pengp','Cylinder heads',             '🧱',false,false,7,NOW()),
  ('vssc_engp8','vscat_pengp','Gaskets and seals',          '🧩',false,false,8,NOW()),
  -- Belts and Timing (6)
  ('vssc_belt1','vscat_pbelt','Drive belts',                '🪢',false,false,1,NOW()),
  ('vssc_belt2','vscat_pbelt','Timing chains',              '⛓️',false,false,2,NOW()),
  ('vssc_belt3','vscat_pbelt','Timing belts',               '🪢',false,false,3,NOW()),
  ('vssc_belt4','vscat_pbelt','Tensioners',                 '⚙️',false,false,4,NOW()),
  ('vssc_belt5','vscat_pbelt','Timing gears',               '⚙️',false,false,5,NOW()),
  ('vssc_belt6','vscat_pbelt','Timing kits',                '🧩',false,false,6,NOW()),
  -- Fuel System (7)
  ('vssc_fuel1','vscat_pfuel','Fuel pumps',                 '⛽',false,false,1,NOW()),
  ('vssc_fuel2','vscat_pfuel','Fuel injectors',             '🧴',false,false,2,NOW()),
  ('vssc_fuel3','vscat_pfuel','Fuel tanks',                 '⛽',false,false,3,NOW()),
  ('vssc_fuel4','vscat_pfuel','Fuel-pressure regulators',   '🛢️',false,false,4,NOW()),
  ('vssc_fuel5','vscat_pfuel','Fuel hoses',                 '🧴',false,false,5,NOW()),
  ('vssc_fuel6','vscat_pfuel','Fuel rails',                 '🧩',false,false,6,NOW()),
  ('vssc_fuel7','vscat_pfuel','Fuel caps',                  '⛽',false,false,7,NOW()),
  -- Ignition and Sensors (8)
  ('vssc_ign1','vscat_pign','Spark plugs',                  '⚡',false,false,1,NOW()),
  ('vssc_ign2','vscat_pign','Ignition coils',               '⚡',false,false,2,NOW()),
  ('vssc_ign3','vscat_pign','Spark-plug wires',              '🪢',false,false,3,NOW()),
  ('vssc_ign4','vscat_pign','Engine sensors',                '🖥️',false,false,4,NOW()),
  ('vssc_ign5','vscat_pign','Throttle sensors',              '🧭',false,false,5,NOW()),
  ('vssc_ign6','vscat_pign','Oxygen sensors',                '🧪',false,false,6,NOW()),
  ('vssc_ign7','vscat_pign','Temperature sensors',           '🌡️',false,false,7,NOW()),
  ('vssc_ign8','vscat_pign','Crankshaft sensors',            '⚙️',false,false,8,NOW()),
  -- Cooling System (7)
  ('vssc_cools1','vscat_pcsys','Radiators',                  '❄️',false,false,1,NOW()),
  ('vssc_cools2','vscat_pcsys','Water pumps',                '💧',false,false,2,NOW()),
  ('vssc_cools3','vscat_pcsys','Thermostats',                '🌡️',false,false,3,NOW()),
  ('vssc_cools4','vscat_pcsys','Cooling fans',                '🌀',false,false,4,NOW()),
  ('vssc_cools5','vscat_pcsys','Radiator hoses',              '🚿',false,false,5,NOW()),
  ('vssc_cools6','vscat_pcsys','Coolant reservoirs',          '🧴',false,false,6,NOW()),
  ('vssc_cools7','vscat_pcsys','Radiator caps',               '🧩',false,false,7,NOW()),
  -- Air Conditioning (7)
  ('vssc_ac1','vscat_pac','AC compressors',                   '❄️',false,false,1,NOW()),
  ('vssc_ac2','vscat_pac','AC condensers',                    '🧊',false,false,2,NOW()),
  ('vssc_ac3','vscat_pac','AC evaporators',                   '🧊',false,false,3,NOW()),
  ('vssc_ac4','vscat_pac','Blower motors',                    '💨',false,false,4,NOW()),
  ('vssc_ac5','vscat_pac','Expansion valves',                 '🧩',false,false,5,NOW()),
  ('vssc_ac6','vscat_pac','Refrigerant',                      '🧴',false,false,6,NOW()),
  ('vssc_ac7','vscat_pac','AC hoses',                         '🧩',false,false,7,NOW()),
  -- Heating System (6)
  ('vssc_heat1','vscat_pheat','Heater cores',                 '🔥',false,false,1,NOW()),
  ('vssc_heat2','vscat_pheat','Heater blowers',               '🌬️',false,false,2,NOW()),
  ('vssc_heat3','vscat_pheat','Heater hoses',                 '🧩',false,false,3,NOW()),
  ('vssc_heat4','vscat_pheat','Climate controls',             '🎛️',false,false,4,NOW()),
  ('vssc_heat5','vscat_pheat','Air vents',                    '🌬️',false,false,5,NOW()),
  ('vssc_heat6','vscat_pheat','HVAC actuators',                '🧩',false,false,6,NOW()),
  -- Starting and Charging (7)
  ('vssc_start1','vscat_pstart','Batteries',                  '🔋',false,false,1,NOW()),
  ('vssc_start2','vscat_pstart','Alternators',                '⚡',false,false,2,NOW()),
  ('vssc_start3','vscat_pstart','Starter motors',              '⚡',false,false,3,NOW()),
  ('vssc_start4','vscat_pstart','Voltage regulators',          '🔌',false,false,4,NOW()),
  ('vssc_start5','vscat_pstart','Battery terminals',           '🔋',false,false,5,NOW()),
  ('vssc_start6','vscat_pstart','Battery cables',              '🔋',false,false,6,NOW()),
  ('vssc_start7','vscat_pstart','Starter relays',              '🔌',false,false,7,NOW()),
  -- Electrical Components (7)
  ('vssc_elcm1','vscat_pelcm','Wiring harnesses',              '🔌',false,false,1,NOW()),
  ('vssc_elcm2','vscat_pelcm','Connectors',                    '🧷',false,false,2,NOW()),
  ('vssc_elcm3','vscat_pelcm','Fuses',                         '🛡️',false,false,3,NOW()),
  ('vssc_elcm4','vscat_pelcm','Relays',                        '🔌',false,false,4,NOW()),
  ('vssc_elcm5','vscat_pelcm','Switches',                      '🎛️',false,false,5,NOW()),
  ('vssc_elcm6','vscat_pelcm','Fuse boxes',                    '🧩',false,false,6,NOW()),
  ('vssc_elcm7','vscat_pelcm','Control modules',                '🖥️',false,false,7,NOW()),
  -- Lighting and Visibility (8)
  ('vssc_light1','vscat_plight','Headlight bulbs',             '💡',false,false,1,NOW()),
  ('vssc_light2','vscat_plight','Headlight assemblies',        '🔦',false,false,2,NOW()),
  ('vssc_light3','vscat_plight','Tail lights',                 '🔴',false,false,3,NOW()),
  ('vssc_light4','vscat_plight','Indicator lights',            '🟠',false,false,4,NOW()),
  ('vssc_light5','vscat_plight','Fog lights',                  '💡',false,false,5,NOW()),
  ('vssc_light6','vscat_plight','Wiper blades',                '🪟',false,false,6,NOW()),
  ('vssc_light7','vscat_plight','Wiper motors',                '⚙️',false,false,7,NOW()),
  ('vssc_light8','vscat_plight','Mirrors',                     '🪞',false,false,8,NOW()),
  -- Brake Parts — REUSE vscat_pbrake (only "Master cylinders" is genuinely new; others skipped by ON CONFLICT)
  ('vssc_brkp1','vscat_pbrake','Brake pads',                   '🧩',false,false,9,NOW()),
  ('vssc_brkp2','vscat_pbrake','Brake rotors',                 '⚙️',false,false,10,NOW()),
  ('vssc_brkp3','vscat_pbrake','Brake drums',                  '🛞',false,false,11,NOW()),
  ('vssc_brkp4','vscat_pbrake','Brake shoes',                  '🧱',false,false,12,NOW()),
  ('vssc_brkp5','vscat_pbrake','Brake calipers',               '🧰',false,false,13,NOW()),
  ('vssc_brkp6','vscat_pbrake','Master cylinders',             '🛢️',false,false,14,NOW()),
  ('vssc_brkp7','vscat_pbrake','Brake hoses',                  '🛞',false,false,15,NOW()),
  ('vssc_brkp8','vscat_pbrake','ABS sensors',                  '🚨',false,false,16,NOW()),
  -- Steering Parts (6)
  ('vssc_steer1','vscat_psteer','Steering racks',              '🧭',false,false,1,NOW()),
  ('vssc_steer2','vscat_psteer','Steering gearboxes',          '⚙️',false,false,2,NOW()),
  ('vssc_steer3','vscat_psteer','Power-steering pumps',        '🧴',false,false,3,NOW()),
  ('vssc_steer4','vscat_psteer','Tie-rod ends',                '🪢',false,false,4,NOW()),
  ('vssc_steer5','vscat_psteer','Steering couplings',          '🧩',false,false,5,NOW()),
  ('vssc_steer6','vscat_psteer','Steering knuckles',           '🛞',false,false,6,NOW()),
  -- Suspension Parts (8)
  ('vssc_susp1','vscat_psusp','Shock absorbers',               '🪜',false,false,1,NOW()),
  ('vssc_susp2','vscat_psusp','Struts',                        '🪜',false,false,2,NOW()),
  ('vssc_susp3','vscat_psusp','Coil springs',                  '🌀',false,false,3,NOW()),
  ('vssc_susp4','vscat_psusp','Leaf springs',                  '🛞',false,false,4,NOW()),
  ('vssc_susp5','vscat_psusp','Control arms',                  '🧩',false,false,5,NOW()),
  ('vssc_susp6','vscat_psusp','Ball joints',                   '⚙️',false,false,6,NOW()),
  ('vssc_susp7','vscat_psusp','Stabilizer links',              '🔗',false,false,7,NOW()),
  ('vssc_susp8','vscat_psusp','Suspension bushes',             '🪢',false,false,8,NOW()),
  -- Tires and Wheels — REUSE vscat_ptire
  ('vssc_tirw1','vscat_ptire','New tires',                     '🆕',false,false,9,NOW()),
  ('vssc_tirw2','vscat_ptire','Used tires',                    '♻️',false,false,10,NOW()),
  ('vssc_tirw3','vscat_ptire','Steel rims',                    '⚙️',false,false,11,NOW()),
  ('vssc_tirw4','vscat_ptire','Alloy rims',                    '✨',false,false,12,NOW()),
  ('vssc_tirw5','vscat_ptire','Wheel covers',                  '🧩',false,false,13,NOW()),
  ('vssc_tirw6','vscat_ptire','Lug nuts',                      '🔩',false,false,14,NOW()),
  ('vssc_tirw7','vscat_ptire','Tire valves',                   '💨',false,false,15,NOW()),
  ('vssc_tirw8','vscat_ptire','Wheel weights',                 '⚖️',false,false,16,NOW()),
  -- Tire Repair Supplies (6)
  ('vssc_tirr1','vscat_ptirer','Tire patches',                 '🩹',false,false,1,NOW()),
  ('vssc_tirr2','vscat_ptirer','Tire plugs',                   '🩹',false,false,2,NOW()),
  ('vssc_tirr3','vscat_ptirer','Tire sealant',                 '🧴',false,false,3,NOW()),
  ('vssc_tirr4','vscat_ptirer','Tire repair kits',              '🧰',false,false,4,NOW()),
  ('vssc_tirr5','vscat_ptirer','Tire-pressure sensors',         '💨',false,false,5,NOW()),
  ('vssc_tirr6','vscat_ptirer','Valve caps',                    '🧩',false,false,6,NOW()),
  -- Transmission and Clutch (8)
  ('vssc_trns1','vscat_ptrans','Transmission assemblies',      '⚙️',false,false,1,NOW()),
  ('vssc_trns2','vscat_ptrans','Transmission filters',          '🔄',false,false,2,NOW()),
  ('vssc_trns3','vscat_ptrans','Transmission seals',            '🧩',false,false,3,NOW()),
  ('vssc_trns4','vscat_ptrans','Torque converters',             '🛞',false,false,4,NOW()),
  ('vssc_trns5','vscat_ptrans','Clutch kits',                   '🧩',false,false,5,NOW()),
  ('vssc_trns6','vscat_ptrans','Clutch discs',                  '🧩',false,false,6,NOW()),
  ('vssc_trns7','vscat_ptrans','Pressure plates',                '🛞',false,false,7,NOW()),
  ('vssc_trns8','vscat_ptrans','Flywheels',                     '⚙️',false,false,8,NOW()),
  -- Axles and Driveline (7)
  ('vssc_axle1','vscat_paxle','CV axles',                       '🛞',false,false,1,NOW()),
  ('vssc_axle2','vscat_paxle','Driveshafts',                    '⚙️',false,false,2,NOW()),
  ('vssc_axle3','vscat_paxle','Universal joints',                '🧩',false,false,3,NOW()),
  ('vssc_axle4','vscat_paxle','Differentials',                  '⚙️',false,false,4,NOW()),
  ('vssc_axle5','vscat_paxle','CV boots',                       '🧩',false,false,5,NOW()),
  ('vssc_axle6','vscat_paxle','Wheel bearings',                 '⚙️',false,false,6,NOW()),
  ('vssc_axle7','vscat_paxle','Wheel hubs',                     '🛞',false,false,7,NOW()),
  -- Exhaust and Emissions (8)
  ('vssc_exhp1','vscat_pexh','Exhaust pipes',                    '💨',false,false,1,NOW()),
  ('vssc_exhp2','vscat_pexh','Mufflers',                         '🔇',false,false,2,NOW()),
  ('vssc_exhp3','vscat_pexh','Catalytic converters',              '🧩',false,false,3,NOW()),
  ('vssc_exhp4','vscat_pexh','Exhaust manifolds',                '🧩',false,false,4,NOW()),
  ('vssc_exhp5','vscat_pexh','Exhaust gaskets',                  '🧴',false,false,5,NOW()),
  ('vssc_exhp6','vscat_pexh','Exhaust clamps',                   '🧩',false,false,6,NOW()),
  ('vssc_exhp7','vscat_pexh','Oxygen sensors',                   '🧪',false,false,7,NOW()),
  ('vssc_exhp8','vscat_pexh','EGR valves',                       '🧩',false,false,8,NOW()),
  -- Body and Exterior (8)
  ('vssc_bdye1','vscat_pbody','Bumpers',                        '🚘',false,false,1,NOW()),
  ('vssc_bdye2','vscat_pbody','Doors',                          '🚪',false,false,2,NOW()),
  ('vssc_bdye3','vscat_pbody','Fenders',                        '🪶',false,false,3,NOW()),
  ('vssc_bdye4','vscat_pbody','Hoods',                          '🧱',false,false,4,NOW()),
  ('vssc_bdye5','vscat_pbody','Grilles',                        '🧩',false,false,5,NOW()),
  ('vssc_bdye6','vscat_pbody','Windshields',                    '🪟',false,false,6,NOW()),
  ('vssc_bdye7','vscat_pbody','Window regulators',              '🪟',false,false,7,NOW()),
  ('vssc_bdye8','vscat_pbody','Door locks',                     '🔒',false,false,8,NOW()),
  -- Interior and Accessories — REUSE vscat_pacc
  ('vssc_intacc1','vscat_pacc','Seat covers',                   '🪑',false,false,9,NOW()),
  ('vssc_intacc2','vscat_pacc','Floor mats',                    '🧭',false,false,10,NOW()),
  ('vssc_intacc3','vscat_pacc','Dashboards',                    '🎛️',false,false,11,NOW()),
  ('vssc_intacc4','vscat_pacc','Radios',                        '📻',false,false,12,NOW()),
  ('vssc_intacc5','vscat_pacc','Speakers',                      '🔊',false,false,13,NOW()),
  ('vssc_intacc6','vscat_pacc','Reverse cameras',                '📹',false,false,14,NOW()),
  ('vssc_intacc7','vscat_pacc','Phone mounts',                   '📱',false,false,15,NOW()),
  ('vssc_intacc8','vscat_pacc','Emergency kits',                 '🧰',false,false,16,NOW()),
  -- Hand Tools (6)
  ('vssc_hand1','vscat_whand','Wrenches',                       '🔧',false,false,1,NOW()),
  ('vssc_hand2','vscat_whand','Screwdrivers',                   '🪛',false,false,2,NOW()),
  ('vssc_hand3','vscat_whand','Socket sets',                    '🧰',false,false,3,NOW()),
  ('vssc_hand4','vscat_whand','Pliers',                         '🗜️',false,false,4,NOW()),
  ('vssc_hand5','vscat_whand','Measuring tools',                '📏',false,false,5,NOW()),
  ('vssc_hand6','vscat_whand','Torque wrenches',                '🔧',false,false,6,NOW()),
  -- Workshop Equipment (7)
  ('vssc_equip1','vscat_wequip','Jacks',                        '🛞',false,false,1,NOW()),
  ('vssc_equip2','vscat_wequip','Jack stands',                  '🪜',false,false,2,NOW()),
  ('vssc_equip3','vscat_wequip','Air compressors',               '💨',false,false,3,NOW()),
  ('vssc_equip4','vscat_wequip','Tire changers',                '🛞',false,false,4,NOW()),
  ('vssc_equip5','vscat_wequip','Wheel balancers',               '⚖️',false,false,5,NOW()),
  ('vssc_equip6','vscat_wequip','Diagnostic scanners',           '🔍',false,false,6,NOW()),
  ('vssc_equip7','vscat_wequip','Battery chargers',              '🔋',false,false,7,NOW()),
  -- Workshop Consumables (7)
  ('vssc_cons1','vscat_wcons','Mechanic gloves',                 '🧤',false,false,1,NOW()),
  ('vssc_cons2','vscat_wcons','Shop towels',                     '🧻',false,false,2,NOW()),
  ('vssc_cons3','vscat_wcons','Cleaning rags',                   '🧽',false,false,3,NOW()),
  ('vssc_cons4','vscat_wcons','Hand cleaner',                    '🧴',false,false,4,NOW()),
  ('vssc_cons5','vscat_wcons','Fasteners',                       '🔩',false,false,5,NOW()),
  ('vssc_cons6','vscat_wcons','Cable ties',                      '🧷',false,false,6,NOW()),
  ('vssc_cons7','vscat_wcons','Waste containers',                '🗑️',false,false,7,NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;
