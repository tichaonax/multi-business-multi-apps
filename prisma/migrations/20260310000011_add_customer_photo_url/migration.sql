-- Migration: 20260310000011_add_customer_photo_url
-- Adds optional photoUrl column to business_customers table

ALTER TABLE "business_customers"
  ADD COLUMN "photoUrl" TEXT DEFAULT NULL;
