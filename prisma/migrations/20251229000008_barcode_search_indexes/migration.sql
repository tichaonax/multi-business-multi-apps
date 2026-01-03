-- Migration 6: Barcode Search and Lookup Indexes
-- This migration adds full-text search and optimized indexes for fast barcode template
-- and print job searching via the barcode management UI and scanner

-- Full-text search index for barcode template names
-- Enables fast searching by template name (e.g., "Home Beauty Quilts")
CREATE INDEX IF NOT EXISTS idx_barcode_templates_name_search
  ON barcode_templates USING gin(to_tsvector('english', name));

-- Index for barcode value lookups (critical for scanner functionality)
CREATE INDEX IF NOT EXISTS idx_barcode_templates_barcode_value
  ON barcode_templates("barcodeValue");

-- Index for business-scoped template searches
CREATE INDEX IF NOT EXISTS idx_barcode_templates_business
  ON barcode_templates("businessId", name);

-- Composite index for barcode scanner with business filter
CREATE INDEX IF NOT EXISTS idx_barcode_templates_business_barcode
  ON barcode_templates("businessId", "barcodeValue");

-- Full-text search index for print job item names
-- Enables searching print jobs by item name
CREATE INDEX IF NOT EXISTS idx_barcode_print_jobs_item_name_search
  ON barcode_print_jobs USING gin(to_tsvector('english', "itemName"));

-- Index for barcode data lookups in print jobs
-- Enables finding all print jobs that printed a specific barcode
CREATE INDEX IF NOT EXISTS idx_barcode_print_jobs_barcode_data
  ON barcode_print_jobs("barcodeData");

-- Index for business-scoped print job searches
CREATE INDEX IF NOT EXISTS idx_barcode_print_jobs_business
  ON barcode_print_jobs("businessId", "createdAt" DESC);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_barcode_print_jobs_status
  ON barcode_print_jobs(status, "createdAt" DESC);

-- Composite index for business + status filtering
CREATE INDEX IF NOT EXISTS idx_barcode_print_jobs_business_status
  ON barcode_print_jobs("businessId", status, "createdAt" DESC);

-- Add comments explaining the indexes
COMMENT ON INDEX idx_barcode_templates_name_search IS 'Full-text search index for template name searching';
COMMENT ON INDEX idx_barcode_templates_barcode_value IS 'Fast barcode value lookup for scanner functionality';
COMMENT ON INDEX idx_barcode_templates_business_barcode IS 'Business-scoped barcode lookups (for business-specific search)';
COMMENT ON INDEX idx_barcode_print_jobs_item_name_search IS 'Full-text search index for print job item names';
COMMENT ON INDEX idx_barcode_print_jobs_barcode_data IS 'Find all print jobs for a specific barcode';
COMMENT ON INDEX idx_barcode_print_jobs_business_status IS 'Filter print jobs by business and status with chronological ordering';

-- Performance notes:
-- - GIN indexes (to_tsvector) enable fast full-text search but take more storage
-- - Composite indexes reduce need for multiple index scans in filtered queries
-- - DESC ordering in indexes optimizes "most recent first" queries
-- - All indexes support the search and scanner features in barcode management UI
