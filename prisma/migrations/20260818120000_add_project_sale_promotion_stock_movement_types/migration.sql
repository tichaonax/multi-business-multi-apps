-- MBM-270: Hardware Inventory Taxonomy Expansion
-- New values must be committed before they can be referenced by any other
-- statement, so this migration only adds them — nothing else touches
-- StockMovementType in this same file.
ALTER TYPE "StockMovementType" ADD VALUE 'PROJECT_SALE';
ALTER TYPE "StockMovementType" ADD VALUE 'PROMOTION';
