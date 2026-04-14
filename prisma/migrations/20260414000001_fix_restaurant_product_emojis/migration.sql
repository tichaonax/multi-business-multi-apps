-- Fix restaurant product names: add missing emojis and normalise spelling
-- Business: HXI Eats (b9a622a5-c3b9-47c9-88ec-9569f512dbdf)

-- ── Sadza dishes ─────────────────────────────────────────────────────────────
UPDATE "business_products" SET name = '🍽️🐓 Sadza & 1pc Road Runner'       WHERE id = 'e5f305d3-976f-4f43-9865-5afd96caeed0';
UPDATE "business_products" SET name = '🍽️🥩 Sadza & 1pc Liver'             WHERE id = '70d86cc6-7b5b-4ea5-a3e3-03ffed97a381';
UPDATE "business_products" SET name = '🍽️🦴 Sadza & 1pc Zondo'             WHERE id = 'b485d455-fa67-4969-a339-8d69a65063b8';
UPDATE "business_products" SET name = '🍽️🐓 Sadza & Road Runner 2pc'       WHERE id = 'ae80f4f5-b31c-4406-9f67-bc93af0037e3';
UPDATE "business_products" SET name = '🍽️🐟 Sadza & Small Fish'            WHERE id = 'afa094cd-de37-4276-89e5-3d5768745b07';

-- ── Rice dishes ──────────────────────────────────────────────────────────────
UPDATE "business_products" SET name = '🍚🥩 Rice & 1pc Liver'              WHERE id = 'd4c189ae-6f7d-40b7-afb1-3a816fc117aa';
UPDATE "business_products" SET name = '🍚🐓 Rice & 2pc Road Runner & Salad' WHERE id = '687c6c03-89d3-4607-a202-14db01ec7092';
UPDATE "business_products" SET name = '🍚🐔 Rice & 1pc Chicken'            WHERE id = '68ae4df0-b888-4c46-b70c-f79628e63f07';
UPDATE "business_products" SET name = '🍚🥩 Rice & 2pc Liver'              WHERE id = 'dd98b0f0-f46c-45c1-a052-7a7ba95a4efe';
UPDATE "business_products" SET name = '🍚🫘 Rice & Beans'                  WHERE id = '6b5808f5-8743-458c-871e-68319f0e59d6';

-- ── Spaghetti dishes ─────────────────────────────────────────────────────────
UPDATE "business_products" SET name = '🍝 Spaghetti'                       WHERE id = 'b51100eb-f6e0-4e54-8aff-c121f2b3f805';
UPDATE "business_products" SET name = '🍝🐔 Spaghetti & Chicken'           WHERE id = '8af55925-0d04-47bf-92f3-79c2e0eafabd';
UPDATE "business_products" SET name = '🍝🥩 Spaghetti Bolognese'           WHERE id = '8ca605c2-33a5-4e33-af6b-26079473ee20';
UPDATE "business_products" SET name = '🍝🐔 Spaghetti, Chicken & Salad'    WHERE id = '7c7618c9-9525-4de1-b9f0-b7919a57d434';

-- ── Chicken / meat dishes ────────────────────────────────────────────────────
UPDATE "business_products" SET name = '🐔🍟 Quarter Chicken & Chips'       WHERE id = '950ee07f-ba01-407c-9ccd-eb5ce9a33425';
UPDATE "business_products" SET name = '🌭🍟 Russian & Chips'               WHERE id = '6471fcbb-fe02-4ff1-8e22-5cadd5181604';
UPDATE "business_products" SET name = '🍔🍟 Beef Burger & Fries'           WHERE id = 'a17d1903-7b65-46c4-96bd-2e2f7700eada';
UPDATE "business_products" SET name = '🐔 Grilled Chicken Breast'          WHERE id = '4d8b2486-d103-4970-ad51-fcd4a39a226f';
UPDATE "business_products" SET name = '🐔 Chicken Wings (8pc)'             WHERE id = '61776d44-4a4d-4c42-abf2-d759eea4252f';

-- ── Drinks ───────────────────────────────────────────────────────────────────
UPDATE "business_products" SET name = '🍹 Citro'                           WHERE id = 'ed2a2c66-999e-4f2d-9afa-71b643fe3995';
UPDATE "business_products" SET name = '🍹 Fizzi'                           WHERE id = '43daea13-065b-44c6-9cee-5ec1a7bfa8d2';
UPDATE "business_products" SET name = '🍹 Pet Coke'                        WHERE id = '4be79896-91c6-4902-8f57-306c6095ea10';
UPDATE "business_products" SET name = '🍹 Coca-Cola 330ml'                 WHERE id = '862334f9-7765-4439-ab6d-18d7a7457387';
UPDATE "business_products" SET name = '🍹 Mixed Juice'                     WHERE id = '1e0fdacc-a664-4852-9611-9e7b902dc4a2';
UPDATE "business_products" SET name = '🍹 Maheu'                           WHERE id = '6245e90c-c136-4597-b0ed-aaef2a43f62b';
UPDATE "business_products" SET name = '🍹 Pfuko Maheu 500ml'               WHERE id = '8ab8efc9-783c-4e94-8382-36914e1da671';
UPDATE "business_products" SET name = '🍹 Revive 500ml'                    WHERE id = '80cfd35d-d800-4a04-ad4f-9cf2a778553b';
UPDATE "business_products" SET name = '🍊 Orange Juice (Fresh)'            WHERE id = '39bd6988-77fd-4c81-8a96-fd1fad024bb1';
UPDATE "business_products" SET name = '🍊 Orange Juice 250ml'              WHERE id = '551935da-e34e-4f7e-870c-fb2cb2f62f07';
UPDATE "business_products" SET name = '🚰 Sparkling Water 500ml'           WHERE id = '16fcf4e3-71bd-463b-99b4-bc2e83a2becf';
UPDATE "business_products" SET name = '🚰 Water'                           WHERE id = '5976c7c9-209e-4e01-990d-d128436804b2';
UPDATE "business_products" SET name = '🍹 Soft Drink'                      WHERE id = '858652fa-1570-4048-9317-f216de8de3d4';
UPDATE "business_products" SET name = '☕ Coffee'                           WHERE id = '0397a679-63ee-4c03-9897-1626af1c4e54';

-- ── Salads / sides ───────────────────────────────────────────────────────────
UPDATE "business_products" SET name = '🥗 Salad'                           WHERE id = '5f4a829d-1f1f-49a6-8a82-1d8eb94b0119';
UPDATE "business_products" SET name = '🥗 Salad'                           WHERE id = 'c28ef5f0-22f0-4ab6-a8fb-3548e1c29b79';
UPDATE "business_products" SET name = '🥗 Caesar Salad'                    WHERE id = 'ba2fc2b9-29ec-4af5-9155-85ffbb152593';
UPDATE "business_products" SET name = '🍽️ Chimbutu'                        WHERE id = '8ed87857-f7c0-4f43-a8ef-4ea2644f1303';
UPDATE "business_products" SET name = '🐟🍟 Fish & Chips'                  WHERE id = '1489fc0e-44b1-4bf3-bea6-6b9bd52917af';
UPDATE "business_products" SET name = '🍞 Garlic Bread'                    WHERE id = '392585aa-58cd-4938-9936-3889dcf28e75';

-- ── Back-fill historical order items (attributes.productName) ─────────────────
-- Updates the snapshotted productName in order item attributes to match the
-- corrected product names above, so the Daily Detail report shows them correctly.

UPDATE "business_order_items"
SET attributes = jsonb_set(attributes, '{productName}', '"🍽️🐓 Sadza & 1pc Road Runner"')
WHERE attributes->>'productId' = 'e5f305d3-976f-4f43-9865-5afd96caeed0' AND attributes IS NOT NULL;

UPDATE "business_order_items"
SET attributes = jsonb_set(attributes, '{productName}', '"🍽️🥩 Sadza & 1pc Liver"')
WHERE attributes->>'productId' = '70d86cc6-7b5b-4ea5-a3e3-03ffed97a381' AND attributes IS NOT NULL;

UPDATE "business_order_items"
SET attributes = jsonb_set(attributes, '{productName}', '"🍽️🦴 Sadza & 1pc Zondo"')
WHERE attributes->>'productId' = 'b485d455-fa67-4969-a339-8d69a65063b8' AND attributes IS NOT NULL;

UPDATE "business_order_items"
SET attributes = jsonb_set(attributes, '{productName}', '"🍽️🐓 Sadza & Road Runner 2pc"')
WHERE attributes->>'productId' = 'ae80f4f5-b31c-4406-9f67-bc93af0037e3' AND attributes IS NOT NULL;

UPDATE "business_order_items"
SET attributes = jsonb_set(attributes, '{productName}', '"🍽️🐟 Sadza & Small Fish"')
WHERE attributes->>'productId' = 'afa094cd-de37-4276-89e5-3d5768745b07' AND attributes IS NOT NULL;

UPDATE "business_order_items"
SET attributes = jsonb_set(attributes, '{productName}', '"🍚🥩 Rice & 1pc Liver"')
WHERE attributes->>'productId' = 'd4c189ae-6f7d-40b7-afb1-3a816fc117aa' AND attributes IS NOT NULL;

UPDATE "business_order_items"
SET attributes = jsonb_set(attributes, '{productName}', '"🍚🐓 Rice & 2pc Road Runner & Salad"')
WHERE attributes->>'productId' = '687c6c03-89d3-4607-a202-14db01ec7092' AND attributes IS NOT NULL;

UPDATE "business_order_items"
SET attributes = jsonb_set(attributes, '{productName}', '"🍚🐔 Rice & 1pc Chicken"')
WHERE attributes->>'productId' = '68ae4df0-b888-4c46-b70c-f79628e63f07' AND attributes IS NOT NULL;

UPDATE "business_order_items"
SET attributes = jsonb_set(attributes, '{productName}', '"🍚🥩 Rice & 2pc Liver"')
WHERE attributes->>'productId' = 'dd98b0f0-f46c-45c1-a052-7a7ba95a4efe' AND attributes IS NOT NULL;

UPDATE "business_order_items"
SET attributes = jsonb_set(attributes, '{productName}', '"🍚🫘 Rice & Beans"')
WHERE attributes->>'productId' = '6b5808f5-8743-458c-871e-68319f0e59d6' AND attributes IS NOT NULL;

UPDATE "business_order_items"
SET attributes = jsonb_set(attributes, '{productName}', '"🍝 Spaghetti"')
WHERE attributes->>'productId' = 'b51100eb-f6e0-4e54-8aff-c121f2b3f805' AND attributes IS NOT NULL;

UPDATE "business_order_items"
SET attributes = jsonb_set(attributes, '{productName}', '"🍝🐔 Spaghetti & Chicken"')
WHERE attributes->>'productId' = '8af55925-0d04-47bf-92f3-79c2e0eafabd' AND attributes IS NOT NULL;

UPDATE "business_order_items"
SET attributes = jsonb_set(attributes, '{productName}', '"🍝🥩 Spaghetti Bolognese"')
WHERE attributes->>'productId' = '8ca605c2-33a5-4e33-af6b-26079473ee20' AND attributes IS NOT NULL;

UPDATE "business_order_items"
SET attributes = jsonb_set(attributes, '{productName}', '"🍝🐔 Spaghetti, Chicken & Salad"')
WHERE attributes->>'productId' = '7c7618c9-9525-4de1-b9f0-b7919a57d434' AND attributes IS NOT NULL;

UPDATE "business_order_items"
SET attributes = jsonb_set(attributes, '{productName}', '"🐔🍟 Quarter Chicken & Chips"')
WHERE attributes->>'productId' = '950ee07f-ba01-407c-9ccd-eb5ce9a33425' AND attributes IS NOT NULL;

UPDATE "business_order_items"
SET attributes = jsonb_set(attributes, '{productName}', '"🌭🍟 Russian & Chips"')
WHERE attributes->>'productId' = '6471fcbb-fe02-4ff1-8e22-5cadd5181604' AND attributes IS NOT NULL;

UPDATE "business_order_items"
SET attributes = jsonb_set(attributes, '{productName}', '"🍔🍟 Beef Burger & Fries"')
WHERE attributes->>'productId' = 'a17d1903-7b65-46c4-96bd-2e2f7700eada' AND attributes IS NOT NULL;

UPDATE "business_order_items"
SET attributes = jsonb_set(attributes, '{productName}', '"🐔 Grilled Chicken Breast"')
WHERE attributes->>'productId' = '4d8b2486-d103-4970-ad51-fcd4a39a226f' AND attributes IS NOT NULL;

UPDATE "business_order_items"
SET attributes = jsonb_set(attributes, '{productName}', '"🐔 Chicken Wings (8pc)"')
WHERE attributes->>'productId' = '61776d44-4a4d-4c42-abf2-d759eea4252f' AND attributes IS NOT NULL;

UPDATE "business_order_items"
SET attributes = jsonb_set(attributes, '{productName}', '"🍹 Citro"')
WHERE attributes->>'productId' = 'ed2a2c66-999e-4f2d-9afa-71b643fe3995' AND attributes IS NOT NULL;

UPDATE "business_order_items"
SET attributes = jsonb_set(attributes, '{productName}', '"🍹 Fizzi"')
WHERE attributes->>'productId' = '43daea13-065b-44c6-9cee-5ec1a7bfa8d2' AND attributes IS NOT NULL;

UPDATE "business_order_items"
SET attributes = jsonb_set(attributes, '{productName}', '"🍹 Pet Coke"')
WHERE attributes->>'productId' = '4be79896-91c6-4902-8f57-306c6095ea10' AND attributes IS NOT NULL;

UPDATE "business_order_items"
SET attributes = jsonb_set(attributes, '{productName}', '"🍹 Coca-Cola 330ml"')
WHERE attributes->>'productId' = '862334f9-7765-4439-ab6d-18d7a7457387' AND attributes IS NOT NULL;

UPDATE "business_order_items"
SET attributes = jsonb_set(attributes, '{productName}', '"🍹 Mixed Juice"')
WHERE attributes->>'productId' = '1e0fdacc-a664-4852-9611-9e7b902dc4a2' AND attributes IS NOT NULL;

UPDATE "business_order_items"
SET attributes = jsonb_set(attributes, '{productName}', '"🍹 Maheu"')
WHERE attributes->>'productId' = '6245e90c-c136-4597-b0ed-aaef2a43f62b' AND attributes IS NOT NULL;

UPDATE "business_order_items"
SET attributes = jsonb_set(attributes, '{productName}', '"🍹 Pfuko Maheu 500ml"')
WHERE attributes->>'productId' = '8ab8efc9-783c-4e94-8382-36914e1da671' AND attributes IS NOT NULL;

UPDATE "business_order_items"
SET attributes = jsonb_set(attributes, '{productName}', '"🍹 Revive 500ml"')
WHERE attributes->>'productId' = '80cfd35d-d800-4a04-ad4f-9cf2a778553b' AND attributes IS NOT NULL;

UPDATE "business_order_items"
SET attributes = jsonb_set(attributes, '{productName}', '"🍊 Orange Juice (Fresh)"')
WHERE attributes->>'productId' = '39bd6988-77fd-4c81-8a96-fd1fad024bb1' AND attributes IS NOT NULL;

UPDATE "business_order_items"
SET attributes = jsonb_set(attributes, '{productName}', '"🍊 Orange Juice 250ml"')
WHERE attributes->>'productId' = '551935da-e34e-4f7e-870c-fb2cb2f62f07' AND attributes IS NOT NULL;

UPDATE "business_order_items"
SET attributes = jsonb_set(attributes, '{productName}', '"🚰 Sparkling Water 500ml"')
WHERE attributes->>'productId' = '16fcf4e3-71bd-463b-99b4-bc2e83a2becf' AND attributes IS NOT NULL;

UPDATE "business_order_items"
SET attributes = jsonb_set(attributes, '{productName}', '"🚰 Water"')
WHERE attributes->>'productId' = '5976c7c9-209e-4e01-990d-d128436804b2' AND attributes IS NOT NULL;

UPDATE "business_order_items"
SET attributes = jsonb_set(attributes, '{productName}', '"🍹 Soft Drink"')
WHERE attributes->>'productId' = '858652fa-1570-4048-9317-f216de8de3d4' AND attributes IS NOT NULL;

UPDATE "business_order_items"
SET attributes = jsonb_set(attributes, '{productName}', '"☕ Coffee"')
WHERE attributes->>'productId' = '0397a679-63ee-4c03-9897-1626af1c4e54' AND attributes IS NOT NULL;

UPDATE "business_order_items"
SET attributes = jsonb_set(attributes, '{productName}', '"🥗 Salad"')
WHERE attributes->>'productId' IN ('5f4a829d-1f1f-49a6-8a82-1d8eb94b0119', 'c28ef5f0-22f0-4ab6-a8fb-3548e1c29b79') AND attributes IS NOT NULL;

UPDATE "business_order_items"
SET attributes = jsonb_set(attributes, '{productName}', '"🥗 Caesar Salad"')
WHERE attributes->>'productId' = 'ba2fc2b9-29ec-4af5-9155-85ffbb152593' AND attributes IS NOT NULL;

UPDATE "business_order_items"
SET attributes = jsonb_set(attributes, '{productName}', '"🍽️ Chimbutu"')
WHERE attributes->>'productId' = '8ed87857-f7c0-4f43-a8ef-4ea2644f1303' AND attributes IS NOT NULL;

UPDATE "business_order_items"
SET attributes = jsonb_set(attributes, '{productName}', '"🐟🍟 Fish & Chips"')
WHERE attributes->>'productId' = '1489fc0e-44b1-4bf3-bea6-6b9bd52917af' AND attributes IS NOT NULL;

UPDATE "business_order_items"
SET attributes = jsonb_set(attributes, '{productName}', '"🍞 Garlic Bread"')
WHERE attributes->>'productId' = '392585aa-58cd-4938-9936-3889dcf28e75' AND attributes IS NOT NULL;
