-- Deduplicate LANDLORD suppliers with the same name (case-insensitive)
-- Keeps the oldest record, re-assigns all references, then deletes duplicates

DO $$
DECLARE
  dup RECORD;
  keeper_id TEXT;
BEGIN
  FOR dup IN
    SELECT LOWER(TRIM(name)) AS norm_name
    FROM business_suppliers
    WHERE "supplierType" = 'LANDLORD'
    GROUP BY LOWER(TRIM(name))
    HAVING COUNT(*) > 1
  LOOP
    -- Keep the oldest record for this name
    SELECT id INTO keeper_id
    FROM business_suppliers
    WHERE "supplierType" = 'LANDLORD'
      AND LOWER(TRIM(name)) = dup.norm_name
    ORDER BY "createdAt" ASC
    LIMIT 1;

    -- Re-assign: business_rent_configs (landlordSupplierId)
    UPDATE business_rent_configs
    SET "landlordSupplierId" = keeper_id
    WHERE "landlordSupplierId" IN (
      SELECT id FROM business_suppliers
      WHERE "supplierType" = 'LANDLORD'
        AND LOWER(TRIM(name)) = dup.norm_name
        AND id <> keeper_id
    );

    -- Re-assign: expense_account_payments (payeeSupplierId)
    UPDATE expense_account_payments
    SET "payeeSupplierId" = keeper_id
    WHERE "payeeSupplierId" IN (
      SELECT id FROM business_suppliers
      WHERE "supplierType" = 'LANDLORD'
        AND LOWER(TRIM(name)) = dup.norm_name
        AND id <> keeper_id
    );

    -- Re-assign: supplier_payment_requests (supplierId)
    UPDATE supplier_payment_requests
    SET "supplierId" = keeper_id
    WHERE "supplierId" IN (
      SELECT id FROM business_suppliers
      WHERE "supplierType" = 'LANDLORD'
        AND LOWER(TRIM(name)) = dup.norm_name
        AND id <> keeper_id
    );

    -- Re-assign: supplier_ratings (supplierId)
    UPDATE supplier_ratings
    SET "supplierId" = keeper_id
    WHERE "supplierId" IN (
      SELECT id FROM business_suppliers
      WHERE "supplierType" = 'LANDLORD'
        AND LOWER(TRIM(name)) = dup.norm_name
        AND id <> keeper_id
    );

    -- Delete the duplicates (all references already re-pointed to keeper)
    DELETE FROM business_suppliers
    WHERE "supplierType" = 'LANDLORD'
      AND LOWER(TRIM(name)) = dup.norm_name
      AND id <> keeper_id;

    RAISE NOTICE 'Deduped landlord "%" — kept %', dup.norm_name, keeper_id;
  END LOOP;
END $$;
