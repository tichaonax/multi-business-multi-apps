-- CreateTable
CREATE TABLE "daily_specials" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "specialPrice" DECIMAL(10,2) NOT NULL,
    "includeWifi" BOOLEAN NOT NULL DEFAULT true,
    "bulletPoints" JSONB NOT NULL DEFAULT '[]',
    "imageId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_specials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_special_add_ons" (
    "id" TEXT NOT NULL,
    "dailySpecialId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "daily_special_add_ons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_special_schedules" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "specialId" TEXT NOT NULL,

    CONSTRAINT "daily_special_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_special_day_overrides" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "isDisabled" BOOLEAN NOT NULL DEFAULT false,
    "overrideSpecialId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_special_day_overrides_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "display_global_settings" ADD COLUMN "specialShowPercentage" INTEGER NOT NULL DEFAULT 25;

-- CreateIndex
CREATE INDEX "daily_specials_businessId_idx" ON "daily_specials"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "daily_special_schedules_businessId_dayOfWeek_key" ON "daily_special_schedules"("businessId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "daily_special_day_overrides_businessId_date_key" ON "daily_special_day_overrides"("businessId", "date");

-- AddForeignKey
ALTER TABLE "daily_specials" ADD CONSTRAINT "daily_specials_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_specials" ADD CONSTRAINT "daily_specials_productId_fkey" FOREIGN KEY ("productId") REFERENCES "business_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_special_add_ons" ADD CONSTRAINT "daily_special_add_ons_dailySpecialId_fkey" FOREIGN KEY ("dailySpecialId") REFERENCES "daily_specials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_special_add_ons" ADD CONSTRAINT "daily_special_add_ons_productId_fkey" FOREIGN KEY ("productId") REFERENCES "business_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_special_schedules" ADD CONSTRAINT "daily_special_schedules_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_special_schedules" ADD CONSTRAINT "daily_special_schedules_specialId_fkey" FOREIGN KEY ("specialId") REFERENCES "daily_specials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_special_day_overrides" ADD CONSTRAINT "daily_special_day_overrides_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_special_day_overrides" ADD CONSTRAINT "daily_special_day_overrides_overrideSpecialId_fkey" FOREIGN KEY ("overrideSpecialId") REFERENCES "daily_specials"("id") ON DELETE SET NULL ON UPDATE CASCADE;
