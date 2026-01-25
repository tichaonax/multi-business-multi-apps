-- Add WiFi token support to menu combo items
-- Allows combos to include R710 WiFi tokens as complimentary items

-- Make productId nullable (combo item can be either a product OR a WiFi token)
ALTER TABLE "menu_combo_items" ALTER COLUMN "productId" DROP NOT NULL;

-- Add tokenConfigId column for WiFi token reference
ALTER TABLE "menu_combo_items" ADD COLUMN "tokenConfigId" TEXT;

-- Add index for tokenConfigId lookups
CREATE INDEX "menu_combo_items_tokenConfigId_idx" ON "menu_combo_items"("tokenConfigId");

-- Add foreign key constraint to r710_token_configs
ALTER TABLE "menu_combo_items" ADD CONSTRAINT "menu_combo_items_tokenConfigId_fkey"
  FOREIGN KEY ("tokenConfigId") REFERENCES "r710_token_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
