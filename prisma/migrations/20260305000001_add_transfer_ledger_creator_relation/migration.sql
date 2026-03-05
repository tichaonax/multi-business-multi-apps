-- AddForeignKey
ALTER TABLE "business_transfer_ledger" ADD CONSTRAINT "business_transfer_ledger_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
