-- getOrCreateDirectRoom's "does a direct room already exist for these two
-- people?" check required EXACTLY 2 ChatParticipants rows. Before the
-- roomId+userId unique constraint (dedupe_chat_participants migration), a
-- stray duplicate participant row in an existing direct room made that
-- check fail, so the app silently created a second, genuinely duplicate
-- direct room for the same pair of users instead of reusing the first one
-- — confirmed in the wild between the same two users (one room from
-- 2026-10-03, a duplicate from 2026-10-08). This merges every such
-- duplicate group (same two participants, same room type 'direct') into
-- whichever room has the most messages, same technique as the earlier
-- General/System Alerts room merges. No-op where there's already only one
-- direct room per pair.

DO $$
DECLARE
  dup RECORD;
  canonical_id text;
  other_id text;
BEGIN
  FOR dup IN
    SELECT participant_pair, array_agg(room_id ORDER BY msg_count DESC, created_at ASC) AS room_ids
    FROM (
      SELECT
        cr.id AS room_id,
        cr."createdAt" AS created_at,
        (SELECT string_agg(cp."userId", ',' ORDER BY cp."userId") FROM chat_participants cp WHERE cp."roomId" = cr.id) AS participant_pair,
        (SELECT count(*) FROM chat_messages cm WHERE cm."roomId" = cr.id) AS msg_count
      FROM chat_rooms cr
      WHERE cr.type = 'direct'
    ) sub
    WHERE participant_pair IS NOT NULL
    GROUP BY participant_pair
    HAVING count(*) > 1
  LOOP
    canonical_id := dup.room_ids[1];
    FOR i IN 2..array_length(dup.room_ids, 1) LOOP
      other_id := dup.room_ids[i];

      UPDATE chat_messages SET "roomId" = canonical_id WHERE "roomId" = other_id;

      UPDATE chat_participants cp
      SET "roomId" = canonical_id
      WHERE cp."roomId" = other_id
      AND NOT EXISTS (
        SELECT 1 FROM chat_participants cp2
        WHERE cp2."roomId" = canonical_id AND cp2."userId" = cp."userId"
      );
      DELETE FROM chat_participants WHERE "roomId" = other_id;

      DELETE FROM chat_rooms WHERE id = other_id;
    END LOOP;
  END LOOP;
END $$;
