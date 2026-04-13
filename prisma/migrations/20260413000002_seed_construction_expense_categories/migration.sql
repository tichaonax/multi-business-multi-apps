-- Data Migration: Seed Construction Expense Categories (MBM-177)
-- Adds detailed categories and subcategories under the existing 'domain-construction' domain.
-- Uses INSERT ... WHERE NOT EXISTS so it is safe to re-run.

-- ─── Category colour for Construction ─────────────────────────────────────────
-- #F97316 (orange-red)

-- ═══════════════════════════════════════════════════════════════════════════════
-- STRUCTURAL MATERIALS
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO "expense_categories" ("id","name","emoji","color","description","requiresSubcategory","isDefault","isUserCreated","domainId","createdAt","updatedAt")
SELECT 'cat-const-foundation-materials','Foundation Materials','🏛️','#F97316','Cement, gravel, sand and base materials for foundations',true,true,false,'domain-construction',NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_categories" WHERE "id"='cat-const-foundation-materials');

INSERT INTO "expense_categories" ("id","name","emoji","color","description","requiresSubcategory","isDefault","isUserCreated","domainId","createdAt","updatedAt")
SELECT 'cat-const-framing-materials','Framing Materials','🏗️','#F97316','Lumber, steel and structural framing supplies',true,true,false,'domain-construction',NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_categories" WHERE "id"='cat-const-framing-materials');

INSERT INTO "expense_categories" ("id","name","emoji","color","description","requiresSubcategory","isDefault","isUserCreated","domainId","createdAt","updatedAt")
SELECT 'cat-const-masonry-materials','Masonry Materials','🧱','#F97316','Blocks, bricks, mortar, rebar and masonry supplies',true,true,false,'domain-construction',NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_categories" WHERE "id"='cat-const-masonry-materials');

-- ═══════════════════════════════════════════════════════════════════════════════
-- MECHANICAL AND ELECTRICAL
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO "expense_categories" ("id","name","emoji","color","description","requiresSubcategory","isDefault","isUserCreated","domainId","createdAt","updatedAt")
SELECT 'cat-const-electrical-supplies','Electrical Supplies','🔌','#F97316','Wiring, conduit, outlets, breakers and electrical components',true,true,false,'domain-construction',NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_categories" WHERE "id"='cat-const-electrical-supplies');

INSERT INTO "expense_categories" ("id","name","emoji","color","description","requiresSubcategory","isDefault","isUserCreated","domainId","createdAt","updatedAt")
SELECT 'cat-const-plumbing-supplies','Plumbing Supplies','🚿','#F97316','Pipes, fittings, fixtures and plumbing materials',true,true,false,'domain-construction',NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_categories" WHERE "id"='cat-const-plumbing-supplies');

INSERT INTO "expense_categories" ("id","name","emoji","color","description","requiresSubcategory","isDefault","isUserCreated","domainId","createdAt","updatedAt")
SELECT 'cat-const-hvac-supplies','HVAC Supplies','🌬️','#F97316','AC units, heaters, ductwork, vents and climate control supplies',true,true,false,'domain-construction',NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_categories" WHERE "id"='cat-const-hvac-supplies');

-- ═══════════════════════════════════════════════════════════════════════════════
-- FINISH MATERIALS
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO "expense_categories" ("id","name","emoji","color","description","requiresSubcategory","isDefault","isUserCreated","domainId","createdAt","updatedAt")
SELECT 'cat-const-carpentry-finishes','Carpentry Finishes','🪚','#F97316','Doors, windows, trim, cabinets and finish carpentry materials',true,true,false,'domain-construction',NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_categories" WHERE "id"='cat-const-carpentry-finishes');

INSERT INTO "expense_categories" ("id","name","emoji","color","description","requiresSubcategory","isDefault","isUserCreated","domainId","createdAt","updatedAt")
SELECT 'cat-const-painting-supplies','Painting Supplies','🎨','#F97316','Paint, primers, brushes, rollers and finishing supplies',true,true,false,'domain-construction',NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_categories" WHERE "id"='cat-const-painting-supplies');

INSERT INTO "expense_categories" ("id","name","emoji","color","description","requiresSubcategory","isDefault","isUserCreated","domainId","createdAt","updatedAt")
SELECT 'cat-const-surface-finishes','Surface Finishes','🧱','#F97316','Drywall, joint compound, tile adhesive, grout and surface materials',true,true,false,'domain-construction',NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_categories" WHERE "id"='cat-const-surface-finishes');

-- ═══════════════════════════════════════════════════════════════════════════════
-- SITE WORK MATERIALS
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO "expense_categories" ("id","name","emoji","color","description","requiresSubcategory","isDefault","isUserCreated","domainId","createdAt","updatedAt")
SELECT 'cat-const-excavation-fill','Excavation and Fill','🚧','#F97316','Gravel, sand, topsoil, road base and site fill materials',true,true,false,'domain-construction',NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_categories" WHERE "id"='cat-const-excavation-fill');

INSERT INTO "expense_categories" ("id","name","emoji","color","description","requiresSubcategory","isDefault","isUserCreated","domainId","createdAt","updatedAt")
SELECT 'cat-const-drainage-materials','Drainage Materials','🌧️','#F97316','Drain pipes, drain rock, culverts, membranes and drainage supplies',true,true,false,'domain-construction',NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_categories" WHERE "id"='cat-const-drainage-materials');

-- ═══════════════════════════════════════════════════════════════════════════════
-- TOOLS AND JOB SUPPLIES
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO "expense_categories" ("id","name","emoji","color","description","requiresSubcategory","isDefault","isUserCreated","domainId","createdAt","updatedAt")
SELECT 'cat-const-hand-tools','Hand Tools','🛠️','#F97316','Hammers, screwdrivers, wrenches, saws and hand tools',true,true,false,'domain-construction',NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_categories" WHERE "id"='cat-const-hand-tools');

INSERT INTO "expense_categories" ("id","name","emoji","color","description","requiresSubcategory","isDefault","isUserCreated","domainId","createdAt","updatedAt")
SELECT 'cat-const-power-tool-supplies','Power Tool Supplies','⚡','#F97316','Drill bits, saw blades, batteries, chargers and power tool consumables',true,true,false,'domain-construction',NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_categories" WHERE "id"='cat-const-power-tool-supplies');

INSERT INTO "expense_categories" ("id","name","emoji","color","description","requiresSubcategory","isDefault","isUserCreated","domainId","createdAt","updatedAt")
SELECT 'cat-const-job-consumables','Job Consumables','🧤','#F97316','Rags, lubricants, adhesives, sealants, tape and site consumables',true,true,false,'domain-construction',NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_categories" WHERE "id"='cat-const-job-consumables');

-- ═══════════════════════════════════════════════════════════════════════════════
-- SAFETY AND COMPLIANCE
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO "expense_categories" ("id","name","emoji","color","description","requiresSubcategory","isDefault","isUserCreated","domainId","createdAt","updatedAt")
SELECT 'cat-const-ppe','Personal Protective Equipment','👷','#F97316','Hard hats, safety glasses, gloves, boots, vests and PPE',true,true,false,'domain-construction',NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_categories" WHERE "id"='cat-const-ppe');

INSERT INTO "expense_categories" ("id","name","emoji","color","description","requiresSubcategory","isDefault","isUserCreated","domainId","createdAt","updatedAt")
SELECT 'cat-const-permits-fees','Permits and Fees','📋','#F97316','Building permits, inspection fees, licence fees and compliance charges',true,true,false,'domain-construction',NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_categories" WHERE "id"='cat-const-permits-fees');

-- ═══════════════════════════════════════════════════════════════════════════════
-- LOGISTICS AND EQUIPMENT
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO "expense_categories" ("id","name","emoji","color","description","requiresSubcategory","isDefault","isUserCreated","domainId","createdAt","updatedAt")
SELECT 'cat-const-delivery-transport','Delivery and Transport','🚛','#F97316','Material delivery, fuel, freight, hauling and transport costs',true,true,false,'domain-construction',NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_categories" WHERE "id"='cat-const-delivery-transport');

INSERT INTO "expense_categories" ("id","name","emoji","color","description","requiresSubcategory","isDefault","isUserCreated","domainId","createdAt","updatedAt")
SELECT 'cat-const-machinery-costs','Machinery Costs','🚜','#F97316','Equipment rental, fuel, repairs, parts and machinery expenses',true,true,false,'domain-construction',NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_categories" WHERE "id"='cat-const-machinery-costs');

-- ═══════════════════════════════════════════════════════════════════════════════
-- LABOR AND SUBCONTRACTORS
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO "expense_categories" ("id","name","emoji","color","description","requiresSubcategory","isDefault","isUserCreated","domainId","createdAt","updatedAt")
SELECT 'cat-const-direct-labor','Direct Labor','👷','#F97316','Carpenters, masons, electricians, plumbers and site workers',true,true,false,'domain-construction',NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_categories" WHERE "id"='cat-const-direct-labor');

INSERT INTO "expense_categories" ("id","name","emoji","color","description","requiresSubcategory","isDefault","isUserCreated","domainId","createdAt","updatedAt")
SELECT 'cat-const-subcontracted-work','Subcontracted Work','🤝','#F97316','Site prep, foundation, electrical, plumbing and specialist crews',true,true,false,'domain-construction',NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_categories" WHERE "id"='cat-const-subcontracted-work');

-- ═══════════════════════════════════════════════════════════════════════════════
-- ADMINISTRATIVE AND OVERHEAD
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO "expense_categories" ("id","name","emoji","color","description","requiresSubcategory","isDefault","isUserCreated","domainId","createdAt","updatedAt")
SELECT 'cat-const-office-costs','Office Costs','🗂️','#F97316','Printing, office supplies, software, phone, internet and admin costs',true,true,false,'domain-construction',NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_categories" WHERE "id"='cat-const-office-costs');

INSERT INTO "expense_categories" ("id","name","emoji","color","description","requiresSubcategory","isDefault","isUserCreated","domainId","createdAt","updatedAt")
SELECT 'cat-const-project-overhead','Project Overhead','🧾','#F97316','Insurance, rent, utilities, bonding, supervision and project overhead',true,true,false,'domain-construction',NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_categories" WHERE "id"='cat-const-project-overhead');

-- ═══════════════════════════════════════════════════════════════════════════════
-- SUBCATEGORIES: Foundation Materials
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-fm-cement','cat-const-foundation-materials','Cement','🧱','Portland cement and blended cement products',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-fm-cement');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-fm-gravel','cat-const-foundation-materials','Gravel','🪨','Coarse gravel for foundation drainage and base layers',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-fm-gravel');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-fm-sand','cat-const-foundation-materials','Sand','🏖️','Fine and coarse sand for mixing and bedding',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-fm-sand');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-fm-concrete-mix','cat-const-foundation-materials','Concrete mix','🧱','Bagged concrete mix for small pours',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-fm-concrete-mix');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-fm-ready-mix','cat-const-foundation-materials','Ready-mix concrete','🧱','Delivered ready-mix concrete for large pours',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-fm-ready-mix');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-fm-crusher-run','cat-const-foundation-materials','Crusher run','🪨','Crushed stone aggregate for compacted sub-base',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-fm-crusher-run');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-fm-fill-dirt','cat-const-foundation-materials','Fill dirt','🪨','General fill dirt for levelling and backfill',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-fm-fill-dirt');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-fm-form-boards','cat-const-foundation-materials','Form boards','🪵','Timber form boards for concrete shuttering',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-fm-form-boards');

-- ─── Subcategories: Framing Materials ────────────────────────────────────────

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-frm-lumber','cat-const-framing-materials','Lumber','🪵','Dimensional lumber for structural framing',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-frm-lumber');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-frm-studs','cat-const-framing-materials','Studs','🪵','Wall studs for timber frame construction',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-frm-studs');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-frm-plywood','cat-const-framing-materials','Plywood','🪵','Structural plywood sheathing and decking',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-frm-plywood');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-frm-osb','cat-const-framing-materials','OSB boards','🪵','Oriented strand board for sheathing',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-frm-osb');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-frm-steel-framing','cat-const-framing-materials','Steel framing','🔩','Light gauge steel framing members',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-frm-steel-framing');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-frm-trusses','cat-const-framing-materials','Trusses','🪚','Prefabricated roof and floor trusses',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-frm-trusses');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-frm-blocks','cat-const-framing-materials','Blocks','🧱','Concrete masonry blocks for structural walls',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-frm-blocks');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-frm-bricks','cat-const-framing-materials','Bricks','🧱','Fired clay bricks for structural and facing work',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-frm-bricks');

-- ─── Subcategories: Masonry Materials ────────────────────────────────────────

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-mm-concrete-blocks','cat-const-masonry-materials','Concrete blocks','🧱','Standard and hollow concrete masonry units',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-mm-concrete-blocks');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-mm-bricks','cat-const-masonry-materials','Bricks','🧱','Clay and concrete bricks',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-mm-bricks');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-mm-stone','cat-const-masonry-materials','Stone','🪨','Natural and cut stone for masonry work',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-mm-stone');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-mm-mortar','cat-const-masonry-materials','Mortar','🧱','Portland and masonry mortar for bonding',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-mm-mortar');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-mm-masonry-adhesive','cat-const-masonry-materials','Masonry adhesive','🧴','Construction adhesives for masonry applications',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-mm-masonry-adhesive');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-mm-rebar','cat-const-masonry-materials','Rebar','🧱','Steel reinforcing bar for concrete and masonry',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-mm-rebar');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-mm-aggregate','cat-const-masonry-materials','Aggregate','🪨','Coarse and fine aggregate for concrete mixes',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-mm-aggregate');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-mm-stucco-mix','cat-const-masonry-materials','Stucco mix','🧱','Pre-mixed stucco and render',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-mm-stucco-mix');

-- ─── Subcategories: Electrical Supplies ──────────────────────────────────────

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-es-wire','cat-const-electrical-supplies','Wire','🔌','Electrical cable and wiring',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-es-wire');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-es-conduit','cat-const-electrical-supplies','Conduit','🔌','Electrical conduit and fittings',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-es-conduit');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-es-outlets','cat-const-electrical-supplies','Outlets','🔌','Wall outlets, sockets and covers',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-es-outlets');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-es-switches','cat-const-electrical-supplies','Switches','🔌','Light switches and control devices',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-es-switches');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-es-light-fixtures','cat-const-electrical-supplies','Light fixtures','💡','Interior and exterior lighting units',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-es-light-fixtures');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-es-breakers','cat-const-electrical-supplies','Breakers','⚡','Circuit breakers and distribution board components',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-es-breakers');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-es-junction-boxes','cat-const-electrical-supplies','Junction boxes','🧰','Electrical junction and pull boxes',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-es-junction-boxes');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-es-batteries','cat-const-electrical-supplies','Batteries','🔋','Batteries for tools and equipment',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-es-batteries');

-- ─── Subcategories: Plumbing Supplies ────────────────────────────────────────

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-ps-pipes','cat-const-plumbing-supplies','Pipes','🚰','PVC, copper and galvanised pipes',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-ps-pipes');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-ps-fittings','cat-const-plumbing-supplies','Fittings','🚰','Elbows, tees, couplings and pipe fittings',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-ps-fittings');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-ps-toilets','cat-const-plumbing-supplies','Toilets','🚽','Toilet suites and cisterns',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-ps-toilets');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-ps-faucets','cat-const-plumbing-supplies','Faucets','🚰','Taps, mixers and faucet sets',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-ps-faucets');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-ps-shower-heads','cat-const-plumbing-supplies','Shower heads','🚿','Shower heads, rails and enclosures',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-ps-shower-heads');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-ps-pvc-cement','cat-const-plumbing-supplies','PVC cement','🧴','Solvent cement for PVC pipe joints',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-ps-pvc-cement');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-ps-sealants','cat-const-plumbing-supplies','Sealants','🧽','Plumbing sealants, PTFE tape and thread compounds',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-ps-sealants');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-ps-valves','cat-const-plumbing-supplies','Valves','🧰','Gate valves, ball valves and isolation valves',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-ps-valves');

-- ─── Subcategories: HVAC Supplies ────────────────────────────────────────────

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-hvac-ac-units','cat-const-hvac-supplies','AC units','❄️','Split, window and ducted air conditioning units',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-hvac-ac-units');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-hvac-heaters','cat-const-hvac-supplies','Heaters','🔥','Electric and gas heaters for spaces',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-hvac-heaters');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-hvac-ductwork','cat-const-hvac-supplies','Ductwork','🌬️','Sheet metal ducting, flex duct and fittings',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-hvac-ductwork');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-hvac-filters','cat-const-hvac-supplies','Filters','🧽','Air filters and filter media for HVAC systems',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-hvac-filters');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-hvac-vents','cat-const-hvac-supplies','Vents','🧰','Supply and return air grilles and registers',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-hvac-vents');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-hvac-motors','cat-const-hvac-supplies','Motors','⚙️','Fan and blower motors for HVAC equipment',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-hvac-motors');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-hvac-insulation','cat-const-hvac-supplies','Insulation wrap','🧴','Duct insulation wrap and pipe lagging',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-hvac-insulation');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-hvac-thermostats','cat-const-hvac-supplies','Thermostats','🧰','Programmable and smart thermostats',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-hvac-thermostats');

-- ─── Subcategories: Carpentry Finishes ───────────────────────────────────────

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-cf-doors','cat-const-carpentry-finishes','Doors','🚪','Interior and exterior door sets and frames',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-cf-doors');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-cf-windows','cat-const-carpentry-finishes','Windows','🪟','Window units, frames and glazing',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-cf-windows');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-cf-trim','cat-const-carpentry-finishes','Trim','🪵','Door and window architrave trim',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-cf-trim');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-cf-moulding','cat-const-carpentry-finishes','Moulding','🪵','Cornices, skirtings and decorative mouldings',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-cf-moulding');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-cf-cabinets','cat-const-carpentry-finishes','Cabinets','🪚','Kitchen and bathroom cabinet sets',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-cf-cabinets');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-cf-baseboards','cat-const-carpentry-finishes','Baseboards','🪵','Skirting boards and base trim',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-cf-baseboards');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-cf-shelving','cat-const-carpentry-finishes','Shelving','🪵','Fixed and adjustable shelving systems',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-cf-shelving');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-cf-hardware','cat-const-carpentry-finishes','Hardware','🧰','Hinges, handles, locks and door hardware',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-cf-hardware');

-- ─── Subcategories: Painting Supplies ────────────────────────────────────────

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-paint-paint','cat-const-painting-supplies','Paint','🎨','Interior and exterior paints',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-paint-paint');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-paint-brushes','cat-const-painting-supplies','Brushes','🖌️','Paintbrushes and applicator brushes',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-paint-brushes');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-paint-rollers','cat-const-painting-supplies','Rollers','🧽','Paint rollers, frames and covers',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-paint-rollers');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-paint-primer','cat-const-painting-supplies','Primer','🧴','Surface primers and undercoats',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-paint-primer');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-paint-drop-cloths','cat-const-painting-supplies','Drop cloths','🧻','Protective drop sheets and canvas covers',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-paint-drop-cloths');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-paint-tape','cat-const-painting-supplies','Painter''s tape','🩹','Masking and painter''s tape',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-paint-tape');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-paint-thinner','cat-const-painting-supplies','Paint thinner','🧴','Mineral spirits, turps and paint thinners',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-paint-thinner');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-paint-sealers','cat-const-painting-supplies','Sealers','🧴','Surface sealers and finishing varnishes',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-paint-sealers');

-- ─── Subcategories: Surface Finishes ─────────────────────────────────────────

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-sf-drywall','cat-const-surface-finishes','Drywall','🧱','Gypsum wallboard and drywall sheets',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-sf-drywall');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-sf-joint-compound','cat-const-surface-finishes','Joint compound','🧴','Drywall joint compound and setting-type plaster',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-sf-joint-compound');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-sf-sandpaper','cat-const-surface-finishes','Sandpaper','🧻','Abrasive paper and sanding sheets',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-sf-sandpaper');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-sf-backer-board','cat-const-surface-finishes','Backer board','🪵','Cement backer board for wet areas',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-sf-backer-board');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-sf-caulk','cat-const-surface-finishes','Caulk','🧴','Silicone and acrylic caulking compounds',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-sf-caulk');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-sf-grout','cat-const-surface-finishes','Grout','🧴','Tile grout for joints and gaps',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-sf-grout');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-sf-tile-adhesive','cat-const-surface-finishes','Tile adhesive','🧴','Ceramic and porcelain tile adhesive',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-sf-tile-adhesive');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-sf-ceiling-tiles','cat-const-surface-finishes','Ceiling tiles','🧱','Suspended and glue-up ceiling tiles',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-sf-ceiling-tiles');

-- ─── Subcategories: Excavation and Fill ──────────────────────────────────────

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-ef-gravel','cat-const-excavation-fill','Gravel','🪨','Coarse gravel for drainage and base layers',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-ef-gravel');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-ef-sand','cat-const-excavation-fill','Sand','🏖️','Sand for bedding and site levelling',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-ef-sand');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-ef-fill-dirt','cat-const-excavation-fill','Fill dirt','🪨','General fill and backfill material',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-ef-fill-dirt');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-ef-topsoil','cat-const-excavation-fill','Topsoil','🪨','Quality topsoil for landscaping and finish grading',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-ef-topsoil');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-ef-road-base','cat-const-excavation-fill','Road base','🪨','Compacted road base aggregate',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-ef-road-base');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-ef-crushed-rock','cat-const-excavation-fill','Crushed rock','🪨','Crushed stone for sub-base and drainage',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-ef-crushed-rock');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-ef-stabilized-fill','cat-const-excavation-fill','Stabilized fill','🧱','Cement-stabilised fill for engineered subgrade',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-ef-stabilized-fill');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-ef-marking-paint','cat-const-excavation-fill','Marking paint','🚧','Line marking and layout paint',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-ef-marking-paint');

-- ─── Subcategories: Drainage Materials ───────────────────────────────────────

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-dm-drain-pipe','cat-const-drainage-materials','Drain pipe','🚰','Perforated and solid drain pipe',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-dm-drain-pipe');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-dm-drain-rock','cat-const-drainage-materials','Drain rock','🪨','Clean drain rock and pea gravel',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-dm-drain-rock');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-dm-culverts','cat-const-drainage-materials','Culverts','🧱','Corrugated and concrete culvert pipe',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-dm-culverts');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-dm-waterproof-membrane','cat-const-drainage-materials','Waterproof membrane','🧴','Sheet and liquid waterproofing membranes',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-dm-waterproof-membrane');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-dm-pipe-fittings','cat-const-drainage-materials','Pipe fittings','🧴','Drainage pipe fittings and couplings',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-dm-pipe-fittings');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-dm-catch-basin-parts','cat-const-drainage-materials','Catch basin parts','🧴','Catch basin frames, grates and sumps',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-dm-catch-basin-parts');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-dm-seal-tape','cat-const-drainage-materials','Seal tape','🧽','Drainage seal tape and butyl tape',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-dm-seal-tape');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-dm-grates','cat-const-drainage-materials','Grates','🧰','Surface water grates and covers',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-dm-grates');

-- ─── Subcategories: Hand Tools ────────────────────────────────────────────────

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-ht-hammers','cat-const-hand-tools','Hammers','🔨','Claw hammers, sledgehammers and mallets',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-ht-hammers');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-ht-screwdrivers','cat-const-hand-tools','Screwdrivers','🪛','Flathead, Phillips and Torx screwdrivers',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-ht-screwdrivers');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-ht-wrenches','cat-const-hand-tools','Wrenches','🔧','Adjustable and fixed wrenches',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-ht-wrenches');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-ht-saws','cat-const-hand-tools','Saws','🪚','Hand saws and hack saws',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-ht-saws');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-ht-pliers','cat-const-hand-tools','Pliers','🗜️','Combination, needle-nose and locking pliers',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-ht-pliers');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-ht-measuring-tools','cat-const-hand-tools','Measuring tools','📏','Tape measures, squares and rulers',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-ht-measuring-tools');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-ht-levels','cat-const-hand-tools','Levels','🧲','Spirit levels and laser levels',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-ht-levels');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-ht-axes','cat-const-hand-tools','Axes','🪓','Axes and hatchets for site clearing',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-ht-axes');

-- ─── Subcategories: Power Tool Supplies ──────────────────────────────────────

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-pts-drill-bits','cat-const-power-tool-supplies','Drill bits','🪚','Masonry, wood and metal drill bits',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-pts-drill-bits');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-pts-saw-blades','cat-const-power-tool-supplies','Saw blades','🔩','Circular saw, jigsaw and reciprocating saw blades',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-pts-saw-blades');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-pts-batteries','cat-const-power-tool-supplies','Batteries','🧰','Lithium-ion tool batteries',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-pts-batteries');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-pts-chargers','cat-const-power-tool-supplies','Chargers','🔌','Battery chargers and docking stations',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-pts-chargers');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-pts-extension-cords','cat-const-power-tool-supplies','Extension cords','🧰','Heavy-duty extension leads for site use',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-pts-extension-cords');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-pts-cleaning-fluids','cat-const-power-tool-supplies','Cleaning fluids','🧼','Tool cleaning solvents and degreasers',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-pts-cleaning-fluids');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-pts-fasteners','cat-const-power-tool-supplies','Fasteners','🧷','Nails, screws, bolts and construction fasteners',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-pts-fasteners');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-pts-tool-cases','cat-const-power-tool-supplies','Tool cases','🧰','Hard and soft cases for tool storage',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-pts-tool-cases');

-- ─── Subcategories: Job Consumables ──────────────────────────────────────────

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-jc-rags','cat-const-job-consumables','Rags','🧻','Cleaning rags and shop towels',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-jc-rags');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-jc-lubricants','cat-const-job-consumables','Lubricants','🧴','Machine oil, WD-40 and general lubricants',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-jc-lubricants');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-jc-adhesives','cat-const-job-consumables','Adhesives','🧴','Construction adhesives and contact cement',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-jc-adhesives');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-jc-sealants','cat-const-job-consumables','Sealants','🧴','General purpose sealants and caulking',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-jc-sealants');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-jc-tape','cat-const-job-consumables','Tape','🩹','Duct tape, filament tape and general purpose tape',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-jc-tape');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-jc-gloves','cat-const-job-consumables','Gloves','🧤','Disposable and reusable work gloves',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-jc-gloves');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-jc-safety-gear','cat-const-job-consumables','Safety gear','🧯','Fire extinguishers and emergency safety equipment',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-jc-safety-gear');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-jc-cleanup-supplies','cat-const-job-consumables','Cleanup supplies','🧻','Brooms, buckets, rubbish bags and site cleanup materials',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-jc-cleanup-supplies');

-- ─── Subcategories: Personal Protective Equipment ────────────────────────────

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-ppe-hard-hats','cat-const-ppe','Hard hats','🪖','Class E and G hard hats for site workers',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-ppe-hard-hats');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-ppe-safety-glasses','cat-const-ppe','Safety glasses','🥽','Impact-resistant safety glasses and goggles',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-ppe-safety-glasses');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-ppe-gloves','cat-const-ppe','Gloves','🧤','Cut-resistant and general work gloves',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-ppe-gloves');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-ppe-boots','cat-const-ppe','Steel-toe boots','👢','Steel-capped and composite-toe safety boots',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-ppe-boots');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-ppe-vests','cat-const-ppe','Safety vests','🦺','High-visibility vests and reflective workwear',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-ppe-vests');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-ppe-masks','cat-const-ppe','Masks','😷','Dust masks, respirators and N95 masks',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-ppe-masks');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-ppe-ear-protection','cat-const-ppe','Ear protection','🦻','Earmuffs and disposable ear plugs',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-ppe-ear-protection');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-ppe-fire-extinguishers','cat-const-ppe','Fire extinguishers','🧯','Dry powder and CO2 fire extinguishers',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-ppe-fire-extinguishers');

-- ─── Subcategories: Permits and Fees ─────────────────────────────────────────

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-pf-permits','cat-const-permits-fees','Permits','🪪','Building and construction permits',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-pf-permits');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-pf-inspection-fees','cat-const-permits-fees','Inspection fees','📄','Council and third-party inspection charges',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-pf-inspection-fees');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-pf-license-fees','cat-const-permits-fees','License fees','🧾','Contractor and trade licence fees',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-pf-license-fees');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-pf-code-compliance','cat-const-permits-fees','Code compliance fees','🏛️','Building code compliance and certification fees',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-pf-code-compliance');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-pf-plan-review','cat-const-permits-fees','Plan review fees','📑','Architectural and engineering plan review charges',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-pf-plan-review');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-pf-authority-charges','cat-const-permits-fees','Local authority charges','🧾','Council levies and local authority fees',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-pf-authority-charges');

-- ─── Subcategories: Delivery and Transport ───────────────────────────────────

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-dt-material-delivery','cat-const-delivery-transport','Material delivery','🚚','Supplier delivery charges for materials',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-dt-material-delivery');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-dt-fuel','cat-const-delivery-transport','Fuel','⛽','Diesel and petrol for delivery and site vehicles',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-dt-fuel');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-dt-freight','cat-const-delivery-transport','Freight charges','🧾','Freight forwarding and courier fees',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-dt-freight');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-dt-loading-supplies','cat-const-delivery-transport','Loading supplies','📦','Pallets, strapping and loading materials',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-dt-loading-supplies');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-dt-straps','cat-const-delivery-transport','Straps','🪝','Ratchet straps and tie-downs for transport',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-dt-straps');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-dt-pallets','cat-const-delivery-transport','Pallets','🧰','Timber pallets for material storage and transport',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-dt-pallets');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-dt-hauling-fees','cat-const-delivery-transport','Hauling fees','🚛','Skip bin and tipper hauling fees',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-dt-hauling-fees');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-dt-transport-charges','cat-const-delivery-transport','Transport charges','🧭','General site transport and travel reimbursements',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-dt-transport-charges');

-- ─── Subcategories: Machinery Costs ──────────────────────────────────────────

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-mc-equipment-rental','cat-const-machinery-costs','Equipment rental','🚜','Excavator, crane, compactor and plant hire',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-mc-equipment-rental');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-mc-fuel','cat-const-machinery-costs','Fuel','⛽','Diesel and petrol for machinery',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-mc-fuel');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-mc-equipment-repair','cat-const-machinery-costs','Equipment repair','🛠️','On-site and workshop machinery repairs',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-mc-equipment-repair');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-mc-lubricants','cat-const-machinery-costs','Lubricants','🧴','Engine oil, hydraulic fluid and grease',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-mc-lubricants');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-mc-batteries','cat-const-machinery-costs','Batteries','🔋','Heavy duty batteries for plant and equipment',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-mc-batteries');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-mc-replacement-parts','cat-const-machinery-costs','Replacement parts','🧰','Wear parts, filters and replacement components',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-mc-replacement-parts');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-mc-service-fees','cat-const-machinery-costs','Service fees','🧾','Scheduled service and maintenance fees',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-mc-service-fees');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-mc-inspection-fees','cat-const-machinery-costs','Inspection fees','🧪','Equipment roadworthy and compliance inspections',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-mc-inspection-fees');

-- ─── Subcategories: Direct Labor ─────────────────────────────────────────────

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-dl-carpenters','cat-const-direct-labor','Carpenters','👷','Framing and finish carpenters',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-dl-carpenters');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-dl-masons','cat-const-direct-labor','Masons','🧱','Brick, block and stone masons',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-dl-masons');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-dl-electricians','cat-const-direct-labor','Electricians','⚡','Licensed electricians and apprentices',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-dl-electricians');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-dl-plumbers','cat-const-direct-labor','Plumbers','🚿','Licensed plumbers and plumbing assistants',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-dl-plumbers');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-dl-painters','cat-const-direct-labor','Painters','🎨','Interior and exterior painters',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-dl-painters');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-dl-finishers','cat-const-direct-labor','Finishers','🪚','Concrete and surface finishers',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-dl-finishers');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-dl-concrete-workers','cat-const-direct-labor','Concrete workers','🧱','Concrete pourers, vibrators and finishers',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-dl-concrete-workers');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-dl-laborers','cat-const-direct-labor','Laborers','🚧','General site labourers and helpers',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-dl-laborers');

-- ─── Subcategories: Subcontracted Work ───────────────────────────────────────

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-sw-site-prep','cat-const-subcontracted-work','Site prep crews','🧰','Land clearing and site preparation contractors',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-sw-site-prep');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-sw-foundation-crews','cat-const-subcontracted-work','Foundation crews','🧱','Specialist foundation and piling contractors',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-sw-foundation-crews');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-sw-electrical-crews','cat-const-subcontracted-work','Electrical crews','⚡','Electrical subcontractors',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-sw-electrical-crews');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-sw-plumbing-crews','cat-const-subcontracted-work','Plumbing crews','🚿','Plumbing subcontractors',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-sw-plumbing-crews');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-sw-hvac-crews','cat-const-subcontracted-work','HVAC crews','🌬️','HVAC installation subcontractors',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-sw-hvac-crews');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-sw-window-installers','cat-const-subcontracted-work','Window installers','🪟','Window and glazing installation contractors',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-sw-window-installers');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-sw-door-installers','cat-const-subcontracted-work','Door installers','🚪','Door and frame installation contractors',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-sw-door-installers');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-sw-cabinet-installers','cat-const-subcontracted-work','Cabinet installers','🪚','Kitchen and joinery installation contractors',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-sw-cabinet-installers');

-- ─── Subcategories: Office Costs ─────────────────────────────────────────────

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-oc-printing','cat-const-office-costs','Printing','🖨️','Plan printing, copying and document printing',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-oc-printing');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-oc-office-supplies','cat-const-office-costs','Office supplies','📠','Stationery, paper and general office supplies',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-oc-office-supplies');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-oc-software','cat-const-office-costs','Software','💻','Project management and estimating software subscriptions',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-oc-software');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-oc-phone-bills','cat-const-office-costs','Phone bills','📱','Mobile and landline phone charges',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-oc-phone-bills');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-oc-internet','cat-const-office-costs','Internet','🌐','Internet and data connectivity costs',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-oc-internet');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-oc-filing-supplies','cat-const-office-costs','Filing supplies','🗃️','Folders, binders and document filing materials',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-oc-filing-supplies');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-oc-accounting-fees','cat-const-office-costs','Accounting fees','🧾','Bookkeeping and accounting service fees',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-oc-accounting-fees');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-oc-management-costs','cat-const-office-costs','Management costs','📋','Project management and supervision overheads',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-oc-management-costs');

-- ─── Subcategories: Project Overhead ─────────────────────────────────────────

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-po-insurance','cat-const-project-overhead','Insurance','🧾','Construction all-risk and public liability insurance',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-po-insurance');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-po-rent','cat-const-project-overhead','Rent','🏢','Site office and compound rental',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-po-rent');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-po-utilities','cat-const-project-overhead','Utilities','💡','Electricity, water and site utilities',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-po-utilities');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-po-bonding','cat-const-project-overhead','Bonding','🛡️','Performance bonds and surety bonds',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-po-bonding');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-po-project-admin','cat-const-project-overhead','Project administration','📊','General project administration costs',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-po-project-admin');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-po-supervision','cat-const-project-overhead','Supervision','🧭','Site supervision and foreman costs',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-po-supervision');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-po-documentation','cat-const-project-overhead','Documentation','📑','As-built drawings, reports and project documentation',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-po-documentation');

INSERT INTO "expense_subcategories" ("id","categoryId","name","emoji","description","isDefault","isUserCreated","createdAt")
SELECT 'sub-const-po-small-overhead','cat-const-project-overhead','Small overhead items','🧰','Miscellaneous small overhead and site expenses',true,false,NOW()
WHERE NOT EXISTS (SELECT 1 FROM "expense_subcategories" WHERE "id"='sub-const-po-small-overhead');
