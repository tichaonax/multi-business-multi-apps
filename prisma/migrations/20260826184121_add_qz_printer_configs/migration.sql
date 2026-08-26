-- CreateTable
CREATE TABLE "qz_printer_configs" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "workstationAgentId" TEXT,
    "printerName" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qz_printer_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "qz_printer_configs_businessId_idx" ON "qz_printer_configs"("businessId");

-- CreateIndex
CREATE INDEX "qz_printer_configs_workstationAgentId_idx" ON "qz_printer_configs"("workstationAgentId");

-- AddForeignKey
ALTER TABLE "qz_printer_configs" ADD CONSTRAINT "qz_printer_configs_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qz_printer_configs" ADD CONSTRAINT "qz_printer_configs_workstationAgentId_fkey" FOREIGN KEY ("workstationAgentId") REFERENCES "workstation_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qz_printer_configs" ADD CONSTRAINT "qz_printer_configs_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
