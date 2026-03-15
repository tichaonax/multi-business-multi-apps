-- Make LANDLORD suppliers global (not tied to any specific business)
-- Sets businessId = NULL and businessType = 'LANDLORD' so they appear across all business types

UPDATE "business_suppliers"
SET "businessId" = NULL,
    "businessType" = 'LANDLORD'
WHERE "supplierType" = 'LANDLORD';
