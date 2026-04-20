-- CreateTable
CREATE TABLE "menu_item_inventory_config" (
    "id" TEXT NOT NULL,
    "businessProductId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "isTracked" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_item_inventory_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_item_inventory_batches" (
    "id" TEXT NOT NULL,
    "businessProductId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "remaining" INTEGER NOT NULL,
    "costPerUnit" DECIMAL(10,2) NOT NULL,
    "totalCost" DECIMAL(10,2) NOT NULL,
    "batchDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_item_inventory_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "menu_item_inventory_config_businessProductId_businessId_key" ON "menu_item_inventory_config"("businessProductId", "businessId");

-- CreateIndex
CREATE INDEX "menu_item_inventory_config_businessId_idx" ON "menu_item_inventory_config"("businessId");

-- CreateIndex
CREATE INDEX "menu_item_inventory_batches_businessId_idx" ON "menu_item_inventory_batches"("businessId");

-- CreateIndex
CREATE INDEX "menu_item_inventory_batches_businessProductId_remaining_idx" ON "menu_item_inventory_batches"("businessProductId", "remaining");

-- AddForeignKey
ALTER TABLE "menu_item_inventory_config" ADD CONSTRAINT "menu_item_inventory_config_businessProductId_fkey" FOREIGN KEY ("businessProductId") REFERENCES "business_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_inventory_config" ADD CONSTRAINT "menu_item_inventory_config_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_inventory_batches" ADD CONSTRAINT "menu_item_inventory_batches_businessProductId_fkey" FOREIGN KEY ("businessProductId") REFERENCES "business_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_inventory_batches" ADD CONSTRAINT "menu_item_inventory_batches_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
