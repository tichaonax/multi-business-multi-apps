-- MBM-143: Add totalCashReceived to grouped_eod_runs
ALTER TABLE "grouped_eod_runs" ADD COLUMN "totalCashReceived" DOUBLE PRECISION;
