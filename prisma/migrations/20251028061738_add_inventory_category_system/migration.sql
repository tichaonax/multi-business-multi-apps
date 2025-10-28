-- AlterTable
ALTER TABLE "public"."business_categories" ADD COLUMN     "color" TEXT NOT NULL DEFAULT '#3B82F6',
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "domainId" TEXT,
ADD COLUMN     "emoji" TEXT NOT NULL DEFAULT '📦',
ADD COLUMN     "isUserCreated" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."inventory_domains" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "description" TEXT,
    "businessType" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystemTemplate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."inventory_subcategories" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isUserCreated" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "inventory_subcategories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inventory_domains_name_key" ON "public"."inventory_domains"("name");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_subcategories_categoryId_name_key" ON "public"."inventory_subcategories"("categoryId", "name");

-- AddForeignKey
ALTER TABLE "public"."business_categories" ADD CONSTRAINT "business_categories_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "public"."inventory_domains"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."business_categories" ADD CONSTRAINT "business_categories_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventory_subcategories" ADD CONSTRAINT "inventory_subcategories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."business_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventory_subcategories" ADD CONSTRAINT "inventory_subcategories_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
