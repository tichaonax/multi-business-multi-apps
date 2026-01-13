-- Add slogan column to businesses table
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "slogan" VARCHAR(200) DEFAULT 'Where Customer Is King';

-- Add showSlogan column
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "showSlogan" BOOLEAN DEFAULT TRUE;

-- Add comments
COMMENT ON COLUMN "businesses"."slogan" IS 'Business slogan displayed on customer-facing screens';
COMMENT ON COLUMN "businesses"."showSlogan" IS 'Whether to display the business slogan on customer displays';

-- Update existing businesses that don't have slogan set
UPDATE "businesses"
SET "slogan" = 'Where Customer Is King'
WHERE "slogan" IS NULL OR "slogan" = '';

-- Ensure showSlogan is TRUE for existing businesses
UPDATE "businesses"
SET "showSlogan" = TRUE
WHERE "showSlogan" IS NULL;
