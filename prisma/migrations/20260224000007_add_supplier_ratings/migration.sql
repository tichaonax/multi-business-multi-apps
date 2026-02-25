-- CreateTable
CREATE TABLE "supplier_ratings" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "ratedBy" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "supplier_ratings_supplierId_businessId_idx" ON "supplier_ratings"("supplierId", "businessId");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "supplier_ratings_supplierId_businessId_ratedBy_key" ON "supplier_ratings"("supplierId", "businessId", "ratedBy");

-- AddForeignKey
ALTER TABLE "supplier_ratings" ADD CONSTRAINT "supplier_ratings_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "business_suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_ratings" ADD CONSTRAINT "supplier_ratings_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_ratings" ADD CONSTRAINT "supplier_ratings_ratedBy_fkey" FOREIGN KEY ("ratedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
