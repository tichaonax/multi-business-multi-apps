-- MBM-283 follow-up: a business can have several workstations that each
-- need a different default remote printer (e.g. front counter -> kitchen
-- printer, bar tablet -> bar printer) -- a single business-wide default
-- can't represent that. Drops the one-row-per-business uniqueness and adds
-- an optional workstationAgentId dimension, mirroring qz_printer_configs.
-- Table has zero rows in production as of this migration (Phase 3 shipped
-- with no admin UI to create any yet), so no data migration is needed.

-- DropIndex
DROP INDEX "default_receipt_printer_configs_businessId_key";

-- AlterTable
ALTER TABLE "default_receipt_printer_configs" ADD COLUMN "workstationAgentId" TEXT;

-- CreateIndex
CREATE INDEX "default_receipt_printer_configs_businessId_idx" ON "default_receipt_printer_configs"("businessId");

-- CreateIndex
CREATE INDEX "default_receipt_printer_configs_workstationAgentId_idx" ON "default_receipt_printer_configs"("workstationAgentId");

-- AddForeignKey
ALTER TABLE "default_receipt_printer_configs" ADD CONSTRAINT "default_receipt_printer_configs_workstationAgentId_fkey" FOREIGN KEY ("workstationAgentId") REFERENCES "workstation_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
