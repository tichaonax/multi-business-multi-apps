-- Migration: Add essential missing columns and tables (conservative approach)
-- Created: 2026-01-13
-- Purpose: Add only critical missing schema elements without dropping/altering existing ones
-- Expected Impact: Brings database closer to schema.prisma without breaking existing data

-- Add missing columns to business_products
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_products' AND column_name = 'createdFromTemplateId') THEN
        ALTER TABLE "business_products" ADD COLUMN "createdFromTemplateId" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_products' AND column_name = 'templateLinkedAt') THEN
        ALTER TABLE "business_products" ADD COLUMN "templateLinkedAt" TIMESTAMPTZ(6);
    END IF;
END $$;

-- Add missing columns to product_barcodes
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_barcodes' AND column_name = 'createdBy') THEN
        ALTER TABLE "product_barcodes" ADD COLUMN "createdBy" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_barcodes' AND column_name = 'source') THEN
        ALTER TABLE "product_barcodes" ADD COLUMN "source" VARCHAR(50) DEFAULT 'MANUAL';
    END IF;
END $$;

-- Add missing columns to barcode_templates
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'barcode_templates' AND column_name = 'brand_name') THEN
        ALTER TABLE "barcode_templates" ADD COLUMN "brand_name" VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'barcode_templates' AND column_name = 'category_name') THEN
        ALTER TABLE "barcode_templates" ADD COLUMN "category_name" VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'barcode_templates' AND column_name = 'department_name') THEN
        ALTER TABLE "barcode_templates" ADD COLUMN "department_name" VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'barcode_templates' AND column_name = 'createdBy') THEN
        ALTER TABLE "barcode_templates" ADD COLUMN "createdBy" TEXT;
    END IF;
END $$;

-- Add missing column to barcode_print_jobs
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'barcode_print_jobs' AND column_name = 'createdBy') THEN
        ALTER TABLE "barcode_print_jobs" ADD COLUMN "createdBy" TEXT;
    END IF;
END $$;

-- Add missing column to businesses
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'showSlogan' AND is_nullable = 'NO') THEN
        ALTER TABLE "businesses" ALTER COLUMN "showSlogan" DROP NOT NULL;
    END IF;
END $$;

-- Note: NOT creating esp32_connected_clients, customer_display_sessions, pos_terminal_configs tables
-- as these may be deprecated/optional tables that aren't used in production
