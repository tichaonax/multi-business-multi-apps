-- Seed Home Expense Categories
-- Source: Home Expense Categories.md
--
-- Domain: domain-home (already exists)
-- IDEMPOTENT: Uses ON CONFLICT DO NOTHING — safe to re-run
--
-- Already in domain-home (unchanged):
--   Rent & Accommodation, Utilities, Groceries & Household Food,
--   Maintenance & Repairs, Domestic Workers, Furniture & Appliances,
--   Home Security, Garden & Outdoor, Cleaning & Toiletries, Insurance & Rates
--
-- Adds:
--   2 new expense_categories:
--       Vehicle and Transport, Family and Household Support
--   6 new expense_subcategories under the 2 new categories
--   4 new expense_subcategories added to existing categories:
--       Utilities → Service Fees
--       Maintenance & Repairs → Supplies and Materials
--       Furniture & Appliances → Appliance Repairs
--       Garden & Outdoor → Outdoor Repairs

-- =============================================================================
-- ENSURE domain-home EXISTS (safe for fresh installs and production)
-- =============================================================================

INSERT INTO expense_domains (id, name, emoji, description, "isActive", "createdAt")
SELECT 'domain-home', 'Home', '🏠', 'Home and household expense categories', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM expense_domains WHERE id = 'domain-home');

-- =============================================================================
-- NEW EXPENSE CATEGORIES
-- =============================================================================

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-home-vehicle-transport', 'domain-home', 'Vehicle and Transport', '🚗', '#3B82F6', 'Vehicle maintenance, repairs, and day-to-day operating costs', true, false, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-home-family-support', 'domain-home', 'Family and Household Support', '👨‍👩‍👧', '#F97316', 'Childcare, elder care, and family support costs', true, false, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- EXPENSE SUBCATEGORIES — VEHICLE AND TRANSPORT
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-home-veh-maintenance', 'cat-home-vehicle-transport', 'Auto Maintenance', '🛢️', 'Oil changes, tune-ups, tire rotation, battery replacement, car wash, and wiper replacement', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-home-veh-repairs', 'cat-home-vehicle-transport', 'Auto Repairs', '🔧', 'Brake, engine, transmission, AC, electrical, suspension, lights, and alignment repairs', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-home-veh-operating', 'cat-home-vehicle-transport', 'Vehicle Operating Costs', '⛽', 'Fuel, tolls, parking, registration, insurance, and inspection fees', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- EXPENSE SUBCATEGORIES — FAMILY AND HOUSEHOLD SUPPORT
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-home-fam-childcare', 'cat-home-family-support', 'Childcare', '👶', 'Babysitting, nanny services, child supplies, toys, and lunch expenses', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-home-fam-eldercare', 'cat-home-family-support', 'Elder Care', '👵', 'Caregiver support, medical supplies, transport, home assistance, and support services', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-home-fam-admin', 'cat-home-family-support', 'Household Admin', '🧾', 'Lease fees, mortgage charges, home insurance, HOA fees, permits, property taxes, and household fees', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- ADD SERVICE FEES SUBCATEGORY to existing Utilities category
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-home-util-services', 'cat-home-utilities', 'Service Fees', '📡', 'Cable, alarm monitoring, security services, pest control, deep cleaning, and maintenance contracts', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- ADD SUPPLIES AND MATERIALS SUBCATEGORY to existing Maintenance & Repairs category
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-home-maint-supplies', 'cat-home-maintenance-repairs', 'Supplies and Materials', '🔩', 'Screws, tools, glue, sealants, tape, replacement parts, cleaning chemicals, and hardware', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- ADD APPLIANCE REPAIRS SUBCATEGORY to existing Furniture & Appliances category
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-home-furn-repairs', 'cat-home-furniture-appliances', 'Appliance Repairs', '⚙️', 'Compressor repair, heating element replacement, motor repair, cord replacement, filter replacement, and service calls', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- ADD OUTDOOR REPAIRS SUBCATEGORY to existing Garden & Outdoor category
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-home-gard-repairs', 'cat-home-garden-outdoor', 'Outdoor Repairs', '🪚', 'Fence repair, wall repair, deck repair, patio upkeep, outdoor lighting, and outdoor fixtures', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;
