-- Add optional due-date override and void tracking to contractor payouts
ALTER TABLE "vehicle_service_contractor_payouts" ADD COLUMN "dueDateOverride" TIMESTAMP(3);
ALTER TABLE "vehicle_service_contractor_payouts" ADD COLUMN "voidedAt" TIMESTAMP(3);
ALTER TABLE "vehicle_service_contractor_payouts" ADD COLUMN "voidedBy" TEXT;
