-- CreateTable: expense_domains
CREATE TABLE "expense_domains" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable: expense_subcategories
CREATE TABLE "expense_subcategories" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isUserCreated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "expense_subcategories_pkey" PRIMARY KEY ("id")
);

-- AlterTable: expense_categories - Add new columns
ALTER TABLE "expense_categories" ADD COLUMN "domainId" TEXT;
ALTER TABLE "expense_categories" ADD COLUMN "description" TEXT;
ALTER TABLE "expense_categories" ADD COLUMN "isUserCreated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "expense_categories" ADD COLUMN "createdBy" TEXT;

-- Rename userId to createdBy in expense_categories
ALTER TABLE "expense_categories" RENAME COLUMN "userId" TO "createdBy_old";
UPDATE "expense_categories" SET "createdBy" = "createdBy_old" WHERE "createdBy_old" IS NOT NULL;
ALTER TABLE "expense_categories" DROP COLUMN "createdBy_old";

-- AlterTable: personal_expenses - Add new foreign key columns (nullable for migration)
ALTER TABLE "personal_expenses" ADD COLUMN "categoryId" TEXT;
ALTER TABLE "personal_expenses" ADD COLUMN "subcategoryId" TEXT;

-- CreateIndex: Unique constraints
CREATE UNIQUE INDEX "expense_domains_name_key" ON "expense_domains"("name");
CREATE UNIQUE INDEX "expense_categories_domainId_name_key" ON "expense_categories"("domainId", "name");
CREATE UNIQUE INDEX "expense_subcategories_categoryId_name_key" ON "expense_subcategories"("categoryId", "name");

-- AddForeignKey: expense_categories
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_domainId_fkey"
    FOREIGN KEY ("domainId") REFERENCES "expense_domains"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: expense_subcategories
ALTER TABLE "expense_subcategories" ADD CONSTRAINT "expense_subcategories_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "expense_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "expense_subcategories" ADD CONSTRAINT "expense_subcategories_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: personal_expenses
ALTER TABLE "personal_expenses" ADD CONSTRAINT "personal_expenses_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "expense_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "personal_expenses" ADD CONSTRAINT "personal_expenses_subcategoryId_fkey"
    FOREIGN KEY ("subcategoryId") REFERENCES "expense_subcategories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
