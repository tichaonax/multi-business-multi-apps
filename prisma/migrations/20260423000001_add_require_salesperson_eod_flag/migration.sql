-- Migration: add requireSalespersonEod and eodDeadlineTime to businesses
ALTER TABLE "businesses"
  ADD COLUMN "requireSalespersonEod" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN "eodDeadlineTime"       VARCHAR(5) DEFAULT '20:00';
