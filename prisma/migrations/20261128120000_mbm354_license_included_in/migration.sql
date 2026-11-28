-- MBM-354: a radio licence / insurance that comes on the registration's receipt
ALTER TABLE "vehicle_licenses" ADD COLUMN "includedInLicenseId" TEXT;

CREATE INDEX "vehicle_licenses_includedInLicenseId_idx" ON "vehicle_licenses"("includedInLicenseId");

ALTER TABLE "vehicle_licenses" ADD CONSTRAINT "vehicle_licenses_includedInLicenseId_fkey" FOREIGN KEY ("includedInLicenseId") REFERENCES "vehicle_licenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
