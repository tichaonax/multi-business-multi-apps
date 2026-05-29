-- warehouse_order_refs: tracks every unique (orderNumber, trackingNumber) combo ever imported.
-- Populated at import time with ON CONFLICT DO NOTHING — never overwritten.
-- ORDER MAX = SUM(orderedQty) WHERE orderNumber = X
-- Only ever increases: new unique combos add to the total, reimports change nothing.

CREATE TABLE IF NOT EXISTS warehouse_order_refs (
  id               TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "orderNumber"    TEXT NOT NULL,
  "trackingNumber" TEXT NOT NULL DEFAULT '',
  "orderedQty"     INTEGER NOT NULL DEFAULT 0,
  "firstSeenAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "warehouse_order_refs_order_tracking_unique" UNIQUE ("orderNumber", "trackingNumber")
);

CREATE INDEX IF NOT EXISTS "warehouse_order_refs_orderNumber_idx"     ON warehouse_order_refs ("orderNumber");
CREATE INDEX IF NOT EXISTS "warehouse_order_refs_trackingNumber_idx"  ON warehouse_order_refs ("trackingNumber");
