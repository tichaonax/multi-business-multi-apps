-- Seed Celebrations and Special Occasions Expense Categories
-- Source: Celebrations and Special Occasions.md
--
-- IDEMPOTENT: Uses ON CONFLICT DO NOTHING — safe to re-run
--
-- Adds:
--    1 expense_domain      (domain-celebrations)
--   11 expense_categories  under domain-celebrations
--   11 expense_subcategories
--   88 expense_sub_subcategories  (8 items per subcategory)

-- =============================================================================
-- EXPENSE DOMAIN
-- =============================================================================

INSERT INTO expense_domains (id, name, emoji, description, "isActive", "createdAt")
SELECT 'domain-celebrations', 'Celebrations and Special Occasions', '🎉', 'Expense categories for birthdays, holidays, weddings, and other special events', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM expense_domains WHERE id = 'domain-celebrations');

-- =============================================================================
-- EXPENSE CATEGORIES
-- =============================================================================

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-cel-birthdays', 'domain-celebrations', 'Birthdays', '🎂', '#EC4899', 'Cakes, balloons, decorations, gifts, and party supplies for birthday celebrations', true, false, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-cel-mothers-day', 'domain-celebrations', 'Mother''s Day', '👩', '#F472B6', 'Flowers, gifts, chocolates, cards, and meals for Mother''s Day', true, false, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-cel-fathers-day', 'domain-celebrations', 'Father''s Day', '👨', '#3B82F6', 'Gifts, meals, drinks, and hobby items for Father''s Day', true, false, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-cel-holidays', 'domain-celebrations', 'Holidays', '🎄', '#10B981', 'Decorations, gifts, food, lights, and stocking stuffers for holiday seasons', true, false, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-cel-graduation', 'domain-celebrations', 'Graduation', '🎓', '#6366F1', 'Gifts, photos, party supplies, and ceremony costs for graduation events', true, false, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-cel-weddings', 'domain-celebrations', 'Weddings', '💍', '#8B5CF6', 'Gifts, clothing, cake, decorations, photography, and reception costs', true, false, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-cel-baby-showers', 'domain-celebrations', 'Baby Showers', '👶', '#06B6D4', 'Gifts, diapers, baby clothes, decorations, cake, and party supplies', true, false, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-cel-housewarming', 'domain-celebrations', 'Housewarming', '🏡', '#F59E0B', 'Gifts, candles, home decor, food, drinks, and home items for housewarming parties', true, false, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-cel-anniversaries', 'domain-celebrations', 'Anniversaries', '❤️', '#EF4444', 'Gifts, flowers, dinner, decorations, drinks, and trips for anniversaries', true, false, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-cel-religious', 'domain-celebrations', 'Religious Events', '🕌', '#D97706', 'Offerings, candles, clothing, food, donations, and gifts for religious occasions', true, false, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, description, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-cel-community', 'domain-celebrations', 'Community Events', '🎊', '#14B8A6', 'Decorations, food, drinks, prizes, banners, music, and seating for community gatherings', true, false, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- EXPENSE SUBCATEGORIES
-- =============================================================================

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-cel-birthdays', 'cat-cel-birthdays', 'Birthday Expenses', '🎁', 'Cakes, balloons, decorations, gifts, treats, photos, party food, and entertainment', true, false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-cel-mothers-day', 'cat-cel-mothers-day', 'Mother''s Day Expenses', '💐', 'Flowers, gifts, chocolates, cards, meals, brunch, shopping, and wrapping supplies', true, false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-cel-fathers-day', 'cat-cel-fathers-day', 'Father''s Day Expenses', '🎁', 'Gifts, meals, drinks, cards, clothing, tools, electronics, and hobby items', true, false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-cel-holidays', 'cat-cel-holidays', 'Holiday Expenses', '🎅', 'Decorations, gifts, food, treats, lights, stocking stuffers, wrapping paper, and gift bags', true, false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-cel-graduation', 'cat-cel-graduation', 'Graduation Expenses', '🎓', 'Gifts, photos, party supplies, decorations, food, cards, outfit, and ceremony costs', true, false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-cel-weddings', 'cat-cel-weddings', 'Wedding Expenses', '💒', 'Gifts, shower gifts, clothing, formal wear, cake, decorations, photography, and reception food', true, false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-cel-baby-showers', 'cat-cel-baby-showers', 'Baby Shower Expenses', '🍼', 'Gifts, diapers, baby clothes, decorations, cake, food, cards, and party supplies', true, false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-cel-housewarming', 'cat-cel-housewarming', 'Housewarming Expenses', '🏠', 'Gifts, candles, home decor, food, drinks, home items, wrapping supplies, and cards', true, false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-cel-anniversaries', 'cat-cel-anniversaries', 'Anniversary Expenses', '💝', 'Gifts, flowers, dinner, cards, decorations, drinks, candles, and trips', true, false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-cel-religious', 'cat-cel-religious', 'Religious Occasion Expenses', '🙏', 'Offerings, candles, clothing, food, cards, decor, donations, and gifts', true, false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_subcategories (id, "categoryId", name, emoji, description, "isDefault", "isUserCreated", "createdAt")
VALUES ('sub-cel-community', 'cat-cel-community', 'Event Expenses', '🥳', 'Decorations, food, drinks, prizes, banners, music, seating, and entry fees', true, false, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- EXPENSE SUB-SUBCATEGORIES — BIRTHDAYS
-- =============================================================================

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-bday-cakes', 'sub-cel-birthdays', 'Cakes', '🎂', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-bday-balloons', 'sub-cel-birthdays', 'Balloons', '🎈', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-bday-decorations', 'sub-cel-birthdays', 'Decorations', '🎉', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-bday-gifts', 'sub-cel-birthdays', 'Gifts', '🎁', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-bday-treats', 'sub-cel-birthdays', 'Treats', '🧁', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-bday-photos', 'sub-cel-birthdays', 'Photos', '📸', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-bday-party-food', 'sub-cel-birthdays', 'Party food', '🍽️', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-bday-entertainment', 'sub-cel-birthdays', 'Entertainment', '🎶', false, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- EXPENSE SUB-SUBCATEGORIES — MOTHER'S DAY
-- =============================================================================

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-mom-flowers', 'sub-cel-mothers-day', 'Flowers', '🌸', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-mom-gifts', 'sub-cel-mothers-day', 'Gifts', '🎁', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-mom-chocolates', 'sub-cel-mothers-day', 'Chocolates', '🍫', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-mom-cards', 'sub-cel-mothers-day', 'Cards', '💌', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-mom-meals', 'sub-cel-mothers-day', 'Meals', '🍽️', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-mom-brunch', 'sub-cel-mothers-day', 'Brunch', '☕', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-mom-shopping', 'sub-cel-mothers-day', 'Shopping', '🛍️', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-mom-wrapping', 'sub-cel-mothers-day', 'Wrapping supplies', '🎀', false, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- EXPENSE SUB-SUBCATEGORIES — FATHER'S DAY
-- =============================================================================

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-dad-gifts', 'sub-cel-fathers-day', 'Gifts', '🎁', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-dad-meals', 'sub-cel-fathers-day', 'Meals', '🍖', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-dad-drinks', 'sub-cel-fathers-day', 'Drinks', '🍺', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-dad-cards', 'sub-cel-fathers-day', 'Cards', '💌', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-dad-clothing', 'sub-cel-fathers-day', 'Clothing', '🧢', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-dad-tools', 'sub-cel-fathers-day', 'Tools', '🛠️', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-dad-electronics', 'sub-cel-fathers-day', 'Electronics', '🎮', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-dad-hobby', 'sub-cel-fathers-day', 'Hobby items', '🏌️', false, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- EXPENSE SUB-SUBCATEGORIES — HOLIDAYS
-- =============================================================================

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-hol-decorations', 'sub-cel-holidays', 'Decorations', '🎄', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-hol-gifts', 'sub-cel-holidays', 'Gifts', '🎁', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-hol-food', 'sub-cel-holidays', 'Food', '🍗', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-hol-treats', 'sub-cel-holidays', 'Treats', '🍬', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-hol-lights', 'sub-cel-holidays', 'Lights', '🕯️', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-hol-stockings', 'sub-cel-holidays', 'Stocking stuffers', '🧦', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-hol-wrapping', 'sub-cel-holidays', 'Wrapping paper', '🎀', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-hol-gift-bags', 'sub-cel-holidays', 'Gift bags', '🛍️', false, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- EXPENSE SUB-SUBCATEGORIES — GRADUATION
-- =============================================================================

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-grad-gifts', 'sub-cel-graduation', 'Gifts', '🎓', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-grad-photos', 'sub-cel-graduation', 'Photos', '📸', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-grad-party-supplies', 'sub-cel-graduation', 'Party supplies', '🎉', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-grad-decorations', 'sub-cel-graduation', 'Decorations', '🎈', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-grad-food', 'sub-cel-graduation', 'Food', '🍽️', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-grad-cards', 'sub-cel-graduation', 'Cards', '💌', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-grad-outfit', 'sub-cel-graduation', 'Outfit', '👕', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-grad-ceremony', 'sub-cel-graduation', 'Ceremony costs', '🏫', false, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- EXPENSE SUB-SUBCATEGORIES — WEDDINGS
-- =============================================================================

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-wed-gifts', 'sub-cel-weddings', 'Gifts', '💍', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-wed-shower-gifts', 'sub-cel-weddings', 'Shower gifts', '🎁', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-wed-clothing', 'sub-cel-weddings', 'Clothing', '👗', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-wed-formal-wear', 'sub-cel-weddings', 'Formal wear', '🤵', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-wed-cake', 'sub-cel-weddings', 'Cake', '🍰', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-wed-decorations', 'sub-cel-weddings', 'Decorations', '🎉', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-wed-photography', 'sub-cel-weddings', 'Photography', '📸', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-wed-reception', 'sub-cel-weddings', 'Reception food', '🍽️', false, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- EXPENSE SUB-SUBCATEGORIES — BABY SHOWERS
-- =============================================================================

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-baby-gifts', 'sub-cel-baby-showers', 'Gifts', '🎁', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-baby-diapers', 'sub-cel-baby-showers', 'Diapers', '🍼', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-baby-clothes', 'sub-cel-baby-showers', 'Baby clothes', '👕', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-baby-decorations', 'sub-cel-baby-showers', 'Decorations', '🎈', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-baby-cake', 'sub-cel-baby-showers', 'Cake', '🍰', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-baby-food', 'sub-cel-baby-showers', 'Food', '🍽️', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-baby-cards', 'sub-cel-baby-showers', 'Cards', '💌', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-baby-party-supplies', 'sub-cel-baby-showers', 'Party supplies', '🎀', false, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- EXPENSE SUB-SUBCATEGORIES — HOUSEWARMING
-- =============================================================================

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-hw-gifts', 'sub-cel-housewarming', 'Gifts', '🎁', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-hw-candles', 'sub-cel-housewarming', 'Candles', '🕯️', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-hw-decor', 'sub-cel-housewarming', 'Home decor', '🪴', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-hw-food', 'sub-cel-housewarming', 'Food', '🍽️', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-hw-drinks', 'sub-cel-housewarming', 'Drinks', '🥂', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-hw-home-items', 'sub-cel-housewarming', 'Home items', '🛋️', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-hw-wrapping', 'sub-cel-housewarming', 'Wrapping supplies', '🎀', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-hw-cards', 'sub-cel-housewarming', 'Cards', '💌', false, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- EXPENSE SUB-SUBCATEGORIES — ANNIVERSARIES
-- =============================================================================

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-ann-gifts', 'sub-cel-anniversaries', 'Gifts', '🎁', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-ann-flowers', 'sub-cel-anniversaries', 'Flowers', '🌹', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-ann-dinner', 'sub-cel-anniversaries', 'Dinner', '🍽️', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-ann-cards', 'sub-cel-anniversaries', 'Cards', '💌', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-ann-decorations', 'sub-cel-anniversaries', 'Decorations', '🎉', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-ann-drinks', 'sub-cel-anniversaries', 'Drinks', '🥂', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-ann-candles', 'sub-cel-anniversaries', 'Candles', '🕯️', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-ann-trips', 'sub-cel-anniversaries', 'Trips', '✈️', false, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- EXPENSE SUB-SUBCATEGORIES — RELIGIOUS EVENTS
-- =============================================================================

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-rel-offerings', 'sub-cel-religious', 'Offerings', '🎁', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-rel-candles', 'sub-cel-religious', 'Candles', '🕯️', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-rel-clothing', 'sub-cel-religious', 'Clothing', '👕', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-rel-food', 'sub-cel-religious', 'Food', '🍽️', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-rel-cards', 'sub-cel-religious', 'Cards', '💌', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-rel-decor', 'sub-cel-religious', 'Decor', '🪔', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-rel-donations', 'sub-cel-religious', 'Donations', '🕌', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-rel-gifts', 'sub-cel-religious', 'Gifts', '🧧', false, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- EXPENSE SUB-SUBCATEGORIES — COMMUNITY EVENTS
-- =============================================================================

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-com-decorations', 'sub-cel-community', 'Decorations', '🎉', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-com-food', 'sub-cel-community', 'Food', '🍽️', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-com-drinks', 'sub-cel-community', 'Drinks', '🥤', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-com-prizes', 'sub-cel-community', 'Prizes', '🎁', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-com-banners', 'sub-cel-community', 'Banners', '🪧', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-com-music', 'sub-cel-community', 'Music', '🎶', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-com-seating', 'sub-cel-community', 'Seating', '🪑', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_sub_subcategories (id, "subcategoryId", name, emoji, "isUserCreated", "createdAt")
VALUES ('subsub-cel-com-entry-fees', 'sub-cel-community', 'Entry fees', '🧾', false, NOW())
ON CONFLICT (id) DO NOTHING;
