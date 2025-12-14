-- CreateTable
CREATE TABLE "token_configurations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "durationMinutes" INTEGER NOT NULL,
    "bandwidthDownMb" INTEGER NOT NULL,
    "bandwidthUpMb" INTEGER NOT NULL,
    "basePrice" DECIMAL(12,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "token_configurations_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "idx_token_configurations_isActive" ON "token_configurations"("isActive");
CREATE INDEX "idx_token_configurations_displayOrder" ON "token_configurations"("displayOrder");