-- CreateTable: payee_category_groups (Level 1)
CREATE TABLE "public"."payee_category_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payee_category_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable: payee_categories (Level 2)
CREATE TABLE "public"."payee_categories" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payee_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payee_category_groups_name_key" ON "public"."payee_category_groups"("name");

-- CreateIndex
CREATE UNIQUE INDEX "payee_categories_groupId_name_key" ON "public"."payee_categories"("groupId", "name");

-- AddForeignKey
ALTER TABLE "public"."payee_categories" ADD CONSTRAINT "payee_categories_groupId_fkey"
    FOREIGN KEY ("groupId") REFERENCES "public"."payee_category_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
