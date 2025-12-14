-- CreateTable
CREATE TABLE "business_token_menu_items" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "tokenConfigId" TEXT NOT NULL,
    "businessPrice" DECIMAL(12,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_token_menu_items_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE UNIQUE INDEX "business_token_menu_items_businessId_tokenConfigId_key" ON "business_token_menu_items"("businessId", "tokenConfigId");
CREATE INDEX "idx_business_token_menu_items_businessId" ON "business_token_menu_items"("businessId");
CREATE INDEX "idx_business_token_menu_items_tokenConfigId" ON "business_token_menu_items"("tokenConfigId");

-- Add foreign key constraints
ALTER TABLE "business_token_menu_items" ADD CONSTRAINT "business_token_menu_items_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "business_token_menu_items" ADD CONSTRAINT "business_token_menu_items_tokenConfigId_fkey" FOREIGN KEY ("tokenConfigId") REFERENCES "token_configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;