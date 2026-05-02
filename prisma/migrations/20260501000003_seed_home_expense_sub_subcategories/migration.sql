-- Seed Home Expense Sub-Subcategories (leaf items)
-- Source: Home Expense Categories.md
-- IDEMPOTENT: Uses ON CONFLICT (id) DO NOTHING -- safe to re-run
--
-- Structure:
--   subcat-home-clean-supplies   -> 6 items (Dishwashing supplies, Paper products...)
--   subcat-home-dom-maid         -> 4 items (House cleaners, Laundry help, Handymen, House sitters)
--   subcat-home-dom-nanny        -> 2 items (Caregivers, Nannies)
--   subcat-home-maint-general    -> 4 items (Door repair, Window repair, Cabinet repair, General maintenance)
--   subcat-home-maint-painting   -> 2 items (Wall repair, Drywall repair)
--   subcat-home-maint-electrical -> 1 item  (Electrical repair)
--   subcat-home-maint-plumbing   -> 1 item  (Plumbing repair)
--   subcat-home-maint-supplies   -> 8 items (Screws, Tools, Glue...)
--   subcat-home-util-services    -> 6 items (Cable, Alarm monitoring...)
--   sub-home-veh-maintenance     -> 6 items (Oil changes, Tune-ups...)
--   sub-home-veh-repairs         -> 8 items (Brake repair, Engine repair...)
--   sub-home-veh-operating       -> 6 items (Fuel, Tolls...)
--   subcat-home-furn-furniture   -> 6 items (Sofas, Beds...)
--   subcat-home-furn-appliances  -> 8 items (Fridges, Stoves...)
--   subcat-home-furn-repairs     -> 6 items (Compressor repair, Motor repair...)
--   subcat-home-gard-lawn        -> 4 items (Lawn care, Garden upkeep...)
--   subcat-home-gard-plants      -> 2 items (Fertilizer, Weed control)
--   subcat-home-gard-repairs     -> 6 items (Fence repair, Wall repair...)
--   sub-home-fam-childcare       -> 5 items (Babysitting, Nanny services...)
--   sub-home-fam-eldercare       -> 5 items (Caregiver support, Medical supplies...)
--   sub-home-fam-admin           -> 11 items (Lease fees, Mortgage charges...)
--   Total: 107 sub-subcategories

-- =============================================================================
-- HOME OPERATIONS - Cleaning Supplies
-- Existing subcategory: subcat-home-clean-supplies
-- =============================================================================

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-clean-dishwashing', 'subcat-home-clean-supplies', 'Dishwashing supplies', '🧼', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-clean-paper', 'subcat-home-clean-supplies', 'Paper products', '🧻', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-clean-trash', 'subcat-home-clean-supplies', 'Trash bags', '🗑', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-clean-storage', 'subcat-home-clean-supplies', 'Storage containers', '🪣', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-clean-batteries', 'subcat-home-clean-supplies', 'Batteries', '🔋', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-clean-bulbs', 'subcat-home-clean-supplies', 'Light bulbs', '💡', false, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- HOME OPERATIONS - Domestic Workers
-- Existing subcategories: subcat-home-dom-maid, subcat-home-dom-nanny
-- =============================================================================

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-dom-cleaners', 'subcat-home-dom-maid', 'House cleaners', '🧹', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-dom-laundry', 'subcat-home-dom-maid', 'Laundry help', '🧺', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-dom-handymen', 'subcat-home-dom-maid', 'Handymen', '🧰', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-dom-sitters', 'subcat-home-dom-maid', 'House sitters', '🚪', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-dom-nannies', 'subcat-home-dom-nanny', 'Nannies', '👶', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-dom-caregivers', 'subcat-home-dom-nanny', 'Caregivers', '👵', false, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- HOME MAINTENANCE - Repairs
-- Existing subcategories: subcat-home-maint-general, subcat-home-maint-painting,
--                         subcat-home-maint-electrical, subcat-home-maint-plumbing
-- =============================================================================

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-rep-door', 'subcat-home-maint-general', 'Door repair', '🚪', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-rep-window', 'subcat-home-maint-general', 'Window repair', '🪟', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-rep-cabinet', 'subcat-home-maint-general', 'Cabinet repair', '🪚', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-rep-general', 'subcat-home-maint-general', 'General maintenance', '🧰', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-rep-wall', 'subcat-home-maint-painting', 'Wall repair', '🎨', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-rep-drywall', 'subcat-home-maint-painting', 'Drywall repair', '🧱', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-rep-electrical', 'subcat-home-maint-electrical', 'Electrical repair', '🔌', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-rep-plumbing', 'subcat-home-maint-plumbing', 'Plumbing repair', '🚰', false, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- HOME MAINTENANCE - Supplies and Materials
-- Existing subcategory: subcat-home-maint-supplies
-- =============================================================================

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-sup-screws', 'subcat-home-maint-supplies', 'Screws', '🔩', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-sup-tools', 'subcat-home-maint-supplies', 'Tools', '🪛', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-sup-glue', 'subcat-home-maint-supplies', 'Glue', '🧴', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-sup-sealants', 'subcat-home-maint-supplies', 'Sealants', '🧴', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-sup-tape', 'subcat-home-maint-supplies', 'Tape', '🩹', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-sup-parts', 'subcat-home-maint-supplies', 'Replacement parts', '🧽', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-sup-chemicals', 'subcat-home-maint-supplies', 'Cleaning chemicals', '🧼', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-sup-hardware', 'subcat-home-maint-supplies', 'Hardware', '🪚', false, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- UTILITIES - Service Fees
-- Existing subcategory: subcat-home-util-services
-- =============================================================================

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-svc-cable', 'subcat-home-util-services', 'Cable', '📡', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-svc-alarm', 'subcat-home-util-services', 'Alarm monitoring', '🧾', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-svc-security', 'subcat-home-util-services', 'Security services', '🔒', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-svc-pest', 'subcat-home-util-services', 'Pest control', '🧯', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-svc-cleaning', 'subcat-home-util-services', 'Deep cleaning', '🧹', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-svc-maint', 'subcat-home-util-services', 'Maintenance contracts', '🧰', false, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- VEHICLE AND TRANSPORT - Auto Maintenance
-- Existing subcategory: sub-home-veh-maintenance
-- =============================================================================

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-veh-oil', 'sub-home-veh-maintenance', 'Oil changes', '🛢', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-veh-tuneup', 'sub-home-veh-maintenance', 'Tune-ups', '🔧', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-veh-tires', 'sub-home-veh-maintenance', 'Tire rotation', '🔄', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-veh-battery', 'sub-home-veh-maintenance', 'Battery replacement', '🔋', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-veh-wash', 'sub-home-veh-maintenance', 'Car wash', '🧽', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-veh-wipers', 'sub-home-veh-maintenance', 'Wiper replacement', '🪟', false, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- VEHICLE AND TRANSPORT - Auto Repairs
-- Existing subcategory: sub-home-veh-repairs
-- =============================================================================

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-veh-brakes', 'sub-home-veh-repairs', 'Brake repair', '🔩', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-veh-engine', 'sub-home-veh-repairs', 'Engine repair', '⚙', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-veh-trans', 'sub-home-veh-repairs', 'Transmission repair', '🚘', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-veh-ac', 'sub-home-veh-repairs', 'AC repair', '💨', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-veh-electrical2', 'sub-home-veh-repairs', 'Electrical repair', '🔌', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-veh-suspension', 'sub-home-veh-repairs', 'Suspension repair', '🔧', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-veh-lights', 'sub-home-veh-repairs', 'Light replacement', '💡', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-veh-alignment', 'sub-home-veh-repairs', 'Alignment', '🧭', false, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- VEHICLE AND TRANSPORT - Vehicle Operating Costs
-- Existing subcategory: sub-home-veh-operating
-- =============================================================================

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-veh-fuel', 'sub-home-veh-operating', 'Fuel', '⛽', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-veh-tolls', 'sub-home-veh-operating', 'Tolls', '🛣', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-veh-parking', 'sub-home-veh-operating', 'Parking', '🅿', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-veh-reg', 'sub-home-veh-operating', 'Registration', '📋', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-veh-insurance', 'sub-home-veh-operating', 'Insurance', '🔒', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-veh-inspection', 'sub-home-veh-operating', 'Inspection fees', '📄', false, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- FURNITURE AND APPLIANCES - Furniture
-- Existing subcategory: subcat-home-furn-furniture
-- =============================================================================

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-furn-sofas', 'subcat-home-furn-furniture', 'Sofas', '🛋', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-furn-beds', 'subcat-home-furn-furniture', 'Beds', '🛏', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-furn-chairs', 'subcat-home-furn-furniture', 'Chairs', '🪑', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-furn-cabinets', 'subcat-home-furn-furniture', 'Cabinets', '🗄', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-furn-tables', 'subcat-home-furn-furniture', 'Tables', '🪟', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-furn-shelving', 'subcat-home-furn-furniture', 'Shelving', '🧺', false, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- FURNITURE AND APPLIANCES - Home Appliances
-- Existing subcategory: subcat-home-furn-appliances
-- =============================================================================

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-app-fridge', 'subcat-home-furn-appliances', 'Fridges', '❄', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-app-stove', 'subcat-home-furn-appliances', 'Stoves', '🍳', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-app-washer', 'subcat-home-furn-appliances', 'Washers', '🧺', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-app-dryer', 'subcat-home-furn-appliances', 'Dryers', '💨', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-app-tv', 'subcat-home-furn-appliances', 'TVs', '📺', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-app-vacuum', 'subcat-home-furn-appliances', 'Vacuums', '🧹', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-app-microwave', 'subcat-home-furn-appliances', 'Microwaves', '🍞', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-app-coffee', 'subcat-home-furn-appliances', 'Coffee makers', '☕', false, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- FURNITURE AND APPLIANCES - Appliance Repairs
-- Existing subcategory: subcat-home-furn-repairs
-- =============================================================================

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-rep-compressor', 'subcat-home-furn-repairs', 'Compressor repair', '🌀', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-rep-heating', 'subcat-home-furn-repairs', 'Heating element replacement', '🔥', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-rep-motor', 'subcat-home-furn-repairs', 'Motor repair', '⚙', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-rep-cord', 'subcat-home-furn-repairs', 'Cord replacement', '🔌', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-rep-filter', 'subcat-home-furn-repairs', 'Filter replacement', '🧽', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-rep-service', 'subcat-home-furn-repairs', 'Service calls', '🧰', false, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- YARD AND OUTDOOR - Outdoor Maintenance
-- Existing subcategories: subcat-home-gard-lawn, subcat-home-gard-plants
-- =============================================================================

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-gard-lawn', 'subcat-home-gard-lawn', 'Lawn care', '🌱', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-gard-garden', 'subcat-home-gard-lawn', 'Garden upkeep', '🌿', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-gard-tree', 'subcat-home-gard-lawn', 'Tree trimming', '🪚', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-gard-cleanup', 'subcat-home-gard-lawn', 'Yard cleanup', '🧹', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-gard-fertilizer', 'subcat-home-gard-plants', 'Fertilizer', '🧴', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-gard-weed', 'subcat-home-gard-plants', 'Weed control', '🧴', false, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- YARD AND OUTDOOR - Outdoor Repairs
-- Existing subcategory: subcat-home-gard-repairs
-- =============================================================================

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-out-fence', 'subcat-home-gard-repairs', 'Fence repair', '🚪', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-out-wall', 'subcat-home-gard-repairs', 'Wall repair', '🧱', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-out-deck', 'subcat-home-gard-repairs', 'Deck repair', '🪵', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-out-patio', 'subcat-home-gard-repairs', 'Patio upkeep', '⛱', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-out-lighting', 'subcat-home-gard-repairs', 'Outdoor lighting', '💡', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-out-fixtures', 'subcat-home-gard-repairs', 'Outdoor fixtures', '🧰', false, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- FAMILY AND HOUSEHOLD SUPPORT - Childcare
-- Existing subcategory: sub-home-fam-childcare
-- =============================================================================

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-child-babysit', 'sub-home-fam-childcare', 'Babysitting', '🍼', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-child-nanny', 'sub-home-fam-childcare', 'Nanny services', '👶', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-child-supplies', 'sub-home-fam-childcare', 'Child supplies', '🎒', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-child-toys', 'sub-home-fam-childcare', 'Toys', '🧸', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-child-lunch', 'sub-home-fam-childcare', 'Lunch expenses', '🍱', false, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- FAMILY AND HOUSEHOLD SUPPORT - Elder Care
-- Existing subcategory: sub-home-fam-eldercare
-- =============================================================================

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-elder-caregiver', 'sub-home-fam-eldercare', 'Caregiver support', '🧑', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-elder-medical', 'sub-home-fam-eldercare', 'Medical supplies', '🧴', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-elder-transport', 'sub-home-fam-eldercare', 'Transport', '🚕', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-elder-homehelp', 'sub-home-fam-eldercare', 'Home assistance', '🏠', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-elder-support', 'sub-home-fam-eldercare', 'Support services', '🧾', false, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- HOUSEHOLD ADMIN - Home Paperwork and Fees
-- Existing subcategory: sub-home-fam-admin
-- =============================================================================

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-admin-lease', 'sub-home-fam-admin', 'Lease fees', '🏠', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-admin-mortgage', 'sub-home-fam-admin', 'Mortgage-related charges', '🏦', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-admin-insurance', 'sub-home-fam-admin', 'Home insurance', '🔒', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-admin-hoa', 'sub-home-fam-admin', 'HOA fees', '🧾', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-admin-permits', 'sub-home-fam-admin', 'Permits', '📑', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-admin-taxes', 'sub-home-fam-admin', 'Property taxes', '🧾', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-admin-late', 'sub-home-fam-admin', 'Late fees', '🧾', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-admin-service', 'sub-home-fam-admin', 'Service charges', '💸', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-admin-delivery', 'sub-home-fam-admin', 'Delivery fees', '🧾', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-admin-replace', 'sub-home-fam-admin', 'Replacement fees', '🧾', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-home-admin-misc', 'sub-home-fam-admin', 'Unexpected household expenses', '🧾', false, NOW())
ON CONFLICT (id) DO NOTHING;
