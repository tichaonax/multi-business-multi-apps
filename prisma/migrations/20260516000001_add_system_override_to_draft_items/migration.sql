-- Add system quantity override fields to stock_take_draft_items for audited overrides
ALTER TABLE "stock_take_draft_items"
  ADD COLUMN IF NOT EXISTS "systemQuantityOverride" INTEGER,
  ADD COLUMN IF NOT EXISTS "systemOverrideReason"   TEXT,
  ADD COLUMN IF NOT EXISTS "systemOverriddenBy"     TEXT,
  ADD COLUMN IF NOT EXISTS "systemOverriddenAt"     TIMESTAMP(3);
