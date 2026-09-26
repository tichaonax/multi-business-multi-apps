-- Re-clusters moveSessionId by time proximity instead of exact-timestamp
-- match. The previous backfill (20260926170000) grouped strictly by
-- (batchId, movedAt), which correctly reflects one API call but is too
-- granular from a user's perspective: moving 10 items one row at a time in
-- one sitting makes 10 separate API calls (10 distinct movedAt values), so
-- it showed up as 10 sessions instead of one.
--
-- This recomputes moveSessionId for every moved item using a standard
-- "gaps and islands" grouping: order items by movedAt within each
-- (batchId, targetBusinessId), start a new session whenever the gap since
-- the previous item exceeds 30 minutes, and assign one fresh id per
-- resulting cluster. Applies to ALL moved items (not just ones missing a
-- moveSessionId), since existing values need to be re-clustered, not just
-- filled in.
WITH ordered AS (
  SELECT
    wi.id,
    wi."batchId",
    bp."businessId",
    wi."movedAt",
    LAG(wi."movedAt") OVER (PARTITION BY wi."batchId", bp."businessId" ORDER BY wi."movedAt") AS prev_moved_at
  FROM warehouse_items wi
  JOIN business_products bp ON bp.id = wi."businessProductId"
  WHERE wi.status = 'MOVED_TO_BUSINESS' AND wi."movedAt" IS NOT NULL
),
boundaries AS (
  SELECT
    id, "batchId", "businessId", "movedAt",
    CASE
      WHEN prev_moved_at IS NULL OR "movedAt" - prev_moved_at > INTERVAL '30 minutes' THEN 1
      ELSE 0
    END AS is_new_session
  FROM ordered
),
grouped AS (
  SELECT
    id, "batchId", "businessId",
    SUM(is_new_session) OVER (PARTITION BY "batchId", "businessId" ORDER BY "movedAt" ROWS UNBOUNDED PRECEDING) AS session_group
  FROM boundaries
),
session_ids AS (
  SELECT DISTINCT "batchId", "businessId", session_group, gen_random_uuid() AS session_id
  FROM grouped
)
UPDATE warehouse_items wi
SET "moveSessionId" = si.session_id, "updatedAt" = now()
FROM grouped g
JOIN session_ids si
  ON si."batchId" = g."batchId" AND si."businessId" = g."businessId" AND si.session_group = g.session_group
WHERE wi.id = g.id;
