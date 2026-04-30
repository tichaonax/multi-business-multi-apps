-- Seed Vehicle Expense Categories
-- Adds categories and subcategories under the Vehicle ExpenseDomain.
-- Source: ai-contexts/project-plans/review/Vehicle Expense Categories.md
--
-- Domain: domain-vehicle (already exists)
-- IDEMPOTENT: Uses ON CONFLICT DO NOTHING — safe to re-run
--
-- Adds:
--   6 expense_categories  under domain-vehicle
--   12 expense_subcategories

-- =============================================================================
-- ENSURE domain-vehicle EXISTS (safe for fresh installs and production)
-- =============================================================================

INSERT INTO expense_domains (id, name, emoji, description, "isActive", "createdAt")
SELECT 'domain-vehicle', 'Vehicle', '🚗', 'Expense categories for vehicle-related costs', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM expense_domains WHERE id = 'domain-vehicle');

-- =============================================================================
-- EXPENSE CATEGORIES
-- =============================================================================

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-veh-repairs', 'domain-vehicle', 'Vehicle Repairs', '🛠️', '#EF4444', 'All repair work on vehicles — mechanical, electrical, and body', true, false, true, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-veh-maintenance', 'domain-vehicle', 'Maintenance and Service', '🛢️', '#F59E0B', 'Scheduled maintenance and consumables that keep vehicles running', true, false, true, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-veh-upkeep', 'domain-vehicle', 'Vehicle Upkeep', '🚘', '#3B82F6', 'Cleaning, detailing and accessories that maintain vehicle condition', true, false, true, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-veh-operating', 'domain-vehicle', 'Operating Costs', '⛽', '#10B981', 'Day-to-day costs of running and using vehicles', true, false, true, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-veh-compliance', 'domain-vehicle', 'Ownership and Compliance', '📄', '#8B5CF6', 'Legal, registration, insurance and compliance obligations', true, false, true, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-veh-fleet', 'domain-vehicle', 'Fleet and Business Use', '🚚', '#06B6D4', 'Costs specific to business-use vehicles and fleet management', true, false, true, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

-- =============================================================================
-- EXPENSE SUBCATEGORIES — VEHICLE REPAIRS
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-veh-rep-auto', 'cat-veh-repairs', 'Auto Repair Services', '🔧', 'Engine, brakes, transmission, suspension, electrical, exhaust, AC and steering repairs', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-veh-rep-parts', 'cat-veh-repairs', 'Replacement Parts', '🧩', 'Tires, batteries, wipers, lights, belts, sensors, hoses and other replacement parts', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- EXPENSE SUBCATEGORIES — MAINTENANCE AND SERVICE
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-veh-mnt-routine', 'cat-veh-maintenance', 'Routine Maintenance', '🛢️', 'Oil changes, tune-ups, tire rotations, filter replacements, inspections and spark plugs', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-veh-mnt-fluids', 'cat-veh-maintenance', 'Fluids and Consumables', '🧪', 'Motor oil, transmission fluid, brake fluid, coolant, power steering fluid, washer fluid and grease', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- EXPENSE SUBCATEGORIES — VEHICLE UPKEEP
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-veh-upk-cleaning', 'cat-veh-upkeep', 'Cleaning and Detailing', '🧽', 'Car washes, interior and exterior cleaning, waxing, tire shine and upholstery care', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-veh-upk-accessories', 'cat-veh-upkeep', 'Accessories and Install', '🧰', 'Seat covers, floor mats, phone mounts, dash cams, roof racks, tool kits and security accessories', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- EXPENSE SUBCATEGORIES — OPERATING COSTS
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-veh-op-fuel', 'cat-veh-operating', 'Fuel and Charging', '⛽', 'Gasoline, diesel, electric charging, fuel additives and fuel station fees', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-veh-op-road', 'cat-veh-operating', 'Road and Travel Costs', '🛣️', 'Tolls, parking fees, traffic fines, road permits and trip expenses', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- EXPENSE SUBCATEGORIES — OWNERSHIP AND COMPLIANCE
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-veh-cmp-registration', 'cat-veh-compliance', 'Registration and Licensing', '🪪', 'Registration fees, inspection fees, license plates, title fees and renewals', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-veh-cmp-insurance', 'cat-veh-compliance', 'Insurance and Protection', '🛡️', 'Auto insurance, collision, comprehensive coverage, roadside assistance and warranty plans', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- EXPENSE SUBCATEGORIES — FLEET AND BUSINESS USE
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-veh-flt-costs', 'cat-veh-fleet', 'Business Vehicle Costs', '🧑‍🔧', 'Fleet maintenance, business fuel, driver reimbursements, delivery vehicle costs and service contracts', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-veh-flt-admin', 'cat-veh-fleet', 'Vehicle Administration', '📋', 'Logbook and mileage tracking, vehicle records, lease payments and fleet management fees', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;
