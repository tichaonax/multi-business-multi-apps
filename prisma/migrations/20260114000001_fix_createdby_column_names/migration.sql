-- Migration: Fix createdBy column names to match Prisma schema (createdById)
-- Created: 2026-01-14
-- Purpose: Rename createdBy columns to createdById to match schema.prisma

-- Rename column in barcode_templates
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'barcode_templates' AND column_name = 'createdBy') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'barcode_templates' AND column_name = 'createdById') THEN
            ALTER TABLE "barcode_templates" RENAME COLUMN "createdBy" TO "createdById";
        ELSE
            -- Both columns exist, drop the wrong one
            ALTER TABLE "barcode_templates" DROP COLUMN "createdBy";
        END IF;
    END IF;
END $$;

-- Rename column in barcode_print_jobs
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'barcode_print_jobs' AND column_name = 'createdBy') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'barcode_print_jobs' AND column_name = 'createdById') THEN
            ALTER TABLE "barcode_print_jobs" RENAME COLUMN "createdBy" TO "createdById";
        ELSE
            -- Both columns exist, drop the wrong one
            ALTER TABLE "barcode_print_jobs" DROP COLUMN "createdBy";
        END IF;
    END IF;
END $$;

-- Rename column in product_barcodes
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_barcodes' AND column_name = 'createdBy') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_barcodes' AND column_name = 'createdById') THEN
            ALTER TABLE "product_barcodes" RENAME COLUMN "createdBy" TO "createdById";
        ELSE
            -- Both columns exist, drop the wrong one
            ALTER TABLE "product_barcodes" DROP COLUMN "createdBy";
        END IF;
    END IF;
END $$;
