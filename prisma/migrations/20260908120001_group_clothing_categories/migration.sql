-- Groups the (until now flat) 1,804 clothing categories under ~51
-- new parent "group" categories, mirroring the section/subgroup structure in
-- ai-contexts/category-emojis/clothing-emojis.md so the category list is
-- navigable instead of one long flat list. Uses the existing, previously
-- unused BusinessCategories.parentId self-reference -- no schema change,
-- and existing domainId (Men's/Women's/Kids demographic split) and every
-- product/inventory FK are left untouched.
--
-- Must run AFTER the brand/IP rename migration -- leaf rows that were
-- renamed there are matched here by their NEW name.
--
-- Idempotent -- safe to re-run (ON CONFLICT DO NOTHING on the group inserts,
-- and the parentId UPDATEs just set the same value again).

-- Step 1: create the group (parent) categories.
INSERT INTO business_categories (id, name, emoji, "businessType", "businessId", "domainId", "parentId", "displayOrder", "isActive", "isUserCreated", color, "createdAt", "updatedAt")
VALUES ('abc2c92b-1215-4eb6-be71-3356c2b3d46b', 'Swimwear and Beachwear', '🩱', 'clothing', NULL, NULL, NULL, 0, true, false, '#3B82F6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (id, name, emoji, "businessType", "businessId", "domainId", "parentId", "displayOrder", "isActive", "isUserCreated", color, "createdAt", "updatedAt")
VALUES ('b86576bd-04c9-4719-8561-e48acc7a395b', 'Offers and Collections', '🏷️', 'clothing', NULL, NULL, NULL, 0, true, false, '#3B82F6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (id, name, emoji, "businessType", "businessId", "domainId", "parentId", "displayOrder", "isActive", "isUserCreated", color, "createdAt", "updatedAt")
VALUES ('b42c7b03-0df9-448e-8cba-87c6cd93e238', 'Dresses and One-Pieces', '👗', 'clothing', NULL, NULL, NULL, 0, true, false, '#3B82F6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (id, name, emoji, "businessType", "businessId", "domainId", "parentId", "displayOrder", "isActive", "isUserCreated", color, "createdAt", "updatedAt")
VALUES ('30f25093-be33-4725-a358-25d910fb8bcb', 'Furniture and Storage', '🪑', 'clothing', NULL, NULL, NULL, 0, true, false, '#3B82F6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (id, name, emoji, "businessType", "businessId", "domainId", "parentId", "displayOrder", "isActive", "isUserCreated", color, "createdAt", "updatedAt")
VALUES ('2cc05b96-6d44-4beb-96b1-54b7a95a412b', 'Uncategorized', '📦', 'clothing', NULL, NULL, NULL, 0, true, false, '#3B82F6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (id, name, emoji, "businessType", "businessId", "domainId", "parentId", "displayOrder", "isActive", "isUserCreated", color, "createdAt", "updatedAt")
VALUES ('9a1c8538-5a6f-48c2-8c5f-054e1a8a0496', 'Activewear', '🏃', 'clothing', NULL, NULL, NULL, 0, true, false, '#3B82F6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (id, name, emoji, "businessType", "businessId", "domainId", "parentId", "displayOrder", "isActive", "isUserCreated", color, "createdAt", "updatedAt")
VALUES ('030427c3-2419-4e43-9666-a8f7bccdd1d2', 'Clothing Accessories', '🧤', 'clothing', NULL, NULL, NULL, 0, true, false, '#3B82F6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (id, name, emoji, "businessType", "businessId", "domainId", "parentId", "displayOrder", "isActive", "isUserCreated", color, "createdAt", "updatedAt")
VALUES ('494e7edb-ed24-43b3-8127-67fc57bbe307', 'Tools and Hardware', '🔧', 'clothing', NULL, NULL, NULL, 0, true, false, '#3B82F6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (id, name, emoji, "businessType", "businessId", "domainId", "parentId", "displayOrder", "isActive", "isUserCreated", color, "createdAt", "updatedAt")
VALUES ('9df85714-4a81-41da-9892-0689b4d7b45f', 'Toys and Games', '🧸', 'clothing', NULL, NULL, NULL, 0, true, false, '#3B82F6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (id, name, emoji, "businessType", "businessId", "domainId", "parentId", "displayOrder", "isActive", "isUserCreated", color, "createdAt", "updatedAt")
VALUES ('687b1bd9-4f6c-470c-94f5-1fb71e14b34a', 'Appliances', '🧊', 'clothing', NULL, NULL, NULL, 0, true, false, '#3B82F6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (id, name, emoji, "businessType", "businessId", "domainId", "parentId", "displayOrder", "isActive", "isUserCreated", color, "createdAt", "updatedAt")
VALUES ('b25add42-0894-43a4-addc-164c3a88fcae', 'Home and Living', '🏠', 'clothing', NULL, NULL, NULL, 0, true, false, '#3B82F6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (id, name, emoji, "businessType", "businessId", "domainId", "parentId", "displayOrder", "isActive", "isUserCreated", color, "createdAt", "updatedAt")
VALUES ('c12abc5a-e602-44fa-a2ae-23c1f7536daf', 'Cleaning and Safety', '🧹', 'clothing', NULL, NULL, NULL, 0, true, false, '#3B82F6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (id, name, emoji, "businessType", "businessId", "domainId", "parentId", "displayOrder", "isActive", "isUserCreated", color, "createdAt", "updatedAt")
VALUES ('3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810', 'Colours and Styles', '🎨', 'clothing', NULL, NULL, NULL, 0, true, false, '#3B82F6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (id, name, emoji, "businessType", "businessId", "domainId", "parentId", "displayOrder", "isActive", "isUserCreated", color, "createdAt", "updatedAt")
VALUES ('0eda637d-b534-40fa-82f1-2615b9d5ba60', 'Intimates and Sleepwear', '🩲', 'clothing', NULL, NULL, NULL, 0, true, false, '#3B82F6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (id, name, emoji, "businessType", "businessId", "domainId", "parentId", "displayOrder", "isActive", "isUserCreated", color, "createdAt", "updatedAt")
VALUES ('ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', 'Jewelry and Watches', '💍', 'clothing', NULL, NULL, NULL, 0, true, false, '#3B82F6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (id, name, emoji, "businessType", "businessId", "domainId", "parentId", "displayOrder", "isActive", "isUserCreated", color, "createdAt", "updatedAt")
VALUES ('3ec886e4-13d5-4a50-a9e9-33981da9555f', 'General Apparel Collections', '🧵', 'clothing', NULL, NULL, NULL, 0, true, false, '#3B82F6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (id, name, emoji, "businessType", "businessId", "domainId", "parentId", "displayOrder", "isActive", "isUserCreated", color, "createdAt", "updatedAt")
VALUES ('26966690-9049-40d5-8ec0-0d13fdf4a131', 'Fish, Aquarium, Birds and Farm Animals', '🐠', 'clothing', NULL, NULL, NULL, 0, true, false, '#3B82F6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (id, name, emoji, "businessType", "businessId", "domainId", "parentId", "displayOrder", "isActive", "isUserCreated", color, "createdAt", "updatedAt")
VALUES ('043666f5-321b-4f40-86e9-498e3706d4ae', 'Bedding and Textiles', '🛏️', 'clothing', NULL, NULL, NULL, 0, true, false, '#3B82F6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (id, name, emoji, "businessType", "businessId", "domainId", "parentId", "displayOrder", "isActive", "isUserCreated", color, "createdAt", "updatedAt")
VALUES ('7330f6c8-fd07-42a8-b4c9-c5c3162c3c82', 'Skin and Body Care', '🧴', 'clothing', NULL, NULL, NULL, 0, true, false, '#3B82F6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (id, name, emoji, "businessType", "businessId", "domainId", "parentId", "displayOrder", "isActive", "isUserCreated", color, "createdAt", "updatedAt")
VALUES ('e88758ef-01d3-4503-be52-6a81787c411d', 'Arts and Crafts', '🎨', 'clothing', NULL, NULL, NULL, 0, true, false, '#3B82F6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (id, name, emoji, "businessType", "businessId", "domainId", "parentId", "displayOrder", "isActive", "isUserCreated", color, "createdAt", "updatedAt")
VALUES ('4e552184-1777-4c5c-8c20-03ca62d53111', 'Garden and Outdoor', '🌿', 'clothing', NULL, NULL, NULL, 0, true, false, '#3B82F6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (id, name, emoji, "businessType", "businessId", "domainId", "parentId", "displayOrder", "isActive", "isUserCreated", color, "createdAt", "updatedAt")
VALUES ('84ecad27-65ce-4f56-a989-718ad9ccf032', 'School and Office', '📚', 'clothing', NULL, NULL, NULL, 0, true, false, '#3B82F6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (id, name, emoji, "businessType", "businessId", "domainId", "parentId", "displayOrder", "isActive", "isUserCreated", color, "createdAt", "updatedAt")
VALUES ('5c2dc356-63b6-4b1e-be2e-425cad712918', 'Shoes and Footwear', '👟', 'clothing', NULL, NULL, NULL, 0, true, false, '#3B82F6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (id, name, emoji, "businessType", "businessId", "domainId", "parentId", "displayOrder", "isActive", "isUserCreated", color, "createdAt", "updatedAt")
VALUES ('23015f08-c0f8-481a-995e-47caf540971f', 'Automotive', '🚗', 'clothing', NULL, NULL, NULL, 0, true, false, '#3B82F6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (id, name, emoji, "businessType", "businessId", "domainId", "parentId", "displayOrder", "isActive", "isUserCreated", color, "createdAt", "updatedAt")
VALUES ('a3cf1af6-84f2-405b-8a59-00549e7cebd4', 'Baby Care', '👶', 'clothing', NULL, NULL, NULL, 0, true, false, '#3B82F6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (id, name, emoji, "businessType", "businessId", "domainId", "parentId", "displayOrder", "isActive", "isUserCreated", color, "createdAt", "updatedAt")
VALUES ('f7b4e800-592b-417c-b991-a73b5c27fe17', 'Kids Clothing and Accessories', '🧒', 'clothing', NULL, NULL, NULL, 0, true, false, '#3B82F6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (id, name, emoji, "businessType", "businessId", "domainId", "parentId", "displayOrder", "isActive", "isUserCreated", color, "createdAt", "updatedAt")
VALUES ('f2a963c9-e33f-41ba-9317-9c3fa943ea2b', 'Bags and Luggage', '👜', 'clothing', NULL, NULL, NULL, 0, true, false, '#3B82F6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (id, name, emoji, "businessType", "businessId", "domainId", "parentId", "displayOrder", "isActive", "isUserCreated", color, "createdAt", "updatedAt")
VALUES ('efe21219-b636-4589-b627-37b2807add46', 'Kitchen and Dining', '🍽️', 'clothing', NULL, NULL, NULL, 0, true, false, '#3B82F6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (id, name, emoji, "businessType", "businessId", "domainId", "parentId", "displayOrder", "isActive", "isUserCreated", color, "createdAt", "updatedAt")
VALUES ('97dd1353-838c-40e5-84e1-96e0ae25522f', 'Party and Event Supplies', '🎉', 'clothing', NULL, NULL, NULL, 0, true, false, '#3B82F6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (id, name, emoji, "businessType", "businessId", "domainId", "parentId", "displayOrder", "isActive", "isUserCreated", color, "createdAt", "updatedAt")
VALUES ('d7d88aca-a472-4fbf-a726-1540bc284674', 'Hats and Headwear', '🧢', 'clothing', NULL, NULL, NULL, 0, true, false, '#3B82F6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (id, name, emoji, "businessType", "businessId", "domainId", "parentId", "displayOrder", "isActive", "isUserCreated", color, "createdAt", "updatedAt")
VALUES ('eae2c10f-ba3c-4a5d-9735-7664e089d37a', 'Tops', '👕', 'clothing', NULL, NULL, NULL, 0, true, false, '#3B82F6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (id, name, emoji, "businessType", "businessId", "domainId", "parentId", "displayOrder", "isActive", "isUserCreated", color, "createdAt", "updatedAt")
VALUES ('cb68f488-5fd7-4748-a728-b25e5001581a', 'Bathroom and Laundry', '🚿', 'clothing', NULL, NULL, NULL, 0, true, false, '#3B82F6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (id, name, emoji, "businessType", "businessId", "domainId", "parentId", "displayOrder", "isActive", "isUserCreated", color, "createdAt", "updatedAt")
VALUES ('6e0214a4-3536-49b8-a78a-656aa5f005fd', 'Bottoms', '👖', 'clothing', NULL, NULL, NULL, 0, true, false, '#3B82F6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (id, name, emoji, "businessType", "businessId", "domainId", "parentId", "displayOrder", "isActive", "isUserCreated", color, "createdAt", "updatedAt")
VALUES ('983460ef-137b-4541-bec6-24d1f3c9ac17', 'Health and Wellness', '🩺', 'clothing', NULL, NULL, NULL, 0, true, false, '#3B82F6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (id, name, emoji, "businessType", "businessId", "domainId", "parentId", "displayOrder", "isActive", "isUserCreated", color, "createdAt", "updatedAt")
VALUES ('e23041d0-68b7-4efe-a676-8d5092e099f1', 'Hair Care', '💇', 'clothing', NULL, NULL, NULL, 0, true, false, '#3B82F6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (id, name, emoji, "businessType", "businessId", "domainId", "parentId", "displayOrder", "isActive", "isUserCreated", color, "createdAt", "updatedAt")
VALUES ('94f7ff62-307d-4b46-bca7-f5de06926753', 'Makeup', '💄', 'clothing', NULL, NULL, NULL, 0, true, false, '#3B82F6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (id, name, emoji, "businessType", "businessId", "domainId", "parentId", "displayOrder", "isActive", "isUserCreated", color, "createdAt", "updatedAt")
VALUES ('5be86735-ca7a-4f5c-b636-aa81f0827961', 'Audio, Video and Gaming', '🎧', 'clothing', NULL, NULL, NULL, 0, true, false, '#3B82F6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (id, name, emoji, "businessType", "businessId", "domainId", "parentId", "displayOrder", "isActive", "isUserCreated", color, "createdAt", "updatedAt")
VALUES ('cab9adb0-855a-42be-bba2-71e872693db6', 'Travel', '🧳', 'clothing', NULL, NULL, NULL, 0, true, false, '#3B82F6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (id, name, emoji, "businessType", "businessId", "domainId", "parentId", "displayOrder", "isActive", "isUserCreated", color, "createdAt", "updatedAt")
VALUES ('4b8aa58c-a10e-4e2f-b05a-08e35482b51b', 'Designer and Collaboration Collections', '✨', 'clothing', NULL, NULL, NULL, 0, true, false, '#3B82F6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (id, name, emoji, "businessType", "businessId", "domainId", "parentId", "displayOrder", "isActive", "isUserCreated", color, "createdAt", "updatedAt")
VALUES ('1f648f8c-6f6a-485c-b947-843b7eb206f5', 'Phones and Mobile Accessories', '📱', 'clothing', NULL, NULL, NULL, 0, true, false, '#3B82F6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (id, name, emoji, "businessType", "businessId", "domainId", "parentId", "displayOrder", "isActive", "isUserCreated", color, "createdAt", "updatedAt")
VALUES ('58dd31c8-51a0-496d-a481-feafe9aec825', 'General Pet Supplies', '🐾', 'clothing', NULL, NULL, NULL, 0, true, false, '#3B82F6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (id, name, emoji, "businessType", "businessId", "domainId", "parentId", "displayOrder", "isActive", "isUserCreated", color, "createdAt", "updatedAt")
VALUES ('a3c3fc0b-7600-4a2d-8164-b7294e8e0d7b', 'Computers and Office Technology', '💻', 'clothing', NULL, NULL, NULL, 0, true, false, '#3B82F6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (id, name, emoji, "businessType", "businessId", "domainId", "parentId", "displayOrder", "isActive", "isUserCreated", color, "createdAt", "updatedAt")
VALUES ('0bfa39ba-1929-4913-a1d1-8c0188cffb64', 'Lighting and Smart Electronics', '💡', 'clothing', NULL, NULL, NULL, 0, true, false, '#3B82F6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (id, name, emoji, "businessType", "businessId", "domainId", "parentId", "displayOrder", "isActive", "isUserCreated", color, "createdAt", "updatedAt")
VALUES ('f1a24213-aa2f-41ed-af5a-bf4c102d2304', 'Fit and Size Collections', '📏', 'clothing', NULL, NULL, NULL, 0, true, false, '#3B82F6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (id, name, emoji, "businessType", "businessId", "domainId", "parentId", "displayOrder", "isActive", "isUserCreated", color, "createdAt", "updatedAt")
VALUES ('12d1d6d3-6e01-4c7e-a58b-21bbc154395c', 'Gifts and Seasonal Items', '🎁', 'clothing', NULL, NULL, NULL, 0, true, false, '#3B82F6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (id, name, emoji, "businessType", "businessId", "domainId", "parentId", "displayOrder", "isActive", "isUserCreated", color, "createdAt", "updatedAt")
VALUES ('a20f3791-1ea7-4fc3-bcfe-2ac1184c8776', 'Pet Care and Grooming', '🐕', 'clothing', NULL, NULL, NULL, 0, true, false, '#3B82F6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (id, name, emoji, "businessType", "businessId", "domainId", "parentId", "displayOrder", "isActive", "isUserCreated", color, "createdAt", "updatedAt")
VALUES ('0ab575fe-7231-45e0-9eff-43d9f9923eed', 'Pet Toys and Training', '🧸', 'clothing', NULL, NULL, NULL, 0, true, false, '#3B82F6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (id, name, emoji, "businessType", "businessId", "domainId", "parentId", "displayOrder", "isActive", "isUserCreated", color, "createdAt", "updatedAt")
VALUES ('8dddbe60-e664-4cd1-ae9c-0d3cf78c70aa', 'Nails and Grooming', '💅', 'clothing', NULL, NULL, NULL, 0, true, false, '#3B82F6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (id, name, emoji, "businessType", "businessId", "domainId", "parentId", "displayOrder", "isActive", "isUserCreated", color, "createdAt", "updatedAt")
VALUES ('75cf812f-8a8a-4f1a-b5ee-c2e4e4f6648f', 'Men''s Apparel Collections', '👔', 'clothing', NULL, NULL, NULL, 0, true, false, '#3B82F6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (id, name, emoji, "businessType", "businessId", "domainId", "parentId", "displayOrder", "isActive", "isUserCreated", color, "createdAt", "updatedAt")
VALUES ('ef24ffb9-0436-4b49-809c-394c69ce5ae7', 'Women''s Apparel Collections', '👗', 'clothing', NULL, NULL, NULL, 0, true, false, '#3B82F6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_categories (id, name, emoji, "businessType", "businessId", "domainId", "parentId", "displayOrder", "isActive", "isUserCreated", color, "createdAt", "updatedAt")
VALUES ('499c7169-900e-4291-a02a-07e7d4edaaaf', 'Motorcycle', '🏍️', 'clothing', NULL, NULL, NULL, 0, true, false, '#3B82F6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Step 2: point every leaf category at its group. This matches by name, so a
-- name shared by an unused bulk-import row and an actively-used curated
-- category (e.g. "Tops") gets reparented on both -- fine on its own, but
-- Step 3 below undoes it for anything actually in use.
-- Swimwear and Beachwear (30)
UPDATE business_categories SET "parentId" = 'abc2c92b-1215-4eb6-be71-3356c2b3d46b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = '3 Piece bikini set' AND (id != 'abc2c92b-1215-4eb6-be71-3356c2b3d46b');
UPDATE business_categories SET "parentId" = 'abc2c92b-1215-4eb6-be71-3356c2b3d46b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = '3 piece bikini sets' AND (id != 'abc2c92b-1215-4eb6-be71-3356c2b3d46b');
UPDATE business_categories SET "parentId" = 'abc2c92b-1215-4eb6-be71-3356c2b3d46b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Beach dress' AND (id != 'abc2c92b-1215-4eb6-be71-3356c2b3d46b');
UPDATE business_categories SET "parentId" = 'abc2c92b-1215-4eb6-be71-3356c2b3d46b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Beach dresses' AND (id != 'abc2c92b-1215-4eb6-be71-3356c2b3d46b');
UPDATE business_categories SET "parentId" = 'abc2c92b-1215-4eb6-be71-3356c2b3d46b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Beach towels & bath sheets' AND (id != 'abc2c92b-1215-4eb6-be71-3356c2b3d46b');
UPDATE business_categories SET "parentId" = 'abc2c92b-1215-4eb6-be71-3356c2b3d46b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Beachwear' AND (id != 'abc2c92b-1215-4eb6-be71-3356c2b3d46b');
UPDATE business_categories SET "parentId" = 'abc2c92b-1215-4eb6-be71-3356c2b3d46b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bikini sets' AND (id != 'abc2c92b-1215-4eb6-be71-3356c2b3d46b');
UPDATE business_categories SET "parentId" = 'abc2c92b-1215-4eb6-be71-3356c2b3d46b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bikini tops' AND (id != 'abc2c92b-1215-4eb6-be71-3356c2b3d46b');
UPDATE business_categories SET "parentId" = 'abc2c92b-1215-4eb6-be71-3356c2b3d46b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Boys swimwear' AND (id != 'abc2c92b-1215-4eb6-be71-3356c2b3d46b');
UPDATE business_categories SET "parentId" = 'abc2c92b-1215-4eb6-be71-3356c2b3d46b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Cover ups' AND (id != 'abc2c92b-1215-4eb6-be71-3356c2b3d46b');
UPDATE business_categories SET "parentId" = 'abc2c92b-1215-4eb6-be71-3356c2b3d46b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Curve beachwear' AND (id != 'abc2c92b-1215-4eb6-be71-3356c2b3d46b');
UPDATE business_categories SET "parentId" = 'abc2c92b-1215-4eb6-be71-3356c2b3d46b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Girls beachwear' AND (id != 'abc2c92b-1215-4eb6-be71-3356c2b3d46b');
UPDATE business_categories SET "parentId" = 'abc2c92b-1215-4eb6-be71-3356c2b3d46b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Maternity beachwear' AND (id != 'abc2c92b-1215-4eb6-be71-3356c2b3d46b');
UPDATE business_categories SET "parentId" = 'abc2c92b-1215-4eb6-be71-3356c2b3d46b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Men beachwear' AND (id != 'abc2c92b-1215-4eb6-be71-3356c2b3d46b');
UPDATE business_categories SET "parentId" = 'abc2c92b-1215-4eb6-be71-3356c2b3d46b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Rashguards' AND (id != 'abc2c92b-1215-4eb6-be71-3356c2b3d46b');
UPDATE business_categories SET "parentId" = 'abc2c92b-1215-4eb6-be71-3356c2b3d46b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SWIMSUITS FOR ALL' AND (id != 'abc2c92b-1215-4eb6-be71-3356c2b3d46b');
UPDATE business_categories SET "parentId" = 'abc2c92b-1215-4eb6-be71-3356c2b3d46b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Swim shorts' AND (id != 'abc2c92b-1215-4eb6-be71-3356c2b3d46b');
UPDATE business_categories SET "parentId" = 'abc2c92b-1215-4eb6-be71-3356c2b3d46b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Swimwear' AND (id != 'abc2c92b-1215-4eb6-be71-3356c2b3d46b');
UPDATE business_categories SET "parentId" = 'abc2c92b-1215-4eb6-be71-3356c2b3d46b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Swimwear Basics Collection' AND (id != 'abc2c92b-1215-4eb6-be71-3356c2b3d46b');
UPDATE business_categories SET "parentId" = 'abc2c92b-1215-4eb6-be71-3356c2b3d46b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Swimwear Beach Collection' AND (id != 'abc2c92b-1215-4eb6-be71-3356c2b3d46b');
UPDATE business_categories SET "parentId" = 'abc2c92b-1215-4eb6-be71-3356c2b3d46b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Swimwear Casual Collection' AND (id != 'abc2c92b-1215-4eb6-be71-3356c2b3d46b');
UPDATE business_categories SET "parentId" = 'abc2c92b-1215-4eb6-be71-3356c2b3d46b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Swimwear Glam Collection' AND (id != 'abc2c92b-1215-4eb6-be71-3356c2b3d46b');
UPDATE business_categories SET "parentId" = 'abc2c92b-1215-4eb6-be71-3356c2b3d46b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Swimwear Modern Collection' AND (id != 'abc2c92b-1215-4eb6-be71-3356c2b3d46b');
UPDATE business_categories SET "parentId" = 'abc2c92b-1215-4eb6-be71-3356c2b3d46b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Swimwear Occasion Collection' AND (id != 'abc2c92b-1215-4eb6-be71-3356c2b3d46b');
UPDATE business_categories SET "parentId" = 'abc2c92b-1215-4eb6-be71-3356c2b3d46b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Swimwear Resort Collection' AND (id != 'abc2c92b-1215-4eb6-be71-3356c2b3d46b');
UPDATE business_categories SET "parentId" = 'abc2c92b-1215-4eb6-be71-3356c2b3d46b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Swimwear Sporty Collection' AND (id != 'abc2c92b-1215-4eb6-be71-3356c2b3d46b');
UPDATE business_categories SET "parentId" = 'abc2c92b-1215-4eb6-be71-3356c2b3d46b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Swimwear Vacation Collection' AND (id != 'abc2c92b-1215-4eb6-be71-3356c2b3d46b');
UPDATE business_categories SET "parentId" = 'abc2c92b-1215-4eb6-be71-3356c2b3d46b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Tankinis' AND (id != 'abc2c92b-1215-4eb6-be71-3356c2b3d46b');
UPDATE business_categories SET "parentId" = 'abc2c92b-1215-4eb6-be71-3356c2b3d46b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women burkinis' AND (id != 'abc2c92b-1215-4eb6-be71-3356c2b3d46b');
UPDATE business_categories SET "parentId" = 'abc2c92b-1215-4eb6-be71-3356c2b3d46b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women rashguards' AND (id != 'abc2c92b-1215-4eb6-be71-3356c2b3d46b');

-- Offers and Collections (22)
UPDATE business_categories SET "parentId" = 'b86576bd-04c9-4719-8561-e48acc7a395b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = '40%-50%off' AND (id != 'b86576bd-04c9-4719-8561-e48acc7a395b');
UPDATE business_categories SET "parentId" = 'b86576bd-04c9-4719-8561-e48acc7a395b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = '50%-60%off' AND (id != 'b86576bd-04c9-4719-8561-e48acc7a395b');
UPDATE business_categories SET "parentId" = 'b86576bd-04c9-4719-8561-e48acc7a395b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = '60%-70%off' AND (id != 'b86576bd-04c9-4719-8561-e48acc7a395b');
UPDATE business_categories SET "parentId" = 'b86576bd-04c9-4719-8561-e48acc7a395b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'All under 10' AND (id != 'b86576bd-04c9-4719-8561-e48acc7a395b');
UPDATE business_categories SET "parentId" = 'b86576bd-04c9-4719-8561-e48acc7a395b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Best sellers' AND (id != 'b86576bd-04c9-4719-8561-e48acc7a395b');
UPDATE business_categories SET "parentId" = 'b86576bd-04c9-4719-8561-e48acc7a395b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bestsellers on sale' AND (id != 'b86576bd-04c9-4719-8561-e48acc7a395b');
UPDATE business_categories SET "parentId" = 'b86576bd-04c9-4719-8561-e48acc7a395b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Collection' AND (id != 'b86576bd-04c9-4719-8561-e48acc7a395b');
UPDATE business_categories SET "parentId" = 'b86576bd-04c9-4719-8561-e48acc7a395b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Customization' AND (id != 'b86576bd-04c9-4719-8561-e48acc7a395b');
UPDATE business_categories SET "parentId" = 'b86576bd-04c9-4719-8561-e48acc7a395b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Hobbies, collections, parties' AND (id != 'b86576bd-04c9-4719-8561-e48acc7a395b');
UPDATE business_categories SET "parentId" = 'b86576bd-04c9-4719-8561-e48acc7a395b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Made to order' AND (id != 'b86576bd-04c9-4719-8561-e48acc7a395b');
UPDATE business_categories SET "parentId" = 'b86576bd-04c9-4719-8561-e48acc7a395b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'New in other categories' AND (id != 'b86576bd-04c9-4719-8561-e48acc7a395b');
UPDATE business_categories SET "parentId" = 'b86576bd-04c9-4719-8561-e48acc7a395b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'New in sale' AND (id != 'b86576bd-04c9-4719-8561-e48acc7a395b');
UPDATE business_categories SET "parentId" = 'b86576bd-04c9-4719-8561-e48acc7a395b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'New this week' AND (id != 'b86576bd-04c9-4719-8561-e48acc7a395b');
UPDATE business_categories SET "parentId" = 'b86576bd-04c9-4719-8561-e48acc7a395b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'New to sale' AND (id != 'b86576bd-04c9-4719-8561-e48acc7a395b');
UPDATE business_categories SET "parentId" = 'b86576bd-04c9-4719-8561-e48acc7a395b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Shop by activity' AND (id != 'b86576bd-04c9-4719-8561-e48acc7a395b');
UPDATE business_categories SET "parentId" = 'b86576bd-04c9-4719-8561-e48acc7a395b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Shop by brands' AND (id != 'b86576bd-04c9-4719-8561-e48acc7a395b');
UPDATE business_categories SET "parentId" = 'b86576bd-04c9-4719-8561-e48acc7a395b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Shop by color' AND (id != 'b86576bd-04c9-4719-8561-e48acc7a395b');
UPDATE business_categories SET "parentId" = 'b86576bd-04c9-4719-8561-e48acc7a395b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Shop by style' AND (id != 'b86576bd-04c9-4719-8561-e48acc7a395b');
UPDATE business_categories SET "parentId" = 'b86576bd-04c9-4719-8561-e48acc7a395b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Shop by trend' AND (id != 'b86576bd-04c9-4719-8561-e48acc7a395b');
UPDATE business_categories SET "parentId" = 'b86576bd-04c9-4719-8561-e48acc7a395b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Special offers' AND (id != 'b86576bd-04c9-4719-8561-e48acc7a395b');
UPDATE business_categories SET "parentId" = 'b86576bd-04c9-4719-8561-e48acc7a395b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Special sale' AND (id != 'b86576bd-04c9-4719-8561-e48acc7a395b');
UPDATE business_categories SET "parentId" = 'b86576bd-04c9-4719-8561-e48acc7a395b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Teenager dolls & stuffed collections' AND (id != 'b86576bd-04c9-4719-8561-e48acc7a395b');

-- Dresses and One-Pieces (59)
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Abayas' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Arabian dresses' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Arabian wear' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bachelorette party dresses' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bodysuits' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bodysuits & jumpsuits' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bodysuits&dresses' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Boho dresses' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bridal shower dresses' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bridesmaid dresses' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Cheongsam' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Co-ords' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Cocktail dresses' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Cultural Wear' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Denim jumpsuits & overalls' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Denim overalls & jumpsuits' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Denim two-piece outfits' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Dirndl dresses' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Dress shoes' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Dress up' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Dresses' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Dresses & Rompers' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Dresses & Sets' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Ethnic & fusion wear' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Fall dresses' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Glamorous dresses' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Hanfu' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Homecoming dresses' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Jumpsuit' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Jumpsuits' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Jumpsuits & bodysuits' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Jumpsuits & co-ords' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Jumpsuits & two-pieces' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kaftan & jalabiya' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids dress up accessories' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids dress up sets' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kimono Tops' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kimonos' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Long dresses' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Maxi dresses' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Maxi party dresses' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Midi dresses' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Modest evening dresses' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Mother of the bride dresses' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'One shoulder' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'One-pieces' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Onesies' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Outfit' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Outfit Sets' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet dresses' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet jumpsuits' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Prom & evening dresses' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Prom dresses' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Slying Dress' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Unitards' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women dresses' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women jumpsuits & bodysuits' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Dresses' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');
UPDATE business_categories SET "parentId" = 'b42c7b03-0df9-448e-8cba-87c6cd93e238', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Yukatas' AND (id != 'b42c7b03-0df9-448e-8cba-87c6cd93e238');

-- Furniture and Storage (43)
UPDATE business_categories SET "parentId" = '30f25093-be33-4725-a358-25d910fb8bcb', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Accent furniture' AND (id != '30f25093-be33-4725-a358-25d910fb8bcb');
UPDATE business_categories SET "parentId" = '30f25093-be33-4725-a358-25d910fb8bcb', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'All-purpose covers' AND (id != '30f25093-be33-4725-a358-25d910fb8bcb');
UPDATE business_categories SET "parentId" = '30f25093-be33-4725-a358-25d910fb8bcb', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Armrest covers' AND (id != '30f25093-be33-4725-a358-25d910fb8bcb');
UPDATE business_categories SET "parentId" = '30f25093-be33-4725-a358-25d910fb8bcb', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Basket Flower' AND (id != '30f25093-be33-4725-a358-25d910fb8bcb');
UPDATE business_categories SET "parentId" = '30f25093-be33-4725-a358-25d910fb8bcb', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Baskets, bins, & containers' AND (id != '30f25093-be33-4725-a358-25d910fb8bcb');
UPDATE business_categories SET "parentId" = '30f25093-be33-4725-a358-25d910fb8bcb', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bathroom furniture' AND (id != '30f25093-be33-4725-a358-25d910fb8bcb');
UPDATE business_categories SET "parentId" = '30f25093-be33-4725-a358-25d910fb8bcb', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Chair covers' AND (id != '30f25093-be33-4725-a358-25d910fb8bcb');
UPDATE business_categories SET "parentId" = '30f25093-be33-4725-a358-25d910fb8bcb', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Chair pads' AND (id != '30f25093-be33-4725-a358-25d910fb8bcb');
UPDATE business_categories SET "parentId" = '30f25093-be33-4725-a358-25d910fb8bcb', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Chaise lounge covers' AND (id != '30f25093-be33-4725-a358-25d910fb8bcb');
UPDATE business_categories SET "parentId" = '30f25093-be33-4725-a358-25d910fb8bcb', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Clothes sorting' AND (id != '30f25093-be33-4725-a358-25d910fb8bcb');
UPDATE business_categories SET "parentId" = '30f25093-be33-4725-a358-25d910fb8bcb', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Clothing & closet storage' AND (id != '30f25093-be33-4725-a358-25d910fb8bcb');
UPDATE business_categories SET "parentId" = '30f25093-be33-4725-a358-25d910fb8bcb', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Clothing anti-slip accessories' AND (id != '30f25093-be33-4725-a358-25d910fb8bcb');
UPDATE business_categories SET "parentId" = '30f25093-be33-4725-a358-25d910fb8bcb', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Clothing organizing supplies' AND (id != '30f25093-be33-4725-a358-25d910fb8bcb');
UPDATE business_categories SET "parentId" = '30f25093-be33-4725-a358-25d910fb8bcb', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Dining room furniture' AND (id != '30f25093-be33-4725-a358-25d910fb8bcb');
UPDATE business_categories SET "parentId" = '30f25093-be33-4725-a358-25d910fb8bcb', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Dust covers' AND (id != '30f25093-be33-4725-a358-25d910fb8bcb');
UPDATE business_categories SET "parentId" = '30f25093-be33-4725-a358-25d910fb8bcb', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Dustproof cover' AND (id != '30f25093-be33-4725-a358-25d910fb8bcb');
UPDATE business_categories SET "parentId" = '30f25093-be33-4725-a358-25d910fb8bcb', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Entryway furniture' AND (id != '30f25093-be33-4725-a358-25d910fb8bcb');
UPDATE business_categories SET "parentId" = '30f25093-be33-4725-a358-25d910fb8bcb', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Furniture hardware' AND (id != '30f25093-be33-4725-a358-25d910fb8bcb');
UPDATE business_categories SET "parentId" = '30f25093-be33-4725-a358-25d910fb8bcb', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Furniture protection' AND (id != '30f25093-be33-4725-a358-25d910fb8bcb');
UPDATE business_categories SET "parentId" = '30f25093-be33-4725-a358-25d910fb8bcb', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Furniture replacement parts' AND (id != '30f25093-be33-4725-a358-25d910fb8bcb');
UPDATE business_categories SET "parentId" = '30f25093-be33-4725-a358-25d910fb8bcb', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Futon slipcovers' AND (id != '30f25093-be33-4725-a358-25d910fb8bcb');
UPDATE business_categories SET "parentId" = '30f25093-be33-4725-a358-25d910fb8bcb', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Game & recreation room furniture' AND (id != '30f25093-be33-4725-a358-25d910fb8bcb');
UPDATE business_categories SET "parentId" = '30f25093-be33-4725-a358-25d910fb8bcb', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Garage storage' AND (id != '30f25093-be33-4725-a358-25d910fb8bcb');
UPDATE business_categories SET "parentId" = '30f25093-be33-4725-a358-25d910fb8bcb', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Hangers & racks' AND (id != '30f25093-be33-4725-a358-25d910fb8bcb');
UPDATE business_categories SET "parentId" = '30f25093-be33-4725-a358-25d910fb8bcb', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Home and Outdoor Furniture' AND (id != '30f25093-be33-4725-a358-25d910fb8bcb');
UPDATE business_categories SET "parentId" = '30f25093-be33-4725-a358-25d910fb8bcb', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Home office furniture' AND (id != '30f25093-be33-4725-a358-25d910fb8bcb');
UPDATE business_categories SET "parentId" = '30f25093-be33-4725-a358-25d910fb8bcb', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Home office storage' AND (id != '30f25093-be33-4725-a358-25d910fb8bcb');
UPDATE business_categories SET "parentId" = '30f25093-be33-4725-a358-25d910fb8bcb', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Indoor and Outdoor Furniture' AND (id != '30f25093-be33-4725-a358-25d910fb8bcb');
UPDATE business_categories SET "parentId" = '30f25093-be33-4725-a358-25d910fb8bcb', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids'' furniture' AND (id != '30f25093-be33-4725-a358-25d910fb8bcb');
UPDATE business_categories SET "parentId" = '30f25093-be33-4725-a358-25d910fb8bcb', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kitchen furniture' AND (id != '30f25093-be33-4725-a358-25d910fb8bcb');
UPDATE business_categories SET "parentId" = '30f25093-be33-4725-a358-25d910fb8bcb', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Portable closets' AND (id != '30f25093-be33-4725-a358-25d910fb8bcb');
UPDATE business_categories SET "parentId" = '30f25093-be33-4725-a358-25d910fb8bcb', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Portable storage' AND (id != '30f25093-be33-4725-a358-25d910fb8bcb');
UPDATE business_categories SET "parentId" = '30f25093-be33-4725-a358-25d910fb8bcb', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Recliner slipcovers' AND (id != '30f25093-be33-4725-a358-25d910fb8bcb');
UPDATE business_categories SET "parentId" = '30f25093-be33-4725-a358-25d910fb8bcb', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sofa & chair leg grippers' AND (id != '30f25093-be33-4725-a358-25d910fb8bcb');
UPDATE business_categories SET "parentId" = '30f25093-be33-4725-a358-25d910fb8bcb', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sofa slipcovers' AND (id != '30f25093-be33-4725-a358-25d910fb8bcb');
UPDATE business_categories SET "parentId" = '30f25093-be33-4725-a358-25d910fb8bcb', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Stationery storage boxes' AND (id != '30f25093-be33-4725-a358-25d910fb8bcb');
UPDATE business_categories SET "parentId" = '30f25093-be33-4725-a358-25d910fb8bcb', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Storage baskets' AND (id != '30f25093-be33-4725-a358-25d910fb8bcb');
UPDATE business_categories SET "parentId" = '30f25093-be33-4725-a358-25d910fb8bcb', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Storage benches & ottomans' AND (id != '30f25093-be33-4725-a358-25d910fb8bcb');
UPDATE business_categories SET "parentId" = '30f25093-be33-4725-a358-25d910fb8bcb', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Storage boxes & bins' AND (id != '30f25093-be33-4725-a358-25d910fb8bcb');
UPDATE business_categories SET "parentId" = '30f25093-be33-4725-a358-25d910fb8bcb', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Storage drawers' AND (id != '30f25093-be33-4725-a358-25d910fb8bcb');
UPDATE business_categories SET "parentId" = '30f25093-be33-4725-a358-25d910fb8bcb', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Storage holders & racks' AND (id != '30f25093-be33-4725-a358-25d910fb8bcb');
UPDATE business_categories SET "parentId" = '30f25093-be33-4725-a358-25d910fb8bcb', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Storage island & carts' AND (id != '30f25093-be33-4725-a358-25d910fb8bcb');
UPDATE business_categories SET "parentId" = '30f25093-be33-4725-a358-25d910fb8bcb', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Storage solutions set' AND (id != '30f25093-be33-4725-a358-25d910fb8bcb');

-- Uncategorized (176)
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'AKNOTIC' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'ANEWSTA' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Accessories' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Accessories & parts' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Accessory organizers' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Accs trending styles' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Air mattresses' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'All the extras' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Arts crafts & sewing storage' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Ashtrays' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Baby' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Baby Basics' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bed wedges & body positioners' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bikinx' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bird training' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bmai' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bottle covers' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'CUCCOO' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'CUCCOO BIZCHIC' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'CUCCOO CHICEST' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'CUCCOO TILAWA' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Care' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Cases' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Cigarette cases' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Cigarette storage' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Clips' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Clusters & raw' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Com' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Consoles & organizers' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Cozy Cub' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Cut out' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'DAIMENGFEN' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'DAZY' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Dazy' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Dola Lovely' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Dye' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'EMERY ROSE' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'ENCHNT' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Electric Insect & Pest Repellers' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Elestic Scrunh' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Essence' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Events accessories' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Everyday' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Exotic' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Eye covers' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Eye tools' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Fall & winter' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Family' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Faux feathers' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Feeders' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Feeding' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Feet protection' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Female hair trimmer & removal' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Fever City' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Files' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Fishing' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Flag' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Fleese Pyjama' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Flower' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Flower knows' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'For Body &face' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'French memo boards' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Friends' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Functional cosmetics' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'GEMCHO' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'GINGTTO' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'GLOWMODE' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Gentleman & british' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Girly' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Glow Oil' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Hair' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Hair chains' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Hair styling tools' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Hair tools' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Hand & foot warmers' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Handle fans' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Heart' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Hokoyo' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Household chemicals' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Household merchandises' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Ice pad' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Ideas' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Ideasx' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'In My Nature' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Infant Clothing' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Inkpads' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Instrument accessories' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Interior accessories' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'JNSQ' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'K- beauty' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'K.SKIN' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'KDOMO' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Keep' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Key holder & keychain organizers' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Keychains & accs' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'LINSY' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'LUVLETTE' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Labels,indexes & stamps' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Leopard' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Lip Stick' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Lips' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Live sound & stage' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'LongNap™' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Longnap™' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Loose-leaf covers' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'MASKERT' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'MOTF' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'MT99' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'MUSERA' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Men' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Men clothing' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Men grooming' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Men''s Underwaer' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Mornach' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'NEON BLANC' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Natural' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Newborn Essentials' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Ninja' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Nujoom' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'ONTRE' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Oral & nose care' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Outdoor' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Outdoor clothing' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Outdoor sofas covers' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Oversleeves' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pads' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Party' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Party accessories' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pen cover & pen grip' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet travel bowls & bottles' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Puff' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Push' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Rearview mirror accessories' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Remote control covers' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Repair tools & winders' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Romber' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Rool On' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Royal' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SONGMICSHOME' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'SUMWON' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Service' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sets' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Shadows' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sheet' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sm product' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Small Varse' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Smoking accessories' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Solid gum' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Spirit' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Style' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Styleloop' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sugerpunk' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Suprenx' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sweat pads' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Teaching re' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'The Happy Look' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Triangle' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'VUTRU' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Varse 1l' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Verse' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'WARRIOR' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'WESTFADE' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'WINGSLOV' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Washers & Dryers' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Winter thermal cover' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women two pieces' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women uniforms & scrubs' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women uniforms & special clothing' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women waist chains' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Wrist corsage' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'YITAHOME' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Yefecy' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Zambia' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');
UPDATE business_categories SET "parentId" = '2cc05b96-6d44-4beb-96b1-54b7a95a412b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Zip up' AND (id != '2cc05b96-6d44-4beb-96b1-54b7a95a412b');

-- Activewear (48)
UPDATE business_categories SET "parentId" = '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Active & Playwear' AND (id != '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496');
UPDATE business_categories SET "parentId" = '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Active bottoms' AND (id != '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496');
UPDATE business_categories SET "parentId" = '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Active sets' AND (id != '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496');
UPDATE business_categories SET "parentId" = '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Active tops' AND (id != '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496');
UPDATE business_categories SET "parentId" = '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Activewear' AND (id != '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496');
UPDATE business_categories SET "parentId" = '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Athleisure' AND (id != '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496');
UPDATE business_categories SET "parentId" = '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Athletic Training Footwear and Apparel' AND (id != '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496');
UPDATE business_categories SET "parentId" = '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Basic & sporty' AND (id != '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496');
UPDATE business_categories SET "parentId" = '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Boxing fighting & dance gymnastics' AND (id != '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496');
UPDATE business_categories SET "parentId" = '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Classic Athletic Footwear and Apparel' AND (id != '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496');
UPDATE business_categories SET "parentId" = '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Cycling' AND (id != '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496');
UPDATE business_categories SET "parentId" = '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Exercise mats' AND (id != '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496');
UPDATE business_categories SET "parentId" = '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Fitness & body building' AND (id != '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496');
UPDATE business_categories SET "parentId" = '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Girls Activewear' AND (id != '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496');
UPDATE business_categories SET "parentId" = '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids swimming pools & outdoor water toys' AND (id != '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496');
UPDATE business_categories SET "parentId" = '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Men activewear' AND (id != '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496');
UPDATE business_categories SET "parentId" = '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Men''s Athletic Collection' AND (id != '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496');
UPDATE business_categories SET "parentId" = '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Men''s Athletic Prep Collection' AND (id != '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496');
UPDATE business_categories SET "parentId" = '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Men''s Smart Athletic Collection' AND (id != '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496');
UPDATE business_categories SET "parentId" = '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Performance Athletic Footwear and Apparel' AND (id != '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496');
UPDATE business_categories SET "parentId" = '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Plus activewear' AND (id != '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496');
UPDATE business_categories SET "parentId" = '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Professional sports shoes' AND (id != '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496');
UPDATE business_categories SET "parentId" = '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sport Casual Footwear and Apparel' AND (id != '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496');
UPDATE business_categories SET "parentId" = '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sports & outdoor' AND (id != '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496');
UPDATE business_categories SET "parentId" = '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sports & outdoor supplies' AND (id != '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496');
UPDATE business_categories SET "parentId" = '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sports & outdoors' AND (id != '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496');
UPDATE business_categories SET "parentId" = '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sports Shoes' AND (id != '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496');
UPDATE business_categories SET "parentId" = '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sports accessories' AND (id != '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496');
UPDATE business_categories SET "parentId" = '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sports bags' AND (id != '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496');
UPDATE business_categories SET "parentId" = '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sports bottle' AND (id != '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496');
UPDATE business_categories SET "parentId" = '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sports bras' AND (id != '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496');
UPDATE business_categories SET "parentId" = '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sports game' AND (id != '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496');
UPDATE business_categories SET "parentId" = '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sports safety & shaper' AND (id != '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496');
UPDATE business_categories SET "parentId" = '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sports shorts' AND (id != '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496');
UPDATE business_categories SET "parentId" = '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sports socks' AND (id != '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496');
UPDATE business_categories SET "parentId" = '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sportswear' AND (id != '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496');
UPDATE business_categories SET "parentId" = '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Swimming' AND (id != '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496');
UPDATE business_categories SET "parentId" = '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Team sports' AND (id != '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496');
UPDATE business_categories SET "parentId" = '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Winter sports' AND (id != '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496');
UPDATE business_categories SET "parentId" = '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women exercise & fitness belt' AND (id != '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496');
UPDATE business_categories SET "parentId" = '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Active Lifestyle Collection' AND (id != '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496');
UPDATE business_categories SET "parentId" = '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Court Sports Collection' AND (id != '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496');
UPDATE business_categories SET "parentId" = '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Easy Activewear Collection' AND (id != '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496');
UPDATE business_categories SET "parentId" = '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Innovative Activewear Collection' AND (id != '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496');
UPDATE business_categories SET "parentId" = '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Seamless Activewear Collection' AND (id != '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496');
UPDATE business_categories SET "parentId" = '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Street Activewear Collection' AND (id != '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496');
UPDATE business_categories SET "parentId" = '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Yoga Collection' AND (id != '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496');
UPDATE business_categories SET "parentId" = '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Yoga' AND (id != '9a1c8538-5a6f-48c2-8c5f-054e1a8a0496');

-- Clothing Accessories (56)
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Activities & entertainment' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Ankle socks' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Aprons' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Belt' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Belts' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Belts & suspenders' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bridal belts' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bridal gloves' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Crew socks' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Cufflinks and tie clips' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Customized aprons' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Customized socks' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Earmuffs' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Eyeglass frames' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Eyeglasses' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Eyemasks & earmuffs' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Fashion Accessories' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Fashion glasses' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Gender neutral accessories' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Glasses & eyewear accessories' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Glasses accessories' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Glasses sets' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Gloves' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Handkerchiefs' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Infinity Scarves' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Invisible socks' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Less Socks' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Long Socks' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Men fashion accessories' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Men socks' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Men ties & collar' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Men''s socks & accessories' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Over the calf socks' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Over the knee socks' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet bows & ties' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet scarves' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet seat belts' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Scarves' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Scarves Accessories' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Shawls' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sockets' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Socks' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sports glasses' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sunglasses' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Tarps & tie-downs' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Tie side' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Toe socks' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Wearable Accessories' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women Scarves & Scarf Accessories' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women belts' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women belts & accessories' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women glasses & eyewear' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women harness belts' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women hats & gloves' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women socks & hosiery' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');
UPDATE business_categories SET "parentId" = '030427c3-2419-4e43-9666-a8f7bccdd1d2', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women spuc belts' AND (id != '030427c3-2419-4e43-9666-a8f7bccdd1d2');

-- Tools and Hardware (43)
UPDATE business_categories SET "parentId" = '494e7edb-ed24-43b3-8127-67fc57bbe307', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Adhesives & sealers' AND (id != '494e7edb-ed24-43b3-8127-67fc57bbe307');
UPDATE business_categories SET "parentId" = '494e7edb-ed24-43b3-8127-67fc57bbe307', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Adult blocks & figures' AND (id != '494e7edb-ed24-43b3-8127-67fc57bbe307');
UPDATE business_categories SET "parentId" = '494e7edb-ed24-43b3-8127-67fc57bbe307', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Brackets & clamps' AND (id != '494e7edb-ed24-43b3-8127-67fc57bbe307');
UPDATE business_categories SET "parentId" = '494e7edb-ed24-43b3-8127-67fc57bbe307', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Cabinet hardware' AND (id != '494e7edb-ed24-43b3-8127-67fc57bbe307');
UPDATE business_categories SET "parentId" = '494e7edb-ed24-43b3-8127-67fc57bbe307', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Cleaning suppliers accessories' AND (id != '494e7edb-ed24-43b3-8127-67fc57bbe307');
UPDATE business_categories SET "parentId" = '494e7edb-ed24-43b3-8127-67fc57bbe307', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Cleaning suppliers storages' AND (id != '494e7edb-ed24-43b3-8127-67fc57bbe307');
UPDATE business_categories SET "parentId" = '494e7edb-ed24-43b3-8127-67fc57bbe307', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Crowbars' AND (id != '494e7edb-ed24-43b3-8127-67fc57bbe307');
UPDATE business_categories SET "parentId" = '494e7edb-ed24-43b3-8127-67fc57bbe307', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Door hardware & locks' AND (id != '494e7edb-ed24-43b3-8127-67fc57bbe307');
UPDATE business_categories SET "parentId" = '494e7edb-ed24-43b3-8127-67fc57bbe307', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Double sided tape' AND (id != '494e7edb-ed24-43b3-8127-67fc57bbe307');
UPDATE business_categories SET "parentId" = '494e7edb-ed24-43b3-8127-67fc57bbe307', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Equipment & Maintenance' AND (id != '494e7edb-ed24-43b3-8127-67fc57bbe307');
UPDATE business_categories SET "parentId" = '494e7edb-ed24-43b3-8127-67fc57bbe307', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Fasneter' AND (id != '494e7edb-ed24-43b3-8127-67fc57bbe307');
UPDATE business_categories SET "parentId" = '494e7edb-ed24-43b3-8127-67fc57bbe307', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Fasneter Red' AND (id != '494e7edb-ed24-43b3-8127-67fc57bbe307');
UPDATE business_categories SET "parentId" = '494e7edb-ed24-43b3-8127-67fc57bbe307', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Fasteners & hooks' AND (id != '494e7edb-ed24-43b3-8127-67fc57bbe307');
UPDATE business_categories SET "parentId" = '494e7edb-ed24-43b3-8127-67fc57bbe307', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Grinders' AND (id != '494e7edb-ed24-43b3-8127-67fc57bbe307');
UPDATE business_categories SET "parentId" = '494e7edb-ed24-43b3-8127-67fc57bbe307', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Hammer' AND (id != '494e7edb-ed24-43b3-8127-67fc57bbe307');
UPDATE business_categories SET "parentId" = '494e7edb-ed24-43b3-8127-67fc57bbe307', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Hand scissors' AND (id != '494e7edb-ed24-43b3-8127-67fc57bbe307');
UPDATE business_categories SET "parentId" = '494e7edb-ed24-43b3-8127-67fc57bbe307', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Hand tools' AND (id != '494e7edb-ed24-43b3-8127-67fc57bbe307');
UPDATE business_categories SET "parentId" = '494e7edb-ed24-43b3-8127-67fc57bbe307', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Hasps & locks' AND (id != '494e7edb-ed24-43b3-8127-67fc57bbe307');
UPDATE business_categories SET "parentId" = '494e7edb-ed24-43b3-8127-67fc57bbe307', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Hookah & accessories' AND (id != '494e7edb-ed24-43b3-8127-67fc57bbe307');
UPDATE business_categories SET "parentId" = '494e7edb-ed24-43b3-8127-67fc57bbe307', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Hooks & rails' AND (id != '494e7edb-ed24-43b3-8127-67fc57bbe307');
UPDATE business_categories SET "parentId" = '494e7edb-ed24-43b3-8127-67fc57bbe307', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Industrial tweezers' AND (id != '494e7edb-ed24-43b3-8127-67fc57bbe307');
UPDATE business_categories SET "parentId" = '494e7edb-ed24-43b3-8127-67fc57bbe307', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Interlocking floor mats' AND (id != '494e7edb-ed24-43b3-8127-67fc57bbe307');
UPDATE business_categories SET "parentId" = '494e7edb-ed24-43b3-8127-67fc57bbe307', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Masking tape' AND (id != '494e7edb-ed24-43b3-8127-67fc57bbe307');
UPDATE business_categories SET "parentId" = '494e7edb-ed24-43b3-8127-67fc57bbe307', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Measuring tools' AND (id != '494e7edb-ed24-43b3-8127-67fc57bbe307');
UPDATE business_categories SET "parentId" = '494e7edb-ed24-43b3-8127-67fc57bbe307', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Moth & mildew proofing' AND (id != '494e7edb-ed24-43b3-8127-67fc57bbe307');
UPDATE business_categories SET "parentId" = '494e7edb-ed24-43b3-8127-67fc57bbe307', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Nano tape' AND (id != '494e7edb-ed24-43b3-8127-67fc57bbe307');
UPDATE business_categories SET "parentId" = '494e7edb-ed24-43b3-8127-67fc57bbe307', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Office adhesive tape' AND (id != '494e7edb-ed24-43b3-8127-67fc57bbe307');
UPDATE business_categories SET "parentId" = '494e7edb-ed24-43b3-8127-67fc57bbe307', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pliers' AND (id != '494e7edb-ed24-43b3-8127-67fc57bbe307');
UPDATE business_categories SET "parentId" = '494e7edb-ed24-43b3-8127-67fc57bbe307', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Saw' AND (id != '494e7edb-ed24-43b3-8127-67fc57bbe307');
UPDATE business_categories SET "parentId" = '494e7edb-ed24-43b3-8127-67fc57bbe307', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Scissors' AND (id != '494e7edb-ed24-43b3-8127-67fc57bbe307');
UPDATE business_categories SET "parentId" = '494e7edb-ed24-43b3-8127-67fc57bbe307', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Screwdriver' AND (id != '494e7edb-ed24-43b3-8127-67fc57bbe307');
UPDATE business_categories SET "parentId" = '494e7edb-ed24-43b3-8127-67fc57bbe307', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Self-adhesive paper' AND (id != '494e7edb-ed24-43b3-8127-67fc57bbe307');
UPDATE business_categories SET "parentId" = '494e7edb-ed24-43b3-8127-67fc57bbe307', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sheet fasteners & grippers' AND (id != '494e7edb-ed24-43b3-8127-67fc57bbe307');
UPDATE business_categories SET "parentId" = '494e7edb-ed24-43b3-8127-67fc57bbe307', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Super Glue' AND (id != '494e7edb-ed24-43b3-8127-67fc57bbe307');
UPDATE business_categories SET "parentId" = '494e7edb-ed24-43b3-8127-67fc57bbe307', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Tap & die' AND (id != '494e7edb-ed24-43b3-8127-67fc57bbe307');
UPDATE business_categories SET "parentId" = '494e7edb-ed24-43b3-8127-67fc57bbe307', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Tape dispenser' AND (id != '494e7edb-ed24-43b3-8127-67fc57bbe307');
UPDATE business_categories SET "parentId" = '494e7edb-ed24-43b3-8127-67fc57bbe307', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Tapes,adhesives & fasteners' AND (id != '494e7edb-ed24-43b3-8127-67fc57bbe307');
UPDATE business_categories SET "parentId" = '494e7edb-ed24-43b3-8127-67fc57bbe307', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Tapestry' AND (id != '494e7edb-ed24-43b3-8127-67fc57bbe307');
UPDATE business_categories SET "parentId" = '494e7edb-ed24-43b3-8127-67fc57bbe307', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Tool bags' AND (id != '494e7edb-ed24-43b3-8127-67fc57bbe307');
UPDATE business_categories SET "parentId" = '494e7edb-ed24-43b3-8127-67fc57bbe307', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Tools & home improvement' AND (id != '494e7edb-ed24-43b3-8127-67fc57bbe307');
UPDATE business_categories SET "parentId" = '494e7edb-ed24-43b3-8127-67fc57bbe307', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Utility knife' AND (id != '494e7edb-ed24-43b3-8127-67fc57bbe307');
UPDATE business_categories SET "parentId" = '494e7edb-ed24-43b3-8127-67fc57bbe307', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Window hardware' AND (id != '494e7edb-ed24-43b3-8127-67fc57bbe307');
UPDATE business_categories SET "parentId" = '494e7edb-ed24-43b3-8127-67fc57bbe307', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Wrench' AND (id != '494e7edb-ed24-43b3-8127-67fc57bbe307');

-- Toys and Games (44)
UPDATE business_categories SET "parentId" = '9df85714-4a81-41da-9892-0689b4d7b45f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Adult remote control toys' AND (id != '9df85714-4a81-41da-9892-0689b4d7b45f');
UPDATE business_categories SET "parentId" = '9df85714-4a81-41da-9892-0689b4d7b45f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Arts, crafts & puzzles storage' AND (id != '9df85714-4a81-41da-9892-0689b4d7b45f');
UPDATE business_categories SET "parentId" = '9df85714-4a81-41da-9892-0689b4d7b45f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Baby musical toys' AND (id != '9df85714-4a81-41da-9892-0689b4d7b45f');
UPDATE business_categories SET "parentId" = '9df85714-4a81-41da-9892-0689b4d7b45f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Baby toys' AND (id != '9df85714-4a81-41da-9892-0689b4d7b45f');
UPDATE business_categories SET "parentId" = '9df85714-4a81-41da-9892-0689b4d7b45f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Balls' AND (id != '9df85714-4a81-41da-9892-0689b4d7b45f');
UPDATE business_categories SET "parentId" = '9df85714-4a81-41da-9892-0689b4d7b45f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Baseball cap' AND (id != '9df85714-4a81-41da-9892-0689b4d7b45f');
UPDATE business_categories SET "parentId" = '9df85714-4a81-41da-9892-0689b4d7b45f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bass guitars' AND (id != '9df85714-4a81-41da-9892-0689b4d7b45f');
UPDATE business_categories SET "parentId" = '9df85714-4a81-41da-9892-0689b4d7b45f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bath toys' AND (id != '9df85714-4a81-41da-9892-0689b4d7b45f');
UPDATE business_categories SET "parentId" = '9df85714-4a81-41da-9892-0689b4d7b45f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'CUCCOO DOLLMOD' AND (id != '9df85714-4a81-41da-9892-0689b4d7b45f');
UPDATE business_categories SET "parentId" = '9df85714-4a81-41da-9892-0689b4d7b45f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Collectible toys' AND (id != '9df85714-4a81-41da-9892-0689b4d7b45f');
UPDATE business_categories SET "parentId" = '9df85714-4a81-41da-9892-0689b4d7b45f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Drums & percussion' AND (id != '9df85714-4a81-41da-9892-0689b4d7b45f');
UPDATE business_categories SET "parentId" = '9df85714-4a81-41da-9892-0689b4d7b45f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Early development & activity toys' AND (id != '9df85714-4a81-41da-9892-0689b4d7b45f');
UPDATE business_categories SET "parentId" = '9df85714-4a81-41da-9892-0689b4d7b45f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Electronic toys' AND (id != '9df85714-4a81-41da-9892-0689b4d7b45f');
UPDATE business_categories SET "parentId" = '9df85714-4a81-41da-9892-0689b4d7b45f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Game supplies' AND (id != '9df85714-4a81-41da-9892-0689b4d7b45f');
UPDATE business_categories SET "parentId" = '9df85714-4a81-41da-9892-0689b4d7b45f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Games & entertainment' AND (id != '9df85714-4a81-41da-9892-0689b4d7b45f');
UPDATE business_categories SET "parentId" = '9df85714-4a81-41da-9892-0689b4d7b45f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Guitars' AND (id != '9df85714-4a81-41da-9892-0689b4d7b45f');
UPDATE business_categories SET "parentId" = '9df85714-4a81-41da-9892-0689b4d7b45f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids building block sets' AND (id != '9df85714-4a81-41da-9892-0689b4d7b45f');
UPDATE business_categories SET "parentId" = '9df85714-4a81-41da-9892-0689b4d7b45f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids dolls & stuffed toys' AND (id != '9df85714-4a81-41da-9892-0689b4d7b45f');
UPDATE business_categories SET "parentId" = '9df85714-4a81-41da-9892-0689b4d7b45f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids dress up & pretend toys' AND (id != '9df85714-4a81-41da-9892-0689b4d7b45f');
UPDATE business_categories SET "parentId" = '9df85714-4a81-41da-9892-0689b4d7b45f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids educational toys' AND (id != '9df85714-4a81-41da-9892-0689b4d7b45f');
UPDATE business_categories SET "parentId" = '9df85714-4a81-41da-9892-0689b4d7b45f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids electric dress up & pretend toys' AND (id != '9df85714-4a81-41da-9892-0689b4d7b45f');
UPDATE business_categories SET "parentId" = '9df85714-4a81-41da-9892-0689b4d7b45f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids electronic learning toys' AND (id != '9df85714-4a81-41da-9892-0689b4d7b45f');
UPDATE business_categories SET "parentId" = '9df85714-4a81-41da-9892-0689b4d7b45f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids kitchen toys' AND (id != '9df85714-4a81-41da-9892-0689b4d7b45f');
UPDATE business_categories SET "parentId" = '9df85714-4a81-41da-9892-0689b4d7b45f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids magic cubes' AND (id != '9df85714-4a81-41da-9892-0689b4d7b45f');
UPDATE business_categories SET "parentId" = '9df85714-4a81-41da-9892-0689b4d7b45f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids magnetic building block toys' AND (id != '9df85714-4a81-41da-9892-0689b4d7b45f');
UPDATE business_categories SET "parentId" = '9df85714-4a81-41da-9892-0689b4d7b45f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids medical kits' AND (id != '9df85714-4a81-41da-9892-0689b4d7b45f');
UPDATE business_categories SET "parentId" = '9df85714-4a81-41da-9892-0689b4d7b45f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids outdoor play' AND (id != '9df85714-4a81-41da-9892-0689b4d7b45f');
UPDATE business_categories SET "parentId" = '9df85714-4a81-41da-9892-0689b4d7b45f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids play tools' AND (id != '9df85714-4a81-41da-9892-0689b4d7b45f');
UPDATE business_categories SET "parentId" = '9df85714-4a81-41da-9892-0689b4d7b45f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids plush & stuffed toys' AND (id != '9df85714-4a81-41da-9892-0689b4d7b45f');
UPDATE business_categories SET "parentId" = '9df85714-4a81-41da-9892-0689b4d7b45f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids puzzles' AND (id != '9df85714-4a81-41da-9892-0689b4d7b45f');
UPDATE business_categories SET "parentId" = '9df85714-4a81-41da-9892-0689b4d7b45f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids sandboxes & beach toys' AND (id != '9df85714-4a81-41da-9892-0689b4d7b45f');
UPDATE business_categories SET "parentId" = '9df85714-4a81-41da-9892-0689b4d7b45f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids tablets' AND (id != '9df85714-4a81-41da-9892-0689b4d7b45f');
UPDATE business_categories SET "parentId" = '9df85714-4a81-41da-9892-0689b4d7b45f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids toy sports' AND (id != '9df85714-4a81-41da-9892-0689b4d7b45f');
UPDATE business_categories SET "parentId" = '9df85714-4a81-41da-9892-0689b4d7b45f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Mandolins' AND (id != '9df85714-4a81-41da-9892-0689b4d7b45f');
UPDATE business_categories SET "parentId" = '9df85714-4a81-41da-9892-0689b4d7b45f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Musical instruments' AND (id != '9df85714-4a81-41da-9892-0689b4d7b45f');
UPDATE business_categories SET "parentId" = '9df85714-4a81-41da-9892-0689b4d7b45f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Musical instruments & accessories' AND (id != '9df85714-4a81-41da-9892-0689b4d7b45f');
UPDATE business_categories SET "parentId" = '9df85714-4a81-41da-9892-0689b4d7b45f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Musical toys' AND (id != '9df85714-4a81-41da-9892-0689b4d7b45f');
UPDATE business_categories SET "parentId" = '9df85714-4a81-41da-9892-0689b4d7b45f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Stringed musical instruments' AND (id != '9df85714-4a81-41da-9892-0689b4d7b45f');
UPDATE business_categories SET "parentId" = '9df85714-4a81-41da-9892-0689b4d7b45f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Teenager novelty & gag toys' AND (id != '9df85714-4a81-41da-9892-0689b4d7b45f');
UPDATE business_categories SET "parentId" = '9df85714-4a81-41da-9892-0689b4d7b45f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Teenager sports & outdoor play' AND (id != '9df85714-4a81-41da-9892-0689b4d7b45f');
UPDATE business_categories SET "parentId" = '9df85714-4a81-41da-9892-0689b4d7b45f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Toys' AND (id != '9df85714-4a81-41da-9892-0689b4d7b45f');
UPDATE business_categories SET "parentId" = '9df85714-4a81-41da-9892-0689b4d7b45f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Toys & games' AND (id != '9df85714-4a81-41da-9892-0689b4d7b45f');
UPDATE business_categories SET "parentId" = '9df85714-4a81-41da-9892-0689b4d7b45f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Ukuleles' AND (id != '9df85714-4a81-41da-9892-0689b4d7b45f');
UPDATE business_categories SET "parentId" = '9df85714-4a81-41da-9892-0689b4d7b45f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Wind & woodwind musical instruments' AND (id != '9df85714-4a81-41da-9892-0689b4d7b45f');

-- Appliances (37)
UPDATE business_categories SET "parentId" = '687b1bd9-4f6c-470c-94f5-1fb71e14b34a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Air Condition' AND (id != '687b1bd9-4f6c-470c-94f5-1fb71e14b34a');
UPDATE business_categories SET "parentId" = '687b1bd9-4f6c-470c-94f5-1fb71e14b34a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Appliances' AND (id != '687b1bd9-4f6c-470c-94f5-1fb71e14b34a');
UPDATE business_categories SET "parentId" = '687b1bd9-4f6c-470c-94f5-1fb71e14b34a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Aquarium Appliances' AND (id != '687b1bd9-4f6c-470c-94f5-1fb71e14b34a');
UPDATE business_categories SET "parentId" = '687b1bd9-4f6c-470c-94f5-1fb71e14b34a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Blenders' AND (id != '687b1bd9-4f6c-470c-94f5-1fb71e14b34a');
UPDATE business_categories SET "parentId" = '687b1bd9-4f6c-470c-94f5-1fb71e14b34a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bulbs' AND (id != '687b1bd9-4f6c-470c-94f5-1fb71e14b34a');
UPDATE business_categories SET "parentId" = '687b1bd9-4f6c-470c-94f5-1fb71e14b34a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Cable & cable accessories' AND (id != '687b1bd9-4f6c-470c-94f5-1fb71e14b34a');
UPDATE business_categories SET "parentId" = '687b1bd9-4f6c-470c-94f5-1fb71e14b34a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Cable organizers' AND (id != '687b1bd9-4f6c-470c-94f5-1fb71e14b34a');
UPDATE business_categories SET "parentId" = '687b1bd9-4f6c-470c-94f5-1fb71e14b34a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Ceiling lights & fans' AND (id != '687b1bd9-4f6c-470c-94f5-1fb71e14b34a');
UPDATE business_categories SET "parentId" = '687b1bd9-4f6c-470c-94f5-1fb71e14b34a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Cleaning Appliances' AND (id != '687b1bd9-4f6c-470c-94f5-1fb71e14b34a');
UPDATE business_categories SET "parentId" = '687b1bd9-4f6c-470c-94f5-1fb71e14b34a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Climate Control' AND (id != '687b1bd9-4f6c-470c-94f5-1fb71e14b34a');
UPDATE business_categories SET "parentId" = '687b1bd9-4f6c-470c-94f5-1fb71e14b34a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Coffee & tea appliances' AND (id != '687b1bd9-4f6c-470c-94f5-1fb71e14b34a');
UPDATE business_categories SET "parentId" = '687b1bd9-4f6c-470c-94f5-1fb71e14b34a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Cooking Appliances' AND (id != '687b1bd9-4f6c-470c-94f5-1fb71e14b34a');
UPDATE business_categories SET "parentId" = '687b1bd9-4f6c-470c-94f5-1fb71e14b34a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Cooling products' AND (id != '687b1bd9-4f6c-470c-94f5-1fb71e14b34a');
UPDATE business_categories SET "parentId" = '687b1bd9-4f6c-470c-94f5-1fb71e14b34a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Entertainment Appliances' AND (id != '687b1bd9-4f6c-470c-94f5-1fb71e14b34a');
UPDATE business_categories SET "parentId" = '687b1bd9-4f6c-470c-94f5-1fb71e14b34a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Environmental appliances' AND (id != '687b1bd9-4f6c-470c-94f5-1fb71e14b34a');
UPDATE business_categories SET "parentId" = '687b1bd9-4f6c-470c-94f5-1fb71e14b34a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Heater & cooler' AND (id != '687b1bd9-4f6c-470c-94f5-1fb71e14b34a');
UPDATE business_categories SET "parentId" = '687b1bd9-4f6c-470c-94f5-1fb71e14b34a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Home Cleaning Appliances' AND (id != '687b1bd9-4f6c-470c-94f5-1fb71e14b34a');
UPDATE business_categories SET "parentId" = '687b1bd9-4f6c-470c-94f5-1fb71e14b34a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Household appliances' AND (id != '687b1bd9-4f6c-470c-94f5-1fb71e14b34a');
UPDATE business_categories SET "parentId" = '687b1bd9-4f6c-470c-94f5-1fb71e14b34a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Indoor fountain pumps' AND (id != '687b1bd9-4f6c-470c-94f5-1fb71e14b34a');
UPDATE business_categories SET "parentId" = '687b1bd9-4f6c-470c-94f5-1fb71e14b34a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Juicer & food processor' AND (id != '687b1bd9-4f6c-470c-94f5-1fb71e14b34a');
UPDATE business_categories SET "parentId" = '687b1bd9-4f6c-470c-94f5-1fb71e14b34a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Laundry Appliances' AND (id != '687b1bd9-4f6c-470c-94f5-1fb71e14b34a');
UPDATE business_categories SET "parentId" = '687b1bd9-4f6c-470c-94f5-1fb71e14b34a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Light Bar' AND (id != '687b1bd9-4f6c-470c-94f5-1fb71e14b34a');
UPDATE business_categories SET "parentId" = '687b1bd9-4f6c-470c-94f5-1fb71e14b34a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Light accessories' AND (id != '687b1bd9-4f6c-470c-94f5-1fb71e14b34a');
UPDATE business_categories SET "parentId" = '687b1bd9-4f6c-470c-94f5-1fb71e14b34a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Major Appliances Parts' AND (id != '687b1bd9-4f6c-470c-94f5-1fb71e14b34a');
UPDATE business_categories SET "parentId" = '687b1bd9-4f6c-470c-94f5-1fb71e14b34a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Makeup appliance' AND (id != '687b1bd9-4f6c-470c-94f5-1fb71e14b34a');
UPDATE business_categories SET "parentId" = '687b1bd9-4f6c-470c-94f5-1fb71e14b34a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Paper & tubes & rolling appliances' AND (id != '687b1bd9-4f6c-470c-94f5-1fb71e14b34a');
UPDATE business_categories SET "parentId" = '687b1bd9-4f6c-470c-94f5-1fb71e14b34a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet appliances' AND (id != '687b1bd9-4f6c-470c-94f5-1fb71e14b34a');
UPDATE business_categories SET "parentId" = '687b1bd9-4f6c-470c-94f5-1fb71e14b34a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Portable Refrigerator' AND (id != '687b1bd9-4f6c-470c-94f5-1fb71e14b34a');
UPDATE business_categories SET "parentId" = '687b1bd9-4f6c-470c-94f5-1fb71e14b34a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Power transmission' AND (id != '687b1bd9-4f6c-470c-94f5-1fb71e14b34a');
UPDATE business_categories SET "parentId" = '687b1bd9-4f6c-470c-94f5-1fb71e14b34a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Refrigeration Appliances' AND (id != '687b1bd9-4f6c-470c-94f5-1fb71e14b34a');
UPDATE business_categories SET "parentId" = '687b1bd9-4f6c-470c-94f5-1fb71e14b34a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Refrigerators & freezers' AND (id != '687b1bd9-4f6c-470c-94f5-1fb71e14b34a');
UPDATE business_categories SET "parentId" = '687b1bd9-4f6c-470c-94f5-1fb71e14b34a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Small Kitchen Appliances' AND (id != '687b1bd9-4f6c-470c-94f5-1fb71e14b34a');
UPDATE business_categories SET "parentId" = '687b1bd9-4f6c-470c-94f5-1fb71e14b34a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Styling tools & appliances' AND (id != '687b1bd9-4f6c-470c-94f5-1fb71e14b34a');
UPDATE business_categories SET "parentId" = '687b1bd9-4f6c-470c-94f5-1fb71e14b34a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Temperature gauges' AND (id != '687b1bd9-4f6c-470c-94f5-1fb71e14b34a');
UPDATE business_categories SET "parentId" = '687b1bd9-4f6c-470c-94f5-1fb71e14b34a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Warming products' AND (id != '687b1bd9-4f6c-470c-94f5-1fb71e14b34a');
UPDATE business_categories SET "parentId" = '687b1bd9-4f6c-470c-94f5-1fb71e14b34a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Washing machine dust covers' AND (id != '687b1bd9-4f6c-470c-94f5-1fb71e14b34a');
UPDATE business_categories SET "parentId" = '687b1bd9-4f6c-470c-94f5-1fb71e14b34a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Window screens' AND (id != '687b1bd9-4f6c-470c-94f5-1fb71e14b34a');

-- Home and Living (34)
UPDATE business_categories SET "parentId" = 'b25add42-0894-43a4-addc-164c3a88fcae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Air freshener supplies' AND (id != 'b25add42-0894-43a4-addc-164c3a88fcae');
UPDATE business_categories SET "parentId" = 'b25add42-0894-43a4-addc-164c3a88fcae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'At home' AND (id != 'b25add42-0894-43a4-addc-164c3a88fcae');
UPDATE business_categories SET "parentId" = 'b25add42-0894-43a4-addc-164c3a88fcae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bookends & book stands' AND (id != 'b25add42-0894-43a4-addc-164c3a88fcae');
UPDATE business_categories SET "parentId" = 'b25add42-0894-43a4-addc-164c3a88fcae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bookmarks' AND (id != 'b25add42-0894-43a4-addc-164c3a88fcae');
UPDATE business_categories SET "parentId" = 'b25add42-0894-43a4-addc-164c3a88fcae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Candles & holders' AND (id != 'b25add42-0894-43a4-addc-164c3a88fcae');
UPDATE business_categories SET "parentId" = 'b25add42-0894-43a4-addc-164c3a88fcae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Couch & Sofa Decor' AND (id != 'b25add42-0894-43a4-addc-164c3a88fcae');
UPDATE business_categories SET "parentId" = 'b25add42-0894-43a4-addc-164c3a88fcae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Customized decorative pillows' AND (id != 'b25add42-0894-43a4-addc-164c3a88fcae');
UPDATE business_categories SET "parentId" = 'b25add42-0894-43a4-addc-164c3a88fcae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Daily home essentials' AND (id != 'b25add42-0894-43a4-addc-164c3a88fcae');
UPDATE business_categories SET "parentId" = 'b25add42-0894-43a4-addc-164c3a88fcae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Decorations' AND (id != 'b25add42-0894-43a4-addc-164c3a88fcae');
UPDATE business_categories SET "parentId" = 'b25add42-0894-43a4-addc-164c3a88fcae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Decorative Lamp' AND (id != 'b25add42-0894-43a4-addc-164c3a88fcae');
UPDATE business_categories SET "parentId" = 'b25add42-0894-43a4-addc-164c3a88fcae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Decorative Pillows, Inserts, & Covers' AND (id != 'b25add42-0894-43a4-addc-164c3a88fcae');
UPDATE business_categories SET "parentId" = 'b25add42-0894-43a4-addc-164c3a88fcae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Exterior decorative accessories' AND (id != 'b25add42-0894-43a4-addc-164c3a88fcae');
UPDATE business_categories SET "parentId" = 'b25add42-0894-43a4-addc-164c3a88fcae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Exterior sticker' AND (id != 'b25add42-0894-43a4-addc-164c3a88fcae');
UPDATE business_categories SET "parentId" = 'b25add42-0894-43a4-addc-164c3a88fcae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Hand fans' AND (id != 'b25add42-0894-43a4-addc-164c3a88fcae');
UPDATE business_categories SET "parentId" = 'b25add42-0894-43a4-addc-164c3a88fcae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Home & living' AND (id != 'b25add42-0894-43a4-addc-164c3a88fcae');
UPDATE business_categories SET "parentId" = 'b25add42-0894-43a4-addc-164c3a88fcae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Home decor' AND (id != 'b25add42-0894-43a4-addc-164c3a88fcae');
UPDATE business_categories SET "parentId" = 'b25add42-0894-43a4-addc-164c3a88fcae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Home decor accents & accessories' AND (id != 'b25add42-0894-43a4-addc-164c3a88fcae');
UPDATE business_categories SET "parentId" = 'b25add42-0894-43a4-addc-164c3a88fcae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Home fragrance products' AND (id != 'b25add42-0894-43a4-addc-164c3a88fcae');
UPDATE business_categories SET "parentId" = 'b25add42-0894-43a4-addc-164c3a88fcae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Home fragrance sachets' AND (id != 'b25add42-0894-43a4-addc-164c3a88fcae');
UPDATE business_categories SET "parentId" = 'b25add42-0894-43a4-addc-164c3a88fcae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Home stickers' AND (id != 'b25add42-0894-43a4-addc-164c3a88fcae');
UPDATE business_categories SET "parentId" = 'b25add42-0894-43a4-addc-164c3a88fcae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Home textile' AND (id != 'b25add42-0894-43a4-addc-164c3a88fcae');
UPDATE business_categories SET "parentId" = 'b25add42-0894-43a4-addc-164c3a88fcae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Household Textile Sundries' AND (id != 'b25add42-0894-43a4-addc-164c3a88fcae');
UPDATE business_categories SET "parentId" = 'b25add42-0894-43a4-addc-164c3a88fcae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Incense & incense burners' AND (id != 'b25add42-0894-43a4-addc-164c3a88fcae');
UPDATE business_categories SET "parentId" = 'b25add42-0894-43a4-addc-164c3a88fcae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Nursery decor' AND (id != 'b25add42-0894-43a4-addc-164c3a88fcae');
UPDATE business_categories SET "parentId" = 'b25add42-0894-43a4-addc-164c3a88fcae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Nursery storage' AND (id != 'b25add42-0894-43a4-addc-164c3a88fcae');
UPDATE business_categories SET "parentId" = 'b25add42-0894-43a4-addc-164c3a88fcae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Rhinestones & decorations' AND (id != 'b25add42-0894-43a4-addc-164c3a88fcae');
UPDATE business_categories SET "parentId" = 'b25add42-0894-43a4-addc-164c3a88fcae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Shoe diy decorations' AND (id != 'b25add42-0894-43a4-addc-164c3a88fcae');
UPDATE business_categories SET "parentId" = 'b25add42-0894-43a4-addc-164c3a88fcae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Vases & vase accessories' AND (id != 'b25add42-0894-43a4-addc-164c3a88fcae');
UPDATE business_categories SET "parentId" = 'b25add42-0894-43a4-addc-164c3a88fcae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Wall Textile' AND (id != 'b25add42-0894-43a4-addc-164c3a88fcae');
UPDATE business_categories SET "parentId" = 'b25add42-0894-43a4-addc-164c3a88fcae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Wall clocks' AND (id != 'b25add42-0894-43a4-addc-164c3a88fcae');
UPDATE business_categories SET "parentId" = 'b25add42-0894-43a4-addc-164c3a88fcae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Wall hanging' AND (id != 'b25add42-0894-43a4-addc-164c3a88fcae');
UPDATE business_categories SET "parentId" = 'b25add42-0894-43a4-addc-164c3a88fcae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Wind chimes & hanging decorations' AND (id != 'b25add42-0894-43a4-addc-164c3a88fcae');
UPDATE business_categories SET "parentId" = 'b25add42-0894-43a4-addc-164c3a88fcae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Window stickers & films' AND (id != 'b25add42-0894-43a4-addc-164c3a88fcae');
UPDATE business_categories SET "parentId" = 'b25add42-0894-43a4-addc-164c3a88fcae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Window valance' AND (id != 'b25add42-0894-43a4-addc-164c3a88fcae');

-- Cleaning and Safety (21)
UPDATE business_categories SET "parentId" = 'c12abc5a-e602-44fa-a2ae-23c1f7536daf', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'All-purpose cleaner' AND (id != 'c12abc5a-e602-44fa-a2ae-23c1f7536daf');
UPDATE business_categories SET "parentId" = 'c12abc5a-e602-44fa-a2ae-23c1f7536daf', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Cleaning Cloth' AND (id != 'c12abc5a-e602-44fa-a2ae-23c1f7536daf');
UPDATE business_categories SET "parentId" = 'c12abc5a-e602-44fa-a2ae-23c1f7536daf', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Cleaning kits' AND (id != 'c12abc5a-e602-44fa-a2ae-23c1f7536daf');
UPDATE business_categories SET "parentId" = 'c12abc5a-e602-44fa-a2ae-23c1f7536daf', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Cleaning spray bottle' AND (id != 'c12abc5a-e602-44fa-a2ae-23c1f7536daf');
UPDATE business_categories SET "parentId" = 'c12abc5a-e602-44fa-a2ae-23c1f7536daf', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Countertop & hanging trash cans' AND (id != 'c12abc5a-e602-44fa-a2ae-23c1f7536daf');
UPDATE business_categories SET "parentId" = 'c12abc5a-e602-44fa-a2ae-23c1f7536daf', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Daily protective equipment' AND (id != 'c12abc5a-e602-44fa-a2ae-23c1f7536daf');
UPDATE business_categories SET "parentId" = 'c12abc5a-e602-44fa-a2ae-23c1f7536daf', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Facial cleaning tools' AND (id != 'c12abc5a-e602-44fa-a2ae-23c1f7536daf');
UPDATE business_categories SET "parentId" = 'c12abc5a-e602-44fa-a2ae-23c1f7536daf', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Household cleaning & personal care' AND (id != 'c12abc5a-e602-44fa-a2ae-23c1f7536daf');
UPDATE business_categories SET "parentId" = 'c12abc5a-e602-44fa-a2ae-23c1f7536daf', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Household cleaning protections' AND (id != 'c12abc5a-e602-44fa-a2ae-23c1f7536daf');
UPDATE business_categories SET "parentId" = 'c12abc5a-e602-44fa-a2ae-23c1f7536daf', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Household cleaning tools' AND (id != 'c12abc5a-e602-44fa-a2ae-23c1f7536daf');
UPDATE business_categories SET "parentId" = 'c12abc5a-e602-44fa-a2ae-23c1f7536daf', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Household gloves' AND (id != 'c12abc5a-e602-44fa-a2ae-23c1f7536daf');
UPDATE business_categories SET "parentId" = 'c12abc5a-e602-44fa-a2ae-23c1f7536daf', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Janitorial & sanitation supplies' AND (id != 'c12abc5a-e602-44fa-a2ae-23c1f7536daf');
UPDATE business_categories SET "parentId" = 'c12abc5a-e602-44fa-a2ae-23c1f7536daf', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Safety' AND (id != 'c12abc5a-e602-44fa-a2ae-23c1f7536daf');
UPDATE business_categories SET "parentId" = 'c12abc5a-e602-44fa-a2ae-23c1f7536daf', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Tissue' AND (id != 'c12abc5a-e602-44fa-a2ae-23c1f7536daf');
UPDATE business_categories SET "parentId" = 'c12abc5a-e602-44fa-a2ae-23c1f7536daf', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Tissue storage' AND (id != 'c12abc5a-e602-44fa-a2ae-23c1f7536daf');
UPDATE business_categories SET "parentId" = 'c12abc5a-e602-44fa-a2ae-23c1f7536daf', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Tissue, paper napkins & toilet paper' AND (id != 'c12abc5a-e602-44fa-a2ae-23c1f7536daf');
UPDATE business_categories SET "parentId" = 'c12abc5a-e602-44fa-a2ae-23c1f7536daf', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Tisuue' AND (id != 'c12abc5a-e602-44fa-a2ae-23c1f7536daf');
UPDATE business_categories SET "parentId" = 'c12abc5a-e602-44fa-a2ae-23c1f7536daf', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Trash cans & recycling containers' AND (id != 'c12abc5a-e602-44fa-a2ae-23c1f7536daf');
UPDATE business_categories SET "parentId" = 'c12abc5a-e602-44fa-a2ae-23c1f7536daf', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Warning & Emergency' AND (id != 'c12abc5a-e602-44fa-a2ae-23c1f7536daf');
UPDATE business_categories SET "parentId" = 'c12abc5a-e602-44fa-a2ae-23c1f7536daf', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Wet wipes' AND (id != 'c12abc5a-e602-44fa-a2ae-23c1f7536daf');
UPDATE business_categories SET "parentId" = 'c12abc5a-e602-44fa-a2ae-23c1f7536daf', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Wipes' AND (id != 'c12abc5a-e602-44fa-a2ae-23c1f7536daf');

-- Colours and Styles (40)
UPDATE business_categories SET "parentId" = '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'All black' AND (id != '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810');
UPDATE business_categories SET "parentId" = '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'All white' AND (id != '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810');
UPDATE business_categories SET "parentId" = '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Blue' AND (id != '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810');
UPDATE business_categories SET "parentId" = '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bohemian' AND (id != '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810');
UPDATE business_categories SET "parentId" = '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Casual' AND (id != '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810');
UPDATE business_categories SET "parentId" = '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Casual Shoes' AND (id != '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810');
UPDATE business_categories SET "parentId" = '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Casual dresses' AND (id != '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810');
UPDATE business_categories SET "parentId" = '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Cultured pearl' AND (id != '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810');
UPDATE business_categories SET "parentId" = '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Cute' AND (id != '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810');
UPDATE business_categories SET "parentId" = '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Daily & casual' AND (id != '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810');
UPDATE business_categories SET "parentId" = '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Daily needs' AND (id != '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810');
UPDATE business_categories SET "parentId" = '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Daily shoe accessories' AND (id != '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810');
UPDATE business_categories SET "parentId" = '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Elegant' AND (id != '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810');
UPDATE business_categories SET "parentId" = '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Elegant dresses' AND (id != '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810');
UPDATE business_categories SET "parentId" = '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Floral' AND (id != '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810');
UPDATE business_categories SET "parentId" = '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Formal & Event Wear' AND (id != '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810');
UPDATE business_categories SET "parentId" = '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Formal & evening dresses' AND (id != '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810');
UPDATE business_categories SET "parentId" = '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Formal Shoes' AND (id != '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810');
UPDATE business_categories SET "parentId" = '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Formal black dresses' AND (id != '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810');
UPDATE business_categories SET "parentId" = '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Formal casual' AND (id != '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810');
UPDATE business_categories SET "parentId" = '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Funny & cute' AND (id != '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810');
UPDATE business_categories SET "parentId" = '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Green' AND (id != '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810');
UPDATE business_categories SET "parentId" = '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Lace' AND (id != '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810');
UPDATE business_categories SET "parentId" = '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Leather' AND (id != '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810');
UPDATE business_categories SET "parentId" = '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Orange' AND (id != '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810');
UPDATE business_categories SET "parentId" = '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pink Flower' AND (id != '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810');
UPDATE business_categories SET "parentId" = '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Rainbow' AND (id != '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810');
UPDATE business_categories SET "parentId" = '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Satin' AND (id != '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810');
UPDATE business_categories SET "parentId" = '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Semi-formal dresses' AND (id != '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810');
UPDATE business_categories SET "parentId" = '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Street' AND (id != '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810');
UPDATE business_categories SET "parentId" = '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Streetwear' AND (id != '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810');
UPDATE business_categories SET "parentId" = '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Suits & Formalwear' AND (id != '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810');
UPDATE business_categories SET "parentId" = '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Vintage' AND (id != '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810');
UPDATE business_categories SET "parentId" = '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Work' AND (id != '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810');
UPDATE business_categories SET "parentId" = '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Work Light' AND (id != '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810');
UPDATE business_categories SET "parentId" = '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Working Hats' AND (id != '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810');
UPDATE business_categories SET "parentId" = '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Workplace' AND (id != '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810');
UPDATE business_categories SET "parentId" = '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Workwear' AND (id != '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810');
UPDATE business_categories SET "parentId" = '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Yellow' AND (id != '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810');
UPDATE business_categories SET "parentId" = '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Youth & cute' AND (id != '3fcbe9c0-565e-4d3a-8f7d-9dfcf3b96810');

-- Intimates and Sleepwear (67)
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'All Brands' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Basic tops & thermal underwear' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Boxers' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Boys Sleepwear' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bra & panty sets' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Braa' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Brands' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Brands we love' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bras & bralettes' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Brass instruments' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Briefs' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Cheeky' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Corsets & shapewear' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Extremely sexy' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Fashion brands' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Girls Sleepwear' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Girls Underwear & Essentials' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'High cut' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'High waist' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Hipsters' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Intimates' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Intimates & Shapewear' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Lingerie' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Lingerie accessories' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Loungewear bottoms' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Loungewear onepieces' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Loungewear robes' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Loungewear sets' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Loungewear tops' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Men loungewear' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Men''s Underwaer Boxer' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Men''s loungewear' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Men''s underwear' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Micro bra' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Night Dress' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Nightwear' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pajama sets' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pajamas' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Panties' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet pajamas' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Push up' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Robes & robe sets' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Seamless' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sexy' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sexy lingerie' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sexy lingerie & cosplay' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sexy underwear & costumes' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Shapewear' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sheer panels' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sleep & lounge' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sleepwear' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sleepwear & Loungewear' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Socks & lingerie accessories' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Thong & Jock Strap' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Thongs' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Toddler Sleepwear' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Training & Underwear' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Trunks' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Underwear' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Underwear & Loungewear' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Underwear & sleepwear' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Underwear & socks organizing' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Underwear Accessories' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Underwire' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'V-strings' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Vibrators' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');
UPDATE business_categories SET "parentId" = '0eda637d-b534-40fa-82f1-2615b9d5ba60', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women corset belts' AND (id != '0eda637d-b534-40fa-82f1-2615b9d5ba60');

-- Jewelry and Watches (75)
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Ankle chain' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bead style charms' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Beaded necklaces' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Beading & jewelry making' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bib necklaces' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Body chains' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Body jewelry' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bracelets' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Brooches' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Buttons & pins' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Chain necklaces' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Chokers' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Commemorative Pet Necklaces' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Couple watches' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Crystal jewelry' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Customized earrings' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Customized fashion jewelry' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Customized fine jewelry' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Customized jewelry' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Customized necklaces' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Dangle earrings' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Ear cuffs' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Ear wraps' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Earings' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Earings Sets' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Earring sets' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Earrings' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Fine earrings' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Fine jewelry gifts' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Fine jewelry making' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Fine necklaces' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Fine rings' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Foot jewelry' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Head & face jewelry' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Hoop earrings' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Jewelry & Watch Gifts' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Jewelry & watches' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Jewelry Storage' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Jewelry boxes & organizers' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Jewelry displays' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Jewelry findings & components' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Jewelry making & jewelry storage' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Jewelry making kit' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Jewelry sets' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Jewelry tools & equipment' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Layered necklaces' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Long necklaces' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Mail & shipping supplies' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Men jewelry' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Men''s digital watches' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Men''s fashion jewelry' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Men''s mechanical watches' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Men''s quartz watches' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Men''s watch sets' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Necklace sets' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Necklaces' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Other women''s jewelry' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pendant necklaces' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pendants & charms' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet necklaces' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pins & tacks' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pocket & fob watches' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Ringing toys' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Rings' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Stud earrings' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Summer & spring' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Watch Accessories Sets' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Watch boxes' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Watchbands' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Watches & accessories' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Watches & accs' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Wedding jewelry' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women jewelry & accs' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s earrings' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');
UPDATE business_categories SET "parentId" = 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s necklaces' AND (id != 'ad4a3b1b-4821-4d2c-8e73-41f52a5703c7');

-- General Apparel Collections (8)
UPDATE business_categories SET "parentId" = '3ec886e4-13d5-4a50-a9e9-33981da9555f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Apparel' AND (id != '3ec886e4-13d5-4a50-a9e9-33981da9555f');
UPDATE business_categories SET "parentId" = '3ec886e4-13d5-4a50-a9e9-33981da9555f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Apparel sewing & fabric' AND (id != '3ec886e4-13d5-4a50-a9e9-33981da9555f');
UPDATE business_categories SET "parentId" = '3ec886e4-13d5-4a50-a9e9-33981da9555f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Contemporary Fashion Collection' AND (id != '3ec886e4-13d5-4a50-a9e9-33981da9555f');
UPDATE business_categories SET "parentId" = '3ec886e4-13d5-4a50-a9e9-33981da9555f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Everyday Basics Collection' AND (id != '3ec886e4-13d5-4a50-a9e9-33981da9555f');
UPDATE business_categories SET "parentId" = '3ec886e4-13d5-4a50-a9e9-33981da9555f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Everyday Contemporary Fashion Collection' AND (id != '3ec886e4-13d5-4a50-a9e9-33981da9555f');
UPDATE business_categories SET "parentId" = '3ec886e4-13d5-4a50-a9e9-33981da9555f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'General Apparel Collection' AND (id != '3ec886e4-13d5-4a50-a9e9-33981da9555f');
UPDATE business_categories SET "parentId" = '3ec886e4-13d5-4a50-a9e9-33981da9555f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Unisex Apparel Collection' AND (id != '3ec886e4-13d5-4a50-a9e9-33981da9555f');
UPDATE business_categories SET "parentId" = '3ec886e4-13d5-4a50-a9e9-33981da9555f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'World apparel' AND (id != '3ec886e4-13d5-4a50-a9e9-33981da9555f');

-- Fish, Aquarium, Birds and Farm Animals (15)
UPDATE business_categories SET "parentId" = '26966690-9049-40d5-8ec0-0d13fdf4a131', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Aquarium Substrate' AND (id != '26966690-9049-40d5-8ec0-0d13fdf4a131');
UPDATE business_categories SET "parentId" = '26966690-9049-40d5-8ec0-0d13fdf4a131', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Aquarium decorations' AND (id != '26966690-9049-40d5-8ec0-0d13fdf4a131');
UPDATE business_categories SET "parentId" = '26966690-9049-40d5-8ec0-0d13fdf4a131', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bird cages & accessories' AND (id != '26966690-9049-40d5-8ec0-0d13fdf4a131');
UPDATE business_categories SET "parentId" = '26966690-9049-40d5-8ec0-0d13fdf4a131', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bird feeding' AND (id != '26966690-9049-40d5-8ec0-0d13fdf4a131');
UPDATE business_categories SET "parentId" = '26966690-9049-40d5-8ec0-0d13fdf4a131', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bird grooming & baths' AND (id != '26966690-9049-40d5-8ec0-0d13fdf4a131');
UPDATE business_categories SET "parentId" = '26966690-9049-40d5-8ec0-0d13fdf4a131', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bird houses & nests' AND (id != '26966690-9049-40d5-8ec0-0d13fdf4a131');
UPDATE business_categories SET "parentId" = '26966690-9049-40d5-8ec0-0d13fdf4a131', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bird supplies' AND (id != '26966690-9049-40d5-8ec0-0d13fdf4a131');
UPDATE business_categories SET "parentId" = '26966690-9049-40d5-8ec0-0d13fdf4a131', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bird toys' AND (id != '26966690-9049-40d5-8ec0-0d13fdf4a131');
UPDATE business_categories SET "parentId" = '26966690-9049-40d5-8ec0-0d13fdf4a131', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Farm Animal Carriers' AND (id != '26966690-9049-40d5-8ec0-0d13fdf4a131');
UPDATE business_categories SET "parentId" = '26966690-9049-40d5-8ec0-0d13fdf4a131', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Farm Animal Feeding & Watering Supplies' AND (id != '26966690-9049-40d5-8ec0-0d13fdf4a131');
UPDATE business_categories SET "parentId" = '26966690-9049-40d5-8ec0-0d13fdf4a131', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Farm animal supplies' AND (id != '26966690-9049-40d5-8ec0-0d13fdf4a131');
UPDATE business_categories SET "parentId" = '26966690-9049-40d5-8ec0-0d13fdf4a131', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Fish & aquarium supplies' AND (id != '26966690-9049-40d5-8ec0-0d13fdf4a131');
UPDATE business_categories SET "parentId" = '26966690-9049-40d5-8ec0-0d13fdf4a131', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Fish cleaning tools' AND (id != '26966690-9049-40d5-8ec0-0d13fdf4a131');
UPDATE business_categories SET "parentId" = '26966690-9049-40d5-8ec0-0d13fdf4a131', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Small animal cages & houses' AND (id != '26966690-9049-40d5-8ec0-0d13fdf4a131');
UPDATE business_categories SET "parentId" = '26966690-9049-40d5-8ec0-0d13fdf4a131', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Small animal supplies' AND (id != '26966690-9049-40d5-8ec0-0d13fdf4a131');

-- Bedding and Textiles (61)
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Area rugs & sets' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bath mats' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bath pillows' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bath towel sets' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bathing Towels Big' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bed pillows' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bed skirt pins & clips' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bed skirts' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bedding' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Big Bathing Towel' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Blackout curtains & shades' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Blankets' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Blankets & Throws' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Body pillows' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Carpet' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Carpet padding & grippers' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Comforter sets' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Compressed towels' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Curtain tracks & accessories' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Curtains' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Cushion cover' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Decorative & throw pillows' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Dish Towels Small' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Dish cloths & dish towels' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Door mats' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Duvet covers' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Duvets & down comforters' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Fitted sheets' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Fleese Towel' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Hand towels' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Inflatable pillows' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids bath towels' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kitchen window curtains' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Latex pillows' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Lumbar Pillow & Chair Cushions' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Mattress pads' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Mattress protectors & encasements' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Mattress toppers' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Memory foam pillows' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Microfiber towels' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Nap pillows' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Neck & cervical pillows' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Nursery blankets' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Other function pillows & positioners' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet bedding' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pillowcases & shams' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Quick dry towels & cooling towels' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Quilt sets' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Reading & bed rest pillows' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Rugs & Carpets' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Runner rugs' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sheet sets with pillowcases' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Small Blanket' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Throws' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Towels' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Towels & Towel Sets' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Wearable blankets' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Weighted blankets' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Window Treatments' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Window treatments' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');
UPDATE business_categories SET "parentId" = '043666f5-321b-4f40-86e9-498e3706d4ae', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Windproof quilts' AND (id != '043666f5-321b-4f40-86e9-498e3706d4ae');

-- Skin and Body Care (22)
UPDATE business_categories SET "parentId" = '7330f6c8-fd07-42a8-b4c9-c5c3162c3c82', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Aromatherapy' AND (id != '7330f6c8-fd07-42a8-b4c9-c5c3162c3c82');
UPDATE business_categories SET "parentId" = '7330f6c8-fd07-42a8-b4c9-c5c3162c3c82', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Aromatherapy essential oils' AND (id != '7330f6c8-fd07-42a8-b4c9-c5c3162c3c82');
UPDATE business_categories SET "parentId" = '7330f6c8-fd07-42a8-b4c9-c5c3162c3c82', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bath &shower Gel' AND (id != '7330f6c8-fd07-42a8-b4c9-c5c3162c3c82');
UPDATE business_categories SET "parentId" = '7330f6c8-fd07-42a8-b4c9-c5c3162c3c82', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Beauty & body care appliances' AND (id != '7330f6c8-fd07-42a8-b4c9-c5c3162c3c82');
UPDATE business_categories SET "parentId" = '7330f6c8-fd07-42a8-b4c9-c5c3162c3c82', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Beauty tools' AND (id != '7330f6c8-fd07-42a8-b4c9-c5c3162c3c82');
UPDATE business_categories SET "parentId" = '7330f6c8-fd07-42a8-b4c9-c5c3162c3c82', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Body Spry' AND (id != '7330f6c8-fd07-42a8-b4c9-c5c3162c3c82');
UPDATE business_categories SET "parentId" = '7330f6c8-fd07-42a8-b4c9-c5c3162c3c82', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Body anti-friction pads' AND (id != '7330f6c8-fd07-42a8-b4c9-c5c3162c3c82');
UPDATE business_categories SET "parentId" = '7330f6c8-fd07-42a8-b4c9-c5c3162c3c82', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Body care' AND (id != '7330f6c8-fd07-42a8-b4c9-c5c3162c3c82');
UPDATE business_categories SET "parentId" = '7330f6c8-fd07-42a8-b4c9-c5c3162c3c82', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Body care tools' AND (id != '7330f6c8-fd07-42a8-b4c9-c5c3162c3c82');
UPDATE business_categories SET "parentId" = '7330f6c8-fd07-42a8-b4c9-c5c3162c3c82', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Body deodorant' AND (id != '7330f6c8-fd07-42a8-b4c9-c5c3162c3c82');
UPDATE business_categories SET "parentId" = '7330f6c8-fd07-42a8-b4c9-c5c3162c3c82', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Face Wash' AND (id != '7330f6c8-fd07-42a8-b4c9-c5c3162c3c82');
UPDATE business_categories SET "parentId" = '7330f6c8-fd07-42a8-b4c9-c5c3162c3c82', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Foot & hand care tools' AND (id != '7330f6c8-fd07-42a8-b4c9-c5c3162c3c82');
UPDATE business_categories SET "parentId" = '7330f6c8-fd07-42a8-b4c9-c5c3162c3c82', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Fragrances & aromatherapy' AND (id != '7330f6c8-fd07-42a8-b4c9-c5c3162c3c82');
UPDATE business_categories SET "parentId" = '7330f6c8-fd07-42a8-b4c9-c5c3162c3c82', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Lotion' AND (id != '7330f6c8-fd07-42a8-b4c9-c5c3162c3c82');
UPDATE business_categories SET "parentId" = '7330f6c8-fd07-42a8-b4c9-c5c3162c3c82', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Lotion Motion' AND (id != '7330f6c8-fd07-42a8-b4c9-c5c3162c3c82');
UPDATE business_categories SET "parentId" = '7330f6c8-fd07-42a8-b4c9-c5c3162c3c82', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Nail,Hand & Foot Care' AND (id != '7330f6c8-fd07-42a8-b4c9-c5c3162c3c82');
UPDATE business_categories SET "parentId" = '7330f6c8-fd07-42a8-b4c9-c5c3162c3c82', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Perfume' AND (id != '7330f6c8-fd07-42a8-b4c9-c5c3162c3c82');
UPDATE business_categories SET "parentId" = '7330f6c8-fd07-42a8-b4c9-c5c3162c3c82', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Perfume Spry' AND (id != '7330f6c8-fd07-42a8-b4c9-c5c3162c3c82');
UPDATE business_categories SET "parentId" = '7330f6c8-fd07-42a8-b4c9-c5c3162c3c82', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Perfume picks' AND (id != '7330f6c8-fd07-42a8-b4c9-c5c3162c3c82');
UPDATE business_categories SET "parentId" = '7330f6c8-fd07-42a8-b4c9-c5c3162c3c82', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Personal care' AND (id != '7330f6c8-fd07-42a8-b4c9-c5c3162c3c82');
UPDATE business_categories SET "parentId" = '7330f6c8-fd07-42a8-b4c9-c5c3162c3c82', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Personal care and cleaning tools' AND (id != '7330f6c8-fd07-42a8-b4c9-c5c3162c3c82');
UPDATE business_categories SET "parentId" = '7330f6c8-fd07-42a8-b4c9-c5c3162c3c82', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Skin care' AND (id != '7330f6c8-fd07-42a8-b4c9-c5c3162c3c82');

-- Arts and Crafts (44)
UPDATE business_categories SET "parentId" = 'e88758ef-01d3-4503-be52-6a81787c411d', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Art supplies' AND (id != 'e88758ef-01d3-4503-be52-6a81787c411d');
UPDATE business_categories SET "parentId" = 'e88758ef-01d3-4503-be52-6a81787c411d', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Arts accessories' AND (id != 'e88758ef-01d3-4503-be52-6a81787c411d');
UPDATE business_categories SET "parentId" = 'e88758ef-01d3-4503-be52-6a81787c411d', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Beads' AND (id != 'e88758ef-01d3-4503-be52-6a81787c411d');
UPDATE business_categories SET "parentId" = 'e88758ef-01d3-4503-be52-6a81787c411d', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Beads Mixed Colors' AND (id != 'e88758ef-01d3-4503-be52-6a81787c411d');
UPDATE business_categories SET "parentId" = 'e88758ef-01d3-4503-be52-6a81787c411d', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Button & badge making' AND (id != 'e88758ef-01d3-4503-be52-6a81787c411d');
UPDATE business_categories SET "parentId" = 'e88758ef-01d3-4503-be52-6a81787c411d', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Cake decorating supplies' AND (id != 'e88758ef-01d3-4503-be52-6a81787c411d');
UPDATE business_categories SET "parentId" = 'e88758ef-01d3-4503-be52-6a81787c411d', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Candle making' AND (id != 'e88758ef-01d3-4503-be52-6a81787c411d');
UPDATE business_categories SET "parentId" = 'e88758ef-01d3-4503-be52-6a81787c411d', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Candles & crystals' AND (id != 'e88758ef-01d3-4503-be52-6a81787c411d');
UPDATE business_categories SET "parentId" = 'e88758ef-01d3-4503-be52-6a81787c411d', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Crafting' AND (id != 'e88758ef-01d3-4503-be52-6a81787c411d');
UPDATE business_categories SET "parentId" = 'e88758ef-01d3-4503-be52-6a81787c411d', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Crochet' AND (id != 'e88758ef-01d3-4503-be52-6a81787c411d');
UPDATE business_categories SET "parentId" = 'e88758ef-01d3-4503-be52-6a81787c411d', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Cross-stitch' AND (id != 'e88758ef-01d3-4503-be52-6a81787c411d');
UPDATE business_categories SET "parentId" = 'e88758ef-01d3-4503-be52-6a81787c411d', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Crystal & Gemstones' AND (id != 'e88758ef-01d3-4503-be52-6a81787c411d');
UPDATE business_categories SET "parentId" = 'e88758ef-01d3-4503-be52-6a81787c411d', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Crystal set' AND (id != 'e88758ef-01d3-4503-be52-6a81787c411d');
UPDATE business_categories SET "parentId" = 'e88758ef-01d3-4503-be52-6a81787c411d', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Crystal shapes & carvings' AND (id != 'e88758ef-01d3-4503-be52-6a81787c411d');
UPDATE business_categories SET "parentId" = 'e88758ef-01d3-4503-be52-6a81787c411d', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Cutting mat' AND (id != 'e88758ef-01d3-4503-be52-6a81787c411d');
UPDATE business_categories SET "parentId" = 'e88758ef-01d3-4503-be52-6a81787c411d', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Cutting supplies' AND (id != 'e88758ef-01d3-4503-be52-6a81787c411d');
UPDATE business_categories SET "parentId" = 'e88758ef-01d3-4503-be52-6a81787c411d', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'DIY Kits' AND (id != 'e88758ef-01d3-4503-be52-6a81787c411d');
UPDATE business_categories SET "parentId" = 'e88758ef-01d3-4503-be52-6a81787c411d', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Decorating fabric' AND (id != 'e88758ef-01d3-4503-be52-6a81787c411d');
UPDATE business_categories SET "parentId" = 'e88758ef-01d3-4503-be52-6a81787c411d', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Diy diamond painting & accessories' AND (id != 'e88758ef-01d3-4503-be52-6a81787c411d');
UPDATE business_categories SET "parentId" = 'e88758ef-01d3-4503-be52-6a81787c411d', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Drafting supplies' AND (id != 'e88758ef-01d3-4503-be52-6a81787c411d');
UPDATE business_categories SET "parentId" = 'e88758ef-01d3-4503-be52-6a81787c411d', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Felt diy craft' AND (id != 'e88758ef-01d3-4503-be52-6a81787c411d');
UPDATE business_categories SET "parentId" = 'e88758ef-01d3-4503-be52-6a81787c411d', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids drawing & painting supplies' AND (id != 'e88758ef-01d3-4503-be52-6a81787c411d');
UPDATE business_categories SET "parentId" = 'e88758ef-01d3-4503-be52-6a81787c411d', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Knitting & crochet supplies' AND (id != 'e88758ef-01d3-4503-be52-6a81787c411d');
UPDATE business_categories SET "parentId" = 'e88758ef-01d3-4503-be52-6a81787c411d', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Laboratory-created moissanite' AND (id != 'e88758ef-01d3-4503-be52-6a81787c411d');
UPDATE business_categories SET "parentId" = 'e88758ef-01d3-4503-be52-6a81787c411d', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Leathercraft' AND (id != 'e88758ef-01d3-4503-be52-6a81787c411d');
UPDATE business_categories SET "parentId" = 'e88758ef-01d3-4503-be52-6a81787c411d', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Liquid glue' AND (id != 'e88758ef-01d3-4503-be52-6a81787c411d');
UPDATE business_categories SET "parentId" = 'e88758ef-01d3-4503-be52-6a81787c411d', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Magnetic materials' AND (id != 'e88758ef-01d3-4503-be52-6a81787c411d');
UPDATE business_categories SET "parentId" = 'e88758ef-01d3-4503-be52-6a81787c411d', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Needle arts & crafts' AND (id != 'e88758ef-01d3-4503-be52-6a81787c411d');
UPDATE business_categories SET "parentId" = 'e88758ef-01d3-4503-be52-6a81787c411d', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Painting & calligraphy' AND (id != 'e88758ef-01d3-4503-be52-6a81787c411d');
UPDATE business_categories SET "parentId" = 'e88758ef-01d3-4503-be52-6a81787c411d', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Painting & drawing supplies' AND (id != 'e88758ef-01d3-4503-be52-6a81787c411d');
UPDATE business_categories SET "parentId" = 'e88758ef-01d3-4503-be52-6a81787c411d', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Palette tools' AND (id != 'e88758ef-01d3-4503-be52-6a81787c411d');
UPDATE business_categories SET "parentId" = 'e88758ef-01d3-4503-be52-6a81787c411d', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Photo album' AND (id != 'e88758ef-01d3-4503-be52-6a81787c411d');
UPDATE business_categories SET "parentId" = 'e88758ef-01d3-4503-be52-6a81787c411d', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Photo albums, frames, & accessories' AND (id != 'e88758ef-01d3-4503-be52-6a81787c411d');
UPDATE business_categories SET "parentId" = 'e88758ef-01d3-4503-be52-6a81787c411d', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Polished crystal' AND (id != 'e88758ef-01d3-4503-be52-6a81787c411d');
UPDATE business_categories SET "parentId" = 'e88758ef-01d3-4503-be52-6a81787c411d', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pottery & ceramics' AND (id != 'e88758ef-01d3-4503-be52-6a81787c411d');
UPDATE business_categories SET "parentId" = 'e88758ef-01d3-4503-be52-6a81787c411d', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Resin DIY & Silicone Molds' AND (id != 'e88758ef-01d3-4503-be52-6a81787c411d');
UPDATE business_categories SET "parentId" = 'e88758ef-01d3-4503-be52-6a81787c411d', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Scrapbooking & stamping suppliers' AND (id != 'e88758ef-01d3-4503-be52-6a81787c411d');
UPDATE business_categories SET "parentId" = 'e88758ef-01d3-4503-be52-6a81787c411d', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sculpture supplies' AND (id != 'e88758ef-01d3-4503-be52-6a81787c411d');
UPDATE business_categories SET "parentId" = 'e88758ef-01d3-4503-be52-6a81787c411d', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sequin' AND (id != 'e88758ef-01d3-4503-be52-6a81787c411d');
UPDATE business_categories SET "parentId" = 'e88758ef-01d3-4503-be52-6a81787c411d', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Silicone Molds' AND (id != 'e88758ef-01d3-4503-be52-6a81787c411d');
UPDATE business_categories SET "parentId" = 'e88758ef-01d3-4503-be52-6a81787c411d', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Soap making' AND (id != 'e88758ef-01d3-4503-be52-6a81787c411d');
UPDATE business_categories SET "parentId" = 'e88758ef-01d3-4503-be52-6a81787c411d', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Stamps & wax seals' AND (id != 'e88758ef-01d3-4503-be52-6a81787c411d');
UPDATE business_categories SET "parentId" = 'e88758ef-01d3-4503-be52-6a81787c411d', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Wood diy & accessories' AND (id != 'e88758ef-01d3-4503-be52-6a81787c411d');
UPDATE business_categories SET "parentId" = 'e88758ef-01d3-4503-be52-6a81787c411d', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Wood diy supplies' AND (id != 'e88758ef-01d3-4503-be52-6a81787c411d');

-- Garden and Outdoor (16)
UPDATE business_categories SET "parentId" = '4e552184-1777-4c5c-8c20-03ca62d53111', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Artificial decorations' AND (id != '4e552184-1777-4c5c-8c20-03ca62d53111');
UPDATE business_categories SET "parentId" = '4e552184-1777-4c5c-8c20-03ca62d53111', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Decorative garden stakes' AND (id != '4e552184-1777-4c5c-8c20-03ca62d53111');
UPDATE business_categories SET "parentId" = '4e552184-1777-4c5c-8c20-03ca62d53111', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Garden picnic suppliers' AND (id != '4e552184-1777-4c5c-8c20-03ca62d53111');
UPDATE business_categories SET "parentId" = '4e552184-1777-4c5c-8c20-03ca62d53111', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Gardening tools' AND (id != '4e552184-1777-4c5c-8c20-03ca62d53111');
UPDATE business_categories SET "parentId" = '4e552184-1777-4c5c-8c20-03ca62d53111', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Mosquito net' AND (id != '4e552184-1777-4c5c-8c20-03ca62d53111');
UPDATE business_categories SET "parentId" = '4e552184-1777-4c5c-8c20-03ca62d53111', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Outdoor & garden' AND (id != '4e552184-1777-4c5c-8c20-03ca62d53111');
UPDATE business_categories SET "parentId" = '4e552184-1777-4c5c-8c20-03ca62d53111', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Outdoor decoration' AND (id != '4e552184-1777-4c5c-8c20-03ca62d53111');
UPDATE business_categories SET "parentId" = '4e552184-1777-4c5c-8c20-03ca62d53111', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Outdoor pillows & cushions' AND (id != '4e552184-1777-4c5c-8c20-03ca62d53111');
UPDATE business_categories SET "parentId" = '4e552184-1777-4c5c-8c20-03ca62d53111', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Patio furniture & accessory' AND (id != '4e552184-1777-4c5c-8c20-03ca62d53111');
UPDATE business_categories SET "parentId" = '4e552184-1777-4c5c-8c20-03ca62d53111', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pest control' AND (id != '4e552184-1777-4c5c-8c20-03ca62d53111');
UPDATE business_categories SET "parentId" = '4e552184-1777-4c5c-8c20-03ca62d53111', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Planters & containers' AND (id != '4e552184-1777-4c5c-8c20-03ca62d53111');
UPDATE business_categories SET "parentId" = '4e552184-1777-4c5c-8c20-03ca62d53111', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pond liners' AND (id != '4e552184-1777-4c5c-8c20-03ca62d53111');
UPDATE business_categories SET "parentId" = '4e552184-1777-4c5c-8c20-03ca62d53111', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pool & yard supplies' AND (id != '4e552184-1777-4c5c-8c20-03ca62d53111');
UPDATE business_categories SET "parentId" = '4e552184-1777-4c5c-8c20-03ca62d53111', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Shade cloth' AND (id != '4e552184-1777-4c5c-8c20-03ca62d53111');
UPDATE business_categories SET "parentId" = '4e552184-1777-4c5c-8c20-03ca62d53111', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Watering & irrigation' AND (id != '4e552184-1777-4c5c-8c20-03ca62d53111');
UPDATE business_categories SET "parentId" = '4e552184-1777-4c5c-8c20-03ca62d53111', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Wreaths & Crowns' AND (id != '4e552184-1777-4c5c-8c20-03ca62d53111');

-- School and Office (49)
UPDATE business_categories SET "parentId" = '84ecad27-65ce-4f56-a989-718ad9ccf032', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Assorted stickers' AND (id != '84ecad27-65ce-4f56-a989-718ad9ccf032');
UPDATE business_categories SET "parentId" = '84ecad27-65ce-4f56-a989-718ad9ccf032', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Back to school' AND (id != '84ecad27-65ce-4f56-a989-718ad9ccf032');
UPDATE business_categories SET "parentId" = '84ecad27-65ce-4f56-a989-718ad9ccf032', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Back to school supplies' AND (id != '84ecad27-65ce-4f56-a989-718ad9ccf032');
UPDATE business_categories SET "parentId" = '84ecad27-65ce-4f56-a989-718ad9ccf032', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Badge holder & accessories' AND (id != '84ecad27-65ce-4f56-a989-718ad9ccf032');
UPDATE business_categories SET "parentId" = '84ecad27-65ce-4f56-a989-718ad9ccf032', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Binders' AND (id != '84ecad27-65ce-4f56-a989-718ad9ccf032');
UPDATE business_categories SET "parentId" = '84ecad27-65ce-4f56-a989-718ad9ccf032', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Book rings & loose leaf binders' AND (id != '84ecad27-65ce-4f56-a989-718ad9ccf032');
UPDATE business_categories SET "parentId" = '84ecad27-65ce-4f56-a989-718ad9ccf032', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bubble mailers' AND (id != '84ecad27-65ce-4f56-a989-718ad9ccf032');
UPDATE business_categories SET "parentId" = '84ecad27-65ce-4f56-a989-718ad9ccf032', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Clipboards' AND (id != '84ecad27-65ce-4f56-a989-718ad9ccf032');
UPDATE business_categories SET "parentId" = '84ecad27-65ce-4f56-a989-718ad9ccf032', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Copy & multipurpose paper' AND (id != '84ecad27-65ce-4f56-a989-718ad9ccf032');
UPDATE business_categories SET "parentId" = '84ecad27-65ce-4f56-a989-718ad9ccf032', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Desk accessories' AND (id != '84ecad27-65ce-4f56-a989-718ad9ccf032');
UPDATE business_categories SET "parentId" = '84ecad27-65ce-4f56-a989-718ad9ccf032', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Desk sets' AND (id != '84ecad27-65ce-4f56-a989-718ad9ccf032');
UPDATE business_categories SET "parentId" = '84ecad27-65ce-4f56-a989-718ad9ccf032', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Desktop bookshelf' AND (id != '84ecad27-65ce-4f56-a989-718ad9ccf032');
UPDATE business_categories SET "parentId" = '84ecad27-65ce-4f56-a989-718ad9ccf032', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Erasers & correction products' AND (id != '84ecad27-65ce-4f56-a989-718ad9ccf032');
UPDATE business_categories SET "parentId" = '84ecad27-65ce-4f56-a989-718ad9ccf032', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Expandable files' AND (id != '84ecad27-65ce-4f56-a989-718ad9ccf032');
UPDATE business_categories SET "parentId" = '84ecad27-65ce-4f56-a989-718ad9ccf032', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'File folder labels' AND (id != '84ecad27-65ce-4f56-a989-718ad9ccf032');
UPDATE business_categories SET "parentId" = '84ecad27-65ce-4f56-a989-718ad9ccf032', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'File trays' AND (id != '84ecad27-65ce-4f56-a989-718ad9ccf032');
UPDATE business_categories SET "parentId" = '84ecad27-65ce-4f56-a989-718ad9ccf032', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Filing products' AND (id != '84ecad27-65ce-4f56-a989-718ad9ccf032');
UPDATE business_categories SET "parentId" = '84ecad27-65ce-4f56-a989-718ad9ccf032', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Filler paper' AND (id != '84ecad27-65ce-4f56-a989-718ad9ccf032');
UPDATE business_categories SET "parentId" = '84ecad27-65ce-4f56-a989-718ad9ccf032', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Hole puncher' AND (id != '84ecad27-65ce-4f56-a989-718ad9ccf032');
UPDATE business_categories SET "parentId" = '84ecad27-65ce-4f56-a989-718ad9ccf032', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids stickers & collage' AND (id != '84ecad27-65ce-4f56-a989-718ad9ccf032');
UPDATE business_categories SET "parentId" = '84ecad27-65ce-4f56-a989-718ad9ccf032', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Label stickers' AND (id != '84ecad27-65ce-4f56-a989-718ad9ccf032');
UPDATE business_categories SET "parentId" = '84ecad27-65ce-4f56-a989-718ad9ccf032', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Markers & highlighters' AND (id != '84ecad27-65ce-4f56-a989-718ad9ccf032');
UPDATE business_categories SET "parentId" = '84ecad27-65ce-4f56-a989-718ad9ccf032', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Material paper' AND (id != '84ecad27-65ce-4f56-a989-718ad9ccf032');
UPDATE business_categories SET "parentId" = '84ecad27-65ce-4f56-a989-718ad9ccf032', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Memo pads' AND (id != '84ecad27-65ce-4f56-a989-718ad9ccf032');
UPDATE business_categories SET "parentId" = '84ecad27-65ce-4f56-a989-718ad9ccf032', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Multi-function pens' AND (id != '84ecad27-65ce-4f56-a989-718ad9ccf032');
UPDATE business_categories SET "parentId" = '84ecad27-65ce-4f56-a989-718ad9ccf032', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Nail art stickers & decals' AND (id != '84ecad27-65ce-4f56-a989-718ad9ccf032');
UPDATE business_categories SET "parentId" = '84ecad27-65ce-4f56-a989-718ad9ccf032', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Notebooks' AND (id != '84ecad27-65ce-4f56-a989-718ad9ccf032');
UPDATE business_categories SET "parentId" = '84ecad27-65ce-4f56-a989-718ad9ccf032', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Notebooks & writing pads' AND (id != '84ecad27-65ce-4f56-a989-718ad9ccf032');
UPDATE business_categories SET "parentId" = '84ecad27-65ce-4f56-a989-718ad9ccf032', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Office & school supplies' AND (id != '84ecad27-65ce-4f56-a989-718ad9ccf032');
UPDATE business_categories SET "parentId" = '84ecad27-65ce-4f56-a989-718ad9ccf032', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Office accessories' AND (id != '84ecad27-65ce-4f56-a989-718ad9ccf032');
UPDATE business_categories SET "parentId" = '84ecad27-65ce-4f56-a989-718ad9ccf032', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Office binding supplies' AND (id != '84ecad27-65ce-4f56-a989-718ad9ccf032');
UPDATE business_categories SET "parentId" = '84ecad27-65ce-4f56-a989-718ad9ccf032', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Office calculators' AND (id != '84ecad27-65ce-4f56-a989-718ad9ccf032');
UPDATE business_categories SET "parentId" = '84ecad27-65ce-4f56-a989-718ad9ccf032', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Office electronics' AND (id != '84ecad27-65ce-4f56-a989-718ad9ccf032');
UPDATE business_categories SET "parentId" = '84ecad27-65ce-4f56-a989-718ad9ccf032', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Paper' AND (id != '84ecad27-65ce-4f56-a989-718ad9ccf032');
UPDATE business_categories SET "parentId" = '84ecad27-65ce-4f56-a989-718ad9ccf032', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Paper envelopes' AND (id != '84ecad27-65ce-4f56-a989-718ad9ccf032');
UPDATE business_categories SET "parentId" = '84ecad27-65ce-4f56-a989-718ad9ccf032', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pastel paper' AND (id != '84ecad27-65ce-4f56-a989-718ad9ccf032');
UPDATE business_categories SET "parentId" = '84ecad27-65ce-4f56-a989-718ad9ccf032', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pen,pencil & marker cases' AND (id != '84ecad27-65ce-4f56-a989-718ad9ccf032');
UPDATE business_categories SET "parentId" = '84ecad27-65ce-4f56-a989-718ad9ccf032', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pencil sharpener' AND (id != '84ecad27-65ce-4f56-a989-718ad9ccf032');
UPDATE business_categories SET "parentId" = '84ecad27-65ce-4f56-a989-718ad9ccf032', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pencils' AND (id != '84ecad27-65ce-4f56-a989-718ad9ccf032');
UPDATE business_categories SET "parentId" = '84ecad27-65ce-4f56-a989-718ad9ccf032', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pens & refills' AND (id != '84ecad27-65ce-4f56-a989-718ad9ccf032');
UPDATE business_categories SET "parentId" = '84ecad27-65ce-4f56-a989-718ad9ccf032', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Planners' AND (id != '84ecad27-65ce-4f56-a989-718ad9ccf032');
UPDATE business_categories SET "parentId" = '84ecad27-65ce-4f56-a989-718ad9ccf032', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'School & educational supplies' AND (id != '84ecad27-65ce-4f56-a989-718ad9ccf032');
UPDATE business_categories SET "parentId" = '84ecad27-65ce-4f56-a989-718ad9ccf032', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Stapler & staples' AND (id != '84ecad27-65ce-4f56-a989-718ad9ccf032');
UPDATE business_categories SET "parentId" = '84ecad27-65ce-4f56-a989-718ad9ccf032', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Stationery gift sets' AND (id != '84ecad27-65ce-4f56-a989-718ad9ccf032');
UPDATE business_categories SET "parentId" = '84ecad27-65ce-4f56-a989-718ad9ccf032', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Stationery stickers' AND (id != '84ecad27-65ce-4f56-a989-718ad9ccf032');
UPDATE business_categories SET "parentId" = '84ecad27-65ce-4f56-a989-718ad9ccf032', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sticky notes' AND (id != '84ecad27-65ce-4f56-a989-718ad9ccf032');
UPDATE business_categories SET "parentId" = '84ecad27-65ce-4f56-a989-718ad9ccf032', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Teaching resources & accessories' AND (id != '84ecad27-65ce-4f56-a989-718ad9ccf032');
UPDATE business_categories SET "parentId" = '84ecad27-65ce-4f56-a989-718ad9ccf032', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Writing & correction supplies' AND (id != '84ecad27-65ce-4f56-a989-718ad9ccf032');
UPDATE business_categories SET "parentId" = '84ecad27-65ce-4f56-a989-718ad9ccf032', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'school supplies' AND (id != '84ecad27-65ce-4f56-a989-718ad9ccf032');

-- Shoes and Footwear (54)
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Athletic shoes' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Boots' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Boys Footwear' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Clogs' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Flats' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Footwear' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Girls Footwear' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Heels' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Home slippers' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'INFLATION' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Infant boots' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Infant flats' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Infant sandals & slippers' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Infant sneakers' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Inflatable bed pumps' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Insole' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Men flip flops & slides' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Men loafers' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Men sandals' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Men sneakers' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Men''s Footwear' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Men''s outdoor athletic shoes' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pumps' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sandals' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Shoe Polish' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Shoe accessories' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Shoe care & tools' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Shoe organizers' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Shoer Cap' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Shoes' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Shoes & accessories' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Shoes Timberland' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Slippers' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sneakers' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Snow boots' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sport shoes' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Toddler Footwear' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Water shoes' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Winter Shoes' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women ankle boots & booties' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women equestrian boots & western boots' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women flat sandals' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women flip-flops' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women heeled sandals' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women home slippers' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women knee-high boots' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women mid-calf boots' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women over-the-knee boots' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women platforms & wedge sandals' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women shoes' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women slides' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women sports sandals' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women wedge sneakers' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');
UPDATE business_categories SET "parentId" = '5c2dc356-63b6-4b1e-be2e-425cad712918', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Footwear' AND (id != '5c2dc356-63b6-4b1e-be2e-425cad712918');

-- Automotive (21)
UPDATE business_categories SET "parentId" = '23015f08-c0f8-481a-995e-47caf540971f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Automotive' AND (id != '23015f08-c0f8-481a-995e-47caf540971f');
UPDATE business_categories SET "parentId" = '23015f08-c0f8-481a-995e-47caf540971f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Automotive cushions' AND (id != '23015f08-c0f8-481a-995e-47caf540971f');
UPDATE business_categories SET "parentId" = '23015f08-c0f8-481a-995e-47caf540971f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Automotive exterior accessories' AND (id != '23015f08-c0f8-481a-995e-47caf540971f');
UPDATE business_categories SET "parentId" = '23015f08-c0f8-481a-995e-47caf540971f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Automotive mats' AND (id != '23015f08-c0f8-481a-995e-47caf540971f');
UPDATE business_categories SET "parentId" = '23015f08-c0f8-481a-995e-47caf540971f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Car audio' AND (id != '23015f08-c0f8-481a-995e-47caf540971f');
UPDATE business_categories SET "parentId" = '23015f08-c0f8-481a-995e-47caf540971f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Car battery charger' AND (id != '23015f08-c0f8-481a-995e-47caf540971f');
UPDATE business_categories SET "parentId" = '23015f08-c0f8-481a-995e-47caf540971f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Car charger' AND (id != '23015f08-c0f8-481a-995e-47caf540971f');
UPDATE business_categories SET "parentId" = '23015f08-c0f8-481a-995e-47caf540971f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Car diagnostic tools' AND (id != '23015f08-c0f8-481a-995e-47caf540971f');
UPDATE business_categories SET "parentId" = '23015f08-c0f8-481a-995e-47caf540971f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Car electrical appliances' AND (id != '23015f08-c0f8-481a-995e-47caf540971f');
UPDATE business_categories SET "parentId" = '23015f08-c0f8-481a-995e-47caf540971f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Car electronics' AND (id != '23015f08-c0f8-481a-995e-47caf540971f');
UPDATE business_categories SET "parentId" = '23015f08-c0f8-481a-995e-47caf540971f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Car holders' AND (id != '23015f08-c0f8-481a-995e-47caf540971f');
UPDATE business_categories SET "parentId" = '23015f08-c0f8-481a-995e-47caf540971f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Car intelligence system' AND (id != '23015f08-c0f8-481a-995e-47caf540971f');
UPDATE business_categories SET "parentId" = '23015f08-c0f8-481a-995e-47caf540971f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Car lights' AND (id != '23015f08-c0f8-481a-995e-47caf540971f');
UPDATE business_categories SET "parentId" = '23015f08-c0f8-481a-995e-47caf540971f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Car replacement parts' AND (id != '23015f08-c0f8-481a-995e-47caf540971f');
UPDATE business_categories SET "parentId" = '23015f08-c0f8-481a-995e-47caf540971f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Car seats & accessories' AND (id != '23015f08-c0f8-481a-995e-47caf540971f');
UPDATE business_categories SET "parentId" = '23015f08-c0f8-481a-995e-47caf540971f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Car storage' AND (id != '23015f08-c0f8-481a-995e-47caf540971f');
UPDATE business_categories SET "parentId" = '23015f08-c0f8-481a-995e-47caf540971f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Car sun protection' AND (id != '23015f08-c0f8-481a-995e-47caf540971f');
UPDATE business_categories SET "parentId" = '23015f08-c0f8-481a-995e-47caf540971f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Car video surveillance' AND (id != '23015f08-c0f8-481a-995e-47caf540971f');
UPDATE business_categories SET "parentId" = '23015f08-c0f8-481a-995e-47caf540971f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Car wash & maintenance' AND (id != '23015f08-c0f8-481a-995e-47caf540971f');
UPDATE business_categories SET "parentId" = '23015f08-c0f8-481a-995e-47caf540971f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Towing & Trailer Lighting' AND (id != '23015f08-c0f8-481a-995e-47caf540971f');
UPDATE business_categories SET "parentId" = '23015f08-c0f8-481a-995e-47caf540971f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Travel & roadway product' AND (id != '23015f08-c0f8-481a-995e-47caf540971f');

-- Baby Care (19)
UPDATE business_categories SET "parentId" = 'a3cf1af6-84f2-405b-8a59-00549e7cebd4', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Baby & maternity' AND (id != 'a3cf1af6-84f2-405b-8a59-00549e7cebd4');
UPDATE business_categories SET "parentId" = 'a3cf1af6-84f2-405b-8a59-00549e7cebd4', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Baby Accessories' AND (id != 'a3cf1af6-84f2-405b-8a59-00549e7cebd4');
UPDATE business_categories SET "parentId" = 'a3cf1af6-84f2-405b-8a59-00549e7cebd4', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Baby Blanket' AND (id != 'a3cf1af6-84f2-405b-8a59-00549e7cebd4');
UPDATE business_categories SET "parentId" = 'a3cf1af6-84f2-405b-8a59-00549e7cebd4', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Baby Hats' AND (id != 'a3cf1af6-84f2-405b-8a59-00549e7cebd4');
UPDATE business_categories SET "parentId" = 'a3cf1af6-84f2-405b-8a59-00549e7cebd4', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Baby Set' AND (id != 'a3cf1af6-84f2-405b-8a59-00549e7cebd4');
UPDATE business_categories SET "parentId" = 'a3cf1af6-84f2-405b-8a59-00549e7cebd4', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Baby Set 11pc' AND (id != 'a3cf1af6-84f2-405b-8a59-00549e7cebd4');
UPDATE business_categories SET "parentId" = 'a3cf1af6-84f2-405b-8a59-00549e7cebd4', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Baby Tender' AND (id != 'a3cf1af6-84f2-405b-8a59-00549e7cebd4');
UPDATE business_categories SET "parentId" = 'a3cf1af6-84f2-405b-8a59-00549e7cebd4', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Baby accessories' AND (id != 'a3cf1af6-84f2-405b-8a59-00549e7cebd4');
UPDATE business_categories SET "parentId" = 'a3cf1af6-84f2-405b-8a59-00549e7cebd4', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Baby bath toys' AND (id != 'a3cf1af6-84f2-405b-8a59-00549e7cebd4');
UPDATE business_categories SET "parentId" = 'a3cf1af6-84f2-405b-8a59-00549e7cebd4', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Baby car seat & stroller toys' AND (id != 'a3cf1af6-84f2-405b-8a59-00549e7cebd4');
UPDATE business_categories SET "parentId" = 'a3cf1af6-84f2-405b-8a59-00549e7cebd4', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Baby care' AND (id != 'a3cf1af6-84f2-405b-8a59-00549e7cebd4');
UPDATE business_categories SET "parentId" = 'a3cf1af6-84f2-405b-8a59-00549e7cebd4', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Baby early development & activity toys' AND (id != 'a3cf1af6-84f2-405b-8a59-00549e7cebd4');
UPDATE business_categories SET "parentId" = 'a3cf1af6-84f2-405b-8a59-00549e7cebd4', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Baby rattles & plush rings' AND (id != 'a3cf1af6-84f2-405b-8a59-00549e7cebd4');
UPDATE business_categories SET "parentId" = 'a3cf1af6-84f2-405b-8a59-00549e7cebd4', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Baby shoes' AND (id != 'a3cf1af6-84f2-405b-8a59-00549e7cebd4');
UPDATE business_categories SET "parentId" = 'a3cf1af6-84f2-405b-8a59-00549e7cebd4', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Baby supplies' AND (id != 'a3cf1af6-84f2-405b-8a59-00549e7cebd4');
UPDATE business_categories SET "parentId" = 'a3cf1af6-84f2-405b-8a59-00549e7cebd4', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Baby teethers' AND (id != 'a3cf1af6-84f2-405b-8a59-00549e7cebd4');
UPDATE business_categories SET "parentId" = 'a3cf1af6-84f2-405b-8a59-00549e7cebd4', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Baby training balls' AND (id != 'a3cf1af6-84f2-405b-8a59-00549e7cebd4');
UPDATE business_categories SET "parentId" = 'a3cf1af6-84f2-405b-8a59-00549e7cebd4', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Diaper changing' AND (id != 'a3cf1af6-84f2-405b-8a59-00549e7cebd4');
UPDATE business_categories SET "parentId" = 'a3cf1af6-84f2-405b-8a59-00549e7cebd4', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Nursing' AND (id != 'a3cf1af6-84f2-405b-8a59-00549e7cebd4');

-- Kids Clothing and Accessories (53)
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Baby & toddler toys' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Baby boys clothing(0-3yrs)' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Baby girls clothing(0-3yrs)' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Boys Accessories' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Boys Clothing' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Boys Tops' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Customized kids supplies' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Girls Accessories' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Girls Clothing' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Girls Dresses' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Girls School Wear' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Girls Tops' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids Heels' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids alphabet & number toys' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids animal figure toys' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids arts & crafts' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids ball pits & accessories' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids block toy figures & playsets' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids block toys & action figures' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids block vehicles' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids bubbles' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids clay & plasticine' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids craft kits' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids doll toys' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids drawing & writing boards' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids electronic pets' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids floor mats' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids housekeeping toys' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids interactive games' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids marble runs' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids money & banking' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids optics' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids outdoor blasters & foam play' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids outdoor flying toys' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids play tents & tunnels' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids preschool toys' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids reading & writing' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids shape & color recognition' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids shoes' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids shops & accessories' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids stacking block toys' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kids&baby' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'School Socks' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Teen boys clothing(13-16yrs)' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Teen girls clothing(13-16yrs)' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Teen shoes' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Toddler Accessories' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Toddler Bottoms' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Toddler Tops' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Tween boys clothing(8-12yrs)' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Tween girls clothing(8-12yrs)' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Young boys clothing(3-7yrs)' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');
UPDATE business_categories SET "parentId" = 'f7b4e800-592b-417c-b991-a73b5c27fe17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Young girls clothing(3-7yrs)' AND (id != 'f7b4e800-592b-417c-b991-a73b5c27fe17');

-- Bags and Luggage (50)
UPDATE business_categories SET "parentId" = 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Backpacks' AND (id != 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b');
UPDATE business_categories SET "parentId" = 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bag' AND (id != 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b');
UPDATE business_categories SET "parentId" = 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bag accessories' AND (id != 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b');
UPDATE business_categories SET "parentId" = 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bag charms' AND (id != 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b');
UPDATE business_categories SET "parentId" = 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bag covers' AND (id != 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b');
UPDATE business_categories SET "parentId" = 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bag inserts' AND (id != 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b');
UPDATE business_categories SET "parentId" = 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bag sets' AND (id != 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b');
UPDATE business_categories SET "parentId" = 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bag straps' AND (id != 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b');
UPDATE business_categories SET "parentId" = 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bags' AND (id != 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b');
UPDATE business_categories SET "parentId" = 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bags & luggage' AND (id != 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b');
UPDATE business_categories SET "parentId" = 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bags Big' AND (id != 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b');
UPDATE business_categories SET "parentId" = 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Briefcase' AND (id != 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b');
UPDATE business_categories SET "parentId" = 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Business card holders' AND (id != 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b');
UPDATE business_categories SET "parentId" = 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Card holders' AND (id != 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b');
UPDATE business_categories SET "parentId" = 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Cloth storage bags' AND (id != 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b');
UPDATE business_categories SET "parentId" = 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Clutches & wristlet bags' AND (id != 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b');
UPDATE business_categories SET "parentId" = 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Coin purses & key cases' AND (id != 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b');
UPDATE business_categories SET "parentId" = 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Crossbody bags' AND (id != 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b');
UPDATE business_categories SET "parentId" = 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Crossbody bags & message bags' AND (id != 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b');
UPDATE business_categories SET "parentId" = 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Digital bags' AND (id != 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b');
UPDATE business_categories SET "parentId" = 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Evening bags' AND (id != 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b');
UPDATE business_categories SET "parentId" = 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Functional bags' AND (id != 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b');
UPDATE business_categories SET "parentId" = 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Handbag' AND (id != 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b');
UPDATE business_categories SET "parentId" = 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Ladie''s Purse' AND (id != 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b');
UPDATE business_categories SET "parentId" = 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Long wallets' AND (id != 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b');
UPDATE business_categories SET "parentId" = 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Luggage' AND (id != 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b');
UPDATE business_categories SET "parentId" = 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Luggage & travel bags' AND (id != 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b');
UPDATE business_categories SET "parentId" = 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Lunch bags' AND (id != 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b');
UPDATE business_categories SET "parentId" = 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Men bags' AND (id != 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b');
UPDATE business_categories SET "parentId" = 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet bags' AND (id != 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b');
UPDATE business_categories SET "parentId" = 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet poopbags' AND (id != 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b');
UPDATE business_categories SET "parentId" = 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Satchels' AND (id != 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b');
UPDATE business_categories SET "parentId" = 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Shopping bags and cart' AND (id != 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b');
UPDATE business_categories SET "parentId" = 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Shoulder & tote bags' AND (id != 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b');
UPDATE business_categories SET "parentId" = 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Shoulder bags' AND (id != 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b');
UPDATE business_categories SET "parentId" = 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Small wallets' AND (id != 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b');
UPDATE business_categories SET "parentId" = 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sport & outdoor bags' AND (id != 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b');
UPDATE business_categories SET "parentId" = 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Storage bags' AND (id != 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b');
UPDATE business_categories SET "parentId" = 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Tote bags' AND (id != 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b');
UPDATE business_categories SET "parentId" = 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Travel bags' AND (id != 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b');
UPDATE business_categories SET "parentId" = 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Travelling Bag' AND (id != 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b');
UPDATE business_categories SET "parentId" = 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Waist bags' AND (id != 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b');
UPDATE business_categories SET "parentId" = 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Waist bags & arm bags' AND (id != 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b');
UPDATE business_categories SET "parentId" = 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Wallet' AND (id != 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b');
UPDATE business_categories SET "parentId" = 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Wallets & card cases' AND (id != 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b');
UPDATE business_categories SET "parentId" = 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Wallets & cardholders' AND (id != 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b');
UPDATE business_categories SET "parentId" = 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Wash Bag' AND (id != 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b');
UPDATE business_categories SET "parentId" = 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women bags' AND (id != 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b');
UPDATE business_categories SET "parentId" = 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women waist pouch' AND (id != 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b');
UPDATE business_categories SET "parentId" = 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Wristlet bags & clutches' AND (id != 'f2a963c9-e33f-41ba-9317-9c3fa943ea2b');

-- Kitchen and Dining (40)
UPDATE business_categories SET "parentId" = 'efe21219-b636-4589-b627-37b2807add46', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bakeware' AND (id != 'efe21219-b636-4589-b627-37b2807add46');
UPDATE business_categories SET "parentId" = 'efe21219-b636-4589-b627-37b2807add46', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Barware' AND (id != 'efe21219-b636-4589-b627-37b2807add46');
UPDATE business_categories SET "parentId" = 'efe21219-b636-4589-b627-37b2807add46', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Coffeeware' AND (id != 'efe21219-b636-4589-b627-37b2807add46');
UPDATE business_categories SET "parentId" = 'efe21219-b636-4589-b627-37b2807add46', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Cooking utensils' AND (id != 'efe21219-b636-4589-b627-37b2807add46');
UPDATE business_categories SET "parentId" = 'efe21219-b636-4589-b627-37b2807add46', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Cookware & parts' AND (id != 'efe21219-b636-4589-b627-37b2807add46');
UPDATE business_categories SET "parentId" = 'efe21219-b636-4589-b627-37b2807add46', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Customized place mat' AND (id != 'efe21219-b636-4589-b627-37b2807add46');
UPDATE business_categories SET "parentId" = 'efe21219-b636-4589-b627-37b2807add46', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Dinnerware' AND (id != 'efe21219-b636-4589-b627-37b2807add46');
UPDATE business_categories SET "parentId" = 'efe21219-b636-4589-b627-37b2807add46', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Drinkware' AND (id != 'efe21219-b636-4589-b627-37b2807add46');
UPDATE business_categories SET "parentId" = 'efe21219-b636-4589-b627-37b2807add46', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Egg tools' AND (id != 'efe21219-b636-4589-b627-37b2807add46');
UPDATE business_categories SET "parentId" = 'efe21219-b636-4589-b627-37b2807add46', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Food covers' AND (id != 'efe21219-b636-4589-b627-37b2807add46');
UPDATE business_categories SET "parentId" = 'efe21219-b636-4589-b627-37b2807add46', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Food service equipment & supplies' AND (id != 'efe21219-b636-4589-b627-37b2807add46');
UPDATE business_categories SET "parentId" = 'efe21219-b636-4589-b627-37b2807add46', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Food tent' AND (id != 'efe21219-b636-4589-b627-37b2807add46');
UPDATE business_categories SET "parentId" = 'efe21219-b636-4589-b627-37b2807add46', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Fruit & vegetable tools' AND (id != 'efe21219-b636-4589-b627-37b2807add46');
UPDATE business_categories SET "parentId" = 'efe21219-b636-4589-b627-37b2807add46', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Herb & spice tools' AND (id != 'efe21219-b636-4589-b627-37b2807add46');
UPDATE business_categories SET "parentId" = 'efe21219-b636-4589-b627-37b2807add46', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Home & kitchen' AND (id != 'efe21219-b636-4589-b627-37b2807add46');
UPDATE business_categories SET "parentId" = 'efe21219-b636-4589-b627-37b2807add46', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Ice cream tools' AND (id != 'efe21219-b636-4589-b627-37b2807add46');
UPDATE business_categories SET "parentId" = 'efe21219-b636-4589-b627-37b2807add46', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kitchen & Table Linens' AND (id != 'efe21219-b636-4589-b627-37b2807add46');
UPDATE business_categories SET "parentId" = 'efe21219-b636-4589-b627-37b2807add46', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kitchen & dining' AND (id != 'efe21219-b636-4589-b627-37b2807add46');
UPDATE business_categories SET "parentId" = 'efe21219-b636-4589-b627-37b2807add46', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kitchen appliance parts' AND (id != 'efe21219-b636-4589-b627-37b2807add46');
UPDATE business_categories SET "parentId" = 'efe21219-b636-4589-b627-37b2807add46', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kitchen cabinets & accessories' AND (id != 'efe21219-b636-4589-b627-37b2807add46');
UPDATE business_categories SET "parentId" = 'efe21219-b636-4589-b627-37b2807add46', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kitchen cleaning tools' AND (id != 'efe21219-b636-4589-b627-37b2807add46');
UPDATE business_categories SET "parentId" = 'efe21219-b636-4589-b627-37b2807add46', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kitchen faucet accessories' AND (id != 'efe21219-b636-4589-b627-37b2807add46');
UPDATE business_categories SET "parentId" = 'efe21219-b636-4589-b627-37b2807add46', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kitchen fixtures' AND (id != 'efe21219-b636-4589-b627-37b2807add46');
UPDATE business_categories SET "parentId" = 'efe21219-b636-4589-b627-37b2807add46', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kitchen knives & accessories' AND (id != 'efe21219-b636-4589-b627-37b2807add46');
UPDATE business_categories SET "parentId" = 'efe21219-b636-4589-b627-37b2807add46', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kitchen mats & rugs' AND (id != 'efe21219-b636-4589-b627-37b2807add46');
UPDATE business_categories SET "parentId" = 'efe21219-b636-4589-b627-37b2807add46', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kitchen storage & organization' AND (id != 'efe21219-b636-4589-b627-37b2807add46');
UPDATE business_categories SET "parentId" = 'efe21219-b636-4589-b627-37b2807add46', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kitchen tools & gadgets' AND (id != 'efe21219-b636-4589-b627-37b2807add46');
UPDATE business_categories SET "parentId" = 'efe21219-b636-4589-b627-37b2807add46', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Kitchen towels' AND (id != 'efe21219-b636-4589-b627-37b2807add46');
UPDATE business_categories SET "parentId" = 'efe21219-b636-4589-b627-37b2807add46', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Knives' AND (id != 'efe21219-b636-4589-b627-37b2807add46');
UPDATE business_categories SET "parentId" = 'efe21219-b636-4589-b627-37b2807add46', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Large Kitchen Appliances' AND (id != 'efe21219-b636-4589-b627-37b2807add46');
UPDATE business_categories SET "parentId" = 'efe21219-b636-4589-b627-37b2807add46', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Meat & poultry tools' AND (id != 'efe21219-b636-4589-b627-37b2807add46');
UPDATE business_categories SET "parentId" = 'efe21219-b636-4589-b627-37b2807add46', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Other kitchen appliances' AND (id != 'efe21219-b636-4589-b627-37b2807add46');
UPDATE business_categories SET "parentId" = 'efe21219-b636-4589-b627-37b2807add46', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Oven & grilling mitts' AND (id != 'efe21219-b636-4589-b627-37b2807add46');
UPDATE business_categories SET "parentId" = 'efe21219-b636-4589-b627-37b2807add46', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Place Mats' AND (id != 'efe21219-b636-4589-b627-37b2807add46');
UPDATE business_categories SET "parentId" = 'efe21219-b636-4589-b627-37b2807add46', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Potholders' AND (id != 'efe21219-b636-4589-b627-37b2807add46');
UPDATE business_categories SET "parentId" = 'efe21219-b636-4589-b627-37b2807add46', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Refillable containers' AND (id != 'efe21219-b636-4589-b627-37b2807add46');
UPDATE business_categories SET "parentId" = 'efe21219-b636-4589-b627-37b2807add46', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Specialty kitchen appliances' AND (id != 'efe21219-b636-4589-b627-37b2807add46');
UPDATE business_categories SET "parentId" = 'efe21219-b636-4589-b627-37b2807add46', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Table napkins' AND (id != 'efe21219-b636-4589-b627-37b2807add46');
UPDATE business_categories SET "parentId" = 'efe21219-b636-4589-b627-37b2807add46', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Teaware' AND (id != 'efe21219-b636-4589-b627-37b2807add46');
UPDATE business_categories SET "parentId" = 'efe21219-b636-4589-b627-37b2807add46', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Tooth Pick' AND (id != 'efe21219-b636-4589-b627-37b2807add46');

-- Party and Event Supplies (45)
UPDATE business_categories SET "parentId" = '97dd1353-838c-40e5-84e1-96e0ae25522f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Ballgown wedding dresses' AND (id != '97dd1353-838c-40e5-84e1-96e0ae25522f');
UPDATE business_categories SET "parentId" = '97dd1353-838c-40e5-84e1-96e0ae25522f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Balloons' AND (id != '97dd1353-838c-40e5-84e1-96e0ae25522f');
UPDATE business_categories SET "parentId" = '97dd1353-838c-40e5-84e1-96e0ae25522f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Birthday party' AND (id != '97dd1353-838c-40e5-84e1-96e0ae25522f');
UPDATE business_categories SET "parentId" = '97dd1353-838c-40e5-84e1-96e0ae25522f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Boutonnieres' AND (id != '97dd1353-838c-40e5-84e1-96e0ae25522f');
UPDATE business_categories SET "parentId" = '97dd1353-838c-40e5-84e1-96e0ae25522f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bridal veils' AND (id != '97dd1353-838c-40e5-84e1-96e0ae25522f');
UPDATE business_categories SET "parentId" = '97dd1353-838c-40e5-84e1-96e0ae25522f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Ceremony supplies' AND (id != '97dd1353-838c-40e5-84e1-96e0ae25522f');
UPDATE business_categories SET "parentId" = '97dd1353-838c-40e5-84e1-96e0ae25522f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Christmas party supplies' AND (id != '97dd1353-838c-40e5-84e1-96e0ae25522f');
UPDATE business_categories SET "parentId" = '97dd1353-838c-40e5-84e1-96e0ae25522f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Costume & cosplay clothing' AND (id != '97dd1353-838c-40e5-84e1-96e0ae25522f');
UPDATE business_categories SET "parentId" = '97dd1353-838c-40e5-84e1-96e0ae25522f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Costume accessories' AND (id != '97dd1353-838c-40e5-84e1-96e0ae25522f');
UPDATE business_categories SET "parentId" = '97dd1353-838c-40e5-84e1-96e0ae25522f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Costume props' AND (id != '97dd1353-838c-40e5-84e1-96e0ae25522f');
UPDATE business_categories SET "parentId" = '97dd1353-838c-40e5-84e1-96e0ae25522f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Costumes' AND (id != '97dd1353-838c-40e5-84e1-96e0ae25522f');
UPDATE business_categories SET "parentId" = '97dd1353-838c-40e5-84e1-96e0ae25522f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Costumes & accessories' AND (id != '97dd1353-838c-40e5-84e1-96e0ae25522f');
UPDATE business_categories SET "parentId" = '97dd1353-838c-40e5-84e1-96e0ae25522f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Disposable tableware' AND (id != '97dd1353-838c-40e5-84e1-96e0ae25522f');
UPDATE business_categories SET "parentId" = '97dd1353-838c-40e5-84e1-96e0ae25522f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Engagement dresses' AND (id != '97dd1353-838c-40e5-84e1-96e0ae25522f');
UPDATE business_categories SET "parentId" = '97dd1353-838c-40e5-84e1-96e0ae25522f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Event & party supplies' AND (id != '97dd1353-838c-40e5-84e1-96e0ae25522f');
UPDATE business_categories SET "parentId" = '97dd1353-838c-40e5-84e1-96e0ae25522f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Festival party supplies' AND (id != '97dd1353-838c-40e5-84e1-96e0ae25522f');
UPDATE business_categories SET "parentId" = '97dd1353-838c-40e5-84e1-96e0ae25522f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Fine Wedding & Engagement' AND (id != '97dd1353-838c-40e5-84e1-96e0ae25522f');
UPDATE business_categories SET "parentId" = '97dd1353-838c-40e5-84e1-96e0ae25522f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Girls Specialty & Seasonal' AND (id != '97dd1353-838c-40e5-84e1-96e0ae25522f');
UPDATE business_categories SET "parentId" = '97dd1353-838c-40e5-84e1-96e0ae25522f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Halloween party supplies' AND (id != '97dd1353-838c-40e5-84e1-96e0ae25522f');
UPDATE business_categories SET "parentId" = '97dd1353-838c-40e5-84e1-96e0ae25522f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Occasion & party' AND (id != '97dd1353-838c-40e5-84e1-96e0ae25522f');
UPDATE business_categories SET "parentId" = '97dd1353-838c-40e5-84e1-96e0ae25522f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Occasion Wear' AND (id != '97dd1353-838c-40e5-84e1-96e0ae25522f');
UPDATE business_categories SET "parentId" = '97dd1353-838c-40e5-84e1-96e0ae25522f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Party favors' AND (id != '97dd1353-838c-40e5-84e1-96e0ae25522f');
UPDATE business_categories SET "parentId" = '97dd1353-838c-40e5-84e1-96e0ae25522f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Party packs' AND (id != '97dd1353-838c-40e5-84e1-96e0ae25522f');
UPDATE business_categories SET "parentId" = '97dd1353-838c-40e5-84e1-96e0ae25522f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Party supplies' AND (id != '97dd1353-838c-40e5-84e1-96e0ae25522f');
UPDATE business_categories SET "parentId" = '97dd1353-838c-40e5-84e1-96e0ae25522f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Party wear' AND (id != '97dd1353-838c-40e5-84e1-96e0ae25522f');
UPDATE business_categories SET "parentId" = '97dd1353-838c-40e5-84e1-96e0ae25522f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Partywear' AND (id != '97dd1353-838c-40e5-84e1-96e0ae25522f');
UPDATE business_categories SET "parentId" = '97dd1353-838c-40e5-84e1-96e0ae25522f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet costumes' AND (id != '97dd1353-838c-40e5-84e1-96e0ae25522f');
UPDATE business_categories SET "parentId" = '97dd1353-838c-40e5-84e1-96e0ae25522f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sashes' AND (id != '97dd1353-838c-40e5-84e1-96e0ae25522f');
UPDATE business_categories SET "parentId" = '97dd1353-838c-40e5-84e1-96e0ae25522f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sexy costumes' AND (id != '97dd1353-838c-40e5-84e1-96e0ae25522f');
UPDATE business_categories SET "parentId" = '97dd1353-838c-40e5-84e1-96e0ae25522f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Shop by occasion' AND (id != '97dd1353-838c-40e5-84e1-96e0ae25522f');
UPDATE business_categories SET "parentId" = '97dd1353-838c-40e5-84e1-96e0ae25522f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Special Occasion' AND (id != '97dd1353-838c-40e5-84e1-96e0ae25522f');
UPDATE business_categories SET "parentId" = '97dd1353-838c-40e5-84e1-96e0ae25522f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Specialty & Seasonal' AND (id != '97dd1353-838c-40e5-84e1-96e0ae25522f');
UPDATE business_categories SET "parentId" = '97dd1353-838c-40e5-84e1-96e0ae25522f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Table decorations & kitchen fabrics' AND (id != '97dd1353-838c-40e5-84e1-96e0ae25522f');
UPDATE business_categories SET "parentId" = '97dd1353-838c-40e5-84e1-96e0ae25522f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Table runners' AND (id != '97dd1353-838c-40e5-84e1-96e0ae25522f');
UPDATE business_categories SET "parentId" = '97dd1353-838c-40e5-84e1-96e0ae25522f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Tablecloths' AND (id != '97dd1353-838c-40e5-84e1-96e0ae25522f');
UPDATE business_categories SET "parentId" = '97dd1353-838c-40e5-84e1-96e0ae25522f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Wedding' AND (id != '97dd1353-838c-40e5-84e1-96e0ae25522f');
UPDATE business_categories SET "parentId" = '97dd1353-838c-40e5-84e1-96e0ae25522f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Wedding & event' AND (id != '97dd1353-838c-40e5-84e1-96e0ae25522f');
UPDATE business_categories SET "parentId" = '97dd1353-838c-40e5-84e1-96e0ae25522f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Wedding & partywear' AND (id != '97dd1353-838c-40e5-84e1-96e0ae25522f');
UPDATE business_categories SET "parentId" = '97dd1353-838c-40e5-84e1-96e0ae25522f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Wedding arches' AND (id != '97dd1353-838c-40e5-84e1-96e0ae25522f');
UPDATE business_categories SET "parentId" = '97dd1353-838c-40e5-84e1-96e0ae25522f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Wedding artificial rose petal' AND (id != '97dd1353-838c-40e5-84e1-96e0ae25522f');
UPDATE business_categories SET "parentId" = '97dd1353-838c-40e5-84e1-96e0ae25522f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Wedding bouquets' AND (id != '97dd1353-838c-40e5-84e1-96e0ae25522f');
UPDATE business_categories SET "parentId" = '97dd1353-838c-40e5-84e1-96e0ae25522f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Wedding guest dresses' AND (id != '97dd1353-838c-40e5-84e1-96e0ae25522f');
UPDATE business_categories SET "parentId" = '97dd1353-838c-40e5-84e1-96e0ae25522f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Wedding jackets & wraps' AND (id != '97dd1353-838c-40e5-84e1-96e0ae25522f');
UPDATE business_categories SET "parentId" = '97dd1353-838c-40e5-84e1-96e0ae25522f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Wedding party' AND (id != '97dd1353-838c-40e5-84e1-96e0ae25522f');
UPDATE business_categories SET "parentId" = '97dd1353-838c-40e5-84e1-96e0ae25522f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women costumes & cosplay clothing' AND (id != '97dd1353-838c-40e5-84e1-96e0ae25522f');

-- Hats and Headwear (25)
UPDATE business_categories SET "parentId" = 'd7d88aca-a472-4fbf-a726-1540bc284674', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bandana & Square Scarves' AND (id != 'd7d88aca-a472-4fbf-a726-1540bc284674');
UPDATE business_categories SET "parentId" = 'd7d88aca-a472-4fbf-a726-1540bc284674', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bandanas' AND (id != 'd7d88aca-a472-4fbf-a726-1540bc284674');
UPDATE business_categories SET "parentId" = 'd7d88aca-a472-4fbf-a726-1540bc284674', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Beanie hat' AND (id != 'd7d88aca-a472-4fbf-a726-1540bc284674');
UPDATE business_categories SET "parentId" = 'd7d88aca-a472-4fbf-a726-1540bc284674', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Beret Hats' AND (id != 'd7d88aca-a472-4fbf-a726-1540bc284674');
UPDATE business_categories SET "parentId" = 'd7d88aca-a472-4fbf-a726-1540bc284674', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bridal headwear' AND (id != 'd7d88aca-a472-4fbf-a726-1540bc284674');
UPDATE business_categories SET "parentId" = 'd7d88aca-a472-4fbf-a726-1540bc284674', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bucket hat' AND (id != 'd7d88aca-a472-4fbf-a726-1540bc284674');
UPDATE business_categories SET "parentId" = 'd7d88aca-a472-4fbf-a726-1540bc284674', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Caps & hats sorting' AND (id != 'd7d88aca-a472-4fbf-a726-1540bc284674');
UPDATE business_categories SET "parentId" = 'd7d88aca-a472-4fbf-a726-1540bc284674', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Doek' AND (id != 'd7d88aca-a472-4fbf-a726-1540bc284674');
UPDATE business_categories SET "parentId" = 'd7d88aca-a472-4fbf-a726-1540bc284674', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Fedora hat' AND (id != 'd7d88aca-a472-4fbf-a726-1540bc284674');
UPDATE business_categories SET "parentId" = 'd7d88aca-a472-4fbf-a726-1540bc284674', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Funny hat' AND (id != 'd7d88aca-a472-4fbf-a726-1540bc284674');
UPDATE business_categories SET "parentId" = 'd7d88aca-a472-4fbf-a726-1540bc284674', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Hat set' AND (id != 'd7d88aca-a472-4fbf-a726-1540bc284674');
UPDATE business_categories SET "parentId" = 'd7d88aca-a472-4fbf-a726-1540bc284674', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Hats' AND (id != 'd7d88aca-a472-4fbf-a726-1540bc284674');
UPDATE business_categories SET "parentId" = 'd7d88aca-a472-4fbf-a726-1540bc284674', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Head Wrap' AND (id != 'd7d88aca-a472-4fbf-a726-1540bc284674');
UPDATE business_categories SET "parentId" = 'd7d88aca-a472-4fbf-a726-1540bc284674', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Headbands' AND (id != 'd7d88aca-a472-4fbf-a726-1540bc284674');
UPDATE business_categories SET "parentId" = 'd7d88aca-a472-4fbf-a726-1540bc284674', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Headwear' AND (id != 'd7d88aca-a472-4fbf-a726-1540bc284674');
UPDATE business_categories SET "parentId" = 'd7d88aca-a472-4fbf-a726-1540bc284674', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Hijab' AND (id != 'd7d88aca-a472-4fbf-a726-1540bc284674');
UPDATE business_categories SET "parentId" = 'd7d88aca-a472-4fbf-a726-1540bc284674', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Masks & visor hat' AND (id != 'd7d88aca-a472-4fbf-a726-1540bc284674');
UPDATE business_categories SET "parentId" = 'd7d88aca-a472-4fbf-a726-1540bc284674', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Mini Hats' AND (id != 'd7d88aca-a472-4fbf-a726-1540bc284674');
UPDATE business_categories SET "parentId" = 'd7d88aca-a472-4fbf-a726-1540bc284674', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Other hats' AND (id != 'd7d88aca-a472-4fbf-a726-1540bc284674');
UPDATE business_categories SET "parentId" = 'd7d88aca-a472-4fbf-a726-1540bc284674', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet hats' AND (id != 'd7d88aca-a472-4fbf-a726-1540bc284674');
UPDATE business_categories SET "parentId" = 'd7d88aca-a472-4fbf-a726-1540bc284674', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pilot hat' AND (id != 'd7d88aca-a472-4fbf-a726-1540bc284674');
UPDATE business_categories SET "parentId" = 'd7d88aca-a472-4fbf-a726-1540bc284674', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Rain Hats' AND (id != 'd7d88aca-a472-4fbf-a726-1540bc284674');
UPDATE business_categories SET "parentId" = 'd7d88aca-a472-4fbf-a726-1540bc284674', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Straw hat' AND (id != 'd7d88aca-a472-4fbf-a726-1540bc284674');
UPDATE business_categories SET "parentId" = 'd7d88aca-a472-4fbf-a726-1540bc284674', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Wig caps & tools' AND (id != 'd7d88aca-a472-4fbf-a726-1540bc284674');
UPDATE business_categories SET "parentId" = 'd7d88aca-a472-4fbf-a726-1540bc284674', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Wool Hat' AND (id != 'd7d88aca-a472-4fbf-a726-1540bc284674');

-- Tops (90)
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bandeau' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Beach top' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Blazers' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Blouses' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Boys Outerwear' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Cardigans' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Coats' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Crop Top' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Customized women tops' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Denim jackets' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Denim jackets & coats' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Denim shirts' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Designer Short Sleeve Shirt' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Down coats' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Fashion Jersey' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Faux fur coats' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'File jackets & file pockets' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Formal Blouser' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Girls Outerwear' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Girls Sweaters & Hoodies' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Hoodies' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Hoodies & sweatshirts' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Jacket' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Jacket Hood' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Jackets & coats' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Jersey' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Knit tops' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Knitwear' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Long Sleeve' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Long Sleeve  Shirt' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Long Sleeve T-Shirt' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Maternity sweatshirts' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Men''s Outerwear' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Men''s Tops' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Nightgowns & sleepshirts' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Other tops' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Outerwear' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Outfit  T-Shirt & Trouser' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Overcoats' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet coats & jackets' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet sweaters' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet sweatshirts & hoodies' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet tops' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Petticoats' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Plain T-Shirt' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Polo T-Shirt' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Polo shirts' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pullovers' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Scotched Shirt' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Shackets' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sports jackets' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Suit sets' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Suits' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Suits & separates' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Summer Shirt' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sweater co-ords' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sweater dresses' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sweater pants' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sweater skirts' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sweater vests' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sweaters' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sweaters & Hoodies' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sweaters & Knits' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sweaters & cardigans' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sweatshirt' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sweatshirts' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'T-Shirt' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'T-shirts' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Tank & accessories' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Tank tops' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Tank tops & camis' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Tees' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Toddler Outerwear' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Top' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Top brand' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Top handle bags' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Tops' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Trench coats' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Two-piece suits' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Velvet Tracksuit' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Vests' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Waistcoats' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Winter Crop Top' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Winter Jacket' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Winter coats' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women lightweight blazers' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women lightweight cardigans' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women lightweight jackets' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Outerwear' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');
UPDATE business_categories SET "parentId" = 'eae2c10f-ba3c-4a5d-9735-7664e089d37a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Tops' AND (id != 'eae2c10f-ba3c-4a5d-9735-7664e089d37a');

-- Bathroom and Laundry (22)
UPDATE business_categories SET "parentId" = 'cb68f488-5fd7-4748-a728-b25e5001581a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bathroom' AND (id != 'cb68f488-5fd7-4748-a728-b25e5001581a');
UPDATE business_categories SET "parentId" = 'cb68f488-5fd7-4748-a728-b25e5001581a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bathroom & laundry mats' AND (id != 'cb68f488-5fd7-4748-a728-b25e5001581a');
UPDATE business_categories SET "parentId" = 'cb68f488-5fd7-4748-a728-b25e5001581a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bathroom accessory sets' AND (id != 'cb68f488-5fd7-4748-a728-b25e5001581a');
UPDATE business_categories SET "parentId" = 'cb68f488-5fd7-4748-a728-b25e5001581a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bathroom fixtures' AND (id != 'cb68f488-5fd7-4748-a728-b25e5001581a');
UPDATE business_categories SET "parentId" = 'cb68f488-5fd7-4748-a728-b25e5001581a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bathroom hardware' AND (id != 'cb68f488-5fd7-4748-a728-b25e5001581a');
UPDATE business_categories SET "parentId" = 'cb68f488-5fd7-4748-a728-b25e5001581a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bathroom safety & accessories' AND (id != 'cb68f488-5fd7-4748-a728-b25e5001581a');
UPDATE business_categories SET "parentId" = 'cb68f488-5fd7-4748-a728-b25e5001581a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bathroom sinks,faucets & accessories' AND (id != 'cb68f488-5fd7-4748-a728-b25e5001581a');
UPDATE business_categories SET "parentId" = 'cb68f488-5fd7-4748-a728-b25e5001581a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bathroom storage & organization' AND (id != 'cb68f488-5fd7-4748-a728-b25e5001581a');
UPDATE business_categories SET "parentId" = 'cb68f488-5fd7-4748-a728-b25e5001581a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bathtub accessories' AND (id != 'cb68f488-5fd7-4748-a728-b25e5001581a');
UPDATE business_categories SET "parentId" = 'cb68f488-5fd7-4748-a728-b25e5001581a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bidets & bidet parts' AND (id != 'cb68f488-5fd7-4748-a728-b25e5001581a');
UPDATE business_categories SET "parentId" = 'cb68f488-5fd7-4748-a728-b25e5001581a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Floor & full length mirrors' AND (id != 'cb68f488-5fd7-4748-a728-b25e5001581a');
UPDATE business_categories SET "parentId" = 'cb68f488-5fd7-4748-a728-b25e5001581a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Floor drain' AND (id != 'cb68f488-5fd7-4748-a728-b25e5001581a');
UPDATE business_categories SET "parentId" = 'cb68f488-5fd7-4748-a728-b25e5001581a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Laundry products' AND (id != 'cb68f488-5fd7-4748-a728-b25e5001581a');
UPDATE business_categories SET "parentId" = 'cb68f488-5fd7-4748-a728-b25e5001581a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Laundry storage & organization' AND (id != 'cb68f488-5fd7-4748-a728-b25e5001581a');
UPDATE business_categories SET "parentId" = 'cb68f488-5fd7-4748-a728-b25e5001581a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Shower accessories' AND (id != 'cb68f488-5fd7-4748-a728-b25e5001581a');
UPDATE business_categories SET "parentId" = 'cb68f488-5fd7-4748-a728-b25e5001581a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Shower curtains & accessories' AND (id != 'cb68f488-5fd7-4748-a728-b25e5001581a');
UPDATE business_categories SET "parentId" = 'cb68f488-5fd7-4748-a728-b25e5001581a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Shower equipment' AND (id != 'cb68f488-5fd7-4748-a728-b25e5001581a');
UPDATE business_categories SET "parentId" = 'cb68f488-5fd7-4748-a728-b25e5001581a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Shower rooms & accessories' AND (id != 'cb68f488-5fd7-4748-a728-b25e5001581a');
UPDATE business_categories SET "parentId" = 'cb68f488-5fd7-4748-a728-b25e5001581a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Showerheads & accessories' AND (id != 'cb68f488-5fd7-4748-a728-b25e5001581a');
UPDATE business_categories SET "parentId" = 'cb68f488-5fd7-4748-a728-b25e5001581a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Toilet accessories' AND (id != 'cb68f488-5fd7-4748-a728-b25e5001581a');
UPDATE business_categories SET "parentId" = 'cb68f488-5fd7-4748-a728-b25e5001581a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Toilets & toilet parts' AND (id != 'cb68f488-5fd7-4748-a728-b25e5001581a');
UPDATE business_categories SET "parentId" = 'cb68f488-5fd7-4748-a728-b25e5001581a', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Washcloths & bath sponges' AND (id != 'cb68f488-5fd7-4748-a728-b25e5001581a');

-- Bottoms (43)
UPDATE business_categories SET "parentId" = '6e0214a4-3536-49b8-a78a-656aa5f005fd', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Beach bottom' AND (id != '6e0214a4-3536-49b8-a78a-656aa5f005fd');
UPDATE business_categories SET "parentId" = '6e0214a4-3536-49b8-a78a-656aa5f005fd', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Beach pants' AND (id != '6e0214a4-3536-49b8-a78a-656aa5f005fd');
UPDATE business_categories SET "parentId" = '6e0214a4-3536-49b8-a78a-656aa5f005fd', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Beach shorts' AND (id != '6e0214a4-3536-49b8-a78a-656aa5f005fd');
UPDATE business_categories SET "parentId" = '6e0214a4-3536-49b8-a78a-656aa5f005fd', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bikini bottoms' AND (id != '6e0214a4-3536-49b8-a78a-656aa5f005fd');
UPDATE business_categories SET "parentId" = '6e0214a4-3536-49b8-a78a-656aa5f005fd', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bottoms' AND (id != '6e0214a4-3536-49b8-a78a-656aa5f005fd');
UPDATE business_categories SET "parentId" = '6e0214a4-3536-49b8-a78a-656aa5f005fd', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Boys Bottoms' AND (id != '6e0214a4-3536-49b8-a78a-656aa5f005fd');
UPDATE business_categories SET "parentId" = '6e0214a4-3536-49b8-a78a-656aa5f005fd', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Cargo Short' AND (id != '6e0214a4-3536-49b8-a78a-656aa5f005fd');
UPDATE business_categories SET "parentId" = '6e0214a4-3536-49b8-a78a-656aa5f005fd', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Denim' AND (id != '6e0214a4-3536-49b8-a78a-656aa5f005fd');
UPDATE business_categories SET "parentId" = '6e0214a4-3536-49b8-a78a-656aa5f005fd', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Denim dresses' AND (id != '6e0214a4-3536-49b8-a78a-656aa5f005fd');
UPDATE business_categories SET "parentId" = '6e0214a4-3536-49b8-a78a-656aa5f005fd', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Denim overalls' AND (id != '6e0214a4-3536-49b8-a78a-656aa5f005fd');
UPDATE business_categories SET "parentId" = '6e0214a4-3536-49b8-a78a-656aa5f005fd', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Denim shorts' AND (id != '6e0214a4-3536-49b8-a78a-656aa5f005fd');
UPDATE business_categories SET "parentId" = '6e0214a4-3536-49b8-a78a-656aa5f005fd', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Denim skirts' AND (id != '6e0214a4-3536-49b8-a78a-656aa5f005fd');
UPDATE business_categories SET "parentId" = '6e0214a4-3536-49b8-a78a-656aa5f005fd', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Formal Trouser' AND (id != '6e0214a4-3536-49b8-a78a-656aa5f005fd');
UPDATE business_categories SET "parentId" = '6e0214a4-3536-49b8-a78a-656aa5f005fd', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Girls Bottoms' AND (id != '6e0214a4-3536-49b8-a78a-656aa5f005fd');
UPDATE business_categories SET "parentId" = '6e0214a4-3536-49b8-a78a-656aa5f005fd', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Girls Leggings' AND (id != '6e0214a4-3536-49b8-a78a-656aa5f005fd');
UPDATE business_categories SET "parentId" = '6e0214a4-3536-49b8-a78a-656aa5f005fd', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Jean' AND (id != '6e0214a4-3536-49b8-a78a-656aa5f005fd');
UPDATE business_categories SET "parentId" = '6e0214a4-3536-49b8-a78a-656aa5f005fd', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Jean Trouser' AND (id != '6e0214a4-3536-49b8-a78a-656aa5f005fd');
UPDATE business_categories SET "parentId" = '6e0214a4-3536-49b8-a78a-656aa5f005fd', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Jeans' AND (id != '6e0214a4-3536-49b8-a78a-656aa5f005fd');
UPDATE business_categories SET "parentId" = '6e0214a4-3536-49b8-a78a-656aa5f005fd', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Legging' AND (id != '6e0214a4-3536-49b8-a78a-656aa5f005fd');
UPDATE business_categories SET "parentId" = '6e0214a4-3536-49b8-a78a-656aa5f005fd', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Leggings' AND (id != '6e0214a4-3536-49b8-a78a-656aa5f005fd');
UPDATE business_categories SET "parentId" = '6e0214a4-3536-49b8-a78a-656aa5f005fd', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Men Pant' AND (id != '6e0214a4-3536-49b8-a78a-656aa5f005fd');
UPDATE business_categories SET "parentId" = '6e0214a4-3536-49b8-a78a-656aa5f005fd', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Men''s Bottoms' AND (id != '6e0214a4-3536-49b8-a78a-656aa5f005fd');
UPDATE business_categories SET "parentId" = '6e0214a4-3536-49b8-a78a-656aa5f005fd', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pant sets' AND (id != '6e0214a4-3536-49b8-a78a-656aa5f005fd');
UPDATE business_categories SET "parentId" = '6e0214a4-3536-49b8-a78a-656aa5f005fd', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pantie' AND (id != '6e0214a4-3536-49b8-a78a-656aa5f005fd');
UPDATE business_categories SET "parentId" = '6e0214a4-3536-49b8-a78a-656aa5f005fd', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pantie Less' AND (id != '6e0214a4-3536-49b8-a78a-656aa5f005fd');
UPDATE business_categories SET "parentId" = '6e0214a4-3536-49b8-a78a-656aa5f005fd', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pants' AND (id != '6e0214a4-3536-49b8-a78a-656aa5f005fd');
UPDATE business_categories SET "parentId" = '6e0214a4-3536-49b8-a78a-656aa5f005fd', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Short' AND (id != '6e0214a4-3536-49b8-a78a-656aa5f005fd');
UPDATE business_categories SET "parentId" = '6e0214a4-3536-49b8-a78a-656aa5f005fd', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Short Sleeve' AND (id != '6e0214a4-3536-49b8-a78a-656aa5f005fd');
UPDATE business_categories SET "parentId" = '6e0214a4-3536-49b8-a78a-656aa5f005fd', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Short dresses' AND (id != '6e0214a4-3536-49b8-a78a-656aa5f005fd');
UPDATE business_categories SET "parentId" = '6e0214a4-3536-49b8-a78a-656aa5f005fd', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Shorts' AND (id != '6e0214a4-3536-49b8-a78a-656aa5f005fd');
UPDATE business_categories SET "parentId" = '6e0214a4-3536-49b8-a78a-656aa5f005fd', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Skirt' AND (id != '6e0214a4-3536-49b8-a78a-656aa5f005fd');
UPDATE business_categories SET "parentId" = '6e0214a4-3536-49b8-a78a-656aa5f005fd', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Skirt sets' AND (id != '6e0214a4-3536-49b8-a78a-656aa5f005fd');
UPDATE business_categories SET "parentId" = '6e0214a4-3536-49b8-a78a-656aa5f005fd', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Skirts' AND (id != '6e0214a4-3536-49b8-a78a-656aa5f005fd');
UPDATE business_categories SET "parentId" = '6e0214a4-3536-49b8-a78a-656aa5f005fd', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Slim Fit Jean' AND (id != '6e0214a4-3536-49b8-a78a-656aa5f005fd');
UPDATE business_categories SET "parentId" = '6e0214a4-3536-49b8-a78a-656aa5f005fd', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sports leggings & pants' AND (id != '6e0214a4-3536-49b8-a78a-656aa5f005fd');
UPDATE business_categories SET "parentId" = '6e0214a4-3536-49b8-a78a-656aa5f005fd', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Suit pants' AND (id != '6e0214a4-3536-49b8-a78a-656aa5f005fd');
UPDATE business_categories SET "parentId" = '6e0214a4-3536-49b8-a78a-656aa5f005fd', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sweatpants' AND (id != '6e0214a4-3536-49b8-a78a-656aa5f005fd');
UPDATE business_categories SET "parentId" = '6e0214a4-3536-49b8-a78a-656aa5f005fd', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Table skirts' AND (id != '6e0214a4-3536-49b8-a78a-656aa5f005fd');
UPDATE business_categories SET "parentId" = '6e0214a4-3536-49b8-a78a-656aa5f005fd', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Tight' AND (id != '6e0214a4-3536-49b8-a78a-656aa5f005fd');
UPDATE business_categories SET "parentId" = '6e0214a4-3536-49b8-a78a-656aa5f005fd', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Tights' AND (id != '6e0214a4-3536-49b8-a78a-656aa5f005fd');
UPDATE business_categories SET "parentId" = '6e0214a4-3536-49b8-a78a-656aa5f005fd', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women bottoms' AND (id != '6e0214a4-3536-49b8-a78a-656aa5f005fd');
UPDATE business_categories SET "parentId" = '6e0214a4-3536-49b8-a78a-656aa5f005fd', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women denim' AND (id != '6e0214a4-3536-49b8-a78a-656aa5f005fd');
UPDATE business_categories SET "parentId" = '6e0214a4-3536-49b8-a78a-656aa5f005fd', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Bottoms' AND (id != '6e0214a4-3536-49b8-a78a-656aa5f005fd');

-- Health and Wellness (20)
UPDATE business_categories SET "parentId" = '983460ef-137b-4541-bec6-24d1f3c9ac17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Beauty & health' AND (id != '983460ef-137b-4541-bec6-24d1f3c9ac17');
UPDATE business_categories SET "parentId" = '983460ef-137b-4541-bec6-24d1f3c9ac17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Digital thermometers & timers' AND (id != '983460ef-137b-4541-bec6-24d1f3c9ac17');
UPDATE business_categories SET "parentId" = '983460ef-137b-4541-bec6-24d1f3c9ac17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Earplugs' AND (id != '983460ef-137b-4541-bec6-24d1f3c9ac17');
UPDATE business_categories SET "parentId" = '983460ef-137b-4541-bec6-24d1f3c9ac17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Electric heating pad' AND (id != '983460ef-137b-4541-bec6-24d1f3c9ac17');
UPDATE business_categories SET "parentId" = '983460ef-137b-4541-bec6-24d1f3c9ac17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Eye mask' AND (id != '983460ef-137b-4541-bec6-24d1f3c9ac17');
UPDATE business_categories SET "parentId" = '983460ef-137b-4541-bec6-24d1f3c9ac17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Health & wellness monitors' AND (id != '983460ef-137b-4541-bec6-24d1f3c9ac17');
UPDATE business_categories SET "parentId" = '983460ef-137b-4541-bec6-24d1f3c9ac17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Hot & cold therapies' AND (id != '983460ef-137b-4541-bec6-24d1f3c9ac17');
UPDATE business_categories SET "parentId" = '983460ef-137b-4541-bec6-24d1f3c9ac17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Hot Water Bottle' AND (id != '983460ef-137b-4541-bec6-24d1f3c9ac17');
UPDATE business_categories SET "parentId" = '983460ef-137b-4541-bec6-24d1f3c9ac17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Male masturbators & couple interaction' AND (id != '983460ef-137b-4541-bec6-24d1f3c9ac17');
UPDATE business_categories SET "parentId" = '983460ef-137b-4541-bec6-24d1f3c9ac17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Massage Tools & Equipment' AND (id != '983460ef-137b-4541-bec6-24d1f3c9ac17');
UPDATE business_categories SET "parentId" = '983460ef-137b-4541-bec6-24d1f3c9ac17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Massage pillows' AND (id != '983460ef-137b-4541-bec6-24d1f3c9ac17');
UPDATE business_categories SET "parentId" = '983460ef-137b-4541-bec6-24d1f3c9ac17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Medicine' AND (id != '983460ef-137b-4541-bec6-24d1f3c9ac17');
UPDATE business_categories SET "parentId" = '983460ef-137b-4541-bec6-24d1f3c9ac17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Other personal care appliances' AND (id != '983460ef-137b-4541-bec6-24d1f3c9ac17');
UPDATE business_categories SET "parentId" = '983460ef-137b-4541-bec6-24d1f3c9ac17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Personal care appliance accessories' AND (id != '983460ef-137b-4541-bec6-24d1f3c9ac17');
UPDATE business_categories SET "parentId" = '983460ef-137b-4541-bec6-24d1f3c9ac17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Romantic & fantasy' AND (id != '983460ef-137b-4541-bec6-24d1f3c9ac17');
UPDATE business_categories SET "parentId" = '983460ef-137b-4541-bec6-24d1f3c9ac17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Safe sex' AND (id != '983460ef-137b-4541-bec6-24d1f3c9ac17');
UPDATE business_categories SET "parentId" = '983460ef-137b-4541-bec6-24d1f3c9ac17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sensual delights' AND (id != '983460ef-137b-4541-bec6-24d1f3c9ac17');
UPDATE business_categories SET "parentId" = '983460ef-137b-4541-bec6-24d1f3c9ac17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sexual wellness' AND (id != '983460ef-137b-4541-bec6-24d1f3c9ac17');
UPDATE business_categories SET "parentId" = '983460ef-137b-4541-bec6-24d1f3c9ac17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Tattoos & body art' AND (id != '983460ef-137b-4541-bec6-24d1f3c9ac17');
UPDATE business_categories SET "parentId" = '983460ef-137b-4541-bec6-24d1f3c9ac17', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Vision care' AND (id != '983460ef-137b-4541-bec6-24d1f3c9ac17');

-- Hair Care (26)
UPDATE business_categories SET "parentId" = 'e23041d0-68b7-4efe-a676-8d5092e099f1', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Bonnet' AND (id != 'e23041d0-68b7-4efe-a676-8d5092e099f1');
UPDATE business_categories SET "parentId" = 'e23041d0-68b7-4efe-a676-8d5092e099f1', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Hair  Shampoo' AND (id != 'e23041d0-68b7-4efe-a676-8d5092e099f1');
UPDATE business_categories SET "parentId" = 'e23041d0-68b7-4efe-a676-8d5092e099f1', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Hair Bands' AND (id != 'e23041d0-68b7-4efe-a676-8d5092e099f1');
UPDATE business_categories SET "parentId" = 'e23041d0-68b7-4efe-a676-8d5092e099f1', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Hair Bun & Hair Pin' AND (id != 'e23041d0-68b7-4efe-a676-8d5092e099f1');
UPDATE business_categories SET "parentId" = 'e23041d0-68b7-4efe-a676-8d5092e099f1', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Hair Combs' AND (id != 'e23041d0-68b7-4efe-a676-8d5092e099f1');
UPDATE business_categories SET "parentId" = 'e23041d0-68b7-4efe-a676-8d5092e099f1', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Hair Curling' AND (id != 'e23041d0-68b7-4efe-a676-8d5092e099f1');
UPDATE business_categories SET "parentId" = 'e23041d0-68b7-4efe-a676-8d5092e099f1', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Hair Oil' AND (id != 'e23041d0-68b7-4efe-a676-8d5092e099f1');
UPDATE business_categories SET "parentId" = 'e23041d0-68b7-4efe-a676-8d5092e099f1', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Hair Pins' AND (id != 'e23041d0-68b7-4efe-a676-8d5092e099f1');
UPDATE business_categories SET "parentId" = 'e23041d0-68b7-4efe-a676-8d5092e099f1', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Hair accessories' AND (id != 'e23041d0-68b7-4efe-a676-8d5092e099f1');
UPDATE business_categories SET "parentId" = 'e23041d0-68b7-4efe-a676-8d5092e099f1', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Hair accessory sets' AND (id != 'e23041d0-68b7-4efe-a676-8d5092e099f1');
UPDATE business_categories SET "parentId" = 'e23041d0-68b7-4efe-a676-8d5092e099f1', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Hair bands' AND (id != 'e23041d0-68b7-4efe-a676-8d5092e099f1');
UPDATE business_categories SET "parentId" = 'e23041d0-68b7-4efe-a676-8d5092e099f1', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Hair bonnets' AND (id != 'e23041d0-68b7-4efe-a676-8d5092e099f1');
UPDATE business_categories SET "parentId" = 'e23041d0-68b7-4efe-a676-8d5092e099f1', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Hair care & styling' AND (id != 'e23041d0-68b7-4efe-a676-8d5092e099f1');
UPDATE business_categories SET "parentId" = 'e23041d0-68b7-4efe-a676-8d5092e099f1', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Hair claws' AND (id != 'e23041d0-68b7-4efe-a676-8d5092e099f1');
UPDATE business_categories SET "parentId" = 'e23041d0-68b7-4efe-a676-8d5092e099f1', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Hair clips' AND (id != 'e23041d0-68b7-4efe-a676-8d5092e099f1');
UPDATE business_categories SET "parentId" = 'e23041d0-68b7-4efe-a676-8d5092e099f1', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Hair ties' AND (id != 'e23041d0-68b7-4efe-a676-8d5092e099f1');
UPDATE business_categories SET "parentId" = 'e23041d0-68b7-4efe-a676-8d5092e099f1', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Human hair wigs' AND (id != 'e23041d0-68b7-4efe-a676-8d5092e099f1');
UPDATE business_categories SET "parentId" = 'e23041d0-68b7-4efe-a676-8d5092e099f1', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Personal Care Styling Appliances' AND (id != 'e23041d0-68b7-4efe-a676-8d5092e099f1');
UPDATE business_categories SET "parentId" = 'e23041d0-68b7-4efe-a676-8d5092e099f1', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Personal Grooming Styling Appliances' AND (id != 'e23041d0-68b7-4efe-a676-8d5092e099f1');
UPDATE business_categories SET "parentId" = 'e23041d0-68b7-4efe-a676-8d5092e099f1', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet hair accessories' AND (id != 'e23041d0-68b7-4efe-a676-8d5092e099f1');
UPDATE business_categories SET "parentId" = 'e23041d0-68b7-4efe-a676-8d5092e099f1', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Salon Hair Care' AND (id != 'e23041d0-68b7-4efe-a676-8d5092e099f1');
UPDATE business_categories SET "parentId" = 'e23041d0-68b7-4efe-a676-8d5092e099f1', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Scrunchies' AND (id != 'e23041d0-68b7-4efe-a676-8d5092e099f1');
UPDATE business_categories SET "parentId" = 'e23041d0-68b7-4efe-a676-8d5092e099f1', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Styling Gel' AND (id != 'e23041d0-68b7-4efe-a676-8d5092e099f1');
UPDATE business_categories SET "parentId" = 'e23041d0-68b7-4efe-a676-8d5092e099f1', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Synthetic hair wigs' AND (id != 'e23041d0-68b7-4efe-a676-8d5092e099f1');
UPDATE business_categories SET "parentId" = 'e23041d0-68b7-4efe-a676-8d5092e099f1', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Wigs & accs' AND (id != 'e23041d0-68b7-4efe-a676-8d5092e099f1');
UPDATE business_categories SET "parentId" = 'e23041d0-68b7-4efe-a676-8d5092e099f1', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women hair accessories' AND (id != 'e23041d0-68b7-4efe-a676-8d5092e099f1');

-- Makeup (20)
UPDATE business_categories SET "parentId" = '94f7ff62-307d-4b46-bca7-f5de06926753', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Brush' AND (id != '94f7ff62-307d-4b46-bca7-f5de06926753');
UPDATE business_categories SET "parentId" = '94f7ff62-307d-4b46-bca7-f5de06926753', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Eye Lashies' AND (id != '94f7ff62-307d-4b46-bca7-f5de06926753');
UPDATE business_categories SET "parentId" = '94f7ff62-307d-4b46-bca7-f5de06926753', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Eye make up' AND (id != '94f7ff62-307d-4b46-bca7-f5de06926753');
UPDATE business_categories SET "parentId" = '94f7ff62-307d-4b46-bca7-f5de06926753', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Eyelashes' AND (id != '94f7ff62-307d-4b46-bca7-f5de06926753');
UPDATE business_categories SET "parentId" = '94f7ff62-307d-4b46-bca7-f5de06926753', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Face Blush' AND (id != '94f7ff62-307d-4b46-bca7-f5de06926753');
UPDATE business_categories SET "parentId" = '94f7ff62-307d-4b46-bca7-f5de06926753', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Face Foundation' AND (id != '94f7ff62-307d-4b46-bca7-f5de06926753');
UPDATE business_categories SET "parentId" = '94f7ff62-307d-4b46-bca7-f5de06926753', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Face Powder' AND (id != '94f7ff62-307d-4b46-bca7-f5de06926753');
UPDATE business_categories SET "parentId" = '94f7ff62-307d-4b46-bca7-f5de06926753', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Face make up' AND (id != '94f7ff62-307d-4b46-bca7-f5de06926753');
UPDATE business_categories SET "parentId" = '94f7ff62-307d-4b46-bca7-f5de06926753', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Foundation' AND (id != '94f7ff62-307d-4b46-bca7-f5de06926753');
UPDATE business_categories SET "parentId" = '94f7ff62-307d-4b46-bca7-f5de06926753', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Home City Tothbrush' AND (id != '94f7ff62-307d-4b46-bca7-f5de06926753');
UPDATE business_categories SET "parentId" = '94f7ff62-307d-4b46-bca7-f5de06926753', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Lip Gloss' AND (id != '94f7ff62-307d-4b46-bca7-f5de06926753');
UPDATE business_categories SET "parentId" = '94f7ff62-307d-4b46-bca7-f5de06926753', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Makeup' AND (id != '94f7ff62-307d-4b46-bca7-f5de06926753');
UPDATE business_categories SET "parentId" = '94f7ff62-307d-4b46-bca7-f5de06926753', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Makeup Mirrors' AND (id != '94f7ff62-307d-4b46-bca7-f5de06926753');
UPDATE business_categories SET "parentId" = '94f7ff62-307d-4b46-bca7-f5de06926753', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Makeup bag & storage' AND (id != '94f7ff62-307d-4b46-bca7-f5de06926753');
UPDATE business_categories SET "parentId" = '94f7ff62-307d-4b46-bca7-f5de06926753', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Makeup bags & cases' AND (id != '94f7ff62-307d-4b46-bca7-f5de06926753');
UPDATE business_categories SET "parentId" = '94f7ff62-307d-4b46-bca7-f5de06926753', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Makeup brush & sponge' AND (id != '94f7ff62-307d-4b46-bca7-f5de06926753');
UPDATE business_categories SET "parentId" = '94f7ff62-307d-4b46-bca7-f5de06926753', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Makeup brush cleaning & drying tools' AND (id != '94f7ff62-307d-4b46-bca7-f5de06926753');
UPDATE business_categories SET "parentId" = '94f7ff62-307d-4b46-bca7-f5de06926753', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Makeup remover' AND (id != '94f7ff62-307d-4b46-bca7-f5de06926753');
UPDATE business_categories SET "parentId" = '94f7ff62-307d-4b46-bca7-f5de06926753', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Quality makeup' AND (id != '94f7ff62-307d-4b46-bca7-f5de06926753');
UPDATE business_categories SET "parentId" = '94f7ff62-307d-4b46-bca7-f5de06926753', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Makeup Collection' AND (id != '94f7ff62-307d-4b46-bca7-f5de06926753');

-- Audio, Video and Gaming (13)
UPDATE business_categories SET "parentId" = '5be86735-ca7a-4f5c-b636-aa81f0827961', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Camera & photo' AND (id != '5be86735-ca7a-4f5c-b636-aa81f0827961');
UPDATE business_categories SET "parentId" = '5be86735-ca7a-4f5c-b636-aa81f0827961', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Earbuds' AND (id != '5be86735-ca7a-4f5c-b636-aa81f0827961');
UPDATE business_categories SET "parentId" = '5be86735-ca7a-4f5c-b636-aa81f0827961', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Electronic music, dj & karaoke' AND (id != '5be86735-ca7a-4f5c-b636-aa81f0827961');
UPDATE business_categories SET "parentId" = '5be86735-ca7a-4f5c-b636-aa81f0827961', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Game consoles & accessories' AND (id != '5be86735-ca7a-4f5c-b636-aa81f0827961');
UPDATE business_categories SET "parentId" = '5be86735-ca7a-4f5c-b636-aa81f0827961', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Headphone & earphone' AND (id != '5be86735-ca7a-4f5c-b636-aa81f0827961');
UPDATE business_categories SET "parentId" = '5be86735-ca7a-4f5c-b636-aa81f0827961', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Home audio & video' AND (id != '5be86735-ca7a-4f5c-b636-aa81f0827961');
UPDATE business_categories SET "parentId" = '5be86735-ca7a-4f5c-b636-aa81f0827961', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Karaoke equipment' AND (id != '5be86735-ca7a-4f5c-b636-aa81f0827961');
UPDATE business_categories SET "parentId" = '5be86735-ca7a-4f5c-b636-aa81f0827961', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Microphones & accessories' AND (id != '5be86735-ca7a-4f5c-b636-aa81f0827961');
UPDATE business_categories SET "parentId" = '5be86735-ca7a-4f5c-b636-aa81f0827961', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Portable audio & video' AND (id != '5be86735-ca7a-4f5c-b636-aa81f0827961');
UPDATE business_categories SET "parentId" = '5be86735-ca7a-4f5c-b636-aa81f0827961', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Recording equipment' AND (id != '5be86735-ca7a-4f5c-b636-aa81f0827961');
UPDATE business_categories SET "parentId" = '5be86735-ca7a-4f5c-b636-aa81f0827961', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Security cameras' AND (id != '5be86735-ca7a-4f5c-b636-aa81f0827961');
UPDATE business_categories SET "parentId" = '5be86735-ca7a-4f5c-b636-aa81f0827961', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Video games' AND (id != '5be86735-ca7a-4f5c-b636-aa81f0827961');
UPDATE business_categories SET "parentId" = '5be86735-ca7a-4f5c-b636-aa81f0827961', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Walkie talkie & accessories' AND (id != '5be86735-ca7a-4f5c-b636-aa81f0827961');

-- Travel (16)
UPDATE business_categories SET "parentId" = 'cab9adb0-855a-42be-bba2-71e872693db6', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Camping & hiking' AND (id != 'cab9adb0-855a-42be-bba2-71e872693db6');
UPDATE business_categories SET "parentId" = 'cab9adb0-855a-42be-bba2-71e872693db6', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Hiking daypacks' AND (id != 'cab9adb0-855a-42be-bba2-71e872693db6');
UPDATE business_categories SET "parentId" = 'cab9adb0-855a-42be-bba2-71e872693db6', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Luggage & travel gear' AND (id != 'cab9adb0-855a-42be-bba2-71e872693db6');
UPDATE business_categories SET "parentId" = 'cab9adb0-855a-42be-bba2-71e872693db6', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Picnic mat' AND (id != 'cab9adb0-855a-42be-bba2-71e872693db6');
UPDATE business_categories SET "parentId" = 'cab9adb0-855a-42be-bba2-71e872693db6', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Rain gear' AND (id != 'cab9adb0-855a-42be-bba2-71e872693db6');
UPDATE business_categories SET "parentId" = 'cab9adb0-855a-42be-bba2-71e872693db6', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Raincoat' AND (id != 'cab9adb0-855a-42be-bba2-71e872693db6');
UPDATE business_categories SET "parentId" = 'cab9adb0-855a-42be-bba2-71e872693db6', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Sleeping bags' AND (id != 'cab9adb0-855a-42be-bba2-71e872693db6');
UPDATE business_categories SET "parentId" = 'cab9adb0-855a-42be-bba2-71e872693db6', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Travel accessories & supplies' AND (id != 'cab9adb0-855a-42be-bba2-71e872693db6');
UPDATE business_categories SET "parentId" = 'cab9adb0-855a-42be-bba2-71e872693db6', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Travel essentials' AND (id != 'cab9adb0-855a-42be-bba2-71e872693db6');
UPDATE business_categories SET "parentId" = 'cab9adb0-855a-42be-bba2-71e872693db6', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Travel gear' AND (id != 'cab9adb0-855a-42be-bba2-71e872693db6');
UPDATE business_categories SET "parentId" = 'cab9adb0-855a-42be-bba2-71e872693db6', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Travel pillows' AND (id != 'cab9adb0-855a-42be-bba2-71e872693db6');
UPDATE business_categories SET "parentId" = 'cab9adb0-855a-42be-bba2-71e872693db6', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Travel sleeping gadgets' AND (id != 'cab9adb0-855a-42be-bba2-71e872693db6');
UPDATE business_categories SET "parentId" = 'cab9adb0-855a-42be-bba2-71e872693db6', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Travel storage' AND (id != 'cab9adb0-855a-42be-bba2-71e872693db6');
UPDATE business_categories SET "parentId" = 'cab9adb0-855a-42be-bba2-71e872693db6', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Umbrella' AND (id != 'cab9adb0-855a-42be-bba2-71e872693db6');
UPDATE business_categories SET "parentId" = 'cab9adb0-855a-42be-bba2-71e872693db6', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Vacation' AND (id != 'cab9adb0-855a-42be-bba2-71e872693db6');
UPDATE business_categories SET "parentId" = 'cab9adb0-855a-42be-bba2-71e872693db6', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Wedding umbrellas' AND (id != 'cab9adb0-855a-42be-bba2-71e872693db6');

-- Designer and Collaboration Collections (16)
UPDATE business_categories SET "parentId" = '4b8aa58c-a10e-4e2f-b05a-08e35482b51b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Artist Collaboration Collection' AND (id != '4b8aa58c-a10e-4e2f-b05a-08e35482b51b');
UPDATE business_categories SET "parentId" = '4b8aa58c-a10e-4e2f-b05a-08e35482b51b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Boutique Designer Collaboration Collection' AND (id != '4b8aa58c-a10e-4e2f-b05a-08e35482b51b');
UPDATE business_categories SET "parentId" = '4b8aa58c-a10e-4e2f-b05a-08e35482b51b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Curated Designer Collaboration Collection' AND (id != '4b8aa58c-a10e-4e2f-b05a-08e35482b51b');
UPDATE business_categories SET "parentId" = '4b8aa58c-a10e-4e2f-b05a-08e35482b51b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Designer Collaboration Collection' AND (id != '4b8aa58c-a10e-4e2f-b05a-08e35482b51b');
UPDATE business_categories SET "parentId" = '4b8aa58c-a10e-4e2f-b05a-08e35482b51b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Graphic Artist Collaboration Collection II' AND (id != '4b8aa58c-a10e-4e2f-b05a-08e35482b51b');
UPDATE business_categories SET "parentId" = '4b8aa58c-a10e-4e2f-b05a-08e35482b51b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Licensed Animated Character Merchandise' AND (id != '4b8aa58c-a10e-4e2f-b05a-08e35482b51b');
UPDATE business_categories SET "parentId" = '4b8aa58c-a10e-4e2f-b05a-08e35482b51b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Licensed Anime Character Merchandise' AND (id != '4b8aa58c-a10e-4e2f-b05a-08e35482b51b');
UPDATE business_categories SET "parentId" = '4b8aa58c-a10e-4e2f-b05a-08e35482b51b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Licensed Art and Character Merchandise' AND (id != '4b8aa58c-a10e-4e2f-b05a-08e35482b51b');
UPDATE business_categories SET "parentId" = '4b8aa58c-a10e-4e2f-b05a-08e35482b51b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Licensed Character Graphic Collection' AND (id != '4b8aa58c-a10e-4e2f-b05a-08e35482b51b');
UPDATE business_categories SET "parentId" = '4b8aa58c-a10e-4e2f-b05a-08e35482b51b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Licensed Character Merchandise' AND (id != '4b8aa58c-a10e-4e2f-b05a-08e35482b51b');
UPDATE business_categories SET "parentId" = '4b8aa58c-a10e-4e2f-b05a-08e35482b51b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Licensed Fantasy Character Merchandise' AND (id != '4b8aa58c-a10e-4e2f-b05a-08e35482b51b');
UPDATE business_categories SET "parentId" = '4b8aa58c-a10e-4e2f-b05a-08e35482b51b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Licensed Graphic Apparel Collection' AND (id != '4b8aa58c-a10e-4e2f-b05a-08e35482b51b');
UPDATE business_categories SET "parentId" = '4b8aa58c-a10e-4e2f-b05a-08e35482b51b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Licensed Kids Character Merchandise' AND (id != '4b8aa58c-a10e-4e2f-b05a-08e35482b51b');
UPDATE business_categories SET "parentId" = '4b8aa58c-a10e-4e2f-b05a-08e35482b51b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Licensed Retro Character Merchandise' AND (id != '4b8aa58c-a10e-4e2f-b05a-08e35482b51b');
UPDATE business_categories SET "parentId" = '4b8aa58c-a10e-4e2f-b05a-08e35482b51b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Multi-Designer Collaboration Collection' AND (id != '4b8aa58c-a10e-4e2f-b05a-08e35482b51b');
UPDATE business_categories SET "parentId" = '4b8aa58c-a10e-4e2f-b05a-08e35482b51b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Premium Designer Collaboration Collection' AND (id != '4b8aa58c-a10e-4e2f-b05a-08e35482b51b');

-- Phones and Mobile Accessories (14)
UPDATE business_categories SET "parentId" = '1f648f8c-6f6a-485c-b947-843b7eb206f5', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Case & screen protectors' AND (id != '1f648f8c-6f6a-485c-b947-843b7eb206f5');
UPDATE business_categories SET "parentId" = '1f648f8c-6f6a-485c-b947-843b7eb206f5', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Cell phone replacement parts' AND (id != '1f648f8c-6f6a-485c-b947-843b7eb206f5');
UPDATE business_categories SET "parentId" = '1f648f8c-6f6a-485c-b947-843b7eb206f5', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Cell phones & accessories' AND (id != '1f648f8c-6f6a-485c-b947-843b7eb206f5');
UPDATE business_categories SET "parentId" = '1f648f8c-6f6a-485c-b947-843b7eb206f5', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Cell phones accessories' AND (id != '1f648f8c-6f6a-485c-b947-843b7eb206f5');
UPDATE business_categories SET "parentId" = '1f648f8c-6f6a-485c-b947-843b7eb206f5', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Cellphones' AND (id != '1f648f8c-6f6a-485c-b947-843b7eb206f5');
UPDATE business_categories SET "parentId" = '1f648f8c-6f6a-485c-b947-843b7eb206f5', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Charger cable adapters' AND (id != '1f648f8c-6f6a-485c-b947-843b7eb206f5');
UPDATE business_categories SET "parentId" = '1f648f8c-6f6a-485c-b947-843b7eb206f5', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Chargers' AND (id != '1f648f8c-6f6a-485c-b947-843b7eb206f5');
UPDATE business_categories SET "parentId" = '1f648f8c-6f6a-485c-b947-843b7eb206f5', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Earphone cases' AND (id != '1f648f8c-6f6a-485c-b947-843b7eb206f5');
UPDATE business_categories SET "parentId" = '1f648f8c-6f6a-485c-b947-843b7eb206f5', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Phone accessories' AND (id != '1f648f8c-6f6a-485c-b947-843b7eb206f5');
UPDATE business_categories SET "parentId" = '1f648f8c-6f6a-485c-b947-843b7eb206f5', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Phone lens & lamp' AND (id != '1f648f8c-6f6a-485c-b947-843b7eb206f5');
UPDATE business_categories SET "parentId" = '1f648f8c-6f6a-485c-b947-843b7eb206f5', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Phone mounts & holders' AND (id != '1f648f8c-6f6a-485c-b947-843b7eb206f5');
UPDATE business_categories SET "parentId" = '1f648f8c-6f6a-485c-b947-843b7eb206f5', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Phone wallets' AND (id != '1f648f8c-6f6a-485c-b947-843b7eb206f5');
UPDATE business_categories SET "parentId" = '1f648f8c-6f6a-485c-b947-843b7eb206f5', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Power bank' AND (id != '1f648f8c-6f6a-485c-b947-843b7eb206f5');
UPDATE business_categories SET "parentId" = '1f648f8c-6f6a-485c-b947-843b7eb206f5', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Screen protectors' AND (id != '1f648f8c-6f6a-485c-b947-843b7eb206f5');

-- General Pet Supplies (30)
UPDATE business_categories SET "parentId" = '58dd31c8-51a0-496d-a481-feafe9aec825', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Cat Litter' AND (id != '58dd31c8-51a0-496d-a481-feafe9aec825');
UPDATE business_categories SET "parentId" = '58dd31c8-51a0-496d-a481-feafe9aec825', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Cat scratchers' AND (id != '58dd31c8-51a0-496d-a481-feafe9aec825');
UPDATE business_categories SET "parentId" = '58dd31c8-51a0-496d-a481-feafe9aec825', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Cat teasers' AND (id != '58dd31c8-51a0-496d-a481-feafe9aec825');
UPDATE business_categories SET "parentId" = '58dd31c8-51a0-496d-a481-feafe9aec825', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Cat tunnels' AND (id != '58dd31c8-51a0-496d-a481-feafe9aec825');
UPDATE business_categories SET "parentId" = '58dd31c8-51a0-496d-a481-feafe9aec825', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Litter boxes & litter mats' AND (id != '58dd31c8-51a0-496d-a481-feafe9aec825');
UPDATE business_categories SET "parentId" = '58dd31c8-51a0-496d-a481-feafe9aec825', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet Outdoor Gear' AND (id != '58dd31c8-51a0-496d-a481-feafe9aec825');
UPDATE business_categories SET "parentId" = '58dd31c8-51a0-496d-a481-feafe9aec825', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet Picture Frames' AND (id != '58dd31c8-51a0-496d-a481-feafe9aec825');
UPDATE business_categories SET "parentId" = '58dd31c8-51a0-496d-a481-feafe9aec825', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet Strollers' AND (id != '58dd31c8-51a0-496d-a481-feafe9aec825');
UPDATE business_categories SET "parentId" = '58dd31c8-51a0-496d-a481-feafe9aec825', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet accessories' AND (id != '58dd31c8-51a0-496d-a481-feafe9aec825');
UPDATE business_categories SET "parentId" = '58dd31c8-51a0-496d-a481-feafe9aec825', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet bed & crate mat' AND (id != '58dd31c8-51a0-496d-a481-feafe9aec825');
UPDATE business_categories SET "parentId" = '58dd31c8-51a0-496d-a481-feafe9aec825', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet blankets & covers' AND (id != '58dd31c8-51a0-496d-a481-feafe9aec825');
UPDATE business_categories SET "parentId" = '58dd31c8-51a0-496d-a481-feafe9aec825', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet bowls' AND (id != '58dd31c8-51a0-496d-a481-feafe9aec825');
UPDATE business_categories SET "parentId" = '58dd31c8-51a0-496d-a481-feafe9aec825', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet bowls & feeders' AND (id != '58dd31c8-51a0-496d-a481-feafe9aec825');
UPDATE business_categories SET "parentId" = '58dd31c8-51a0-496d-a481-feafe9aec825', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet carrier' AND (id != '58dd31c8-51a0-496d-a481-feafe9aec825');
UPDATE business_categories SET "parentId" = '58dd31c8-51a0-496d-a481-feafe9aec825', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet feeders & appliances' AND (id != '58dd31c8-51a0-496d-a481-feafe9aec825');
UPDATE business_categories SET "parentId" = '58dd31c8-51a0-496d-a481-feafe9aec825', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet food storage containers & scoops' AND (id != '58dd31c8-51a0-496d-a481-feafe9aec825');
UPDATE business_categories SET "parentId" = '58dd31c8-51a0-496d-a481-feafe9aec825', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet functional clothing' AND (id != '58dd31c8-51a0-496d-a481-feafe9aec825');
UPDATE business_categories SET "parentId" = '58dd31c8-51a0-496d-a481-feafe9aec825', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet furniture' AND (id != '58dd31c8-51a0-496d-a481-feafe9aec825');
UPDATE business_categories SET "parentId" = '58dd31c8-51a0-496d-a481-feafe9aec825', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet glasses' AND (id != '58dd31c8-51a0-496d-a481-feafe9aec825');
UPDATE business_categories SET "parentId" = '58dd31c8-51a0-496d-a481-feafe9aec825', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet hammock & window perches' AND (id != '58dd31c8-51a0-496d-a481-feafe9aec825');
UPDATE business_categories SET "parentId" = '58dd31c8-51a0-496d-a481-feafe9aec825', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet headwear' AND (id != '58dd31c8-51a0-496d-a481-feafe9aec825');
UPDATE business_categories SET "parentId" = '58dd31c8-51a0-496d-a481-feafe9aec825', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet houses & cages' AND (id != '58dd31c8-51a0-496d-a481-feafe9aec825');
UPDATE business_categories SET "parentId" = '58dd31c8-51a0-496d-a481-feafe9aec825', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet memorial' AND (id != '58dd31c8-51a0-496d-a481-feafe9aec825');
UPDATE business_categories SET "parentId" = '58dd31c8-51a0-496d-a481-feafe9aec825', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet placemats' AND (id != '58dd31c8-51a0-496d-a481-feafe9aec825');
UPDATE business_categories SET "parentId" = '58dd31c8-51a0-496d-a481-feafe9aec825', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet storage & organization' AND (id != '58dd31c8-51a0-496d-a481-feafe9aec825');
UPDATE business_categories SET "parentId" = '58dd31c8-51a0-496d-a481-feafe9aec825', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet supplies' AND (id != '58dd31c8-51a0-496d-a481-feafe9aec825');
UPDATE business_categories SET "parentId" = '58dd31c8-51a0-496d-a481-feafe9aec825', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet treat pouch' AND (id != '58dd31c8-51a0-496d-a481-feafe9aec825');
UPDATE business_categories SET "parentId" = '58dd31c8-51a0-496d-a481-feafe9aec825', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet vehicle accessories' AND (id != '58dd31c8-51a0-496d-a481-feafe9aec825');
UPDATE business_categories SET "parentId" = '58dd31c8-51a0-496d-a481-feafe9aec825', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet waterers & fountains' AND (id != '58dd31c8-51a0-496d-a481-feafe9aec825');
UPDATE business_categories SET "parentId" = '58dd31c8-51a0-496d-a481-feafe9aec825', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Strollers' AND (id != '58dd31c8-51a0-496d-a481-feafe9aec825');

-- Computers and Office Technology (20)
UPDATE business_categories SET "parentId" = 'a3c3fc0b-7600-4a2d-8164-b7294e8e0d7b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Computer & office' AND (id != 'a3c3fc0b-7600-4a2d-8164-b7294e8e0d7b');
UPDATE business_categories SET "parentId" = 'a3c3fc0b-7600-4a2d-8164-b7294e8e0d7b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Computer accessories' AND (id != 'a3c3fc0b-7600-4a2d-8164-b7294e8e0d7b');
UPDATE business_categories SET "parentId" = 'a3c3fc0b-7600-4a2d-8164-b7294e8e0d7b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Computer components' AND (id != 'a3c3fc0b-7600-4a2d-8164-b7294e8e0d7b');
UPDATE business_categories SET "parentId" = 'a3c3fc0b-7600-4a2d-8164-b7294e8e0d7b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Computer peripherals' AND (id != 'a3c3fc0b-7600-4a2d-8164-b7294e8e0d7b');
UPDATE business_categories SET "parentId" = 'a3c3fc0b-7600-4a2d-8164-b7294e8e0d7b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Desktop pcs' AND (id != 'a3c3fc0b-7600-4a2d-8164-b7294e8e0d7b');
UPDATE business_categories SET "parentId" = 'a3c3fc0b-7600-4a2d-8164-b7294e8e0d7b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Household pest & mouse controls' AND (id != 'a3c3fc0b-7600-4a2d-8164-b7294e8e0d7b');
UPDATE business_categories SET "parentId" = 'a3c3fc0b-7600-4a2d-8164-b7294e8e0d7b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Keyboards & midi' AND (id != 'a3c3fc0b-7600-4a2d-8164-b7294e8e0d7b');
UPDATE business_categories SET "parentId" = 'a3c3fc0b-7600-4a2d-8164-b7294e8e0d7b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Keyboards & mouses' AND (id != 'a3c3fc0b-7600-4a2d-8164-b7294e8e0d7b');
UPDATE business_categories SET "parentId" = 'a3c3fc0b-7600-4a2d-8164-b7294e8e0d7b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Laptop accessories' AND (id != 'a3c3fc0b-7600-4a2d-8164-b7294e8e0d7b');
UPDATE business_categories SET "parentId" = 'a3c3fc0b-7600-4a2d-8164-b7294e8e0d7b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Laptop bags' AND (id != 'a3c3fc0b-7600-4a2d-8164-b7294e8e0d7b');
UPDATE business_categories SET "parentId" = 'a3c3fc0b-7600-4a2d-8164-b7294e8e0d7b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Laptop bags & cases' AND (id != 'a3c3fc0b-7600-4a2d-8164-b7294e8e0d7b');
UPDATE business_categories SET "parentId" = 'a3c3fc0b-7600-4a2d-8164-b7294e8e0d7b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Laptops' AND (id != 'a3c3fc0b-7600-4a2d-8164-b7294e8e0d7b');
UPDATE business_categories SET "parentId" = 'a3c3fc0b-7600-4a2d-8164-b7294e8e0d7b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Mini pcs' AND (id != 'a3c3fc0b-7600-4a2d-8164-b7294e8e0d7b');
UPDATE business_categories SET "parentId" = 'a3c3fc0b-7600-4a2d-8164-b7294e8e0d7b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Monitors' AND (id != 'a3c3fc0b-7600-4a2d-8164-b7294e8e0d7b');
UPDATE business_categories SET "parentId" = 'a3c3fc0b-7600-4a2d-8164-b7294e8e0d7b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Mouse mat' AND (id != 'a3c3fc0b-7600-4a2d-8164-b7294e8e0d7b');
UPDATE business_categories SET "parentId" = 'a3c3fc0b-7600-4a2d-8164-b7294e8e0d7b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Mouse pads & wrist rests' AND (id != 'a3c3fc0b-7600-4a2d-8164-b7294e8e0d7b');
UPDATE business_categories SET "parentId" = 'a3c3fc0b-7600-4a2d-8164-b7294e8e0d7b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Networking' AND (id != 'a3c3fc0b-7600-4a2d-8164-b7294e8e0d7b');
UPDATE business_categories SET "parentId" = 'a3c3fc0b-7600-4a2d-8164-b7294e8e0d7b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pc stands & fan' AND (id != 'a3c3fc0b-7600-4a2d-8164-b7294e8e0d7b');
UPDATE business_categories SET "parentId" = 'a3c3fc0b-7600-4a2d-8164-b7294e8e0d7b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Storage devices' AND (id != 'a3c3fc0b-7600-4a2d-8164-b7294e8e0d7b');
UPDATE business_categories SET "parentId" = 'a3c3fc0b-7600-4a2d-8164-b7294e8e0d7b', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Tablets pc' AND (id != 'a3c3fc0b-7600-4a2d-8164-b7294e8e0d7b');

-- Lighting and Smart Electronics (17)
UPDATE business_categories SET "parentId" = '0bfa39ba-1929-4913-a1d1-8c0188cffb64', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Consumer electronic' AND (id != '0bfa39ba-1929-4913-a1d1-8c0188cffb64');
UPDATE business_categories SET "parentId" = '0bfa39ba-1929-4913-a1d1-8c0188cffb64', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Electronics' AND (id != '0bfa39ba-1929-4913-a1d1-8c0188cffb64');
UPDATE business_categories SET "parentId" = '0bfa39ba-1929-4913-a1d1-8c0188cffb64', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Holiday lighting' AND (id != '0bfa39ba-1929-4913-a1d1-8c0188cffb64');
UPDATE business_categories SET "parentId" = '0bfa39ba-1929-4913-a1d1-8c0188cffb64', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Indoor lighting' AND (id != '0bfa39ba-1929-4913-a1d1-8c0188cffb64');
UPDATE business_categories SET "parentId" = '0bfa39ba-1929-4913-a1d1-8c0188cffb64', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Lamps & shades' AND (id != '0bfa39ba-1929-4913-a1d1-8c0188cffb64');
UPDATE business_categories SET "parentId" = '0bfa39ba-1929-4913-a1d1-8c0188cffb64', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Led lamps' AND (id != '0bfa39ba-1929-4913-a1d1-8c0188cffb64');
UPDATE business_categories SET "parentId" = '0bfa39ba-1929-4913-a1d1-8c0188cffb64', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Led lighting' AND (id != '0bfa39ba-1929-4913-a1d1-8c0188cffb64');
UPDATE business_categories SET "parentId" = '0bfa39ba-1929-4913-a1d1-8c0188cffb64', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Lighting & lamp' AND (id != '0bfa39ba-1929-4913-a1d1-8c0188cffb64');
UPDATE business_categories SET "parentId" = '0bfa39ba-1929-4913-a1d1-8c0188cffb64', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Lighting Assemblies' AND (id != '0bfa39ba-1929-4913-a1d1-8c0188cffb64');
UPDATE business_categories SET "parentId" = '0bfa39ba-1929-4913-a1d1-8c0188cffb64', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Motorcycle electronics' AND (id != '0bfa39ba-1929-4913-a1d1-8c0188cffb64');
UPDATE business_categories SET "parentId" = '0bfa39ba-1929-4913-a1d1-8c0188cffb64', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Novelty lighting' AND (id != '0bfa39ba-1929-4913-a1d1-8c0188cffb64');
UPDATE business_categories SET "parentId" = '0bfa39ba-1929-4913-a1d1-8c0188cffb64', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Oil lamps' AND (id != '0bfa39ba-1929-4913-a1d1-8c0188cffb64');
UPDATE business_categories SET "parentId" = '0bfa39ba-1929-4913-a1d1-8c0188cffb64', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Outdoor lighting' AND (id != '0bfa39ba-1929-4913-a1d1-8c0188cffb64');
UPDATE business_categories SET "parentId" = '0bfa39ba-1929-4913-a1d1-8c0188cffb64', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Portable lighting' AND (id != '0bfa39ba-1929-4913-a1d1-8c0188cffb64');
UPDATE business_categories SET "parentId" = '0bfa39ba-1929-4913-a1d1-8c0188cffb64', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Professional lighting' AND (id != '0bfa39ba-1929-4913-a1d1-8c0188cffb64');
UPDATE business_categories SET "parentId" = '0bfa39ba-1929-4913-a1d1-8c0188cffb64', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Smart electronics' AND (id != '0bfa39ba-1929-4913-a1d1-8c0188cffb64');
UPDATE business_categories SET "parentId" = '0bfa39ba-1929-4913-a1d1-8c0188cffb64', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Smart watches' AND (id != '0bfa39ba-1929-4913-a1d1-8c0188cffb64');

-- Fit and Size Collections (21)
UPDATE business_categories SET "parentId" = 'f1a24213-aa2f-41ed-af5a-bf4c102d2304', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Curve' AND (id != 'f1a24213-aa2f-41ed-af5a-bf4c102d2304');
UPDATE business_categories SET "parentId" = 'f1a24213-aa2f-41ed-af5a-bf4c102d2304', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Extended sizes' AND (id != 'f1a24213-aa2f-41ed-af5a-bf4c102d2304');
UPDATE business_categories SET "parentId" = 'f1a24213-aa2f-41ed-af5a-bf4c102d2304', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Maternity Collection' AND (id != 'f1a24213-aa2f-41ed-af5a-bf4c102d2304');
UPDATE business_categories SET "parentId" = 'f1a24213-aa2f-41ed-af5a-bf4c102d2304', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Maternity bottoms' AND (id != 'f1a24213-aa2f-41ed-af5a-bf4c102d2304');
UPDATE business_categories SET "parentId" = 'f1a24213-aa2f-41ed-af5a-bf4c102d2304', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Maternity clothing' AND (id != 'f1a24213-aa2f-41ed-af5a-bf4c102d2304');
UPDATE business_categories SET "parentId" = 'f1a24213-aa2f-41ed-af5a-bf4c102d2304', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Maternity coats & jackets' AND (id != 'f1a24213-aa2f-41ed-af5a-bf4c102d2304');
UPDATE business_categories SET "parentId" = 'f1a24213-aa2f-41ed-af5a-bf4c102d2304', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Maternity denim' AND (id != 'f1a24213-aa2f-41ed-af5a-bf4c102d2304');
UPDATE business_categories SET "parentId" = 'f1a24213-aa2f-41ed-af5a-bf4c102d2304', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Maternity dresses' AND (id != 'f1a24213-aa2f-41ed-af5a-bf4c102d2304');
UPDATE business_categories SET "parentId" = 'f1a24213-aa2f-41ed-af5a-bf4c102d2304', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Maternity gowns' AND (id != 'f1a24213-aa2f-41ed-af5a-bf4c102d2304');
UPDATE business_categories SET "parentId" = 'f1a24213-aa2f-41ed-af5a-bf4c102d2304', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Maternity photoshoot' AND (id != 'f1a24213-aa2f-41ed-af5a-bf4c102d2304');
UPDATE business_categories SET "parentId" = 'f1a24213-aa2f-41ed-af5a-bf4c102d2304', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Maternity pillows' AND (id != 'f1a24213-aa2f-41ed-af5a-bf4c102d2304');
UPDATE business_categories SET "parentId" = 'f1a24213-aa2f-41ed-af5a-bf4c102d2304', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Maternity sweaters' AND (id != 'f1a24213-aa2f-41ed-af5a-bf4c102d2304');
UPDATE business_categories SET "parentId" = 'f1a24213-aa2f-41ed-af5a-bf4c102d2304', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Maternity tops' AND (id != 'f1a24213-aa2f-41ed-af5a-bf4c102d2304');
UPDATE business_categories SET "parentId" = 'f1a24213-aa2f-41ed-af5a-bf4c102d2304', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Petite Collection' AND (id != 'f1a24213-aa2f-41ed-af5a-bf4c102d2304');
UPDATE business_categories SET "parentId" = 'f1a24213-aa2f-41ed-af5a-bf4c102d2304', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Petite Fit Collection' AND (id != 'f1a24213-aa2f-41ed-af5a-bf4c102d2304');
UPDATE business_categories SET "parentId" = 'f1a24213-aa2f-41ed-af5a-bf4c102d2304', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Plus Size Collection' AND (id != 'f1a24213-aa2f-41ed-af5a-bf4c102d2304');
UPDATE business_categories SET "parentId" = 'f1a24213-aa2f-41ed-af5a-bf4c102d2304', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Plus Size Collection (DD+)' AND (id != 'f1a24213-aa2f-41ed-af5a-bf4c102d2304');
UPDATE business_categories SET "parentId" = 'f1a24213-aa2f-41ed-af5a-bf4c102d2304', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Plus Size Curve Collection' AND (id != 'f1a24213-aa2f-41ed-af5a-bf4c102d2304');
UPDATE business_categories SET "parentId" = 'f1a24213-aa2f-41ed-af5a-bf4c102d2304', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Plus size clothing' AND (id != 'f1a24213-aa2f-41ed-af5a-bf4c102d2304');
UPDATE business_categories SET "parentId" = 'f1a24213-aa2f-41ed-af5a-bf4c102d2304', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Tall Fit Collection' AND (id != 'f1a24213-aa2f-41ed-af5a-bf4c102d2304');
UPDATE business_categories SET "parentId" = 'f1a24213-aa2f-41ed-af5a-bf4c102d2304', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women plus size' AND (id != 'f1a24213-aa2f-41ed-af5a-bf4c102d2304');

-- Gifts and Seasonal Items (12)
UPDATE business_categories SET "parentId" = '12d1d6d3-6e01-4c7e-a58b-21bbc154395c', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Customized gift packaging' AND (id != '12d1d6d3-6e01-4c7e-a58b-21bbc154395c');
UPDATE business_categories SET "parentId" = '12d1d6d3-6e01-4c7e-a58b-21bbc154395c', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'For Birthday' AND (id != '12d1d6d3-6e01-4c7e-a58b-21bbc154395c');
UPDATE business_categories SET "parentId" = '12d1d6d3-6e01-4c7e-a58b-21bbc154395c', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'For Father' AND (id != '12d1d6d3-6e01-4c7e-a58b-21bbc154395c');
UPDATE business_categories SET "parentId" = '12d1d6d3-6e01-4c7e-a58b-21bbc154395c', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'For Lover' AND (id != '12d1d6d3-6e01-4c7e-a58b-21bbc154395c');
UPDATE business_categories SET "parentId" = '12d1d6d3-6e01-4c7e-a58b-21bbc154395c', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'For Mother' AND (id != '12d1d6d3-6e01-4c7e-a58b-21bbc154395c');
UPDATE business_categories SET "parentId" = '12d1d6d3-6e01-4c7e-a58b-21bbc154395c', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'For Wedding' AND (id != '12d1d6d3-6e01-4c7e-a58b-21bbc154395c');
UPDATE business_categories SET "parentId" = '12d1d6d3-6e01-4c7e-a58b-21bbc154395c', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Gift guide' AND (id != '12d1d6d3-6e01-4c7e-a58b-21bbc154395c');
UPDATE business_categories SET "parentId" = '12d1d6d3-6e01-4c7e-a58b-21bbc154395c', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Gift sets' AND (id != '12d1d6d3-6e01-4c7e-a58b-21bbc154395c');
UPDATE business_categories SET "parentId" = '12d1d6d3-6e01-4c7e-a58b-21bbc154395c', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Gift wrapping supplies' AND (id != '12d1d6d3-6e01-4c7e-a58b-21bbc154395c');
UPDATE business_categories SET "parentId" = '12d1d6d3-6e01-4c7e-a58b-21bbc154395c', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Holiday ornament storage' AND (id != '12d1d6d3-6e01-4c7e-a58b-21bbc154395c');
UPDATE business_categories SET "parentId" = '12d1d6d3-6e01-4c7e-a58b-21bbc154395c', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Seasonal decor' AND (id != '12d1d6d3-6e01-4c7e-a58b-21bbc154395c');
UPDATE business_categories SET "parentId" = '12d1d6d3-6e01-4c7e-a58b-21bbc154395c', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Watch gift set' AND (id != '12d1d6d3-6e01-4c7e-a58b-21bbc154395c');

-- Pet Care and Grooming (19)
UPDATE business_categories SET "parentId" = 'a20f3791-1ea7-4fc3-bcfe-2ac1184c8776', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Electronic pet collars, leashes & harnesses' AND (id != 'a20f3791-1ea7-4fc3-bcfe-2ac1184c8776');
UPDATE business_categories SET "parentId" = 'a20f3791-1ea7-4fc3-bcfe-2ac1184c8776', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet First Aid' AND (id != 'a20f3791-1ea7-4fc3-bcfe-2ac1184c8776');
UPDATE business_categories SET "parentId" = 'a20f3791-1ea7-4fc3-bcfe-2ac1184c8776', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet cleaning' AND (id != 'a20f3791-1ea7-4fc3-bcfe-2ac1184c8776');
UPDATE business_categories SET "parentId" = 'a20f3791-1ea7-4fc3-bcfe-2ac1184c8776', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet clothing' AND (id != 'a20f3791-1ea7-4fc3-bcfe-2ac1184c8776');
UPDATE business_categories SET "parentId" = 'a20f3791-1ea7-4fc3-bcfe-2ac1184c8776', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet clothing set' AND (id != 'a20f3791-1ea7-4fc3-bcfe-2ac1184c8776');
UPDATE business_categories SET "parentId" = 'a20f3791-1ea7-4fc3-bcfe-2ac1184c8776', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet collars' AND (id != 'a20f3791-1ea7-4fc3-bcfe-2ac1184c8776');
UPDATE business_categories SET "parentId" = 'a20f3791-1ea7-4fc3-bcfe-2ac1184c8776', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet collars, leashes & harnesses sets' AND (id != 'a20f3791-1ea7-4fc3-bcfe-2ac1184c8776');
UPDATE business_categories SET "parentId" = 'a20f3791-1ea7-4fc3-bcfe-2ac1184c8776', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet grooming' AND (id != 'a20f3791-1ea7-4fc3-bcfe-2ac1184c8776');
UPDATE business_categories SET "parentId" = 'a20f3791-1ea7-4fc3-bcfe-2ac1184c8776', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet harnesses' AND (id != 'a20f3791-1ea7-4fc3-bcfe-2ac1184c8776');
UPDATE business_categories SET "parentId" = 'a20f3791-1ea7-4fc3-bcfe-2ac1184c8776', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet health care' AND (id != 'a20f3791-1ea7-4fc3-bcfe-2ac1184c8776');
UPDATE business_categories SET "parentId" = 'a20f3791-1ea7-4fc3-bcfe-2ac1184c8776', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet id tags' AND (id != 'a20f3791-1ea7-4fc3-bcfe-2ac1184c8776');
UPDATE business_categories SET "parentId" = 'a20f3791-1ea7-4fc3-bcfe-2ac1184c8776', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet leashes' AND (id != 'a20f3791-1ea7-4fc3-bcfe-2ac1184c8776');
UPDATE business_categories SET "parentId" = 'a20f3791-1ea7-4fc3-bcfe-2ac1184c8776', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet muzzles' AND (id != 'a20f3791-1ea7-4fc3-bcfe-2ac1184c8776');
UPDATE business_categories SET "parentId" = 'a20f3791-1ea7-4fc3-bcfe-2ac1184c8776', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet recovery collars' AND (id != 'a20f3791-1ea7-4fc3-bcfe-2ac1184c8776');
UPDATE business_categories SET "parentId" = 'a20f3791-1ea7-4fc3-bcfe-2ac1184c8776', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet shoes & socks' AND (id != 'a20f3791-1ea7-4fc3-bcfe-2ac1184c8776');
UPDATE business_categories SET "parentId" = 'a20f3791-1ea7-4fc3-bcfe-2ac1184c8776', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet shower & bath accessories' AND (id != 'a20f3791-1ea7-4fc3-bcfe-2ac1184c8776');
UPDATE business_categories SET "parentId" = 'a20f3791-1ea7-4fc3-bcfe-2ac1184c8776', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet stain & odor removers' AND (id != 'a20f3791-1ea7-4fc3-bcfe-2ac1184c8776');
UPDATE business_categories SET "parentId" = 'a20f3791-1ea7-4fc3-bcfe-2ac1184c8776', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Small Pet Clothing' AND (id != 'a20f3791-1ea7-4fc3-bcfe-2ac1184c8776');
UPDATE business_categories SET "parentId" = 'a20f3791-1ea7-4fc3-bcfe-2ac1184c8776', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Urine isolation pads' AND (id != 'a20f3791-1ea7-4fc3-bcfe-2ac1184c8776');

-- Pet Toys and Training (8)
UPDATE business_categories SET "parentId" = '0ab575fe-7231-45e0-9eff-43d9f9923eed', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Electronic pet toys' AND (id != '0ab575fe-7231-45e0-9eff-43d9f9923eed');
UPDATE business_categories SET "parentId" = '0ab575fe-7231-45e0-9eff-43d9f9923eed', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Electronic pet training & behavior' AND (id != '0ab575fe-7231-45e0-9eff-43d9f9923eed');
UPDATE business_categories SET "parentId" = '0ab575fe-7231-45e0-9eff-43d9f9923eed', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet chasing toys' AND (id != '0ab575fe-7231-45e0-9eff-43d9f9923eed');
UPDATE business_categories SET "parentId" = '0ab575fe-7231-45e0-9eff-43d9f9923eed', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet chew toys' AND (id != '0ab575fe-7231-45e0-9eff-43d9f9923eed');
UPDATE business_categories SET "parentId" = '0ab575fe-7231-45e0-9eff-43d9f9923eed', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet plush toys' AND (id != '0ab575fe-7231-45e0-9eff-43d9f9923eed');
UPDATE business_categories SET "parentId" = '0ab575fe-7231-45e0-9eff-43d9f9923eed', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet sound toys' AND (id != '0ab575fe-7231-45e0-9eff-43d9f9923eed');
UPDATE business_categories SET "parentId" = '0ab575fe-7231-45e0-9eff-43d9f9923eed', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet toy sets' AND (id != '0ab575fe-7231-45e0-9eff-43d9f9923eed');
UPDATE business_categories SET "parentId" = '0ab575fe-7231-45e0-9eff-43d9f9923eed', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Pet training & puzzle toys' AND (id != '0ab575fe-7231-45e0-9eff-43d9f9923eed');

-- Nails and Grooming (20)
UPDATE business_categories SET "parentId" = '8dddbe60-e664-4cd1-ae9c-0d3cf78c70aa', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Eyebrow Razor' AND (id != '8dddbe60-e664-4cd1-ae9c-0d3cf78c70aa');
UPDATE business_categories SET "parentId" = '8dddbe60-e664-4cd1-ae9c-0d3cf78c70aa', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'For Nails' AND (id != '8dddbe60-e664-4cd1-ae9c-0d3cf78c70aa');
UPDATE business_categories SET "parentId" = '8dddbe60-e664-4cd1-ae9c-0d3cf78c70aa', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Gel nail polish' AND (id != '8dddbe60-e664-4cd1-ae9c-0d3cf78c70aa');
UPDATE business_categories SET "parentId" = '8dddbe60-e664-4cd1-ae9c-0d3cf78c70aa', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Hand, foot & nail tools' AND (id != '8dddbe60-e664-4cd1-ae9c-0d3cf78c70aa');
UPDATE business_categories SET "parentId" = '8dddbe60-e664-4cd1-ae9c-0d3cf78c70aa', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Man shaving & accessories and nose hair trimmer' AND (id != '8dddbe60-e664-4cd1-ae9c-0d3cf78c70aa');
UPDATE business_categories SET "parentId" = '8dddbe60-e664-4cd1-ae9c-0d3cf78c70aa', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Nail art equipments' AND (id != '8dddbe60-e664-4cd1-ae9c-0d3cf78c70aa');
UPDATE business_categories SET "parentId" = '8dddbe60-e664-4cd1-ae9c-0d3cf78c70aa', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Nail art salon sets' AND (id != '8dddbe60-e664-4cd1-ae9c-0d3cf78c70aa');
UPDATE business_categories SET "parentId" = '8dddbe60-e664-4cd1-ae9c-0d3cf78c70aa', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Nail art tools' AND (id != '8dddbe60-e664-4cd1-ae9c-0d3cf78c70aa');
UPDATE business_categories SET "parentId" = '8dddbe60-e664-4cd1-ae9c-0d3cf78c70aa', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Nail glue & adhesive' AND (id != '8dddbe60-e664-4cd1-ae9c-0d3cf78c70aa');
UPDATE business_categories SET "parentId" = '8dddbe60-e664-4cd1-ae9c-0d3cf78c70aa', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Nail polish removers' AND (id != '8dddbe60-e664-4cd1-ae9c-0d3cf78c70aa');
UPDATE business_categories SET "parentId" = '8dddbe60-e664-4cd1-ae9c-0d3cf78c70aa', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Nail powder & liquids' AND (id != '8dddbe60-e664-4cd1-ae9c-0d3cf78c70aa');
UPDATE business_categories SET "parentId" = '8dddbe60-e664-4cd1-ae9c-0d3cf78c70aa', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Nails' AND (id != '8dddbe60-e664-4cd1-ae9c-0d3cf78c70aa');
UPDATE business_categories SET "parentId" = '8dddbe60-e664-4cd1-ae9c-0d3cf78c70aa', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Oral Care Essentials' AND (id != '8dddbe60-e664-4cd1-ae9c-0d3cf78c70aa');
UPDATE business_categories SET "parentId" = '8dddbe60-e664-4cd1-ae9c-0d3cf78c70aa', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Oral care' AND (id != '8dddbe60-e664-4cd1-ae9c-0d3cf78c70aa');
UPDATE business_categories SET "parentId" = '8dddbe60-e664-4cd1-ae9c-0d3cf78c70aa', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Press on nails' AND (id != '8dddbe60-e664-4cd1-ae9c-0d3cf78c70aa');
UPDATE business_categories SET "parentId" = '8dddbe60-e664-4cd1-ae9c-0d3cf78c70aa', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Shaving & hair removal' AND (id != '8dddbe60-e664-4cd1-ae9c-0d3cf78c70aa');
UPDATE business_categories SET "parentId" = '8dddbe60-e664-4cd1-ae9c-0d3cf78c70aa', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Super Clean Toothbrush' AND (id != '8dddbe60-e664-4cd1-ae9c-0d3cf78c70aa');
UPDATE business_categories SET "parentId" = '8dddbe60-e664-4cd1-ae9c-0d3cf78c70aa', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Teeth Whitening Oral Care' AND (id != '8dddbe60-e664-4cd1-ae9c-0d3cf78c70aa');
UPDATE business_categories SET "parentId" = '8dddbe60-e664-4cd1-ae9c-0d3cf78c70aa', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Toothbrush' AND (id != '8dddbe60-e664-4cd1-ae9c-0d3cf78c70aa');
UPDATE business_categories SET "parentId" = '8dddbe60-e664-4cd1-ae9c-0d3cf78c70aa', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Toothbrush First Choice' AND (id != '8dddbe60-e664-4cd1-ae9c-0d3cf78c70aa');

-- Men's Apparel Collections (12)
UPDATE business_categories SET "parentId" = '75cf812f-8a8a-4f1a-b5ee-c2e4e4f6648f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Men''s Basics Collection' AND (id != '75cf812f-8a8a-4f1a-b5ee-c2e4e4f6648f');
UPDATE business_categories SET "parentId" = '75cf812f-8a8a-4f1a-b5ee-c2e4e4f6648f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Men''s Casual Comfort Collection' AND (id != '75cf812f-8a8a-4f1a-b5ee-c2e4e4f6648f');
UPDATE business_categories SET "parentId" = '75cf812f-8a8a-4f1a-b5ee-c2e4e4f6648f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Men''s Contemporary Collection' AND (id != '75cf812f-8a8a-4f1a-b5ee-c2e4e4f6648f');
UPDATE business_categories SET "parentId" = '75cf812f-8a8a-4f1a-b5ee-c2e4e4f6648f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Men''s Emerging Trends Collection' AND (id != '75cf812f-8a8a-4f1a-b5ee-c2e4e4f6648f');
UPDATE business_categories SET "parentId" = '75cf812f-8a8a-4f1a-b5ee-c2e4e4f6648f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Men''s Essentials Collection' AND (id != '75cf812f-8a8a-4f1a-b5ee-c2e4e4f6648f');
UPDATE business_categories SET "parentId" = '75cf812f-8a8a-4f1a-b5ee-c2e4e4f6648f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Men''s Nightlife Collection' AND (id != '75cf812f-8a8a-4f1a-b5ee-c2e4e4f6648f');
UPDATE business_categories SET "parentId" = '75cf812f-8a8a-4f1a-b5ee-c2e4e4f6648f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Men''s Resort Wear Collection' AND (id != '75cf812f-8a8a-4f1a-b5ee-c2e4e4f6648f');
UPDATE business_categories SET "parentId" = '75cf812f-8a8a-4f1a-b5ee-c2e4e4f6648f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Men''s Statement Collection' AND (id != '75cf812f-8a8a-4f1a-b5ee-c2e4e4f6648f');
UPDATE business_categories SET "parentId" = '75cf812f-8a8a-4f1a-b5ee-c2e4e4f6648f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Men''s Street Style Collection' AND (id != '75cf812f-8a8a-4f1a-b5ee-c2e4e4f6648f');
UPDATE business_categories SET "parentId" = '75cf812f-8a8a-4f1a-b5ee-c2e4e4f6648f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Men''s Streetwear Collection' AND (id != '75cf812f-8a8a-4f1a-b5ee-c2e4e4f6648f');
UPDATE business_categories SET "parentId" = '75cf812f-8a8a-4f1a-b5ee-c2e4e4f6648f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Men''s Urban Casual Collection' AND (id != '75cf812f-8a8a-4f1a-b5ee-c2e4e4f6648f');
UPDATE business_categories SET "parentId" = '75cf812f-8a8a-4f1a-b5ee-c2e4e4f6648f', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Men''s Vacation Wear Collection' AND (id != '75cf812f-8a8a-4f1a-b5ee-c2e4e4f6648f');

-- Women's Apparel Collections (44)
UPDATE business_categories SET "parentId" = 'ef24ffb9-0436-4b49-809c-394c69ce5ae7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Contemporary Women''s Fashion Collection' AND (id != 'ef24ffb9-0436-4b49-809c-394c69ce5ae7');
UPDATE business_categories SET "parentId" = 'ef24ffb9-0436-4b49-809c-394c69ce5ae7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Trendy Women''s Fashion Collection' AND (id != 'ef24ffb9-0436-4b49-809c-394c69ce5ae7');
UPDATE business_categories SET "parentId" = 'ef24ffb9-0436-4b49-809c-394c69ce5ae7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Basics Collection' AND (id != 'ef24ffb9-0436-4b49-809c-394c69ce5ae7');
UPDATE business_categories SET "parentId" = 'ef24ffb9-0436-4b49-809c-394c69ce5ae7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Bohemian Collection' AND (id != 'ef24ffb9-0436-4b49-809c-394c69ce5ae7');
UPDATE business_categories SET "parentId" = 'ef24ffb9-0436-4b49-809c-394c69ce5ae7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Bold Trendy Collection' AND (id != 'ef24ffb9-0436-4b49-809c-394c69ce5ae7');
UPDATE business_categories SET "parentId" = 'ef24ffb9-0436-4b49-809c-394c69ce5ae7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Business Casual Collection' AND (id != 'ef24ffb9-0436-4b49-809c-394c69ce5ae7');
UPDATE business_categories SET "parentId" = 'ef24ffb9-0436-4b49-809c-394c69ce5ae7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Casual Collection' AND (id != 'ef24ffb9-0436-4b49-809c-394c69ce5ae7');
UPDATE business_categories SET "parentId" = 'ef24ffb9-0436-4b49-809c-394c69ce5ae7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Classic Collection' AND (id != 'ef24ffb9-0436-4b49-809c-394c69ce5ae7');
UPDATE business_categories SET "parentId" = 'ef24ffb9-0436-4b49-809c-394c69ce5ae7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Contemporary Collection' AND (id != 'ef24ffb9-0436-4b49-809c-394c69ce5ae7');
UPDATE business_categories SET "parentId" = 'ef24ffb9-0436-4b49-809c-394c69ce5ae7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Cottagecore Loungewear Collection' AND (id != 'ef24ffb9-0436-4b49-809c-394c69ce5ae7');
UPDATE business_categories SET "parentId" = 'ef24ffb9-0436-4b49-809c-394c69ce5ae7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Decades-Inspired Collection' AND (id != 'ef24ffb9-0436-4b49-809c-394c69ce5ae7');
UPDATE business_categories SET "parentId" = 'ef24ffb9-0436-4b49-809c-394c69ce5ae7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Elegant Collection' AND (id != 'ef24ffb9-0436-4b49-809c-394c69ce5ae7');
UPDATE business_categories SET "parentId" = 'ef24ffb9-0436-4b49-809c-394c69ce5ae7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Essentials Collection' AND (id != 'ef24ffb9-0436-4b49-809c-394c69ce5ae7');
UPDATE business_categories SET "parentId" = 'ef24ffb9-0436-4b49-809c-394c69ce5ae7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Evening Collection' AND (id != 'ef24ffb9-0436-4b49-809c-394c69ce5ae7');
UPDATE business_categories SET "parentId" = 'ef24ffb9-0436-4b49-809c-394c69ce5ae7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Everyday Basics Collection' AND (id != 'ef24ffb9-0436-4b49-809c-394c69ce5ae7');
UPDATE business_categories SET "parentId" = 'ef24ffb9-0436-4b49-809c-394c69ce5ae7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Feminine Collection' AND (id != 'ef24ffb9-0436-4b49-809c-394c69ce5ae7');
UPDATE business_categories SET "parentId" = 'ef24ffb9-0436-4b49-809c-394c69ce5ae7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s General Collection' AND (id != 'ef24ffb9-0436-4b49-809c-394c69ce5ae7');
UPDATE business_categories SET "parentId" = 'ef24ffb9-0436-4b49-809c-394c69ce5ae7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Getaway Collection' AND (id != 'ef24ffb9-0436-4b49-809c-394c69ce5ae7');
UPDATE business_categories SET "parentId" = 'ef24ffb9-0436-4b49-809c-394c69ce5ae7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Glam Collection' AND (id != 'ef24ffb9-0436-4b49-809c-394c69ce5ae7');
UPDATE business_categories SET "parentId" = 'ef24ffb9-0436-4b49-809c-394c69ce5ae7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Global Print Collection' AND (id != 'ef24ffb9-0436-4b49-809c-394c69ce5ae7');
UPDATE business_categories SET "parentId" = 'ef24ffb9-0436-4b49-809c-394c69ce5ae7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Haute Couture-Inspired Collection' AND (id != 'ef24ffb9-0436-4b49-809c-394c69ce5ae7');
UPDATE business_categories SET "parentId" = 'ef24ffb9-0436-4b49-809c-394c69ce5ae7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Haute Fashion Collection' AND (id != 'ef24ffb9-0436-4b49-809c-394c69ce5ae7');
UPDATE business_categories SET "parentId" = 'ef24ffb9-0436-4b49-809c-394c69ce5ae7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Leisurewear Collection' AND (id != 'ef24ffb9-0436-4b49-809c-394c69ce5ae7');
UPDATE business_categories SET "parentId" = 'ef24ffb9-0436-4b49-809c-394c69ce5ae7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Luxe Evening Collection' AND (id != 'ef24ffb9-0436-4b49-809c-394c69ce5ae7');
UPDATE business_categories SET "parentId" = 'ef24ffb9-0436-4b49-809c-394c69ce5ae7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Mod Style Collection' AND (id != 'ef24ffb9-0436-4b49-809c-394c69ce5ae7');
UPDATE business_categories SET "parentId" = 'ef24ffb9-0436-4b49-809c-394c69ce5ae7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Modern Collection' AND (id != 'ef24ffb9-0436-4b49-809c-394c69ce5ae7');
UPDATE business_categories SET "parentId" = 'ef24ffb9-0436-4b49-809c-394c69ce5ae7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Modern Contemporary Collection' AND (id != 'ef24ffb9-0436-4b49-809c-394c69ce5ae7');
UPDATE business_categories SET "parentId" = 'ef24ffb9-0436-4b49-809c-394c69ce5ae7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Modest Wear Collection' AND (id != 'ef24ffb9-0436-4b49-809c-394c69ce5ae7');
UPDATE business_categories SET "parentId" = 'ef24ffb9-0436-4b49-809c-394c69ce5ae7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s New Arrivals Collection' AND (id != 'ef24ffb9-0436-4b49-809c-394c69ce5ae7');
UPDATE business_categories SET "parentId" = 'ef24ffb9-0436-4b49-809c-394c69ce5ae7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Parisian Style Collection' AND (id != 'ef24ffb9-0436-4b49-809c-394c69ce5ae7');
UPDATE business_categories SET "parentId" = 'ef24ffb9-0436-4b49-809c-394c69ce5ae7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Premium Collection' AND (id != 'ef24ffb9-0436-4b49-809c-394c69ce5ae7');
UPDATE business_categories SET "parentId" = 'ef24ffb9-0436-4b49-809c-394c69ce5ae7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Refined Elegant Collection' AND (id != 'ef24ffb9-0436-4b49-809c-394c69ce5ae7');
UPDATE business_categories SET "parentId" = 'ef24ffb9-0436-4b49-809c-394c69ce5ae7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Relaxed Casual Collection' AND (id != 'ef24ffb9-0436-4b49-809c-394c69ce5ae7');
UPDATE business_categories SET "parentId" = 'ef24ffb9-0436-4b49-809c-394c69ce5ae7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Resort Vacation Collection' AND (id != 'ef24ffb9-0436-4b49-809c-394c69ce5ae7');
UPDATE business_categories SET "parentId" = 'ef24ffb9-0436-4b49-809c-394c69ce5ae7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Retro Glam Collection' AND (id != 'ef24ffb9-0436-4b49-809c-394c69ce5ae7');
UPDATE business_categories SET "parentId" = 'ef24ffb9-0436-4b49-809c-394c69ce5ae7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Sculpting Shapewear Collection' AND (id != 'ef24ffb9-0436-4b49-809c-394c69ce5ae7');
UPDATE business_categories SET "parentId" = 'ef24ffb9-0436-4b49-809c-394c69ce5ae7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Shapewear-Inspired Collection' AND (id != 'ef24ffb9-0436-4b49-809c-394c69ce5ae7');
UPDATE business_categories SET "parentId" = 'ef24ffb9-0436-4b49-809c-394c69ce5ae7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Silky Fabrics Collection' AND (id != 'ef24ffb9-0436-4b49-809c-394c69ce5ae7');
UPDATE business_categories SET "parentId" = 'ef24ffb9-0436-4b49-809c-394c69ce5ae7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Statement Collection' AND (id != 'ef24ffb9-0436-4b49-809c-394c69ce5ae7');
UPDATE business_categories SET "parentId" = 'ef24ffb9-0436-4b49-809c-394c69ce5ae7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Travel Chic Collection' AND (id != 'ef24ffb9-0436-4b49-809c-394c69ce5ae7');
UPDATE business_categories SET "parentId" = 'ef24ffb9-0436-4b49-809c-394c69ce5ae7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Trendy Collection' AND (id != 'ef24ffb9-0436-4b49-809c-394c69ce5ae7');
UPDATE business_categories SET "parentId" = 'ef24ffb9-0436-4b49-809c-394c69ce5ae7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Vacation Collection' AND (id != 'ef24ffb9-0436-4b49-809c-394c69ce5ae7');
UPDATE business_categories SET "parentId" = 'ef24ffb9-0436-4b49-809c-394c69ce5ae7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Varsity Style Collection' AND (id != 'ef24ffb9-0436-4b49-809c-394c69ce5ae7');
UPDATE business_categories SET "parentId" = 'ef24ffb9-0436-4b49-809c-394c69ce5ae7', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Women''s Workwear Collection' AND (id != 'ef24ffb9-0436-4b49-809c-394c69ce5ae7');

-- Motorcycle (4)
UPDATE business_categories SET "parentId" = '499c7169-900e-4291-a02a-07e7d4edaaaf', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Motorcycle accessories' AND (id != '499c7169-900e-4291-a02a-07e7d4edaaaf');
UPDATE business_categories SET "parentId" = '499c7169-900e-4291-a02a-07e7d4edaaaf', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Motorcycle protective gear' AND (id != '499c7169-900e-4291-a02a-07e7d4edaaaf');
UPDATE business_categories SET "parentId" = '499c7169-900e-4291-a02a-07e7d4edaaaf', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Motorcycle replacement parts' AND (id != '499c7169-900e-4291-a02a-07e7d4edaaaf');
UPDATE business_categories SET "parentId" = '499c7169-900e-4291-a02a-07e7d4edaaaf', "updatedAt" = NOW() WHERE "businessType" = 'clothing' AND name = 'Motorcycle storage' AND (id != '499c7169-900e-4291-a02a-07e7d4edaaaf');


-- Step 3: leave every category that is already business-owned (businessId is
-- not null -- a merchant created it themselves) or has a real
-- BusinessProducts / BarcodeInventoryItems / InventorySubcategories reference
-- exactly as it was (top-level, parentId null). 243 rows verified
-- read-only before this migration was written. Nothing else about these rows
-- (name, emoji, domainId) is touched -- only parentId is reset.
UPDATE business_categories SET "parentId" = NULL, "updatedAt" = NOW()
WHERE "businessType" = 'clothing' AND id IN ('ccat_womens_tops', 'cat_wc_outfit_sets', 'ccat_fashion_acc', 'cat_mc_underwear', 'ccat_boys', 'ccat_mens_tops', 'ccat_infant', 'ccat_tops', 'ccat_girls', 'ccat_womens_footwear', '9693a621-0a07-45d0-a74a-e4ba887fd3c3', '0f16a215-83f2-4ade-983a-232c21c84f45', '247824f1-10d8-45e5-bc02-3110db5cb2f0', 'f9f0f612-2733-4bbd-ab00-99773955ffcd', 'cat_girl_acc', '8377429a-abf1-4b71-a0b2-118bc4b17cde', 'eb0f0cc9-725c-450c-9500-ff5a8ee61f6b', '28801095-f49d-493b-b04a-3bdc43c90a7d', 'af086be5-b3bb-490a-9f44-d73e64445334', 'd2f6e841-7471-4007-a97a-548450bf5a88', '2259bc96-8d32-4f3d-968d-8b79ff99ae1b', 'ba42efc4-28b8-4c3e-add9-86506fe7e337', 'ca133d91-0286-4ba0-9b04-466d35768923', 'c3fa2274-3998-49a2-a95c-192358e86b6b', 'f121db66-0472-4a91-9163-b5d0b24329df', '35d7db48-2d36-4128-b892-d5eb23a6aad4', 'e22ebf04-9d75-496b-a9ff-8eccba2e75b3', '07916142-1507-4797-97ae-b3660ebd75ae', '194921ea-46a9-4faa-ba0d-6734a0297d5b', '8d240fb1-0cea-4738-9044-c470441090f8', '2b1a22be-cf8d-4ab7-9cc7-4d19d4144813', 'ecfa4583-0e18-4d6d-ae85-b542ad96d23d', 'ccat_athleisure', '85baf03a-18f7-4088-9eef-c647571f0b3f', '1181ca01-afa3-4863-8f01-ed391abca2b1', '9d4fd1d2-0e4a-4aa4-90ba-08243b691a7e', 'dfe931de-6101-4e17-8f99-c75e726cdf11', '43d959ed-c39d-4ebb-a687-dd33c1c41697', 'ccat_headwear', 'a615240c-e9e4-4c02-beb5-d85c6b66c742', '08f702ae-887a-4529-adb0-b18ca73f3394', '43afdd7e-c138-4578-9587-9b6691970c65', 'ce80916f-b26b-4184-b8fe-d5a2116273d4', '4e6ecdf0-e2cd-4f85-9160-7e16d9534d85', '870593dd-1b6a-40fd-acd0-c03e369f06fa', 'e244c7d2-2b79-43ea-86ff-e84b1001cd84', 'f352e495-11ce-4e0c-8682-e86e3fb1c616', '4cce7b7c-5484-4b3c-8865-428e5da1d6b1', 'ecc8d926-e922-427e-b107-295e20932ff2', 'b7fd17c1-63c6-4408-80e2-fa148edd81ef', '54780537-0e9e-465c-b9c5-1bcbe4f10b4d', '50f6d0a4-0765-4f54-904e-4d528850d506', 'e180fdec-1516-4f4e-8f9e-5e5fdab66d72', '20080c33-216d-4a75-9fc9-70c804351000', 'a0ff478b-fc22-411c-94af-df151af7e1a7', 'ccat_womens_dresses', '15dfd005-647b-45a8-a59e-989733c7ca9a', 'aedded9d-b384-4fcb-ba1f-bb3297d0bc0f', '75719e38-0c95-48c6-bf26-563675cff006', 'ccat_formal_wear', 'c2d6d508-a123-4a8d-ba37-ea6ac7bdd6d4', 'ccat_womens_outer', '696bccf9-7093-4d5b-9e86-cf345bdecbfb', '439bdf8b-585d-489b-9f3b-0c55f6cf058d', '5acb5312-3ddc-42bd-9859-7d244500b241', '1c4adc99-49cb-48c5-aec7-92f2d24a04bd', 'db8c0a7f-a38c-4b3e-9147-d3dfb63a481a', '991e3189-a3bb-4acf-ae47-f8cd0c467874', 'e89af1f4-5fc4-4a02-8647-1c5420a7b96b', '9c45b21d-6c23-4013-a54e-a3757b7fd7ba', '08940b5c-224a-4b25-af20-daa0dd191264', '214bea19-49cf-48a6-8d12-639ca82d23ae', '964966f4-ec56-46e0-afdc-f29175291ef2', '7060de52-28af-49dc-966d-cf33671f6fc6', '975b39d6-6bad-4fdf-9012-ddc5d4511375', '239493e7-34ff-447a-b7c0-29aa2f761eba', 'd05c4a04-356b-4ae7-9a98-18150c378ffc', 'f56c472e-442c-4a9d-be9f-7dfc197d37b5', '79e88979-af54-488e-ae96-068b6b1c9733', 'e4e3c2c2-a987-4e73-ad50-9d80d8e2a9d2', 'b8c4491b-7c89-47ae-993b-bb71ce092aff', 'cc1b25c6-a477-4908-9b95-df48f55fc52b', '3938e1b6-7198-45e2-ba6a-6c50db670d96', '77802565-2267-4043-97ff-cd44e65b9926', '69c4a4dc-fb52-4282-9393-b63e3e1f124f', '8a353e90-ef60-4f85-bf0f-099bc47883c2', '126ad9e5-8d21-42eb-8bf9-f416e6e3f3e7', 'db8dbdf0-efe3-4ccc-b8cf-3c1c40e2a019', 'f5498de2-13f3-4473-bcfc-0c34959600d6', '88a4ee09-028f-47ca-888e-6321d4571805', '2dae8143-3f08-43f0-97cd-004bfcd89990', 'b7d08975-35b6-4cdd-a4db-cd376f2ea06e', '96e5959e-d45c-429d-a939-310b28d6e365', '70a87ef1-8f1d-4187-b95e-a42bc8c7ad0b', 'f1670a01-e715-4948-9d53-ad67d3217081', 'b39f837a-65ab-4995-9986-3c698ecad954', 'ef212a9b-a6e4-449d-90ab-396e0d5ede45', '3cfbbdfb-d5c8-4017-88ab-07bd6df8b117', '1278de76-6da5-40b2-8a0c-9369e6d5a037', '66884bf9-050e-4c2f-9d9c-113d46dc087c', 'b731ea08-401f-4339-9536-3ed093f8cdf0', '41aa4aae-265a-43ed-ad30-991a5168e843', '7483222d-ed13-41f6-97e7-d4706529e3e9', 'a884808d-ed71-420f-96c1-e1f906210460', '3cb814ee-991e-44b6-a53d-bffef6c4ccf1', 'ccat_sports_shoes', '7a975204-b42c-46bc-9424-7f0cd06c48be', '64ec349d-6335-434b-87c8-d6a99e63b9c7', '2afff4df-cd9d-4013-9966-d24ceb9989d3', 'e564b441-cbee-4680-98c3-1a17a7a2e69e', '740cf8dc-5f66-41fa-b982-328d7646f403', '2574537d-e40b-414d-92af-2cfde27da458', '7190ddea-360f-4b99-b38a-67afeedf3d24', '0778a52c-cc06-4952-8346-5b37747e26b2', 'a543a916-d4be-4b6f-88f4-bf446dbe04b1', '144438ca-d3e7-4aa3-97be-771475ad7bf7', 'ccat_casual_shoes', '17d07b24-e926-48f1-9cdb-2208a6d7e581', 'ccat_mens_footwear', '4a2259cd-05d3-40a6-9f80-bae11f13b998', 'f3728823-57e7-41f9-8a8e-3d0e7239a0e9', '06cbad7e-9ce6-4219-8256-3d918ee82e7d', 'e216f9f5-7856-4c46-81ba-d92ffa06f604', '275af7ee-deb4-4530-9591-4d25f28c2d9a', '3e1edb55-a9cd-4809-b0c4-072cdabe3019', '744e3bca-32c7-4500-a261-c1ee9269a070', '3ba7c9f1-1fb7-4cb0-9d74-8921a4f0e8a4', 'b2c9a47e-30f1-42c6-ad4e-a2d34a9f52ac', '830f70de-86d7-430c-9fe7-ee6c2d31cb12', 'e5ce8125-6d07-4829-ae05-5ee0fbb07e05', '4feccadd-ca0a-42cf-8e63-b72c8ce3a4c6', 'ccat_sportswear', 'f78faebe-7b00-4838-87fc-a924158f06cf', '87f13995-e0f5-4946-96cb-ea6ab73f5939', 'ef81c49f-57ce-49bc-98e2-e3f14fb9169f', '2159aede-6136-4f25-933a-aab81a1f6f5b', '9f00d4db-c2cc-4b51-939a-53629013cbb8', '730dc12c-1c93-42ba-b69a-cefdfe071bab', '193bcbf2-4994-43b2-bc61-d728a8c1eeb1', 'a60fd6b1-4f45-4b14-946e-b31c269bf9e1', '517fb553-bd24-49a3-bd8e-821fbef83b42', 'f31dae2b-eccf-49d8-bc22-6a8478f0ab5d', 'e42dcf79-6191-4565-9f8d-1e4cc756db08', 'fa3638eb-8117-415e-956c-6457c964567a', '2d5d5dc4-8ea3-452e-9213-34c33d06c249', '1eabc053-2d04-4173-b822-ab2ae88b2f43', '77cf4e8f-fb89-47a9-a9b4-d10b7b3b8070', '454b5d7c-4afe-4a3a-9824-930a1437c977', '753ea168-fb8b-45e8-af31-5e4add1bfea0', '4c281bc8-31e6-4bf9-b26e-b6931b3e36e9', 'a7e0ef23-85ac-4565-a927-6db69f128c30', 'ccat_mens_bottoms', '2ae0998c-bd3c-453c-9395-296206b3d668', 'fbe396af-c133-4058-bed5-095ea5ea1df7', 'b999b5c8-7c8e-4378-a825-853e24a245b0', '74ebda66-8707-42f5-bdcf-f8115c5452d0', 'b0a58425-6250-421b-a379-72afa23bae05', 'd2bb111f-5bb2-4c0d-8097-26cabadcb694', 'd5758711-3154-45fb-a170-d05af0907426', '226f436b-e5f7-4b86-aca3-e3a3f1160768', '9cd3dd58-4983-4a47-a2a6-53a8c7f2bb6c', 'f844cc69-d674-4c85-bc76-4d4a7e2573e3', 'cat_wc_intimates', 'cat_wc_footwear', 'cat_mc_accessories', 'cat_wc_knitwear', 'ccat_womens_bottoms', 'cat_td_tops', 'cat_girl_bottoms', 'cat_girl_outer', 'cat_girl_activewear', 'cat_wc_activewear', 'cat_girl_specialty', 'cat_td_dresses', 'cat_td_footwear', 'ccat_newborn', 'ccat_dresses', 'ccat_bottoms', 'ccat_outerwear', 'ccat_mens_outerwear', 'ccat_underwear', 'ccat_sleepwear', 'ccat_baby_acc_clth', 'ccat_workwear', 'ccat_cultural_wear', 'ccat_bags', 'ccat_formal_shoes', '01681ca0-00b2-4f79-b8b4-718792dfb77f', '14ac8723-6102-4cba-ab5b-f37eee362f7c', 'cc91836d-8ac2-416d-89df-7e6a8978680a', '456c142c-e9e0-49c7-a1a2-8b6d9d42a79b', '6b0070d5-22c4-4deb-9fa5-839c73d3f410', '881c3ad5-32b9-4248-a91e-8302f4c9100f', 'a9d34b30-0a7b-4136-a2c4-976aa9411abd', '65ee2dd2-4bda-44c0-b5a8-c08446efc395', '9f1971b5-7e49-4308-9768-fb332180292d', '428c3d64-1743-4f1c-9707-b1194e95eb59', '345c631a-6d40-4abf-961e-dc133351036b', '96733a47-1bf5-4ee3-a2ec-f7dac77279fc', 'cat_td_baby_basics', 'cat_boy_sleep', 'cat_boy_tops', 'cat_boy_outer', 'cat_boy_bottoms', 'cat_boy_acc', 'cat_boy_footwear', 'cat_td_accessories', 'cat_girl_tops', 'cat_girl_schoolwear', 'cat_girl_knitwear', 'cat_mc_suits', 'cat_mc_knitwear', 'cat_mc_activewear', 'cat_mc_specialty', 'cat_wc_outerwear', 'cat_wc_swimwear', 'cat_wc_sleepwear', 'cat_wc_workwear', 'cat_wc_occasion', 'cat_wc_accessories', 'cat_girl_dresses', 'cat_girl_underwear', 'cat_girl_footwear', 'cat_girl_sleep', 'cat_td_underwear', 'cat_td_activewear', 'cat_td_outerwear', 'cat_td_occasion', 'cat_td_knitwear', 'cat_td_bottoms', 'cat_td_sleepwear', 'ccat_wearable_acc', 'cat_wc_dresses', 'dab2f1cb-6a48-4984-8c69-00eb1d52dce8', 'b737558c-3f20-4d46-a611-9a1ffe366bb1', 'c93d8075-732a-40a2-849e-1066bb2f3253', 'b5b52970-2a1b-4d62-951e-2bda81b1f161', 'c0870b87-f0fd-4dc3-b11b-91d5c1419eea', '117c6c17-b54d-4884-9a6d-55f99437a8e1', '4d7c250c-bc2f-446e-afa8-ebd745fcad40', 'e401d9eb-9a7b-48ec-8291-e3892420eefa', '10f952e4-2945-49f4-814f-392109f823aa', '70aea2d4-c9d1-48c0-a7ca-e2fd882126f5');