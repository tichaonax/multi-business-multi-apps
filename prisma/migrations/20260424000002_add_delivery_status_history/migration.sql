CREATE TABLE "delivery_status_history" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "fromStatus" TEXT NOT NULL,
  "toStatus" TEXT NOT NULL,
  "changedBy" TEXT NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "delivery_status_history_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "delivery_status_history_orderId_idx" ON "delivery_status_history"("orderId");
