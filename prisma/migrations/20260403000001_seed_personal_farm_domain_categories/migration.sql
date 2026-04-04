-- Seed Personal Farm domain categories and subcategories
-- Migration 20260225000002 created the domain-personal domain entry but the
-- category/subcategory INSERT statements did not persist to the database.
-- This migration re-inserts them using ON CONFLICT DO NOTHING — fully idempotent.
--
-- Domain: domain-personal (Personal Farm 🌾)
-- Categories (12): Poultry Feed, Livestock Feed, Aquaculture Feed,
--   Feed Supplements & Additives, Biologics & Vaccines,
--   Antibiotics & Antibacterials, Antiparasitics — Coccidiostats,
--   Antiparasitics — Dewormers & External, Antifungals,
--   Anti-inflammatories & Analgesics, Nutritional Supplements & Vitamins,
--   Disinfectants & Biosecurity
-- Subcategories: 74 entries across all 12 categories

-- Ensure the domain exists (safe for any environment)
INSERT INTO expense_domains (id, name, emoji, description, "isActive", "createdAt")
SELECT 'domain-personal', 'Personal Farm', '🌾', 'Personal farm and livestock expense categories', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM expense_domains WHERE id = 'domain-personal');

-- =============================================================================
-- EXPENSE CATEGORIES — LIVESTOCK & FEEDS
-- =============================================================================

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-personal-poultry-feed', 'domain-personal', 'Poultry Feed', '🐔', '#8B5CF6', 'Feed formulations for broilers, layers, and other poultry', true, false, false, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-personal-livestock-feed', 'domain-personal', 'Livestock Feed', '🐄', '#8B5CF6', 'Feed formulations for cattle, goats, pigs, and other livestock', true, false, false, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-personal-aquaculture-feed', 'domain-personal', 'Aquaculture Feed', '🐟', '#8B5CF6', 'Feed pellets and formulations for fish farming', true, false, false, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-personal-feed-supplements-additives', 'domain-personal', 'Feed Supplements & Additives', '🧪', '#8B5CF6', 'Vitamins, minerals, probiotics, and performance additives mixed into feed', true, false, false, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

-- =============================================================================
-- EXPENSE CATEGORIES — ANIMAL HEALTH
-- =============================================================================

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-personal-biologics-vaccines', 'domain-personal', 'Biologics & Vaccines', '💉', '#8B5CF6', 'Vaccines for poultry and livestock disease prevention', true, false, false, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-personal-antibiotics-antibacterials', 'domain-personal', 'Antibiotics & Antibacterials', '🦠', '#8B5CF6', 'Prescription and veterinary antibiotics for bacterial infections', true, false, false, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-personal-antiparasitics-coccidiostats', 'domain-personal', 'Antiparasitics — Coccidiostats', '🛡️', '#8B5CF6', 'Coccidiosis prevention and treatment products', true, false, false, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-personal-antiparasitics-dewormers-external', 'domain-personal', 'Antiparasitics — Dewormers & External', '🪱', '#8B5CF6', 'Internal dewormers and external parasite control products', true, false, false, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-personal-antifungals', 'domain-personal', 'Antifungals', '🍄', '#8B5CF6', 'Antifungal treatments for poultry, livestock, and farm environments', true, false, false, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-personal-anti-inflammatories-analgesics', 'domain-personal', 'Anti-inflammatories & Analgesics', '💊', '#8B5CF6', 'Pain relief and anti-inflammatory medications for animals', true, false, false, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-personal-nutritional-supplements-vitamins', 'domain-personal', 'Nutritional Supplements & Vitamins', '🌟', '#8B5CF6', 'Vitamins, electrolytes, minerals, and gut health supplements', true, false, false, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-personal-disinfectants-biosecurity', 'domain-personal', 'Disinfectants & Biosecurity', '🧴', '#8B5CF6', 'Farm disinfectants, water sanitizers, and biosecurity consumables', true, false, false, NOW(), NOW())
ON CONFLICT ("domainId", name) DO NOTHING;

-- =============================================================================
-- EXPENSE SUBCATEGORIES — POULTRY FEED
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-poultry-feed-broiler-starter', 'cat-personal-poultry-feed', 'Broiler Starter', '🐣', 'High-protein starter feed, days 1–14', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-poultry-feed-broiler-grower', 'cat-personal-poultry-feed', 'Broiler Grower', '🌱', 'Growth phase feed, days 15–28', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-poultry-feed-broiler-finisher', 'cat-personal-poultry-feed', 'Broiler Finisher', '🏁', 'Pre-slaughter finishing feed, days 29+', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-poultry-feed-layers-mash', 'cat-personal-poultry-feed', 'Layers Mash', '🥚', 'Feed for egg-laying hens', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-poultry-feed-chick-crumbles', 'cat-personal-poultry-feed', 'Chick Crumbles', '🐥', 'Fine-grain feed for day-old chicks', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-poultry-feed-broiler-crumbles', 'cat-personal-poultry-feed', 'Broiler Crumbles', '🐓', 'Crumble form for young broilers', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-poultry-feed-duck-geese-feed', 'cat-personal-poultry-feed', 'Duck & Geese Feed', '🦆', 'Waterfowl-specific pellets', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-poultry-feed-turkey-feed', 'cat-personal-poultry-feed', 'Turkey Feed', '🦃', 'Formulated for turkeys', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- EXPENSE SUBCATEGORIES — LIVESTOCK FEED
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-livestock-feed-cattle-feed', 'cat-personal-livestock-feed', 'Cattle Feed', '🐮', 'Pellets and meal for beef and dairy cattle', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-livestock-feed-dairy-meal', 'cat-personal-livestock-feed', 'Dairy Meal', '🥛', 'High-energy concentrate for lactating cows', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-livestock-feed-goat-feed', 'cat-personal-livestock-feed', 'Goat Feed', '🐐', 'Formulated pellets for goats', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-livestock-feed-sheep-feed', 'cat-personal-livestock-feed', 'Sheep Feed', '🐑', 'Pelleted or mash for sheep', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-livestock-feed-pig-grower-feed', 'cat-personal-livestock-feed', 'Pig Grower Feed', '🐷', 'Grower phase feed for pigs', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-livestock-feed-pig-finisher-feed', 'cat-personal-livestock-feed', 'Pig Finisher Feed', '🐖', 'Pre-market finishing feed for pigs', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-livestock-feed-rabbit-pellets', 'cat-personal-livestock-feed', 'Rabbit Pellets', '🐰', 'Pellets and roughage for rabbits', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-livestock-feed-horse-feed', 'cat-personal-livestock-feed', 'Horse Feed', '🐴', 'Pellets, chaff, and hay blends', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- EXPENSE SUBCATEGORIES — AQUACULTURE FEED
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-aquaculture-feed-tilapia-pellets', 'cat-personal-aquaculture-feed', 'Tilapia Pellets', '🐠', 'Floating and sinking pellets for tilapia', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-aquaculture-feed-catfish-feed', 'cat-personal-aquaculture-feed', 'Catfish Feed', '🐡', 'High-protein sinking pellets for catfish', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-aquaculture-feed-trout-feed', 'cat-personal-aquaculture-feed', 'Trout Feed', '🎣', 'Cold-water species formulation', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-aquaculture-feed-fingerling-feed', 'cat-personal-aquaculture-feed', 'Fingerling Feed', '🐟', 'Micro-pellets for juvenile fish', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- EXPENSE SUBCATEGORIES — FEED SUPPLEMENTS & ADDITIVES
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-feed-supplements-additives-vitamin-mineral-premix', 'cat-personal-feed-supplements-additives', 'Vitamin & Mineral Premix', '⚗️', 'Blended vitamin/mineral powder added to feed', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-feed-supplements-additives-amino-acid-supplements', 'cat-personal-feed-supplements-additives', 'Amino Acid Supplements', '💊', 'Lysine, Methionine — essential amino acids', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-feed-supplements-additives-coccidiostat-premix', 'cat-personal-feed-supplements-additives', 'Coccidiostat Premix', '🛡️', 'Amprolium, Salinomycin mixed into feed to prevent coccidiosis', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-feed-supplements-additives-growth-promoters', 'cat-personal-feed-supplements-additives', 'Growth Promoters', '📈', 'Enzyme-based additives to improve feed conversion', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-feed-supplements-additives-toxin-binders', 'cat-personal-feed-supplements-additives', 'Toxin Binders', '🔗', 'Mycotoxin adsorbents — protect against contaminated feed', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-feed-supplements-additives-acidifiers', 'cat-personal-feed-supplements-additives', 'Acidifiers', '🧫', 'Organic acids to maintain gut pH and improve digestion', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-feed-supplements-additives-probiotics-feed-grade', 'cat-personal-feed-supplements-additives', 'Probiotics (Feed-grade)', '🦠', 'Beneficial bacteria for gut health in feed form', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- EXPENSE SUBCATEGORIES — BIOLOGICS & VACCINES
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-biologics-vaccines-newcastle-disease-vaccine', 'cat-personal-biologics-vaccines', 'Newcastle Disease Vaccine', '🐔', 'Core poultry vaccine — Lasota, Clone 30 strains', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-biologics-vaccines-gumboro-ibd-vaccine', 'cat-personal-biologics-vaccines', 'Gumboro (IBD) Vaccine', '🛡️', 'Infectious Bursal Disease — D78, Bursine', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-biologics-vaccines-mareks-disease-vaccine', 'cat-personal-biologics-vaccines', 'Marek''s Disease Vaccine', '🔬', 'Day-old chick vaccination', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-biologics-vaccines-fowlpox-vaccine', 'cat-personal-biologics-vaccines', 'Fowlpox Vaccine', '🐓', 'Wing-web or thigh inoculation', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-biologics-vaccines-infectious-bronchitis-vaccine', 'cat-personal-biologics-vaccines', 'Infectious Bronchitis Vaccine', '💨', 'Respiratory protection for poultry', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-biologics-vaccines-fmd-vaccine', 'cat-personal-biologics-vaccines', 'FMD Vaccine', '🐄', 'Foot-and-Mouth Disease for cattle', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-biologics-vaccines-anthrax-vaccine', 'cat-personal-biologics-vaccines', 'Anthrax Vaccine', '⚠️', 'Spore vaccine for cattle and sheep', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-biologics-vaccines-brucellosis-vaccine', 'cat-personal-biologics-vaccines', 'Brucellosis Vaccine', '🐐', 'S19, RB51 for cattle and goats', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-biologics-vaccines-rabies-vaccine', 'cat-personal-biologics-vaccines', 'Rabies Vaccine', '🐕', 'For farm dogs and livestock', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- EXPENSE SUBCATEGORIES — ANTIBIOTICS & ANTIBACTERIALS
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-antibiotics-antibacterials-tetracyclines', 'cat-personal-antibiotics-antibacterials', 'Tetracyclines', '💊', 'Oxytetracycline, Doxycycline — broad-spectrum bacterial infections', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-antibiotics-antibacterials-penicillins-amoxicillins', 'cat-personal-antibiotics-antibacterials', 'Penicillins & Amoxicillins', '💊', 'Gram-positive focus — wounds, respiratory', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-antibiotics-antibacterials-sulfonamides', 'cat-personal-antibiotics-antibacterials', 'Sulfonamides', '💊', 'Sulfadiazine, Sulfamethoxazole — poultry common', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-antibiotics-antibacterials-fluoroquinolones', 'cat-personal-antibiotics-antibacterials', 'Fluoroquinolones', '💊', 'Enrofloxacin — severe respiratory infections', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-antibiotics-antibacterials-macrolides', 'cat-personal-antibiotics-antibacterials', 'Macrolides', '💊', 'Tylosin, Erythromycin — mycoplasma treatment', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-antibiotics-antibacterials-aminoglycosides', 'cat-personal-antibiotics-antibacterials', 'Aminoglycosides', '💊', 'Neomycin, Streptomycin — gut and wound infections', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-antibiotics-antibacterials-water-soluble-antibiotics', 'cat-personal-antibiotics-antibacterials', 'Water-Soluble Antibiotics', '💧', 'Powder/liquid dissolved into drinking water for flock treatment', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- EXPENSE SUBCATEGORIES — ANTIPARASITICS — COCCIDIOSTATS
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-antiparasitics-coccidiostats-ionophore', 'cat-personal-antiparasitics-coccidiostats', 'Ionophore Coccidiostats', '🛡️', 'Monensin, Salinomycin, Narasin — added to feed as prevention', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-antiparasitics-coccidiostats-chemical', 'cat-personal-antiparasitics-coccidiostats', 'Chemical Coccidiostats', '⚗️', 'Amprolium, Diclazuril, Toltrazuril — treatment via water', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-antiparasitics-coccidiostats-combination', 'cat-personal-antiparasitics-coccidiostats', 'Combination Coccidiostats', '🔀', 'Ionophore + chemical combination products', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- EXPENSE SUBCATEGORIES — ANTIPARASITICS — DEWORMERS & EXTERNAL
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-antiparasitics-dewormers-benzimidazole', 'cat-personal-antiparasitics-dewormers-external', 'Benzimidazole Dewormers', '🪱', 'Fenbendazole, Albendazole — broad internal worm control', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-antiparasitics-dewormers-piperazine', 'cat-personal-antiparasitics-dewormers-external', 'Piperazine Products', '🔬', 'Round worm treatment, water-soluble', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-antiparasitics-dewormers-levamisole', 'cat-personal-antiparasitics-dewormers-external', 'Levamisole Products', '💊', 'Broad-spectrum anthelmintic, injectable or oral', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-antiparasitics-dewormers-ivermectin', 'cat-personal-antiparasitics-dewormers-external', 'Ivermectin Products', '💉', 'Dual internal and external parasite control', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-antiparasitics-dewormers-external-sprays', 'cat-personal-antiparasitics-dewormers-external', 'External Parasite Sprays', '🕷️', 'Permethrin, Deltamethrin — mites, lice, ticks', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-antiparasitics-dewormers-dip-pour-on', 'cat-personal-antiparasitics-dewormers-external', 'Dip & Pour-On Products', '🐄', 'Cattle and livestock tick/mite dips', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-antiparasitics-dewormers-protozoa-control', 'cat-personal-antiparasitics-dewormers-external', 'Protozoa Control', '🔬', 'Cryptosporidiosis and other protozoan treatments', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- EXPENSE SUBCATEGORIES — ANTIFUNGALS
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-antifungals-poultry-antifungals', 'cat-personal-antifungals', 'Poultry Antifungals', '🐔', 'Nystatin — sour crop, thrush, aspergillosis', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-antifungals-livestock-antifungals', 'cat-personal-antifungals', 'Livestock Antifungals', '🐄', 'Griseofulvin, Enilconazole', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-antifungals-environmental-fungicides', 'cat-personal-antifungals', 'Environmental Fungicides', '🏚️', 'Farm/house disinfection against mold and fungal spores', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-antifungals-mycotoxin-remediation', 'cat-personal-antifungals', 'Mycotoxin Remediation', '☠️', 'Post-contamination feed treatment products', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- EXPENSE SUBCATEGORIES — ANTI-INFLAMMATORIES & ANALGESICS
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-anti-inflammatories-analgesics-nsaids', 'cat-personal-anti-inflammatories-analgesics', 'NSAIDs (Non-Steroidal)', '💊', 'Flunixin Meglumine, Meloxicam, Aspirin — pain and fever', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-anti-inflammatories-analgesics-steroidal', 'cat-personal-anti-inflammatories-analgesics', 'Steroidal Anti-inflammatories', '💉', 'Dexamethasone — severe swelling and shock', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-anti-inflammatories-analgesics-paracetamol', 'cat-personal-anti-inflammatories-analgesics', 'Paracetamol Solutions', '🌡️', 'Fever and pain relief for poultry via drinking water', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- EXPENSE SUBCATEGORIES — NUTRITIONAL SUPPLEMENTS & VITAMINS
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-nutritional-supplements-vitamins-fat-soluble', 'cat-personal-nutritional-supplements-vitamins', 'Fat-Soluble Vitamins (A, D, E, K)', '🅰️', 'Oil-based vitamin solutions — immune and bone health', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-nutritional-supplements-vitamins-b-complex', 'cat-personal-nutritional-supplements-vitamins', 'B-Complex Vitamins', '🅱️', 'B1, B2, B6, B12 — energy metabolism, water-soluble', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-nutritional-supplements-vitamins-vitamin-c', 'cat-personal-nutritional-supplements-vitamins', 'Vitamin C', '🍊', 'Ascorbic acid — stress relief and immune support', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-nutritional-supplements-vitamins-electrolytes', 'cat-personal-nutritional-supplements-vitamins', 'Electrolytes & Rehydration', '💧', 'Heat stress, diarrhea recovery, transport stress', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-nutritional-supplements-vitamins-calcium-phosphorus', 'cat-personal-nutritional-supplements-vitamins', 'Calcium & Phosphorus Supplements', '🦴', 'Eggshell quality, bone development', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-nutritional-supplements-vitamins-iron-trace-minerals', 'cat-personal-nutritional-supplements-vitamins', 'Iron & Trace Minerals', '⚙️', 'Anemia prevention, immune and growth support', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-nutritional-supplements-vitamins-probiotics-prebiotics', 'cat-personal-nutritional-supplements-vitamins', 'Probiotics & Prebiotics', '🦠', 'Gut flora restoration — post-antibiotic treatment', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-nutritional-supplements-vitamins-liver-tonics', 'cat-personal-nutritional-supplements-vitamins', 'Liver Tonics', '🫀', 'Hepatoprotective products for liver detox and function', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- EXPENSE SUBCATEGORIES — DISINFECTANTS & BIOSECURITY
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-disinfectants-biosecurity-farm-house', 'cat-personal-disinfectants-biosecurity', 'Farm & House Disinfectants', '🏚️', 'Formalin, Quaternary Ammonium Compounds — general farm use', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-disinfectants-biosecurity-water-sanitizers', 'cat-personal-disinfectants-biosecurity', 'Water Sanitizers', '💧', 'Chlorine-based, stabilized hydrogen peroxide for drinking water', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-disinfectants-biosecurity-footbath-solutions', 'cat-personal-disinfectants-biosecurity', 'Footbath Solutions', '🦶', 'Virkon S, Copper Sulphate — foot dips at farm entry', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-disinfectants-biosecurity-fumigation-chemicals', 'cat-personal-disinfectants-biosecurity', 'Fumigation Chemicals', '💨', 'Formaldehyde-based fumigation for house disinfection', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-disinfectants-biosecurity-spray-disinfectants', 'cat-personal-disinfectants-biosecurity', 'Spray Disinfectants', '🫧', 'Ready-to-use sprays for equipment and surfaces', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('subcat-personal-disinfectants-biosecurity-biosecurity-consumables', 'cat-personal-disinfectants-biosecurity', 'Biosecurity Consumables', '🧤', 'Gloves, masks, boot covers, disposable coveralls', true, false, NOW())
ON CONFLICT ("categoryId", name) DO NOTHING;
