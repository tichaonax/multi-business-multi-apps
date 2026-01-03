-- Migration 1: Expand Template Name Field and Add Department/Category Links
-- This migration expands the barcode template name field to accommodate longer auto-generated names
-- and adds links to departments and categories for better template organization

-- Expand template name to accommodate longer auto-generated names
-- Format: {department/domain} {brand} {category} {productName}
ALTER TABLE barcode_templates
ALTER COLUMN name TYPE VARCHAR(255);

-- Add description field for label printing
-- This will hold the description text that appears on the printed label
ALTER TABLE barcode_templates
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add department name field (stored as text, not foreign key)
-- Department names help categorize templates by business area (e.g., "Home & Beauty", "Clothing")
ALTER TABLE barcode_templates
ADD COLUMN IF NOT EXISTS department_name VARCHAR(100);

-- Add brand name field for future use
ALTER TABLE barcode_templates
ADD COLUMN IF NOT EXISTS brand_name VARCHAR(100);

-- Add category name field
-- Categories provide granular classification (e.g., "Quilts", "Shirts")
ALTER TABLE barcode_templates
ADD COLUMN IF NOT EXISTS category_name VARCHAR(100);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_barcode_templates_department ON barcode_templates(department_name);
CREATE INDEX IF NOT EXISTS idx_barcode_templates_category ON barcode_templates(category_name);
CREATE INDEX IF NOT EXISTS idx_barcode_templates_brand ON barcode_templates(brand_name);

-- Add comment explaining the name field expansion
COMMENT ON COLUMN barcode_templates.name IS 'Template name, expanded to 255 chars to accommodate auto-generated names like: {department} {brand} {category} {productName}';
COMMENT ON COLUMN barcode_templates.description IS 'Description text to appear on printed labels (from domain or product description)';
COMMENT ON COLUMN barcode_templates.department_name IS 'Department name for template categorization (e.g., Home & Beauty, Clothing)';
COMMENT ON COLUMN barcode_templates.brand_name IS 'Brand name for template categorization (e.g., Nike, Adidas)';
COMMENT ON COLUMN barcode_templates.category_name IS 'Category name for granular classification (e.g., Quilts, Shirts)';
