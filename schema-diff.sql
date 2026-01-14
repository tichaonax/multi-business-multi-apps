warn The configuration property `package.json#prisma` is deprecated and will be removed in Prisma 7. Please migrate to a Prisma config file (e.g., `prisma.config.ts`).
For more information, see: https://pris.ly/prisma-config

-- AlterEnum
BEGIN;
CREATE TYPE "public"."WifiTokenStatus_new" AS ENUM ('ACTIVE', 'EXPIRED', 'DISABLED');
ALTER TABLE "wifi_tokens" ALTER COLUMN "status" DROP DEFAULT;
ALTER TYPE "public"."WifiTokenStatus" RENAME TO "WifiTokenStatus_old";
ALTER TYPE "public"."WifiTokenStatus_new" RENAME TO "WifiTokenStatus";
DROP TYPE "WifiTokenStatus_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."business_order_items" DROP CONSTRAINT "business_order_items_productVariantId_fkey";

-- DropForeignKey
ALTER TABLE "public"."inter_business_loans" DROP CONSTRAINT "inter_business_loans_lender_person_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."esp32_connected_clients" DROP CONSTRAINT "esp32_connected_clients_businessId_fkey";

-- DropForeignKey
ALTER TABLE "public"."esp32_connected_clients" DROP CONSTRAINT "esp32_connected_clients_wifiTokenId_fkey";

-- DropForeignKey
ALTER TABLE "public"."sku_sequences" DROP CONSTRAINT "sku_sequences_businessId_fkey";

-- DropForeignKey
ALTER TABLE "public"."product_price_changes" DROP CONSTRAINT "product_price_changes_barcodeJobId_fkey";

-- DropForeignKey
ALTER TABLE "public"."product_price_changes" DROP CONSTRAINT "product_price_changes_changedBy_fkey";

-- DropForeignKey
ALTER TABLE "public"."product_price_changes" DROP CONSTRAINT "product_price_changes_productId_fkey";

-- DropForeignKey
ALTER TABLE "public"."customer_display_sessions" DROP CONSTRAINT "customer_display_sessions_businessId_fkey";

-- DropForeignKey
ALTER TABLE "public"."pos_terminal_configs" DROP CONSTRAINT "pos_terminal_configs_businessId_fkey";

-- DropIndex
DROP INDEX "public"."business_orders_orderNumber_idx";

-- DropIndex
DROP INDEX "public"."business_orders_businessId_createdAt_idx";

-- DropIndex
DROP INDEX "public"."business_orders_customerId_createdAt_idx";

-- DropIndex
DROP INDEX "public"."wifi_tokens_token_idx";

-- DropIndex
DROP INDEX "public"."r710_connected_clients_lastSyncedAt_idx";

-- DropIndex
DROP INDEX "public"."product_price_changes_variantId_idx";

-- AlterTable
ALTER TABLE "public"."business_products" ADD COLUMN     "createdFromTemplateId" TEXT,
ADD COLUMN     "templateLinkedAt" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "public"."businesses" ALTER COLUMN "showSlogan" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."product_barcodes" ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "source" VARCHAR(50) DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE "public"."portal_integrations" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."token_configurations" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."business_token_menu_items" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."wifi_tokens" DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "public"."barcode_templates" ADD COLUMN     "brand_name" VARCHAR(100),
ADD COLUMN     "category_name" VARCHAR(100),
ADD COLUMN     "createdBy" TEXT NOT NULL,
ADD COLUMN     "department_name" VARCHAR(100),
ALTER COLUMN "name" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "public"."barcode_print_jobs" ADD COLUMN     "createdBy" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."sku_sequences" ALTER COLUMN "id" SET DEFAULT (gen_random_uuid())::text,
ALTER COLUMN "currentSequence" DROP NOT NULL,
ALTER COLUMN "createdAt" DROP NOT NULL,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "updatedAt" DROP NOT NULL,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "public"."product_price_changes" ALTER COLUMN "id" SET DEFAULT (gen_random_uuid())::text,
ALTER COLUMN "changedAt" DROP NOT NULL,
ALTER COLUMN "changedAt" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "changeReason" DROP NOT NULL;

-- DropTable
DROP TABLE "public"."esp32_connected_clients";

-- DropTable
DROP TABLE "public"."customer_display_sessions";

-- DropTable
DROP TABLE "public"."pos_terminal_configs";

-- CreateIndex
CREATE INDEX "idx_business_products_template_link" ON "public"."business_products"("createdFromTemplateId" ASC);

-- CreateIndex
CREATE INDEX "idx_businesses_sku_prefix" ON "public"."businesses"("sku_prefix" ASC);

-- CreateIndex
CREATE INDEX "idx_product_barcodes_code" ON "public"."product_barcodes"("code" ASC);

-- CreateIndex
CREATE INDEX "idx_product_barcodes_type" ON "public"."product_barcodes"("type" ASC);

-- CreateIndex
CREATE INDEX "portal_integrations_expenseAccountId_idx" ON "public"."portal_integrations"("expenseAccountId" ASC);

-- CreateIndex
CREATE INDEX "idx_token_configurations_displayOrder" ON "public"."token_configurations"("displayOrder" ASC);

-- CreateIndex
CREATE INDEX "idx_token_configurations_isActive" ON "public"."token_configurations"("isActive" ASC);

-- CreateIndex
CREATE INDEX "idx_wifi_tokens_status" ON "public"."wifi_tokens"("status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "r710_tokens_password_key" ON "public"."r710_tokens"("password" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "r710_tokens_username_key" ON "public"."r710_tokens"("username" ASC);

-- CreateIndex
CREATE INDEX "r710_connected_clients_tokenUsername_idx" ON "public"."r710_connected_clients"("tokenUsername" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "barcode_templates_barcodeValue_key" ON "public"."barcode_templates"("barcodeValue" ASC);

-- CreateIndex
CREATE INDEX "idx_barcode_templates_barcode_value" ON "public"."barcode_templates"("barcodeValue" ASC);

-- CreateIndex
CREATE INDEX "idx_barcode_templates_brand" ON "public"."barcode_templates"("brand_name" ASC);

-- CreateIndex
CREATE INDEX "idx_barcode_templates_business" ON "public"."barcode_templates"("businessId" ASC, "name" ASC);

-- CreateIndex
CREATE INDEX "idx_barcode_templates_business_barcode" ON "public"."barcode_templates"("businessId" ASC, "barcodeValue" ASC);

-- CreateIndex
CREATE INDEX "idx_barcode_templates_category" ON "public"."barcode_templates"("category_name" ASC);

-- CreateIndex
CREATE INDEX "idx_barcode_templates_department" ON "public"."barcode_templates"("department_name" ASC);

-- CreateIndex
CREATE INDEX "idx_barcode_print_jobs_barcode_data" ON "public"."barcode_print_jobs"("barcodeData" ASC);

-- CreateIndex
CREATE INDEX "idx_barcode_print_jobs_business" ON "public"."barcode_print_jobs"("businessId" ASC, "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_barcode_print_jobs_business_status" ON "public"."barcode_print_jobs"("businessId" ASC, "status" ASC, "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_barcode_print_jobs_status" ON "public"."barcode_print_jobs"("status" ASC, "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "public"."business_order_items" ADD CONSTRAINT "business_order_items_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "public"."product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."business_products" ADD CONSTRAINT "fk_business_products_template" FOREIGN KEY ("createdFromTemplateId") REFERENCES "public"."barcode_templates"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."product_barcodes" ADD CONSTRAINT "fk_product_barcodes_created_by" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."product_price_changes" ADD CONSTRAINT "fk_price_changes_barcode_job" FOREIGN KEY ("barcodeJobId") REFERENCES "public"."barcode_print_jobs"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."product_price_changes" ADD CONSTRAINT "fk_price_changes_product" FOREIGN KEY ("productId") REFERENCES "public"."business_products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."product_price_changes" ADD CONSTRAINT "fk_price_changes_user" FOREIGN KEY ("changedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."receipt_sequences" ADD CONSTRAINT "receipt_sequences_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sku_sequences" ADD CONSTRAINT "fk_sku_sequences_business" FOREIGN KEY ("businessId") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- RenameIndex
ALTER INDEX "public"."business_token_menu_items_businessId_idx" RENAME TO "idx_business_token_menu_items_businessId";

-- RenameIndex
ALTER INDEX "public"."business_token_menu_items_tokenConfigId_idx" RENAME TO "idx_business_token_menu_items_tokenConfigId";

-- RenameIndex
ALTER INDEX "public"."wifi_tokens_businessId_idx" RENAME TO "idx_wifi_tokens_businessId";

-- RenameIndex
ALTER INDEX "public"."wifi_tokens_status_idx" RENAME TO "idx_wifi_tokens_status";

-- RenameIndex
ALTER INDEX "public"."wifi_token_sales_businessId_idx" RENAME TO "idx_wifi_token_sales_businessId";

-- RenameIndex
ALTER INDEX "public"."wifi_token_sales_wifiTokenId_idx" RENAME TO "idx_wifi_token_sales_wifiTokenId";

-- RenameIndex
ALTER INDEX "public"."wifi_token_sales_expenseAccountId_idx" RENAME TO "idx_wifi_token_sales_expenseAccountId";

-- RenameIndex
ALTER INDEX "public"."wifi_token_sales_soldBy_idx" RENAME TO "idx_wifi_token_sales_soldBy";

-- RenameIndex
ALTER INDEX "public"."r710_tokens_username_password_key" RENAME TO "r710_tokens_username_password_unique";

-- RenameIndex
ALTER INDEX "public"."wifi_usage_analytics_periodType_periodStart_system_business_key" RENAME TO "wifi_usage_analytics_periodType_periodStart_system_busines_key";

-- RenameIndex
ALTER INDEX "public"."barcode_templates_businessId_barcodeValue_key" RENAME TO "barcode_templates_business_value_unique";

-- RenameIndex
ALTER INDEX "public"."sku_sequences_businessId_idx" RENAME TO "idx_sku_sequences_business";

-- RenameIndex
ALTER INDEX "public"."sku_sequences_businessId_prefix_idx" RENAME TO "idx_sku_sequences_prefix";

-- RenameIndex
ALTER INDEX "public"."sku_sequences_businessId_prefix_key" RENAME TO "unique_business_prefix";

-- RenameIndex
ALTER INDEX "public"."product_price_changes_productId_idx" RENAME TO "idx_price_changes_product";

-- RenameIndex
ALTER INDEX "public"."product_price_changes_changedAt_idx" RENAME TO "idx_price_changes_date";

-- RenameIndex
ALTER INDEX "public"."product_price_changes_changedBy_idx" RENAME TO "idx_price_changes_user";

-- RenameIndex
ALTER INDEX "public"."product_price_changes_changeReason_idx" RENAME TO "idx_price_changes_reason";

