-- Expand Restaurant Expense Categories
-- Adds Livestock & Feeds and Animal Health expense categories for restaurant businesses
-- that run integrated poultry/livestock operations and need to log those costs.
--
-- These are EXPENSE categories — payments logged in the restaurant expense account
-- (e.g. buying Poultry Feed, Vaccines, Antibiotics for farm operations).
--
-- Domain: domain-restaurant (already exists)
-- IDEMPOTENT: Uses ON CONFLICT DO NOTHING — safe to re-run
--
-- Adds:
--   12 expense_categories  under domain-restaurant
--   74 expense_subcategories

-- =============================================================================
-- ENSURE domain-restaurant EXISTS (safe for fresh installs and production)
-- =============================================================================

INSERT INTO expense_domains (id, name, emoji, description, "isActive", "createdAt")
SELECT 'domain-restaurant', 'Restaurant', '🍽️', 'Expense categories for restaurant business operations', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM expense_domains WHERE id = 'domain-restaurant');

-- =============================================================================
-- EXPENSE CATEGORIES — LIVESTOCK & FEEDS
-- =============================================================================

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-restaurant-poultry-feed', 'domain-restaurant', 'Poultry Feed', '🐔', '#EC4899', 'Feed formulations for broilers, layers, and other poultry', true, false, false, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-restaurant-livestock-feed', 'domain-restaurant', 'Livestock Feed', '🐄', '#EC4899', 'Feed formulations for cattle, goats, pigs, and other livestock', true, false, false, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-restaurant-aquaculture-feed', 'domain-restaurant', 'Aquaculture Feed', '🐟', '#EC4899', 'Feed pellets and formulations for fish farming', true, false, false, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-restaurant-feed-supplements-additives', 'domain-restaurant', 'Feed Supplements & Additives', '🧪', '#EC4899', 'Vitamins, minerals, probiotics, and performance additives mixed into feed', true, false, false, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

-- =============================================================================
-- EXPENSE CATEGORIES — ANIMAL HEALTH
-- =============================================================================

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-restaurant-biologics-vaccines', 'domain-restaurant', 'Biologics & Vaccines', '💉', '#EC4899', 'Vaccines for poultry and livestock disease prevention', true, false, false, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-restaurant-antibiotics-antibacterials', 'domain-restaurant', 'Antibiotics & Antibacterials', '🦠', '#EC4899', 'Prescription and veterinary antibiotics for bacterial infections', true, false, false, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-restaurant-antiparasitics-coccidiostats', 'domain-restaurant', 'Antiparasitics — Coccidiostats', '🛡️', '#EC4899', 'Coccidiosis prevention and treatment products', true, false, false, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-restaurant-antiparasitics-dewormers-external', 'domain-restaurant', 'Antiparasitics — Dewormers & External', '🪱', '#EC4899', 'Internal dewormers and external parasite control products', true, false, false, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-restaurant-antifungals', 'domain-restaurant', 'Antifungals', '🍄', '#EC4899', 'Antifungal treatments for poultry, livestock, and farm environments', true, false, false, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-restaurant-anti-inflammatories-analgesics', 'domain-restaurant', 'Anti-inflammatories & Analgesics', '💊', '#EC4899', 'Pain relief and anti-inflammatory medications for animals', true, false, false, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-restaurant-nutritional-supplements-vitamins', 'domain-restaurant', 'Nutritional Supplements & Vitamins', '🌟', '#EC4899', 'Vitamins, electrolytes, minerals, and gut health supplements', true, false, false, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-restaurant-disinfectants-biosecurity', 'domain-restaurant', 'Disinfectants & Biosecurity', '🧴', '#EC4899', 'Farm disinfectants, water sanitizers, and biosecurity consumables', true, false, false, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

-- =============================================================================
-- EXPENSE SUBCATEGORIES — POULTRY FEED
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-poultry-feed-broiler-starter', 'cat-restaurant-poultry-feed', 'Broiler Starter', '🐣', 'High-protein starter feed, days 1–14', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-poultry-feed-broiler-grower', 'cat-restaurant-poultry-feed', 'Broiler Grower', '🌱', 'Growth phase feed, days 15–28', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-poultry-feed-broiler-finisher', 'cat-restaurant-poultry-feed', 'Broiler Finisher', '🏁', 'Pre-slaughter finishing feed, days 29+', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-poultry-feed-layers-mash', 'cat-restaurant-poultry-feed', 'Layers Mash', '🥚', 'Feed for egg-laying hens', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-poultry-feed-chick-crumbles', 'cat-restaurant-poultry-feed', 'Chick Crumbles', '🐥', 'Fine-grain feed for day-old chicks', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-poultry-feed-broiler-crumbles', 'cat-restaurant-poultry-feed', 'Broiler Crumbles', '🐓', 'Crumble form for young broilers', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-poultry-feed-duck-geese-feed', 'cat-restaurant-poultry-feed', 'Duck & Geese Feed', '🦆', 'Waterfowl-specific pellets', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-poultry-feed-turkey-feed', 'cat-restaurant-poultry-feed', 'Turkey Feed', '🦃', 'Formulated for turkeys', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- EXPENSE SUBCATEGORIES — LIVESTOCK FEED
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-livestock-feed-cattle-feed', 'cat-restaurant-livestock-feed', 'Cattle Feed', '🐮', 'Pellets and meal for beef and dairy cattle', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-livestock-feed-dairy-meal', 'cat-restaurant-livestock-feed', 'Dairy Meal', '🥛', 'High-energy concentrate for lactating cows', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-livestock-feed-goat-feed', 'cat-restaurant-livestock-feed', 'Goat Feed', '🐐', 'Formulated pellets for goats', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-livestock-feed-sheep-feed', 'cat-restaurant-livestock-feed', 'Sheep Feed', '🐑', 'Pelleted or mash for sheep', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-livestock-feed-pig-grower-feed', 'cat-restaurant-livestock-feed', 'Pig Grower Feed', '🐷', 'Grower phase feed for pigs', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-livestock-feed-pig-finisher-feed', 'cat-restaurant-livestock-feed', 'Pig Finisher Feed', '🐖', 'Pre-market finishing feed for pigs', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-livestock-feed-rabbit-pellets', 'cat-restaurant-livestock-feed', 'Rabbit Pellets', '🐰', 'Pellets and roughage for rabbits', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-livestock-feed-horse-feed', 'cat-restaurant-livestock-feed', 'Horse Feed', '🐴', 'Pellets, chaff, and hay blends', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- EXPENSE SUBCATEGORIES — AQUACULTURE FEED
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-aquaculture-feed-tilapia-pellets', 'cat-restaurant-aquaculture-feed', 'Tilapia Pellets', '🐠', 'Floating and sinking pellets for tilapia', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-aquaculture-feed-catfish-feed', 'cat-restaurant-aquaculture-feed', 'Catfish Feed', '🐡', 'High-protein sinking pellets for catfish', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-aquaculture-feed-trout-feed', 'cat-restaurant-aquaculture-feed', 'Trout Feed', '🎣', 'Cold-water species formulation', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-aquaculture-feed-fingerling-feed', 'cat-restaurant-aquaculture-feed', 'Fingerling Feed', '🐟', 'Micro-pellets for juvenile fish', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- EXPENSE SUBCATEGORIES — FEED SUPPLEMENTS & ADDITIVES
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-feed-supplements-additives-vitamin-mineral-premix', 'cat-restaurant-feed-supplements-additives', 'Vitamin & Mineral Premix', '⚗️', 'Blended vitamin/mineral powder added to feed', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-feed-supplements-additives-amino-acid-supplements', 'cat-restaurant-feed-supplements-additives', 'Amino Acid Supplements', '💊', 'Lysine, Methionine — essential amino acids', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-feed-supplements-additives-coccidiostat-premix', 'cat-restaurant-feed-supplements-additives', 'Coccidiostat Premix', '🛡️', 'Amprolium, Salinomycin mixed into feed to prevent coccidiosis', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-feed-supplements-additives-growth-promoters', 'cat-restaurant-feed-supplements-additives', 'Growth Promoters', '📈', 'Enzyme-based additives to improve feed conversion', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-feed-supplements-additives-toxin-binders', 'cat-restaurant-feed-supplements-additives', 'Toxin Binders', '🔗', 'Mycotoxin adsorbents — protect against contaminated feed', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-feed-supplements-additives-acidifiers', 'cat-restaurant-feed-supplements-additives', 'Acidifiers', '🧫', 'Organic acids to maintain gut pH and improve digestion', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-feed-supplements-additives-probiotics-feed-grade', 'cat-restaurant-feed-supplements-additives', 'Probiotics (Feed-grade)', '🦠', 'Beneficial bacteria for gut health in feed form', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- EXPENSE SUBCATEGORIES — BIOLOGICS & VACCINES
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-biologics-vaccines-newcastle-disease-vaccine', 'cat-restaurant-biologics-vaccines', 'Newcastle Disease Vaccine', '🐔', 'Core poultry vaccine — Lasota, Clone 30 strains', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-biologics-vaccines-gumboro-ibd-vaccine', 'cat-restaurant-biologics-vaccines', 'Gumboro (IBD) Vaccine', '🛡️', 'Infectious Bursal Disease — D78, Bursine', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-biologics-vaccines-mareks-disease-vaccine', 'cat-restaurant-biologics-vaccines', 'Marek''s Disease Vaccine', '🔬', 'Day-old chick vaccination', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-biologics-vaccines-fowlpox-vaccine', 'cat-restaurant-biologics-vaccines', 'Fowlpox Vaccine', '🐓', 'Wing-web or thigh inoculation', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-biologics-vaccines-infectious-bronchitis-vaccine', 'cat-restaurant-biologics-vaccines', 'Infectious Bronchitis Vaccine', '💨', 'Respiratory protection for poultry', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-biologics-vaccines-fmd-vaccine', 'cat-restaurant-biologics-vaccines', 'FMD Vaccine', '🐄', 'Foot-and-Mouth Disease for cattle', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-biologics-vaccines-anthrax-vaccine', 'cat-restaurant-biologics-vaccines', 'Anthrax Vaccine', '⚠️', 'Spore vaccine for cattle and sheep', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-biologics-vaccines-brucellosis-vaccine', 'cat-restaurant-biologics-vaccines', 'Brucellosis Vaccine', '🐐', 'S19, RB51 for cattle and goats', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-biologics-vaccines-rabies-vaccine', 'cat-restaurant-biologics-vaccines', 'Rabies Vaccine', '🐕', 'For farm dogs and livestock', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- EXPENSE SUBCATEGORIES — ANTIBIOTICS & ANTIBACTERIALS
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-antibiotics-antibacterials-tetracyclines', 'cat-restaurant-antibiotics-antibacterials', 'Tetracyclines', '💊', 'Oxytetracycline, Doxycycline — broad-spectrum bacterial infections', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-antibiotics-antibacterials-penicillins-amoxicillins', 'cat-restaurant-antibiotics-antibacterials', 'Penicillins & Amoxicillins', '💊', 'Gram-positive focus — wounds, respiratory', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-antibiotics-antibacterials-sulfonamides', 'cat-restaurant-antibiotics-antibacterials', 'Sulfonamides', '💊', 'Sulfadiazine, Sulfamethoxazole — poultry common', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-antibiotics-antibacterials-fluoroquinolones', 'cat-restaurant-antibiotics-antibacterials', 'Fluoroquinolones', '💊', 'Enrofloxacin — severe respiratory infections', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-antibiotics-antibacterials-macrolides', 'cat-restaurant-antibiotics-antibacterials', 'Macrolides', '💊', 'Tylosin, Erythromycin — mycoplasma treatment', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-antibiotics-antibacterials-aminoglycosides', 'cat-restaurant-antibiotics-antibacterials', 'Aminoglycosides', '💊', 'Neomycin, Streptomycin — gut and wound infections', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-antibiotics-antibacterials-water-soluble-antibiotics', 'cat-restaurant-antibiotics-antibacterials', 'Water-Soluble Antibiotics', '💧', 'Powder/liquid dissolved into drinking water for flock treatment', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- EXPENSE SUBCATEGORIES — ANTIPARASITICS — COCCIDIOSTATS
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-antiparasitics-coccidiostats-ionophore', 'cat-restaurant-antiparasitics-coccidiostats', 'Ionophore Coccidiostats', '🛡️', 'Monensin, Salinomycin, Narasin — added to feed as prevention', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-antiparasitics-coccidiostats-chemical', 'cat-restaurant-antiparasitics-coccidiostats', 'Chemical Coccidiostats', '⚗️', 'Amprolium, Diclazuril, Toltrazuril — treatment via water', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-antiparasitics-coccidiostats-combination', 'cat-restaurant-antiparasitics-coccidiostats', 'Combination Coccidiostats', '🔀', 'Ionophore + chemical combination products', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- EXPENSE SUBCATEGORIES — ANTIPARASITICS — DEWORMERS & EXTERNAL
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-antiparasitics-dewormers-benzimidazole', 'cat-restaurant-antiparasitics-dewormers-external', 'Benzimidazole Dewormers', '🪱', 'Fenbendazole, Albendazole — broad internal worm control', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-antiparasitics-dewormers-piperazine', 'cat-restaurant-antiparasitics-dewormers-external', 'Piperazine Products', '🔬', 'Round worm treatment, water-soluble', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-antiparasitics-dewormers-levamisole', 'cat-restaurant-antiparasitics-dewormers-external', 'Levamisole Products', '💊', 'Broad-spectrum anthelmintic, injectable or oral', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-antiparasitics-dewormers-ivermectin', 'cat-restaurant-antiparasitics-dewormers-external', 'Ivermectin Products', '💉', 'Dual internal and external parasite control', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-antiparasitics-dewormers-external-sprays', 'cat-restaurant-antiparasitics-dewormers-external', 'External Parasite Sprays', '🕷️', 'Permethrin, Deltamethrin — mites, lice, ticks', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-antiparasitics-dewormers-dip-pour-on', 'cat-restaurant-antiparasitics-dewormers-external', 'Dip & Pour-On Products', '🐄', 'Cattle and livestock tick/mite dips', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-antiparasitics-dewormers-protozoa-control', 'cat-restaurant-antiparasitics-dewormers-external', 'Protozoa Control', '🔬', 'Cryptosporidiosis and other protozoan treatments', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- EXPENSE SUBCATEGORIES — ANTIFUNGALS
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-antifungals-poultry-antifungals', 'cat-restaurant-antifungals', 'Poultry Antifungals', '🐔', 'Nystatin — sour crop, thrush, aspergillosis', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-antifungals-livestock-antifungals', 'cat-restaurant-antifungals', 'Livestock Antifungals', '🐄', 'Griseofulvin, Enilconazole', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-antifungals-environmental-fungicides', 'cat-restaurant-antifungals', 'Environmental Fungicides', '🏚️', 'Farm/house disinfection against mold and fungal spores', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-antifungals-mycotoxin-remediation', 'cat-restaurant-antifungals', 'Mycotoxin Remediation', '☠️', 'Post-contamination feed treatment products', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- EXPENSE SUBCATEGORIES — ANTI-INFLAMMATORIES & ANALGESICS
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-anti-inflammatories-analgesics-nsaids', 'cat-restaurant-anti-inflammatories-analgesics', 'NSAIDs (Non-Steroidal)', '💊', 'Flunixin Meglumine, Meloxicam, Aspirin — pain and fever', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-anti-inflammatories-analgesics-steroidal', 'cat-restaurant-anti-inflammatories-analgesics', 'Steroidal Anti-inflammatories', '💉', 'Dexamethasone — severe swelling and shock', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-anti-inflammatories-analgesics-paracetamol', 'cat-restaurant-anti-inflammatories-analgesics', 'Paracetamol Solutions', '🌡️', 'Fever and pain relief for poultry via drinking water', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- EXPENSE SUBCATEGORIES — NUTRITIONAL SUPPLEMENTS & VITAMINS
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-nutritional-supplements-vitamins-fat-soluble', 'cat-restaurant-nutritional-supplements-vitamins', 'Fat-Soluble Vitamins (A, D, E, K)', '🅰️', 'Oil-based vitamin solutions — immune and bone health', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-nutritional-supplements-vitamins-b-complex', 'cat-restaurant-nutritional-supplements-vitamins', 'B-Complex Vitamins', '🅱️', 'B1, B2, B6, B12 — energy metabolism, water-soluble', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-nutritional-supplements-vitamins-vitamin-c', 'cat-restaurant-nutritional-supplements-vitamins', 'Vitamin C', '🍊', 'Ascorbic acid — stress relief and immune support', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-nutritional-supplements-vitamins-electrolytes', 'cat-restaurant-nutritional-supplements-vitamins', 'Electrolytes & Rehydration', '💧', 'Heat stress, diarrhea recovery, transport stress', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-nutritional-supplements-vitamins-calcium-phosphorus', 'cat-restaurant-nutritional-supplements-vitamins', 'Calcium & Phosphorus Supplements', '🦴', 'Eggshell quality, bone development', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-nutritional-supplements-vitamins-iron-trace-minerals', 'cat-restaurant-nutritional-supplements-vitamins', 'Iron & Trace Minerals', '⚙️', 'Anemia prevention, immune and growth support', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-nutritional-supplements-vitamins-probiotics-prebiotics', 'cat-restaurant-nutritional-supplements-vitamins', 'Probiotics & Prebiotics', '🦠', 'Gut flora restoration — post-antibiotic treatment', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-nutritional-supplements-vitamins-liver-tonics', 'cat-restaurant-nutritional-supplements-vitamins', 'Liver Tonics', '🫀', 'Hepatoprotective products for liver detox and function', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- EXPENSE SUBCATEGORIES — DISINFECTANTS & BIOSECURITY
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-disinfectants-biosecurity-farm-house', 'cat-restaurant-disinfectants-biosecurity', 'Farm & House Disinfectants', '🏚️', 'Formalin, Quaternary Ammonium Compounds — general farm use', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-disinfectants-biosecurity-water-sanitizers', 'cat-restaurant-disinfectants-biosecurity', 'Water Sanitizers', '💧', 'Chlorine-based, stabilized hydrogen peroxide for drinking water', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-disinfectants-biosecurity-footbath-solutions', 'cat-restaurant-disinfectants-biosecurity', 'Footbath Solutions', '🦶', 'Virkon S, Copper Sulphate — foot dips at farm entry', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-disinfectants-biosecurity-fumigation-chemicals', 'cat-restaurant-disinfectants-biosecurity', 'Fumigation Chemicals', '💨', 'Formaldehyde-based fumigation for house disinfection', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-disinfectants-biosecurity-spray-disinfectants', 'cat-restaurant-disinfectants-biosecurity', 'Spray Disinfectants', '🫧', 'Ready-to-use sprays for equipment and surfaces', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-restaurant-disinfectants-biosecurity-biosecurity-consumables', 'cat-restaurant-disinfectants-biosecurity', 'Biosecurity Consumables', '🧤', 'Gloves, masks, boot covers, disposable coveralls', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- VERIFICATION (uncomment to check manually after deploy)
-- =============================================================================
-- SELECT ec.name, COUNT(esc.id)::int AS subcats
-- FROM expense_categories ec
-- LEFT JOIN expense_subcategories esc ON esc."categoryId" = ec.id
-- WHERE ec."domainId" = 'domain-restaurant'
--   AND ec.id LIKE 'cat-restaurant-%'
--   AND ec.id NOT IN (
--     'cat-restaurant-dairy-beverages','cat-restaurant-financial-transactions',
--     'cat-restaurant-fresh-produce-vegetables','cat-restaurant-general-operating',
--     'cat-restaurant-grains-staples','cat-restaurant-kitchen-supplies',
--     'cat-restaurant-miscellaneous','cat-restaurant-packaging-cleaning',
--     'cat-restaurant-proteins-meat','cat-restaurant-seasonings-condiments',
--     'cat-restaurant-utilities'
--   )
-- GROUP BY ec.name ORDER BY ec.name;
-- Expected: 12 rows with subcats matching: 8,8,4,7,9,7,3,7,4,3,8,6
