-- Fix Migration: Correct Construction Expense Category Levels (MBM-177)
--
-- The previous migration (20260413000002) placed data at the wrong levels:
--   ### level → ExpenseCategories   (shown in "Domain" dropdown)
--   -   level → ExpenseSubcategories (shown in "Category" dropdown)
--   (nothing) → ExpenseSubSubcategories → Sub-Category was empty
--
-- Correct 3-level hierarchy for the payment form:
--   ## level  → ExpenseCategories       (Domain field)    9 groups
--   ### level → ExpenseSubcategories    (Category field)  22 items
--   -   level → ExpenseSubSubcategories (Sub-Cat field)   ~170 items
--
-- Step 1: Remove the incorrectly-placed data from migration 20260413000002.
--         Cascade on ExpenseCategories → ExpenseSubcategories handles sub-const-* cleanup.
-- ─────────────────────────────────────────────────────────────────────────────

DELETE FROM "expense_categories" WHERE "id" LIKE 'cat-const-%';

-- ═════════════════════════════════════════════════════════════════════════════
-- STEP 2: Create the 9 Group Categories (## level → ExpenseCategories)
-- ═════════════════════════════════════════════════════════════════════════════

INSERT INTO "expense_categories" ("id","name","emoji","color","description","requiresSubcategory","isDefault","isUserCreated","domainId","createdAt","updatedAt")
SELECT 'cat-const-structural','Structural Materials','🧱','#F97316','Foundation, framing and masonry materials',true,true,false,'domain-construction',NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_categories" WHERE "id"='cat-const-structural');

INSERT INTO "expense_categories" ("id","name","emoji","color","description","requiresSubcategory","isDefault","isUserCreated","domainId","createdAt","updatedAt")
SELECT 'cat-const-mech-elec','Mechanical and Electrical','⚡','#F97316','Electrical, plumbing and HVAC supplies',true,true,false,'domain-construction',NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_categories" WHERE "id"='cat-const-mech-elec');

INSERT INTO "expense_categories" ("id","name","emoji","color","description","requiresSubcategory","isDefault","isUserCreated","domainId","createdAt","updatedAt")
SELECT 'cat-const-finish','Finish Materials','🎨','#F97316','Carpentry, painting and surface finish materials',true,true,false,'domain-construction',NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_categories" WHERE "id"='cat-const-finish');

INSERT INTO "expense_categories" ("id","name","emoji","color","description","requiresSubcategory","isDefault","isUserCreated","domainId","createdAt","updatedAt")
SELECT 'cat-const-site-work','Site Work Materials','🛣️','#F97316','Excavation, fill and drainage materials',true,true,false,'domain-construction',NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_categories" WHERE "id"='cat-const-site-work');

INSERT INTO "expense_categories" ("id","name","emoji","color","description","requiresSubcategory","isDefault","isUserCreated","domainId","createdAt","updatedAt")
SELECT 'cat-const-tools-supplies','Tools and Job Supplies','🧰','#F97316','Hand tools, power tool supplies and site consumables',true,true,false,'domain-construction',NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_categories" WHERE "id"='cat-const-tools-supplies');

-- Remove any pre-existing placeholder "Safety and Compliance" under domain-construction
-- (UUID-id placeholder with no subcategories that conflicts with our canonical id)
DELETE FROM "expense_categories"
WHERE "domainId"='domain-construction'
  AND "name"='Safety and Compliance'
  AND "id"!='cat-const-safety-comp';

INSERT INTO "expense_categories" ("id","name","emoji","color","description","requiresSubcategory","isDefault","isUserCreated","domainId","createdAt","updatedAt")
SELECT 'cat-const-safety-comp','Safety and Compliance','🦺','#F97316','PPE, permits, inspection fees and compliance costs',true,true,false,'domain-construction',NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_categories" WHERE "id"='cat-const-safety-comp');

INSERT INTO "expense_categories" ("id","name","emoji","color","description","requiresSubcategory","isDefault","isUserCreated","domainId","createdAt","updatedAt")
SELECT 'cat-const-logistics','Logistics and Equipment','🚚','#F97316','Delivery, transport and machinery costs',true,true,false,'domain-construction',NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_categories" WHERE "id"='cat-const-logistics');

INSERT INTO "expense_categories" ("id","name","emoji","color","description","requiresSubcategory","isDefault","isUserCreated","domainId","createdAt","updatedAt")
SELECT 'cat-const-labor','Labor and Subcontractors','👷','#F97316','Direct labour and subcontracted work costs',true,true,false,'domain-construction',NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_categories" WHERE "id"='cat-const-labor');

INSERT INTO "expense_categories" ("id","name","emoji","color","description","requiresSubcategory","isDefault","isUserCreated","domainId","createdAt","updatedAt")
SELECT 'cat-const-admin','Administrative and Overhead','💸','#F97316','Office costs, insurance, rent and project overhead',true,true,false,'domain-construction',NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_categories" WHERE "id"='cat-const-admin');

-- ═════════════════════════════════════════════════════════════════════════════
-- STEP 3: Create the 22 Subcategories (### level → ExpenseSubcategories)
-- ═════════════════════════════════════════════════════════════════════════════

-- ─── Under: Structural Materials ─────────────────────────────────────────────

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'subcat-const-foundation','cat-const-structural','Foundation Materials','🏛️','Cement, gravel, sand and base materials for foundations',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='subcat-const-foundation');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'subcat-const-framing','cat-const-structural','Framing Materials','🏗️','Lumber, steel and structural framing supplies',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='subcat-const-framing');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'subcat-const-masonry','cat-const-structural','Masonry Materials','🧱','Blocks, bricks, mortar, rebar and masonry supplies',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='subcat-const-masonry');

-- ─── Under: Mechanical and Electrical ────────────────────────────────────────

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'subcat-const-electrical','cat-const-mech-elec','Electrical Supplies','🔌','Wiring, conduit, outlets, breakers and electrical components',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='subcat-const-electrical');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'subcat-const-plumbing','cat-const-mech-elec','Plumbing Supplies','🚿','Pipes, fittings, fixtures and plumbing materials',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='subcat-const-plumbing');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'subcat-const-hvac','cat-const-mech-elec','HVAC Supplies','🌬️','AC units, heaters, ductwork, vents and climate control supplies',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='subcat-const-hvac');

-- ─── Under: Finish Materials ──────────────────────────────────────────────────

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'subcat-const-carpentry','cat-const-finish','Carpentry Finishes','🪚','Doors, windows, trim, cabinets and finish carpentry',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='subcat-const-carpentry');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'subcat-const-painting','cat-const-finish','Painting Supplies','🎨','Paint, primers, brushes, rollers and finishing supplies',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='subcat-const-painting');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'subcat-const-surface','cat-const-finish','Surface Finishes','🏠','Drywall, joint compound, tile adhesive, grout and surface materials',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='subcat-const-surface');

-- ─── Under: Site Work Materials ───────────────────────────────────────────────

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'subcat-const-excavation','cat-const-site-work','Excavation and Fill','🚧','Gravel, sand, topsoil, road base and site fill materials',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='subcat-const-excavation');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'subcat-const-drainage','cat-const-site-work','Drainage Materials','🌧️','Drain pipes, drain rock, culverts, membranes and drainage supplies',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='subcat-const-drainage');

-- ─── Under: Tools and Job Supplies ───────────────────────────────────────────

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'subcat-const-hand-tools','cat-const-tools-supplies','Hand Tools','🛠️','Hammers, screwdrivers, wrenches, saws and hand tools',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='subcat-const-hand-tools');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'subcat-const-power-tools','cat-const-tools-supplies','Power Tool Supplies','⚡','Drill bits, saw blades, batteries, chargers and power tool consumables',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='subcat-const-power-tools');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'subcat-const-consumables','cat-const-tools-supplies','Job Consumables','🧤','Rags, lubricants, adhesives, sealants, tape and site consumables',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='subcat-const-consumables');

-- ─── Under: Safety and Compliance ────────────────────────────────────────────

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'subcat-const-ppe','cat-const-safety-comp','Personal Protective Equipment','👷','Hard hats, safety glasses, gloves, boots, vests and PPE',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='subcat-const-ppe');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'subcat-const-permits','cat-const-safety-comp','Permits and Fees','📋','Building permits, inspection fees, licence fees and compliance charges',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='subcat-const-permits');

-- ─── Under: Logistics and Equipment ──────────────────────────────────────────

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'subcat-const-delivery','cat-const-logistics','Delivery and Transport','🚛','Material delivery, fuel, freight, hauling and transport costs',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='subcat-const-delivery');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'subcat-const-machinery','cat-const-logistics','Machinery Costs','🚜','Equipment rental, fuel, repairs, parts and machinery expenses',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='subcat-const-machinery');

-- ─── Under: Labor and Subcontractors ─────────────────────────────────────────

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'subcat-const-direct-labor','cat-const-labor','Direct Labor','👷','Carpenters, masons, electricians, plumbers and site workers',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='subcat-const-direct-labor');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'subcat-const-subcontract','cat-const-labor','Subcontracted Work','🤝','Site prep, foundation, electrical, plumbing and specialist crews',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='subcat-const-subcontract');

-- ─── Under: Administrative and Overhead ──────────────────────────────────────

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'subcat-const-office','cat-const-admin','Office Costs','🗂️','Printing, office supplies, software, phone, internet and admin costs',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='subcat-const-office');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'subcat-const-project-oh','cat-const-admin','Project Overhead','🧾','Insurance, rent, utilities, bonding, supervision and project overhead',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='subcat-const-project-oh');

-- ═════════════════════════════════════════════════════════════════════════════
-- STEP 4: Create Sub-Subcategories (- level → ExpenseSubSubcategories)
-- Uses unique(subcategoryId, name) for idempotency.
-- ═════════════════════════════════════════════════════════════════════════════

-- ─── Foundation Materials ────────────────────────────────────────────────────

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-fm-cement','subcat-const-foundation','Cement','🧱',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-foundation' AND "name"='Cement');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-fm-gravel','subcat-const-foundation','Gravel','🪨',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-foundation' AND "name"='Gravel');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-fm-sand','subcat-const-foundation','Sand','🏖️',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-foundation' AND "name"='Sand');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-fm-concrete-mix','subcat-const-foundation','Concrete mix','🧱',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-foundation' AND "name"='Concrete mix');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-fm-ready-mix','subcat-const-foundation','Ready-mix concrete','🧱',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-foundation' AND "name"='Ready-mix concrete');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-fm-crusher-run','subcat-const-foundation','Crusher run','🪨',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-foundation' AND "name"='Crusher run');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-fm-fill-dirt','subcat-const-foundation','Fill dirt','🪨',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-foundation' AND "name"='Fill dirt');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-fm-form-boards','subcat-const-foundation','Form boards','🪵',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-foundation' AND "name"='Form boards');

-- ─── Framing Materials ───────────────────────────────────────────────────────

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-frm-lumber','subcat-const-framing','Lumber','🪵',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-framing' AND "name"='Lumber');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-frm-studs','subcat-const-framing','Studs','🪵',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-framing' AND "name"='Studs');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-frm-plywood','subcat-const-framing','Plywood','🪵',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-framing' AND "name"='Plywood');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-frm-osb','subcat-const-framing','OSB boards','🪵',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-framing' AND "name"='OSB boards');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-frm-steel','subcat-const-framing','Steel framing','🔩',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-framing' AND "name"='Steel framing');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-frm-trusses','subcat-const-framing','Trusses','🪚',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-framing' AND "name"='Trusses');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-frm-blocks','subcat-const-framing','Blocks','🧱',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-framing' AND "name"='Blocks');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-frm-bricks','subcat-const-framing','Bricks','🧱',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-framing' AND "name"='Bricks');

-- ─── Masonry Materials ───────────────────────────────────────────────────────

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-mm-blocks','subcat-const-masonry','Concrete blocks','🧱',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-masonry' AND "name"='Concrete blocks');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-mm-bricks','subcat-const-masonry','Bricks','🧱',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-masonry' AND "name"='Bricks');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-mm-stone','subcat-const-masonry','Stone','🪨',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-masonry' AND "name"='Stone');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-mm-mortar','subcat-const-masonry','Mortar','🧱',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-masonry' AND "name"='Mortar');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-mm-adhesive','subcat-const-masonry','Masonry adhesive','🧴',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-masonry' AND "name"='Masonry adhesive');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-mm-rebar','subcat-const-masonry','Rebar','🧱',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-masonry' AND "name"='Rebar');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-mm-aggregate','subcat-const-masonry','Aggregate','🪨',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-masonry' AND "name"='Aggregate');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-mm-stucco','subcat-const-masonry','Stucco mix','🧱',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-masonry' AND "name"='Stucco mix');

-- ─── Electrical Supplies ─────────────────────────────────────────────────────

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-es-wire','subcat-const-electrical','Wire','🔌',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-electrical' AND "name"='Wire');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-es-conduit','subcat-const-electrical','Conduit','🔌',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-electrical' AND "name"='Conduit');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-es-outlets','subcat-const-electrical','Outlets','🔌',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-electrical' AND "name"='Outlets');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-es-switches','subcat-const-electrical','Switches','🔌',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-electrical' AND "name"='Switches');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-es-lights','subcat-const-electrical','Light fixtures','💡',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-electrical' AND "name"='Light fixtures');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-es-breakers','subcat-const-electrical','Breakers','⚡',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-electrical' AND "name"='Breakers');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-es-jboxes','subcat-const-electrical','Junction boxes','🧰',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-electrical' AND "name"='Junction boxes');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-es-batteries','subcat-const-electrical','Batteries','🔋',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-electrical' AND "name"='Batteries');

-- ─── Plumbing Supplies ───────────────────────────────────────────────────────

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-ps-pipes','subcat-const-plumbing','Pipes','🚰',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-plumbing' AND "name"='Pipes');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-ps-fittings','subcat-const-plumbing','Fittings','🚰',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-plumbing' AND "name"='Fittings');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-ps-toilets','subcat-const-plumbing','Toilets','🚽',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-plumbing' AND "name"='Toilets');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-ps-faucets','subcat-const-plumbing','Faucets','🚰',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-plumbing' AND "name"='Faucets');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-ps-showers','subcat-const-plumbing','Shower heads','🚿',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-plumbing' AND "name"='Shower heads');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-ps-pvc-cement','subcat-const-plumbing','PVC cement','🧴',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-plumbing' AND "name"='PVC cement');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-ps-sealants','subcat-const-plumbing','Sealants','🧽',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-plumbing' AND "name"='Sealants');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-ps-valves','subcat-const-plumbing','Valves','🧰',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-plumbing' AND "name"='Valves');

-- ─── HVAC Supplies ───────────────────────────────────────────────────────────

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-hvac-ac','subcat-const-hvac','AC units','❄️',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-hvac' AND "name"='AC units');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-hvac-heaters','subcat-const-hvac','Heaters','🔥',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-hvac' AND "name"='Heaters');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-hvac-duct','subcat-const-hvac','Ductwork','🌬️',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-hvac' AND "name"='Ductwork');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-hvac-filters','subcat-const-hvac','Filters','🧽',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-hvac' AND "name"='Filters');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-hvac-vents','subcat-const-hvac','Vents','🧰',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-hvac' AND "name"='Vents');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-hvac-motors','subcat-const-hvac','Motors','⚙️',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-hvac' AND "name"='Motors');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-hvac-insul','subcat-const-hvac','Insulation wrap','🧴',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-hvac' AND "name"='Insulation wrap');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-hvac-therm','subcat-const-hvac','Thermostats','🧰',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-hvac' AND "name"='Thermostats');

-- ─── Carpentry Finishes ──────────────────────────────────────────────────────

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-cf-doors','subcat-const-carpentry','Doors','🚪',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-carpentry' AND "name"='Doors');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-cf-windows','subcat-const-carpentry','Windows','🪟',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-carpentry' AND "name"='Windows');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-cf-trim','subcat-const-carpentry','Trim','🪵',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-carpentry' AND "name"='Trim');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-cf-moulding','subcat-const-carpentry','Moulding','🪵',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-carpentry' AND "name"='Moulding');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-cf-cabinets','subcat-const-carpentry','Cabinets','🪚',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-carpentry' AND "name"='Cabinets');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-cf-baseboards','subcat-const-carpentry','Baseboards','🪵',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-carpentry' AND "name"='Baseboards');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-cf-shelving','subcat-const-carpentry','Shelving','🪵',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-carpentry' AND "name"='Shelving');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-cf-hardware','subcat-const-carpentry','Hardware','🧰',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-carpentry' AND "name"='Hardware');

-- ─── Painting Supplies ───────────────────────────────────────────────────────

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-paint-paint','subcat-const-painting','Paint','🎨',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-painting' AND "name"='Paint');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-paint-brushes','subcat-const-painting','Brushes','🖌️',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-painting' AND "name"='Brushes');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-paint-rollers','subcat-const-painting','Rollers','🧽',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-painting' AND "name"='Rollers');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-paint-primer','subcat-const-painting','Primer','🧴',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-painting' AND "name"='Primer');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-paint-dropcloths','subcat-const-painting','Drop cloths','🧻',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-painting' AND "name"='Drop cloths');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-paint-tape','subcat-const-painting','Painter''s tape','🩹',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-painting' AND "name"='Painter''s tape');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-paint-thinner','subcat-const-painting','Paint thinner','🧴',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-painting' AND "name"='Paint thinner');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-paint-sealers','subcat-const-painting','Sealers','🧴',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-painting' AND "name"='Sealers');

-- ─── Surface Finishes ────────────────────────────────────────────────────────

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-sf-drywall','subcat-const-surface','Drywall','🧱',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-surface' AND "name"='Drywall');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-sf-joint-cpd','subcat-const-surface','Joint compound','🧴',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-surface' AND "name"='Joint compound');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-sf-sandpaper','subcat-const-surface','Sandpaper','🧻',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-surface' AND "name"='Sandpaper');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-sf-backer','subcat-const-surface','Backer board','🪵',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-surface' AND "name"='Backer board');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-sf-caulk','subcat-const-surface','Caulk','🧴',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-surface' AND "name"='Caulk');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-sf-grout','subcat-const-surface','Grout','🧴',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-surface' AND "name"='Grout');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-sf-tileadh','subcat-const-surface','Tile adhesive','🧴',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-surface' AND "name"='Tile adhesive');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-sf-ceiling','subcat-const-surface','Ceiling tiles','🧱',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-surface' AND "name"='Ceiling tiles');

-- ─── Excavation and Fill ─────────────────────────────────────────────────────

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-ef-gravel','subcat-const-excavation','Gravel','🪨',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-excavation' AND "name"='Gravel');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-ef-sand','subcat-const-excavation','Sand','🏖️',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-excavation' AND "name"='Sand');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-ef-fill-dirt','subcat-const-excavation','Fill dirt','🪨',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-excavation' AND "name"='Fill dirt');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-ef-topsoil','subcat-const-excavation','Topsoil','🪨',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-excavation' AND "name"='Topsoil');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-ef-roadbase','subcat-const-excavation','Road base','🪨',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-excavation' AND "name"='Road base');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-ef-crushed','subcat-const-excavation','Crushed rock','🪨',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-excavation' AND "name"='Crushed rock');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-ef-stabfill','subcat-const-excavation','Stabilized fill','🧱',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-excavation' AND "name"='Stabilized fill');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-ef-marking','subcat-const-excavation','Marking paint','🚧',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-excavation' AND "name"='Marking paint');

-- ─── Drainage Materials ──────────────────────────────────────────────────────

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-dm-drainpipe','subcat-const-drainage','Drain pipe','🚰',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-drainage' AND "name"='Drain pipe');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-dm-drainrock','subcat-const-drainage','Drain rock','🪨',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-drainage' AND "name"='Drain rock');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-dm-culverts','subcat-const-drainage','Culverts','🧱',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-drainage' AND "name"='Culverts');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-dm-membrane','subcat-const-drainage','Waterproof membrane','🧴',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-drainage' AND "name"='Waterproof membrane');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-dm-fittings','subcat-const-drainage','Pipe fittings','🧴',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-drainage' AND "name"='Pipe fittings');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-dm-catchbasin','subcat-const-drainage','Catch basin parts','🧴',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-drainage' AND "name"='Catch basin parts');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-dm-sealtape','subcat-const-drainage','Seal tape','🧽',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-drainage' AND "name"='Seal tape');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-dm-grates','subcat-const-drainage','Grates','🧰',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-drainage' AND "name"='Grates');

-- ─── Hand Tools ──────────────────────────────────────────────────────────────

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-ht-hammers','subcat-const-hand-tools','Hammers','🔨',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-hand-tools' AND "name"='Hammers');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-ht-screwdrivers','subcat-const-hand-tools','Screwdrivers','🪛',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-hand-tools' AND "name"='Screwdrivers');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-ht-wrenches','subcat-const-hand-tools','Wrenches','🔧',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-hand-tools' AND "name"='Wrenches');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-ht-saws','subcat-const-hand-tools','Saws','🪚',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-hand-tools' AND "name"='Saws');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-ht-pliers','subcat-const-hand-tools','Pliers','🗜️',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-hand-tools' AND "name"='Pliers');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-ht-measuring','subcat-const-hand-tools','Measuring tools','📏',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-hand-tools' AND "name"='Measuring tools');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-ht-levels','subcat-const-hand-tools','Levels','🧲',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-hand-tools' AND "name"='Levels');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-ht-axes','subcat-const-hand-tools','Axes','🪓',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-hand-tools' AND "name"='Axes');

-- ─── Power Tool Supplies ─────────────────────────────────────────────────────

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-pt-drillbits','subcat-const-power-tools','Drill bits','🪚',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-power-tools' AND "name"='Drill bits');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-pt-sawblades','subcat-const-power-tools','Saw blades','🔩',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-power-tools' AND "name"='Saw blades');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-pt-batteries','subcat-const-power-tools','Batteries','🧰',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-power-tools' AND "name"='Batteries');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-pt-chargers','subcat-const-power-tools','Chargers','🔌',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-power-tools' AND "name"='Chargers');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-pt-extcords','subcat-const-power-tools','Extension cords','🧰',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-power-tools' AND "name"='Extension cords');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-pt-cleaning','subcat-const-power-tools','Cleaning fluids','🧼',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-power-tools' AND "name"='Cleaning fluids');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-pt-fasteners','subcat-const-power-tools','Fasteners','🧷',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-power-tools' AND "name"='Fasteners');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-pt-toolcases','subcat-const-power-tools','Tool cases','🧰',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-power-tools' AND "name"='Tool cases');

-- ─── Job Consumables ─────────────────────────────────────────────────────────

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-jc-rags','subcat-const-consumables','Rags','🧻',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-consumables' AND "name"='Rags');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-jc-lubricants','subcat-const-consumables','Lubricants','🧴',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-consumables' AND "name"='Lubricants');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-jc-adhesives','subcat-const-consumables','Adhesives','🧴',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-consumables' AND "name"='Adhesives');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-jc-sealants','subcat-const-consumables','Sealants','🧴',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-consumables' AND "name"='Sealants');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-jc-tape','subcat-const-consumables','Tape','🩹',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-consumables' AND "name"='Tape');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-jc-gloves','subcat-const-consumables','Gloves','🧤',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-consumables' AND "name"='Gloves');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-jc-safetygear','subcat-const-consumables','Safety gear','🧯',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-consumables' AND "name"='Safety gear');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-jc-cleanup','subcat-const-consumables','Cleanup supplies','🧻',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-consumables' AND "name"='Cleanup supplies');

-- ─── Personal Protective Equipment ───────────────────────────────────────────

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-ppe-hardhats','subcat-const-ppe','Hard hats','🪖',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-ppe' AND "name"='Hard hats');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-ppe-glasses','subcat-const-ppe','Safety glasses','🥽',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-ppe' AND "name"='Safety glasses');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-ppe-gloves','subcat-const-ppe','Gloves','🧤',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-ppe' AND "name"='Gloves');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-ppe-boots','subcat-const-ppe','Steel-toe boots','👢',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-ppe' AND "name"='Steel-toe boots');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-ppe-vests','subcat-const-ppe','Safety vests','🦺',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-ppe' AND "name"='Safety vests');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-ppe-masks','subcat-const-ppe','Masks','😷',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-ppe' AND "name"='Masks');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-ppe-earprot','subcat-const-ppe','Ear protection','🦻',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-ppe' AND "name"='Ear protection');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-ppe-fireext','subcat-const-ppe','Fire extinguishers','🧯',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-ppe' AND "name"='Fire extinguishers');

-- ─── Permits and Fees ────────────────────────────────────────────────────────

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-pf-permits','subcat-const-permits','Permits','🪪',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-permits' AND "name"='Permits');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-pf-inspection','subcat-const-permits','Inspection fees','📄',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-permits' AND "name"='Inspection fees');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-pf-license','subcat-const-permits','License fees','🧾',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-permits' AND "name"='License fees');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-pf-code','subcat-const-permits','Code compliance fees','🏛️',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-permits' AND "name"='Code compliance fees');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-pf-planreview','subcat-const-permits','Plan review fees','📑',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-permits' AND "name"='Plan review fees');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-pf-authority','subcat-const-permits','Local authority charges','🧾',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-permits' AND "name"='Local authority charges');

-- ─── Delivery and Transport ───────────────────────────────────────────────────

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-dt-delivery','subcat-const-delivery','Material delivery','🚚',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-delivery' AND "name"='Material delivery');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-dt-fuel','subcat-const-delivery','Fuel','⛽',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-delivery' AND "name"='Fuel');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-dt-freight','subcat-const-delivery','Freight charges','🧾',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-delivery' AND "name"='Freight charges');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-dt-loading','subcat-const-delivery','Loading supplies','📦',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-delivery' AND "name"='Loading supplies');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-dt-straps','subcat-const-delivery','Straps','🪝',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-delivery' AND "name"='Straps');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-dt-pallets','subcat-const-delivery','Pallets','🧰',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-delivery' AND "name"='Pallets');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-dt-hauling','subcat-const-delivery','Hauling fees','🚛',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-delivery' AND "name"='Hauling fees');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-dt-transport','subcat-const-delivery','Transport charges','🧭',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-delivery' AND "name"='Transport charges');

-- ─── Machinery Costs ─────────────────────────────────────────────────────────

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-mc-rental','subcat-const-machinery','Equipment rental','🚜',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-machinery' AND "name"='Equipment rental');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-mc-fuel','subcat-const-machinery','Fuel','⛽',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-machinery' AND "name"='Fuel');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-mc-repair','subcat-const-machinery','Equipment repair','🛠️',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-machinery' AND "name"='Equipment repair');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-mc-lubricants','subcat-const-machinery','Lubricants','🧴',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-machinery' AND "name"='Lubricants');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-mc-batteries','subcat-const-machinery','Batteries','🔋',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-machinery' AND "name"='Batteries');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-mc-parts','subcat-const-machinery','Replacement parts','🧰',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-machinery' AND "name"='Replacement parts');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-mc-service','subcat-const-machinery','Service fees','🧾',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-machinery' AND "name"='Service fees');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-mc-inspection','subcat-const-machinery','Inspection fees','🧪',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-machinery' AND "name"='Inspection fees');

-- ─── Direct Labor ────────────────────────────────────────────────────────────

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-dl-carpenters','subcat-const-direct-labor','Carpenters','👷',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-direct-labor' AND "name"='Carpenters');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-dl-masons','subcat-const-direct-labor','Masons','🧱',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-direct-labor' AND "name"='Masons');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-dl-electricians','subcat-const-direct-labor','Electricians','⚡',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-direct-labor' AND "name"='Electricians');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-dl-plumbers','subcat-const-direct-labor','Plumbers','🚿',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-direct-labor' AND "name"='Plumbers');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-dl-painters','subcat-const-direct-labor','Painters','🎨',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-direct-labor' AND "name"='Painters');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-dl-finishers','subcat-const-direct-labor','Finishers','🪚',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-direct-labor' AND "name"='Finishers');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-dl-concrete','subcat-const-direct-labor','Concrete workers','🧱',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-direct-labor' AND "name"='Concrete workers');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-dl-laborers','subcat-const-direct-labor','Laborers','🚧',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-direct-labor' AND "name"='Laborers');

-- ─── Subcontracted Work ───────────────────────────────────────────────────────

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-sw-siteprep','subcat-const-subcontract','Site prep crews','🧰',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-subcontract' AND "name"='Site prep crews');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-sw-foundation','subcat-const-subcontract','Foundation crews','🧱',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-subcontract' AND "name"='Foundation crews');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-sw-electrical','subcat-const-subcontract','Electrical crews','⚡',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-subcontract' AND "name"='Electrical crews');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-sw-plumbing','subcat-const-subcontract','Plumbing crews','🚿',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-subcontract' AND "name"='Plumbing crews');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-sw-hvac','subcat-const-subcontract','HVAC crews','🌬️',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-subcontract' AND "name"='HVAC crews');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-sw-windows','subcat-const-subcontract','Window installers','🪟',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-subcontract' AND "name"='Window installers');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-sw-doors','subcat-const-subcontract','Door installers','🚪',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-subcontract' AND "name"='Door installers');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-sw-cabinets','subcat-const-subcontract','Cabinet installers','🪚',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-subcontract' AND "name"='Cabinet installers');

-- ─── Office Costs ────────────────────────────────────────────────────────────

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-oc-printing','subcat-const-office','Printing','🖨️',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-office' AND "name"='Printing');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-oc-supplies','subcat-const-office','Office supplies','📠',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-office' AND "name"='Office supplies');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-oc-software','subcat-const-office','Software','💻',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-office' AND "name"='Software');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-oc-phone','subcat-const-office','Phone bills','📱',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-office' AND "name"='Phone bills');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-oc-internet','subcat-const-office','Internet','🌐',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-office' AND "name"='Internet');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-oc-filing','subcat-const-office','Filing supplies','🗃️',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-office' AND "name"='Filing supplies');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-oc-accounting','subcat-const-office','Accounting fees','🧾',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-office' AND "name"='Accounting fees');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-oc-mgmt','subcat-const-office','Management costs','📋',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-office' AND "name"='Management costs');

-- ─── Project Overhead ────────────────────────────────────────────────────────

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-po-insurance','subcat-const-project-oh','Insurance','🧾',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-project-oh' AND "name"='Insurance');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-po-rent','subcat-const-project-oh','Rent','🏢',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-project-oh' AND "name"='Rent');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-po-utilities','subcat-const-project-oh','Utilities','💡',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-project-oh' AND "name"='Utilities');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-po-bonding','subcat-const-project-oh','Bonding','🛡️',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-project-oh' AND "name"='Bonding');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-po-projadmin','subcat-const-project-oh','Project administration','📊',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-project-oh' AND "name"='Project administration');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-po-supervision','subcat-const-project-oh','Supervision','🧭',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-project-oh' AND "name"='Supervision');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-po-docs','subcat-const-project-oh','Documentation','📑',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-project-oh' AND "name"='Documentation');

INSERT INTO "expense_sub_subcategories" ("id","subcategoryId","name","emoji","isUserCreated","createdAt")
SELECT 'sscat-const-po-misc','subcat-const-project-oh','Small overhead items','🧰',false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_sub_subcategories" WHERE "subcategoryId"='subcat-const-project-oh' AND "name"='Small overhead items');
