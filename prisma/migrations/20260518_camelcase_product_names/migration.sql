-- Migration: Normalise all product and category names to Title Case
-- "baking soda" -> "Baking Soda", "my-product" -> "My-Product"

CREATE OR REPLACE FUNCTION to_title_case(input text) RETURNS text AS $$
DECLARE
  result text := '';
  i int := 1;
  c text;
  prev_char text := ' ';
BEGIN
  WHILE i <= char_length(input) LOOP
    c := substr(input, i, 1);
    IF prev_char = ' ' OR prev_char = '-' THEN
      result := result || upper(c);
    ELSE
      result := result || lower(c);
    END IF;
    prev_char := c;
    i := i + 1;
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Step 1: Resolve duplicate categories (wrong-case vs correct-case).
-- For each pair, re-point all FK references to the correct-case row then delete the wrong-case row.

DO $$
DECLARE
  wrong_id   text;
  correct_id text;
BEGIN
  FOR wrong_id, correct_id IN
    SELECT a.id, b.id
    FROM business_categories a
    JOIN business_categories b
      ON a."businessType" = b."businessType"
      AND (a."domainId" = b."domainId" OR (a."domainId" IS NULL AND b."domainId" IS NULL))
      AND a.id <> b.id
      AND to_title_case(a.name) = b.name
      AND a.name <> b.name
  LOOP
    UPDATE business_products       SET "categoryId" = correct_id WHERE "categoryId" = wrong_id;
    UPDATE barcode_inventory_items SET "categoryId" = correct_id WHERE "categoryId" = wrong_id;
    UPDATE inventory_subcategories SET "categoryId" = correct_id WHERE "categoryId" = wrong_id;
    DELETE FROM business_categories WHERE id = wrong_id;
  END LOOP;
END $$;

-- Step 2: Title-case all remaining names.

UPDATE business_products
SET name = to_title_case(name)
WHERE name IS NOT NULL AND name <> '';

UPDATE business_categories
SET name = to_title_case(name)
WHERE name IS NOT NULL AND name <> '';

UPDATE barcode_inventory_items
SET name = to_title_case(name)
WHERE name IS NOT NULL AND name <> '';

DROP FUNCTION IF EXISTS to_title_case(text);
