-- CreateTable
CREATE TABLE "portal_integrations" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "portalIpAddress" TEXT NOT NULL,
    "portalPort" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "showTokensInPOS" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "portal_integrations_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE UNIQUE INDEX "portal_integrations_businessId_key" ON "portal_integrations"("businessId");

-- Add foreign key constraints
ALTER TABLE "portal_integrations" ADD CONSTRAINT "portal_integrations_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "portal_integrations" ADD CONSTRAINT "portal_integrations_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;