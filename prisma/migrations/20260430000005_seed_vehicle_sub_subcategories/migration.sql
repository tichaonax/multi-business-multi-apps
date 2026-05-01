-- Seed Vehicle Expense Sub-Subcategories (leaf items)
-- Source: ai-contexts/project-plans/review/Vehicle Expense Categories.md
-- These are the searchable leaf items under each subcategory.
--
-- IDEMPOTENT: Uses ON CONFLICT ("subcategoryId", name) DO NOTHING — safe to re-run
--
-- Structure:
--   sub-veh-rep-auto       → 8 items (Engine repair, Brake repair…)
--   sub-veh-rep-parts      → 8 items (Tires, Batteries…)
--   sub-veh-mnt-routine    → 8 items (Oil change, Tune-up…)
--   sub-veh-mnt-fluids     → 8 items (Motor oil, Brake fluid…)
--   sub-veh-upk-cleaning   → 8 items (Car wash, Interior cleaning…)
--   sub-veh-upk-accessories→ 8 items (Seat covers, Dash cams…)
--   sub-veh-op-fuel        → 5 items (Gasoline, Diesel…)
--   sub-veh-op-road        → 5 items (Tolls, Parking fees…)
--   sub-veh-cmp-registration→ 5 items (Registration fees…)
--   sub-veh-cmp-insurance  → 5 items (Auto insurance…)
--   sub-veh-flt-costs      → 5 items (Fleet maintenance…)
--   sub-veh-flt-admin      → 5 items (Logbook tracking…)
--   Total: 84 sub-subcategories

-- =============================================================================
-- AUTO REPAIR SERVICES
-- =============================================================================

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-rep-auto-engine',       'sub-veh-rep-auto', 'Engine repair',       '🔩', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-rep-auto-brakes',       'sub-veh-rep-auto', 'Brake repair',        '🛞', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-rep-auto-transmission', 'sub-veh-rep-auto', 'Transmission repair', '⚙️', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-rep-auto-steering',     'sub-veh-rep-auto', 'Steering repair',     '🧭', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-rep-auto-suspension',   'sub-veh-rep-auto', 'Suspension repair',   '🛞', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-rep-auto-electrical',   'sub-veh-rep-auto', 'Electrical repair',   '🔌', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-rep-auto-exhaust',      'sub-veh-rep-auto', 'Exhaust repair',      '💨', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-rep-auto-ac',           'sub-veh-rep-auto', 'AC repair',           '❄️', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

-- =============================================================================
-- REPLACEMENT PARTS
-- =============================================================================

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-rep-parts-tires',    'sub-veh-rep-parts', 'Tires',              '🛞', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-rep-parts-battery',  'sub-veh-rep-parts', 'Batteries',          '🔋', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-rep-parts-wipers',   'sub-veh-rep-parts', 'Windshield wipers',  '🪟', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-rep-parts-headlights','sub-veh-rep-parts', 'Headlights',        '🔦', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-rep-parts-taillights','sub-veh-rep-parts', 'Taillights',        '💡', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-rep-parts-belts',    'sub-veh-rep-parts', 'Belts',              '🛢️', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-rep-parts-sensors',  'sub-veh-rep-parts', 'Sensors',            '⚙️', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-rep-parts-hoses',    'sub-veh-rep-parts', 'Hoses',              '🧰', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

-- =============================================================================
-- ROUTINE MAINTENANCE
-- =============================================================================

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-mnt-routine-oilchange',   'sub-veh-mnt-routine', 'Oil change',         '🛢️', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-mnt-routine-tuneup',      'sub-veh-mnt-routine', 'Tune-up',            '🔧', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-mnt-routine-tirerot',     'sub-veh-mnt-routine', 'Tire rotation',      '🛞', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-mnt-routine-fluidtop',    'sub-veh-mnt-routine', 'Fluid top-up',       '🧴', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-mnt-routine-filter',      'sub-veh-mnt-routine', 'Filter replacement', '🧽', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-mnt-routine-inspection',  'sub-veh-mnt-routine', 'Vehicle inspection', '🧼', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-mnt-routine-belt',        'sub-veh-mnt-routine', 'Belt replacement',   '🧰', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-mnt-routine-sparkplug',   'sub-veh-mnt-routine', 'Spark plugs',        '🔩', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

-- =============================================================================
-- FLUIDS AND CONSUMABLES
-- =============================================================================

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-mnt-fluids-motoroil',    'sub-veh-mnt-fluids', 'Motor oil',                '🛢️', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-mnt-fluids-transfluid',  'sub-veh-mnt-fluids', 'Transmission fluid',       '🧴', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-mnt-fluids-brakefluid', 'sub-veh-mnt-fluids', 'Brake fluid',              '🧴', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-mnt-fluids-coolant',     'sub-veh-mnt-fluids', 'Coolant',                  '🧴', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-mnt-fluids-psfluid',     'sub-veh-mnt-fluids', 'Power steering fluid',     '🧴', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-mnt-fluids-washerfluid', 'sub-veh-mnt-fluids', 'Windshield washer fluid',  '🧴', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-mnt-fluids-fueladd',     'sub-veh-mnt-fluids', 'Fuel additives',           '⛽', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-mnt-fluids-grease',      'sub-veh-mnt-fluids', 'Grease',                   '🧴', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

-- =============================================================================
-- CLEANING AND DETAILING
-- =============================================================================

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-upk-clean-carwash',    'sub-veh-upk-cleaning', 'Car wash',           '🧽', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-upk-clean-interior',   'sub-veh-upk-cleaning', 'Interior cleaning',  '✨', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-upk-clean-window',     'sub-veh-upk-cleaning', 'Window cleaning',    '🪟', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-upk-clean-waxing',     'sub-veh-upk-cleaning', 'Waxing',             '🧴', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-upk-clean-tireshine',  'sub-veh-upk-cleaning', 'Tire shine',         '🛞', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-upk-clean-vacuuming',  'sub-veh-upk-cleaning', 'Vacuuming',          '🧹', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-upk-clean-upholstery', 'sub-veh-upk-cleaning', 'Upholstery cleaning','🧼', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-upk-clean-odor',       'sub-veh-upk-cleaning', 'Odor removal',       '💨', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

-- =============================================================================
-- ACCESSORIES AND INSTALL
-- =============================================================================

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-upk-acc-seatcovers', 'sub-veh-upk-accessories', 'Seat covers',   '🚘', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-upk-acc-floormats',  'sub-veh-upk-accessories', 'Floor mats',    '🧭', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-upk-acc-phonemount', 'sub-veh-upk-accessories', 'Phone mounts',  '📱', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-upk-acc-chargers',   'sub-veh-upk-accessories', 'Chargers',      '🔌', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-upk-acc-dashcam',    'sub-veh-upk-accessories', 'Dash cams',     '📡', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-upk-acc-roofrack',   'sub-veh-upk-accessories', 'Roof racks',    '🧳', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-upk-acc-toolkits',   'sub-veh-upk-accessories', 'Tool kits',     '🧰', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-upk-acc-steerlock',  'sub-veh-upk-accessories', 'Steering locks','🔒', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

-- =============================================================================
-- FUEL AND CHARGING
-- =============================================================================

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-op-fuel-gasoline',  'sub-veh-op-fuel', 'Gasoline',          '⛽', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-op-fuel-diesel',    'sub-veh-op-fuel', 'Diesel',            '🛢️', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-op-fuel-electric',  'sub-veh-op-fuel', 'Electric charging', '🔋', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-op-fuel-additive',  'sub-veh-op-fuel', 'Fuel additives',    '🧴', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-op-fuel-statnfee',  'sub-veh-op-fuel', 'Fuel station fees', '⛽', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

-- =============================================================================
-- ROAD AND TRAVEL COSTS
-- =============================================================================

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-op-road-tolls',    'sub-veh-op-road', 'Tolls',         '🛣️', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-op-road-parking',  'sub-veh-op-road', 'Parking fees',  '🅿️', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-op-road-fines',    'sub-veh-op-road', 'Traffic fines', '🚦', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-op-road-permits',  'sub-veh-op-road', 'Road permits',  '🧾', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-op-road-trip',     'sub-veh-op-road', 'Trip expenses', '🧭', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

-- =============================================================================
-- REGISTRATION AND LICENSING
-- =============================================================================

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-cmp-reg-regfee',   'sub-veh-cmp-registration', 'Registration fees', '🪪', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-cmp-reg-inspfee',  'sub-veh-cmp-registration', 'Inspection fees',   '📄', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-cmp-reg-plates',   'sub-veh-cmp-registration', 'License plates',    '🏷️', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-cmp-reg-title',    'sub-veh-cmp-registration', 'Title fees',        '📑', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-cmp-reg-renewal',  'sub-veh-cmp-registration', 'Renewal fees',      '🧾', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

-- =============================================================================
-- INSURANCE AND PROTECTION
-- =============================================================================

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-cmp-ins-autoins',   'sub-veh-cmp-insurance', 'Auto insurance',          '🛡️', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-cmp-ins-collision', 'sub-veh-cmp-insurance', 'Collision coverage',      '🛡️', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-cmp-ins-comp',      'sub-veh-cmp-insurance', 'Comprehensive coverage',  '🛡️', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-cmp-ins-roadside',  'sub-veh-cmp-insurance', 'Roadside assistance',     '🧯', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-cmp-ins-warranty',  'sub-veh-cmp-insurance', 'Warranty plans',          '🛡️', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

-- =============================================================================
-- BUSINESS VEHICLE COSTS
-- =============================================================================

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-flt-cost-fleet',    'sub-veh-flt-costs', 'Fleet maintenance',        '🚚', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-flt-cost-busfuel',  'sub-veh-flt-costs', 'Business fuel',            '⛽', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-flt-cost-driver',   'sub-veh-flt-costs', 'Driver reimbursements',    '🧾', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-flt-cost-delivery', 'sub-veh-flt-costs', 'Delivery vehicle costs',   '📦', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-flt-cost-service',  'sub-veh-flt-costs', 'Service contract fees',    '🧰', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

-- =============================================================================
-- VEHICLE ADMINISTRATION
-- =============================================================================

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-flt-adm-logbook',   'sub-veh-flt-admin', 'Logbook tracking',      '📑', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-flt-adm-mileage',   'sub-veh-flt-admin', 'Mileage tracking',      '🧾', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-flt-adm-records',   'sub-veh-flt-admin', 'Vehicle records',       '🗂️', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-flt-adm-lease',     'sub-veh-flt-admin', 'Lease payments',        '🧾', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('sss-veh-flt-adm-fleetmgmt', 'sub-veh-flt-admin', 'Fleet management fees', '🧰', false, NOW())
ON CONFLICT ("subcategoryId", name) DO NOTHING;
