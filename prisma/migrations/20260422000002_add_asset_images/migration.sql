-- CreateTable
CREATE TABLE "asset_images" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "asset_images_assetId_idx" ON "asset_images"("assetId");

-- AddForeignKey
ALTER TABLE "asset_images" ADD CONSTRAINT "asset_images_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "business_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
