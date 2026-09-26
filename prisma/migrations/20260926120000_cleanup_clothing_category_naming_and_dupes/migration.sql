-- Data cleanup discovered while testing the Warehouse "create category/
-- sub-category on the fly" feature (MBM-300 follow-up): a user picked
-- Domain "Electronics" > Category "Cell Phones & Accessories" and found it
-- couldn't be used as a parent for a new sub-category. Investigation showed
-- two independent, pre-existing data issues under businessType='clothing'
-- (this business type's seed data mixes apparel with general-merchandise
-- domains like Electronics/Automotive/Home & Kitchen). Both fixes below are
-- name/structure-based (not hardcoded IDs) so they apply the same way
-- wherever this data exists, and both are non-destructive (rename or
-- soft-deactivate only -- never a hard DELETE).
--
-- 1) Inconsistent connector spelling: some categories exist as "X And Y" in
--    one place and "X & Y" elsewhere for the exact same concept, e.g.
--    "Cell Phones Accessories" vs "Cell Phones & Accessories". The "&" form
--    is this app's established convention (see "Belts & Wallets",
--    "Caps & Hats", "Toys & Games" as domains). This is a straight rename,
--    not a merge -- categories with the same name under DIFFERENT domains
--    are legitimate by design (e.g. "Blazers" exists under both Men's and
--    Women's), so nothing here collapses distinct domain-scoped categories.
--    Verified beforehand against the (businessType, domainId, name) unique
--    constraint: none of these renames collide with an existing row.
UPDATE business_categories SET name = 'Bags & Luggage', "updatedAt" = now()
  WHERE "businessType" = 'clothing' AND name = 'Bags And Luggage' AND "isActive" = true;
UPDATE business_categories SET name = 'Kitchen & Dining', "updatedAt" = now()
  WHERE "businessType" = 'clothing' AND name = 'Kitchen And Dining' AND "isActive" = true;
UPDATE business_categories SET name = 'Cell Phones & Accessories', "updatedAt" = now()
  WHERE "businessType" = 'clothing' AND name = 'Cell Phones Accessories' AND "isActive" = true;
UPDATE business_categories SET name = 'Toys & Games', "updatedAt" = now()
  WHERE "businessType" = 'clothing' AND name = 'Toys And Games' AND "isActive" = true;
UPDATE business_categories SET name = 'Home & Living', "updatedAt" = now()
  WHERE "businessType" = 'clothing' AND name = 'Home And Living' AND "isActive" = true;
UPDATE business_categories SET name = 'Jewelry & Watches', "updatedAt" = now()
  WHERE "businessType" = 'clothing' AND name = 'Jewelry And Watches' AND "isActive" = true;

-- 2) True redundant duplicates: same businessType + name + domainId +
--    parentId + businessId (NULLs matched explicitly below, since SQL NULL
--    is never "=" to another NULL), left over from what look like partial/
--    retried seed batches (e.g. four identical zero-content "Automotive"
--    root categories all created the same day). Unlike the cross-domain
--    repetition above, these are exact duplicates within the SAME domain/
--    parent/business -- there is no legitimate reason for more than one.
--    Per duplicate group, keep exactly one row (prefer one that already has
--    real product/subcategory/child references, else the oldest) and
--    soft-deactivate the rest -- and, as a second, independent safety net,
--    only ever deactivate a specific row if THAT row itself has zero
--    products, zero subcategories and zero child categories, regardless of
--    the group's grouping. Nothing is deleted; this is fully reversible by
--    flipping isActive back to true.
WITH ranked AS (
  SELECT
    bc.id,
    (SELECT count(*) FROM business_products bp WHERE bp."categoryId" = bc.id) AS product_count,
    (SELECT count(*) FROM inventory_subcategories isub WHERE isub."categoryId" = bc.id) AS subcat_count,
    (SELECT count(*) FROM business_categories child WHERE child."parentId" = bc.id) AS child_count,
    ROW_NUMBER() OVER (
      PARTITION BY
        bc."businessType",
        bc.name,
        COALESCE(bc."domainId", '__null__'),
        COALESCE(bc."parentId", '__null__'),
        COALESCE(bc."businessId", '__null__')
      ORDER BY
        (CASE WHEN (SELECT count(*) FROM business_products bp WHERE bp."categoryId" = bc.id) > 0 THEN 0 ELSE 1 END),
        (CASE WHEN (SELECT count(*) FROM inventory_subcategories isub WHERE isub."categoryId" = bc.id) > 0 THEN 0 ELSE 1 END),
        (CASE WHEN (SELECT count(*) FROM business_categories child WHERE child."parentId" = bc.id) > 0 THEN 0 ELSE 1 END),
        bc."createdAt" ASC
    ) AS rn
  FROM business_categories bc
  WHERE bc."businessType" = 'clothing' AND bc."isActive" = true
)
UPDATE business_categories
SET "isActive" = false, "updatedAt" = now()
WHERE id IN (
  SELECT id FROM ranked
  WHERE rn > 1 AND product_count = 0 AND subcat_count = 0 AND child_count = 0
);
