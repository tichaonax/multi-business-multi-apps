-- MBM-354: a licence cost line can say which other licences came on the same receipt
ALTER TABLE "supplier_payment_request_items" ADD COLUMN "vehicleLicenseIncludes" TEXT;
ALTER TABLE "petty_cash_transactions" ADD COLUMN "vehicleLicenseIncludes" TEXT;
ALTER TABLE "combo_payment_request_items" ADD COLUMN "vehicleLicenseIncludes" TEXT;
