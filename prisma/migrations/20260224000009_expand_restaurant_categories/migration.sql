-- Expand Restaurant Business Categories
-- Adds Livestock & Feeds and Animal Health domains for restaurant businesses
-- that source directly from farms or run integrated poultry/livestock operations.
--
-- IDEMPOTENT: Uses ON CONFLICT DO NOTHING — safe to re-run
-- AUTOMATIC: Runs as part of prisma migrate deploy
--
-- Adds:
--   2 inventory domains  (Livestock & Feeds, Animal Health)
--   12 business categories
--   74 inventory subcategories

-- =============================================================================
-- INVENTORY DOMAINS
-- =============================================================================

INSERT INTO "public"."inventory_domains" ("id", "name", "emoji", "description", "businessType", "isActive", "isSystemTemplate", "createdAt")
VALUES ('domain_restaurant_livestock_feeds', 'Livestock & Feeds', '🌾', 'Animal feeds, supplements, and additives for farm-integrated restaurant operations', 'restaurant', true, true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO "public"."inventory_domains" ("id", "name", "emoji", "description", "businessType", "isActive", "isSystemTemplate", "createdAt")
VALUES ('domain_restaurant_animal_health', 'Animal Health', '🩺', 'Veterinary medicines, biologics, and biosecurity products for poultry and livestock', 'restaurant', true, true, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- BUSINESS CATEGORIES — LIVESTOCK & FEEDS
-- =============================================================================

INSERT INTO business_categories (id, "businessId", "businessType", name, description, emoji, color, "displayOrder", "domainId", "isUserCreated", "isActive", "createdAt", "updatedAt")
VALUES ('cat_restaurant_poultry_feed', NULL, 'restaurant', 'Poultry Feed', 'Feed formulations for broilers, layers, and other poultry', '🐔', '#F59E0B', 1, 'domain_restaurant_livestock_feeds', false, true, NOW(), NOW())
ON CONFLICT ("businessType", "domainId", name) DO NOTHING;

INSERT INTO business_categories (id, "businessId", "businessType", name, description, emoji, color, "displayOrder", "domainId", "isUserCreated", "isActive", "createdAt", "updatedAt")
VALUES ('cat_restaurant_livestock_feed', NULL, 'restaurant', 'Livestock Feed', 'Feed formulations for cattle, goats, pigs, and other livestock', '🐄', '#92400E', 2, 'domain_restaurant_livestock_feeds', false, true, NOW(), NOW())
ON CONFLICT ("businessType", "domainId", name) DO NOTHING;

INSERT INTO business_categories (id, "businessId", "businessType", name, description, emoji, color, "displayOrder", "domainId", "isUserCreated", "isActive", "createdAt", "updatedAt")
VALUES ('cat_restaurant_aquaculture_feed', NULL, 'restaurant', 'Aquaculture Feed', 'Feed pellets and formulations for fish farming', '🐟', '#0EA5E9', 3, 'domain_restaurant_livestock_feeds', false, true, NOW(), NOW())
ON CONFLICT ("businessType", "domainId", name) DO NOTHING;

INSERT INTO business_categories (id, "businessId", "businessType", name, description, emoji, color, "displayOrder", "domainId", "isUserCreated", "isActive", "createdAt", "updatedAt")
VALUES ('cat_restaurant_feed_supplements', NULL, 'restaurant', 'Feed Supplements & Additives', 'Vitamins, minerals, probiotics, and performance additives mixed into feed', '🧪', '#10B981', 4, 'domain_restaurant_livestock_feeds', false, true, NOW(), NOW())
ON CONFLICT ("businessType", "domainId", name) DO NOTHING;

-- =============================================================================
-- BUSINESS CATEGORIES — ANIMAL HEALTH
-- =============================================================================

INSERT INTO business_categories (id, "businessId", "businessType", name, description, emoji, color, "displayOrder", "domainId", "isUserCreated", "isActive", "createdAt", "updatedAt")
VALUES ('cat_restaurant_biologics_vaccines', NULL, 'restaurant', 'Biologics & Vaccines', 'Vaccines for poultry and livestock disease prevention', '💉', '#3B82F6', 1, 'domain_restaurant_animal_health', false, true, NOW(), NOW())
ON CONFLICT ("businessType", "domainId", name) DO NOTHING;

INSERT INTO business_categories (id, "businessId", "businessType", name, description, emoji, color, "displayOrder", "domainId", "isUserCreated", "isActive", "createdAt", "updatedAt")
VALUES ('cat_restaurant_antibiotics', NULL, 'restaurant', 'Antibiotics & Antibacterials', 'Prescription and veterinary antibiotics for bacterial infections', '🦠', '#EF4444', 2, 'domain_restaurant_animal_health', false, true, NOW(), NOW())
ON CONFLICT ("businessType", "domainId", name) DO NOTHING;

INSERT INTO business_categories (id, "businessId", "businessType", name, description, emoji, color, "displayOrder", "domainId", "isUserCreated", "isActive", "createdAt", "updatedAt")
VALUES ('cat_restaurant_coccidiostats', NULL, 'restaurant', 'Antiparasitics — Coccidiostats', 'Coccidiosis prevention and treatment products', '🛡️', '#F97316', 3, 'domain_restaurant_animal_health', false, true, NOW(), NOW())
ON CONFLICT ("businessType", "domainId", name) DO NOTHING;

INSERT INTO business_categories (id, "businessId", "businessType", name, description, emoji, color, "displayOrder", "domainId", "isUserCreated", "isActive", "createdAt", "updatedAt")
VALUES ('cat_restaurant_dewormers', NULL, 'restaurant', 'Antiparasitics — Dewormers & External', 'Internal dewormers and external parasite control products', '🪱', '#84CC16', 4, 'domain_restaurant_animal_health', false, true, NOW(), NOW())
ON CONFLICT ("businessType", "domainId", name) DO NOTHING;

INSERT INTO business_categories (id, "businessId", "businessType", name, description, emoji, color, "displayOrder", "domainId", "isUserCreated", "isActive", "createdAt", "updatedAt")
VALUES ('cat_restaurant_antifungals', NULL, 'restaurant', 'Antifungals', 'Antifungal treatments for poultry, livestock, and farm environments', '🍄', '#A855F7', 5, 'domain_restaurant_animal_health', false, true, NOW(), NOW())
ON CONFLICT ("businessType", "domainId", name) DO NOTHING;

INSERT INTO business_categories (id, "businessId", "businessType", name, description, emoji, color, "displayOrder", "domainId", "isUserCreated", "isActive", "createdAt", "updatedAt")
VALUES ('cat_restaurant_anti_inflam', NULL, 'restaurant', 'Anti-inflammatories & Analgesics', 'Pain relief and anti-inflammatory medications for animals', '💊', '#06B6D4', 6, 'domain_restaurant_animal_health', false, true, NOW(), NOW())
ON CONFLICT ("businessType", "domainId", name) DO NOTHING;

INSERT INTO business_categories (id, "businessId", "businessType", name, description, emoji, color, "displayOrder", "domainId", "isUserCreated", "isActive", "createdAt", "updatedAt")
VALUES ('cat_restaurant_nutrition_supplements', NULL, 'restaurant', 'Nutritional Supplements & Vitamins', 'Vitamins, electrolytes, minerals, and gut health supplements', '🌟', '#22C55E', 7, 'domain_restaurant_animal_health', false, true, NOW(), NOW())
ON CONFLICT ("businessType", "domainId", name) DO NOTHING;

INSERT INTO business_categories (id, "businessId", "businessType", name, description, emoji, color, "displayOrder", "domainId", "isUserCreated", "isActive", "createdAt", "updatedAt")
VALUES ('cat_restaurant_disinfectants', NULL, 'restaurant', 'Disinfectants & Biosecurity', 'Farm disinfectants, water sanitizers, and biosecurity consumables', '🧴', '#6366F1', 8, 'domain_restaurant_animal_health', false, true, NOW(), NOW())
ON CONFLICT ("businessType", "domainId", name) DO NOTHING;

-- =============================================================================
-- INVENTORY SUBCATEGORIES — POULTRY FEED
-- =============================================================================

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_broiler_starter', id, 'Broiler Starter', 'High-protein starter feed, days 1–14', '🐣', 1, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Poultry Feed'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_broiler_grower', id, 'Broiler Grower', 'Growth phase feed, days 15–28', '🌱', 2, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Poultry Feed'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_broiler_finisher', id, 'Broiler Finisher', 'Pre-slaughter finishing feed, days 29+', '🏁', 3, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Poultry Feed'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_layers_mash', id, 'Layers Mash', 'Feed for egg-laying hens', '🥚', 4, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Poultry Feed'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_chick_crumbles', id, 'Chick Crumbles', 'Fine-grain feed for day-old chicks', '🐥', 5, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Poultry Feed'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_broiler_crumbles', id, 'Broiler Crumbles', 'Crumble form for young broilers', '🐓', 6, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Poultry Feed'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_duck_geese_feed', id, 'Duck & Geese Feed', 'Waterfowl-specific pellets', '🦆', 7, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Poultry Feed'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_turkey_feed', id, 'Turkey Feed', 'Formulated for turkeys', '🦃', 8, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Poultry Feed'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- INVENTORY SUBCATEGORIES — LIVESTOCK FEED
-- =============================================================================

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_cattle_feed', id, 'Cattle Feed', 'Pellets and meal for beef and dairy cattle', '🐮', 1, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Livestock Feed'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_dairy_meal', id, 'Dairy Meal', 'High-energy concentrate for lactating cows', '🥛', 2, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Livestock Feed'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_goat_feed', id, 'Goat Feed', 'Formulated pellets for goats', '🐐', 3, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Livestock Feed'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_sheep_feed', id, 'Sheep Feed', 'Pelleted or mash for sheep', '🐑', 4, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Livestock Feed'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_pig_grower_feed', id, 'Pig Grower Feed', 'Grower phase feed for pigs', '🐷', 5, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Livestock Feed'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_pig_finisher_feed', id, 'Pig Finisher Feed', 'Pre-market finishing feed for pigs', '🐖', 6, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Livestock Feed'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_rabbit_pellets', id, 'Rabbit Pellets', 'Pellets and roughage for rabbits', '🐰', 7, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Livestock Feed'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_horse_feed', id, 'Horse Feed', 'Pellets, chaff, and hay blends', '🐴', 8, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Livestock Feed'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- INVENTORY SUBCATEGORIES — AQUACULTURE FEED
-- =============================================================================

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_tilapia_pellets', id, 'Tilapia Pellets', 'Floating and sinking pellets for tilapia', '🐠', 1, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Aquaculture Feed'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_catfish_feed', id, 'Catfish Feed', 'High-protein sinking pellets for catfish', '🐡', 2, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Aquaculture Feed'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_trout_feed', id, 'Trout Feed', 'Cold-water species formulation', '🎣', 3, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Aquaculture Feed'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_fingerling_feed', id, 'Fingerling Feed', 'Micro-pellets for juvenile fish', '🐟', 4, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Aquaculture Feed'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- INVENTORY SUBCATEGORIES — FEED SUPPLEMENTS & ADDITIVES
-- =============================================================================

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_vitamin_mineral_premix', id, 'Vitamin & Mineral Premix', 'Blended vitamin/mineral powder added to feed', '⚗️', 1, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Feed Supplements & Additives'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_amino_acid_supplements', id, 'Amino Acid Supplements', 'Lysine, Methionine — essential amino acids', '💊', 2, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Feed Supplements & Additives'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_coccidiostat_premix', id, 'Coccidiostat Premix', 'Amprolium, Salinomycin mixed into feed to prevent coccidiosis', '🛡️', 3, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Feed Supplements & Additives'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_growth_promoters', id, 'Growth Promoters', 'Enzyme-based additives to improve feed conversion', '📈', 4, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Feed Supplements & Additives'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_toxin_binders', id, 'Toxin Binders', 'Mycotoxin adsorbents — protect against contaminated feed', '🔗', 5, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Feed Supplements & Additives'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_acidifiers', id, 'Acidifiers', 'Organic acids to maintain gut pH and improve digestion', '🧫', 6, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Feed Supplements & Additives'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_probiotics_feed_grade', id, 'Probiotics (Feed-grade)', 'Beneficial bacteria for gut health in feed form', '🦠', 7, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Feed Supplements & Additives'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- INVENTORY SUBCATEGORIES — BIOLOGICS & VACCINES
-- =============================================================================

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_newcastle_disease_vaccine', id, 'Newcastle Disease Vaccine', 'Core poultry vaccine — Lasota, Clone 30 strains', '🐔', 1, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Biologics & Vaccines'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_gumboro_ibd_vaccine', id, 'Gumboro (IBD) Vaccine', 'Infectious Bursal Disease — D78, Bursine', '🛡️', 2, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Biologics & Vaccines'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_marek_s_disease_vaccine', id, 'Marek''s Disease Vaccine', 'Day-old chick vaccination', '🔬', 3, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Biologics & Vaccines'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_fowlpox_vaccine', id, 'Fowlpox Vaccine', 'Wing-web or thigh inoculation', '🐓', 4, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Biologics & Vaccines'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_infectious_bronchitis_vaccine', id, 'Infectious Bronchitis Vaccine', 'Respiratory protection for poultry', '💨', 5, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Biologics & Vaccines'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_fmd_vaccine', id, 'FMD Vaccine', 'Foot-and-Mouth Disease for cattle', '🐄', 6, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Biologics & Vaccines'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_anthrax_vaccine', id, 'Anthrax Vaccine', 'Spore vaccine for cattle and sheep', '⚠️', 7, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Biologics & Vaccines'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_brucellosis_vaccine', id, 'Brucellosis Vaccine', 'S19, RB51 for cattle and goats', '🐐', 8, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Biologics & Vaccines'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_rabies_vaccine', id, 'Rabies Vaccine', 'For farm dogs and livestock', '🐕', 9, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Biologics & Vaccines'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- INVENTORY SUBCATEGORIES — ANTIBIOTICS & ANTIBACTERIALS
-- =============================================================================

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_tetracyclines', id, 'Tetracyclines', 'Oxytetracycline, Doxycycline — broad-spectrum bacterial infections', '💊', 1, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Antibiotics & Antibacterials'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_penicillins_amoxicillins', id, 'Penicillins & Amoxicillins', 'Gram-positive focus — wounds, respiratory', '💊', 2, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Antibiotics & Antibacterials'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_sulfonamides', id, 'Sulfonamides', 'Sulfadiazine, Sulfamethoxazole — poultry common', '💊', 3, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Antibiotics & Antibacterials'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_fluoroquinolones', id, 'Fluoroquinolones', 'Enrofloxacin — severe respiratory infections', '💊', 4, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Antibiotics & Antibacterials'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_macrolides', id, 'Macrolides', 'Tylosin, Erythromycin — mycoplasma treatment', '💊', 5, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Antibiotics & Antibacterials'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_aminoglycosides', id, 'Aminoglycosides', 'Neomycin, Streptomycin — gut and wound infections', '💊', 6, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Antibiotics & Antibacterials'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_water_soluble_antibiotics', id, 'Water-Soluble Antibiotics', 'Powder/liquid dissolved into drinking water for flock treatment', '💧', 7, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Antibiotics & Antibacterials'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- INVENTORY SUBCATEGORIES — ANTIPARASITICS — COCCIDIOSTATS
-- =============================================================================

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_ionophore_coccidiostats', id, 'Ionophore Coccidiostats', 'Monensin, Salinomycin, Narasin — added to feed as prevention', '🛡️', 1, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Antiparasitics — Coccidiostats'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_chemical_coccidiostats', id, 'Chemical Coccidiostats', 'Amprolium, Diclazuril, Toltrazuril — treatment via water', '⚗️', 2, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Antiparasitics — Coccidiostats'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_combination_coccidiostats', id, 'Combination Coccidiostats', 'Ionophore + chemical combination products', '🔀', 3, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Antiparasitics — Coccidiostats'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- INVENTORY SUBCATEGORIES — ANTIPARASITICS — DEWORMERS & EXTERNAL
-- =============================================================================

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_benzimidazole_dewormers', id, 'Benzimidazole Dewormers', 'Fenbendazole, Albendazole — broad internal worm control', '🪱', 1, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Antiparasitics — Dewormers & External'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_piperazine_products', id, 'Piperazine Products', 'Round worm treatment, water-soluble', '🔬', 2, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Antiparasitics — Dewormers & External'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_levamisole_products', id, 'Levamisole Products', 'Broad-spectrum anthelmintic, injectable or oral', '💊', 3, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Antiparasitics — Dewormers & External'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_ivermectin_products', id, 'Ivermectin Products', 'Dual internal and external parasite control', '💉', 4, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Antiparasitics — Dewormers & External'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_external_parasite_sprays', id, 'External Parasite Sprays', 'Permethrin, Deltamethrin — mites, lice, ticks', '🕷️', 5, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Antiparasitics — Dewormers & External'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_dip_pour_on_products', id, 'Dip & Pour-On Products', 'Cattle and livestock tick/mite dips', '🐄', 6, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Antiparasitics — Dewormers & External'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_protozoa_control', id, 'Protozoa Control', 'Cryptosporidiosis and other protozoan treatments', '🔬', 7, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Antiparasitics — Dewormers & External'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- INVENTORY SUBCATEGORIES — ANTIFUNGALS
-- =============================================================================

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_poultry_antifungals', id, 'Poultry Antifungals', 'Nystatin — sour crop, thrush, aspergillosis', '🐔', 1, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Antifungals'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_livestock_antifungals', id, 'Livestock Antifungals', 'Griseofulvin, Enilconazole', '🐄', 2, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Antifungals'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_environmental_fungicides', id, 'Environmental Fungicides', 'Farm/house disinfection against mold and fungal spores', '🏚️', 3, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Antifungals'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_mycotoxin_remediation', id, 'Mycotoxin Remediation', 'Post-contamination feed treatment products', '☠️', 4, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Antifungals'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- INVENTORY SUBCATEGORIES — ANTI-INFLAMMATORIES & ANALGESICS
-- =============================================================================

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_nsaids_non_steroidal', id, 'NSAIDs (Non-Steroidal)', 'Flunixin Meglumine, Meloxicam, Aspirin — pain and fever', '💊', 1, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Anti-inflammatories & Analgesics'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_steroidal_anti_inflammatories', id, 'Steroidal Anti-inflammatories', 'Dexamethasone — severe swelling and shock', '💉', 2, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Anti-inflammatories & Analgesics'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_paracetamol_solutions', id, 'Paracetamol Solutions', 'Fever and pain relief for poultry via drinking water', '🌡️', 3, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Anti-inflammatories & Analgesics'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- INVENTORY SUBCATEGORIES — NUTRITIONAL SUPPLEMENTS & VITAMINS
-- =============================================================================

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_fat_soluble_vitamins_a_d_e_k', id, 'Fat-Soluble Vitamins (A, D, E, K)', 'Oil-based vitamin solutions — immune and bone health', '🅰️', 1, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Nutritional Supplements & Vitamins'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_b_complex_vitamins', id, 'B-Complex Vitamins', 'B1, B2, B6, B12 — energy metabolism, water-soluble', '🅱️', 2, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Nutritional Supplements & Vitamins'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_vitamin_c', id, 'Vitamin C', 'Ascorbic acid — stress relief and immune support', '🍊', 3, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Nutritional Supplements & Vitamins'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_electrolytes_rehydration', id, 'Electrolytes & Rehydration', 'Heat stress, diarrhea recovery, transport stress', '💧', 4, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Nutritional Supplements & Vitamins'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_calcium_phosphorus_supplements', id, 'Calcium & Phosphorus Supplements', 'Eggshell quality, bone development', '🦴', 5, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Nutritional Supplements & Vitamins'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_iron_trace_minerals', id, 'Iron & Trace Minerals', 'Anemia prevention, immune and growth support', '⚙️', 6, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Nutritional Supplements & Vitamins'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_probiotics_prebiotics', id, 'Probiotics & Prebiotics', 'Gut flora restoration — post-antibiotic treatment', '🦠', 7, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Nutritional Supplements & Vitamins'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_liver_tonics', id, 'Liver Tonics', 'Hepatoprotective products for liver detox and function', '🫀', 8, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Nutritional Supplements & Vitamins'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- INVENTORY SUBCATEGORIES — DISINFECTANTS & BIOSECURITY
-- =============================================================================

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_farm_house_disinfectants', id, 'Farm & House Disinfectants', 'Formalin, Quaternary Ammonium Compounds — general farm use', '🏚️', 1, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Disinfectants & Biosecurity'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_water_sanitizers', id, 'Water Sanitizers', 'Chlorine-based, stabilized hydrogen peroxide for drinking water', '💧', 2, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Disinfectants & Biosecurity'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_footbath_solutions', id, 'Footbath Solutions', 'Virkon S, Copper Sulphate — foot dips at farm entry', '🦶', 3, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Disinfectants & Biosecurity'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_fumigation_chemicals', id, 'Fumigation Chemicals', 'Formaldehyde-based fumigation for house disinfection', '💨', 4, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Disinfectants & Biosecurity'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_spray_disinfectants', id, 'Spray Disinfectants', 'Ready-to-use sprays for equipment and surfaces', '🫧', 5, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Disinfectants & Biosecurity'
ON CONFLICT ("categoryId", name) DO NOTHING;

INSERT INTO inventory_subcategories (id, "categoryId", name, description, emoji, "displayOrder", "isDefault", "createdAt")
SELECT 'sc_rest_biosecurity_consumables', id, 'Biosecurity Consumables', 'Gloves, masks, boot covers, disposable coveralls', '🧤', 6, true, NOW()
FROM business_categories WHERE "businessType" = 'restaurant' AND name = 'Disinfectants & Biosecurity'
ON CONFLICT ("categoryId", name) DO NOTHING;

-- =============================================================================
-- VERIFICATION (uncomment to check manually after deploy)
-- =============================================================================
-- SELECT d.name AS domain, COUNT(DISTINCT bc.id) AS categories, COUNT(DISTINCT sc.id) AS subcategories
-- FROM inventory_domains d
-- LEFT JOIN business_categories bc ON bc."domainId" = d.id
-- LEFT JOIN inventory_subcategories sc ON sc."categoryId" = bc.id
-- WHERE d.id IN ('domain_restaurant_livestock_feeds', 'domain_restaurant_animal_health')
-- GROUP BY d.name;
-- Expected: Livestock & Feeds → 4 categories / 27 subcategories
--           Animal Health    → 8 categories / 47 subcategories
