-- Shorten scanToken from full UUID to 8-char hex
-- Derives from the first 8 hex chars of the existing UUID (strips the first hyphen if present)
UPDATE "employees"
SET "scanToken" = LOWER(REPLACE(LEFT("scanToken", 9), '-', ''))
WHERE LENGTH("scanToken") > 8;
