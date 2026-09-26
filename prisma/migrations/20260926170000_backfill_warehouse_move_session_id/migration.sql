-- Backfills moveSessionId for items moved to a business BEFORE the Move
-- Sessions feature existed, so past moves show up in the "Move Sessions"
-- panel too, not just ones made from now on.
--
-- Grouping key: (batchId, movedAt). The move route (see
-- src/app/api/warehouse/[batchId]/move/route.ts) computes `movedAt` exactly
-- once per API call and stamps that SAME value on every item moved in that
-- call -- so any items in the same batch sharing the identical movedAt
-- timestamp are guaranteed to be from one original "Move to Business"
-- action, not an approximation.
--
-- Idempotent -- only touches rows that don't already have a moveSessionId.
UPDATE warehouse_items wi
SET "moveSessionId" = grp.session_id, "updatedAt" = now()
FROM (
  SELECT "batchId", "movedAt", gen_random_uuid() AS session_id
  FROM warehouse_items
  WHERE status = 'MOVED_TO_BUSINESS' AND "moveSessionId" IS NULL AND "movedAt" IS NOT NULL
  GROUP BY "batchId", "movedAt"
) grp
WHERE wi."batchId" = grp."batchId"
  AND wi."movedAt" = grp."movedAt"
  AND wi.status = 'MOVED_TO_BUSINESS'
  AND wi."moveSessionId" IS NULL;
