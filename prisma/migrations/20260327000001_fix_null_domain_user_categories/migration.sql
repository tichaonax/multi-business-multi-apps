-- Fix user-created categories that were saved with NULL domainId via bulk stocking
-- or add-stock workflows, when exactly one inventory domain exists for that businessType.
--
-- Safety conditions:
--   1. Only user-created top-level categories (isUserCreated = true, parentId IS NULL)
--   2. Only when exactly one active domain exists for that businessType
--      (avoids ambiguous assignment when multiple departments exist, e.g. clothing)
--   3. Skips if assigning the domain would violate the unique(businessType, domainId, name)
--      constraint (i.e., an identically-named category already exists under that domain)

UPDATE business_categories bc
SET
  "domainId"  = (
    SELECT d.id
    FROM inventory_domains d
    WHERE d."businessType" = bc."businessType"
      AND d."isActive"     = true
    LIMIT 1
  ),
  "updatedAt" = NOW()
WHERE bc."domainId"      IS NULL
  AND bc."isUserCreated"  = true
  AND bc."parentId"       IS NULL
  -- Exactly one active domain exists for this businessType
  AND (
    SELECT COUNT(*)
    FROM inventory_domains d
    WHERE d."businessType" = bc."businessType"
      AND d."isActive"     = true
  ) = 1
  -- No duplicate (businessType, domainId, name) would be created
  AND NOT EXISTS (
    SELECT 1
    FROM business_categories bc2
    WHERE bc2."businessType" = bc."businessType"
      AND bc2."name"         = bc."name"
      AND bc2."domainId"     = (
        SELECT d.id
        FROM inventory_domains d
        WHERE d."businessType" = bc."businessType"
          AND d."isActive"     = true
        LIMIT 1
      )
      AND bc2."id" != bc."id"
  );
