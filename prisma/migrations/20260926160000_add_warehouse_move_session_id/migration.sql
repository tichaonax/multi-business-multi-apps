-- Groups every item moved together in a single "Move to Business" action so
-- a later "Move Sessions" view can show exactly what was moved together in
-- one action, not just each item's own movedAt timestamp.
ALTER TABLE "warehouse_items" ADD COLUMN "moveSessionId" TEXT;

CREATE INDEX "warehouse_items_moveSessionId_idx" ON "warehouse_items"("moveSessionId");
