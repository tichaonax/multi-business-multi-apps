-- MBM-283 follow-up: lightweight, no-agent-required identity for a
-- printer-less device that wants a centrally (admin-assigned) default
-- remote printer without ever pairing/running the local agent.

-- CreateTable
CREATE TABLE "print_terminals" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "registeredBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3),

    CONSTRAINT "print_terminals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "print_terminals_businessId_idx" ON "print_terminals"("businessId");

-- AddForeignKey
ALTER TABLE "print_terminals" ADD CONSTRAINT "print_terminals_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_terminals" ADD CONSTRAINT "print_terminals_registeredBy_fkey" FOREIGN KEY ("registeredBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: second, mutually-exclusive identity column on the existing
-- default-printer table (workstationAgentId = hardware pairing, this new
-- printTerminalId = the lightweight identity above; a row only ever has
-- one of the two set).
ALTER TABLE "default_receipt_printer_configs" ADD COLUMN "printTerminalId" TEXT;

-- CreateIndex
CREATE INDEX "default_receipt_printer_configs_printTerminalId_idx" ON "default_receipt_printer_configs"("printTerminalId");

-- AddForeignKey
ALTER TABLE "default_receipt_printer_configs" ADD CONSTRAINT "default_receipt_printer_configs_printTerminalId_fkey" FOREIGN KEY ("printTerminalId") REFERENCES "print_terminals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
