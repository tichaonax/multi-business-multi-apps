-- CreateTable
CREATE TABLE "wifi_token_sales" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "wifiTokenId" TEXT NOT NULL,
    "expenseAccountId" TEXT NOT NULL,
    "saleAmount" DECIMAL(12,2) NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "soldAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "soldBy" TEXT NOT NULL,
    "receiptPrinted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "wifi_token_sales_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "idx_wifi_token_sales_businessId" ON "wifi_token_sales"("businessId");
CREATE INDEX "idx_wifi_token_sales_wifiTokenId" ON "wifi_token_sales"("wifiTokenId");
CREATE INDEX "idx_wifi_token_sales_expenseAccountId" ON "wifi_token_sales"("expenseAccountId");
CREATE INDEX "idx_wifi_token_sales_soldBy" ON "wifi_token_sales"("soldBy");

-- Add foreign key constraints
ALTER TABLE "wifi_token_sales" ADD CONSTRAINT "wifi_token_sales_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wifi_token_sales" ADD CONSTRAINT "wifi_token_sales_wifiTokenId_fkey" FOREIGN KEY ("wifiTokenId") REFERENCES "wifi_tokens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "wifi_token_sales" ADD CONSTRAINT "wifi_token_sales_expenseAccountId_fkey" FOREIGN KEY ("expenseAccountId") REFERENCES "expense_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "wifi_token_sales" ADD CONSTRAINT "wifi_token_sales_soldBy_fkey" FOREIGN KEY ("soldBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;