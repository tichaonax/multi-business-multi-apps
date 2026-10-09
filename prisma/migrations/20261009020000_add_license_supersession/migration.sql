-- MBM-306: persisted "this license renews that one" link on vehicle_licenses,
-- so a resolved compliance alert can be detected from an already-posted
-- alert (chat digest / bell notification) by following the link forward
-- from the old license's id, without ever rewriting stored alert text.

ALTER TABLE "vehicle_licenses" ADD COLUMN "supersedesLicenseId" TEXT;

CREATE UNIQUE INDEX "vehicle_licenses_supersedesLicenseId_key" ON "vehicle_licenses"("supersedesLicenseId");

ALTER TABLE "vehicle_licenses"
  ADD CONSTRAINT "vehicle_licenses_supersedesLicenseId_fkey"
  FOREIGN KEY ("supersedesLicenseId") REFERENCES "vehicle_licenses"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
