-- Drop the old unique constraint (businessType, name)
ALTER TABLE business_categories DROP CONSTRAINT IF EXISTS business_categories_businessType_name_key;

-- Add the new unique constraint (businessType, domainId, name)
ALTER TABLE business_categories ADD CONSTRAINT business_categories_businessType_domainId_name_key
  UNIQUE ("businessType", "domainId", name);
