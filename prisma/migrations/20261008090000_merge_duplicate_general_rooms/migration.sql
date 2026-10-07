-- A startup race in getGeneralRoom() (two near-simultaneous calls both
-- finding no "General" room and both creating one) left two rows with
-- name='General' AND type='group' in chat_rooms. getGeneralRoom()'s
-- findFirst() has no orderBy, so which one Postgres returns is undefined
-- and can flip after any event that changes the query plan (deploy,
-- restart, ANALYZE, index rebuild) — surfacing to users as "all our chat
-- history disappeared" when the app silently started reading the other,
-- near-empty duplicate. No data was actually lost. This migration merges
-- any such duplicates (keeping the one with the most messages as
-- canonical) and adds a constraint so it can never happen again.

DO $$
DECLARE
  canonical_id uuid;
BEGIN
  SELECT cr.id INTO canonical_id
  FROM chat_rooms cr
  LEFT JOIN chat_messages cm ON cm."roomId" = cr.id
  WHERE cr.name = 'General' AND cr.type = 'group'
  GROUP BY cr.id, cr."createdAt"
  ORDER BY count(cm.id) DESC, cr."createdAt" ASC
  LIMIT 1;

  IF canonical_id IS NOT NULL THEN
    -- Move every message off any other General/group room onto the canonical one.
    UPDATE chat_messages
    SET "roomId" = canonical_id
    WHERE "roomId" IN (
      SELECT id FROM chat_rooms WHERE name = 'General' AND type = 'group' AND id <> canonical_id
    );

    -- Defensive: reassign any participant rows too (General has none today,
    -- but don't leave orphans if that ever changes), skipping collisions.
    UPDATE chat_participants cp
    SET "roomId" = canonical_id
    WHERE "roomId" IN (
      SELECT id FROM chat_rooms WHERE name = 'General' AND type = 'group' AND id <> canonical_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM chat_participants cp2
      WHERE cp2."roomId" = canonical_id AND cp2."userId" = cp."userId"
    );
    DELETE FROM chat_participants
    WHERE "roomId" IN (
      SELECT id FROM chat_rooms WHERE name = 'General' AND type = 'group' AND id <> canonical_id
    );

    -- Drop the now-empty duplicate room(s).
    DELETE FROM chat_rooms WHERE name = 'General' AND type = 'group' AND id <> canonical_id;
  END IF;
END $$;

-- Belt-and-braces: a partial unique index so Postgres itself refuses a
-- second "General"/"group" row, closing the race for good (the app-level
-- fix in getGeneralRoom() handles the resulting unique-violation gracefully).
CREATE UNIQUE INDEX IF NOT EXISTS "chat_rooms_general_singleton"
  ON "chat_rooms" (name)
  WHERE name = 'General' AND type = 'group';
