-- The chat_rooms_system_alerts_singleton index (previous migration) only
-- blocks a NEW duplicate "System Alerts" room — it does nothing for
-- duplicates that already existed at the moment it was created. In
-- production, several near-simultaneous calls to getOrCreateSystemAlertsRoom
-- (nightly cron + the throttled lazy GET /api/notifications trigger + a
-- manual admin sweep, all racing before that constraint was deployed) each
-- created their own room, so the same compliance digest ended up posted
-- into 4 separate "System Alerts" rows — the chat list showed 4 duplicate
-- entries instead of one. Same merge technique as
-- merge_duplicate_general_rooms: keep whichever room has the most messages,
-- move everything else onto it, drop the rest. No-op if there's already
-- only one (e.g. locally, where this never raced).

DO $$
DECLARE
  canonical_id text;
BEGIN
  SELECT cr.id INTO canonical_id
  FROM chat_rooms cr
  LEFT JOIN chat_messages cm ON cm."roomId" = cr.id
  WHERE cr.name = 'System Alerts' AND cr.type = 'system'
  GROUP BY cr.id, cr."createdAt"
  ORDER BY count(cm.id) DESC, cr."createdAt" ASC
  LIMIT 1;

  IF canonical_id IS NOT NULL THEN
    UPDATE chat_messages
    SET "roomId" = canonical_id
    WHERE "roomId" IN (
      SELECT id FROM chat_rooms WHERE name = 'System Alerts' AND type = 'system' AND id <> canonical_id
    );

    UPDATE chat_participants cp
    SET "roomId" = canonical_id
    WHERE "roomId" IN (
      SELECT id FROM chat_rooms WHERE name = 'System Alerts' AND type = 'system' AND id <> canonical_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM chat_participants cp2
      WHERE cp2."roomId" = canonical_id AND cp2."userId" = cp."userId"
    );
    DELETE FROM chat_participants
    WHERE "roomId" IN (
      SELECT id FROM chat_rooms WHERE name = 'System Alerts' AND type = 'system' AND id <> canonical_id
    );

    DELETE FROM chat_rooms WHERE name = 'System Alerts' AND type = 'system' AND id <> canonical_id;
  END IF;
END $$;

-- Re-affirm the constraint (IF NOT EXISTS — already applied, this is just
-- belt-and-braces in case this migration ever runs against a database that
-- somehow doesn't have it yet).
CREATE UNIQUE INDEX IF NOT EXISTS "chat_rooms_system_alerts_singleton"
  ON "chat_rooms" (name)
  WHERE name = 'System Alerts' AND type = 'system';
