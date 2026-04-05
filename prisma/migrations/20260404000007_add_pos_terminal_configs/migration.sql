-- CreateTable
CREATE TABLE IF NOT EXISTS "pos_terminal_configs" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "terminalId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "hasCustomerDisplay" BOOLEAN NOT NULL DEFAULT false,
    "customerDisplayUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_terminal_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "pos_terminal_configs_terminalId_key" ON "pos_terminal_configs"("terminalId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pos_terminal_configs_businessId_idx" ON "pos_terminal_configs"("businessId");

-- AddForeignKey (safe: only add if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pos_terminal_configs_businessId_fkey'
  ) THEN
    ALTER TABLE "pos_terminal_configs" ADD CONSTRAINT "pos_terminal_configs_businessId_fkey"
      FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
