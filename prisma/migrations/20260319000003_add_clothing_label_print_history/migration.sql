-- CreateTable
CREATE TABLE "clothing_label_print_history" (
    "id"         TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "baleId"     TEXT,
    "productId"  TEXT,
    "templateId" TEXT,
    "quantity"   INTEGER NOT NULL,
    "printedBy"  TEXT NOT NULL,
    "printedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes"      TEXT,

    CONSTRAINT "clothing_label_print_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clothing_label_print_history_businessId_idx" ON "clothing_label_print_history"("businessId");

-- CreateIndex
CREATE INDEX "clothing_label_print_history_baleId_idx" ON "clothing_label_print_history"("baleId");

-- CreateIndex
CREATE INDEX "clothing_label_print_history_productId_idx" ON "clothing_label_print_history"("productId");

-- AddForeignKey
ALTER TABLE "clothing_label_print_history" ADD CONSTRAINT "clothing_label_print_history_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clothing_label_print_history" ADD CONSTRAINT "clothing_label_print_history_baleId_fkey"
    FOREIGN KEY ("baleId") REFERENCES "clothing_bales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clothing_label_print_history" ADD CONSTRAINT "clothing_label_print_history_printedBy_fkey"
    FOREIGN KEY ("printedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
