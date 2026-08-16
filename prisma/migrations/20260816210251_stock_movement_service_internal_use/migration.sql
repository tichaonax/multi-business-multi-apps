-- AlterEnum
-- New values must be committed before they can be referenced by any other
-- statement, so this migration only adds them — nothing else touches
-- StockMovementType in this same file.
ALTER TYPE "StockMovementType" ADD VALUE 'SERVICE_USE';
ALTER TYPE "StockMovementType" ADD VALUE 'INTERNAL_USE';
