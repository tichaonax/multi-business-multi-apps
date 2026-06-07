-- CreateTable: display_product_configs
CREATE TABLE "display_product_configs" (
    "id"                  TEXT NOT NULL,
    "businessId"          TEXT NOT NULL,
    "itemType"            TEXT NOT NULL,
    "itemId"              TEXT NOT NULL,
    "priorityBoost"       INTEGER NOT NULL DEFAULT 0,
    "isDailySpecial"      BOOLEAN NOT NULL DEFAULT false,
    "isFeatured"          BOOLEAN NOT NULL DEFAULT false,
    "isHidden"            BOOLEAN NOT NULL DEFAULT false,
    "displayDurationSecs" INTEGER,
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3) NOT NULL,

    CONSTRAINT "display_product_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: display_global_settings
CREATE TABLE "display_global_settings" (
    "id"                   TEXT NOT NULL,
    "businessId"           TEXT NOT NULL,
    "rotationIntervalSecs" INTEGER NOT NULL DEFAULT 6,
    "enableSmartDisplay"   BOOLEAN NOT NULL DEFAULT true,
    "enableSplitLayout"    BOOLEAN NOT NULL DEFAULT true,
    "maxItemsInRotation"   INTEGER NOT NULL DEFAULT 12,
    "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"            TIMESTAMP(3) NOT NULL,

    CONSTRAINT "display_global_settings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "display_product_configs"
    ADD CONSTRAINT "display_product_configs_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "display_global_settings"
    ADD CONSTRAINT "display_global_settings_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "display_product_configs_businessId_itemType_itemId_key"
    ON "display_product_configs"("businessId", "itemType", "itemId");

CREATE INDEX "display_product_configs_businessId_itemType_idx"
    ON "display_product_configs"("businessId", "itemType");

CREATE UNIQUE INDEX "display_global_settings_businessId_key"
    ON "display_global_settings"("businessId");
