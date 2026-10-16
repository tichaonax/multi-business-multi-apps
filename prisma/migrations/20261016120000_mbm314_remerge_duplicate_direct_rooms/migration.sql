-- MBM-314 — duplicate direct (1:1) chats between the same two users came
-- back after 20261008140000_merge_duplicate_direct_rooms merged them. The
-- room was re-created with its original id by a backup restore (restore
-- upserts chat rooms/participants/messages by id, so restoring a backup
-- taken before the merge — or one from another system that has its own
-- direct room for the same pair — reintroduces the duplicate). The restore
-- path and getOrCreateDirectRoom are fixed in code alongside this; this
-- re-runs the same merge for rooms that already slipped through.
--
-- Canonical room = most messages, then oldest. Messages move over, the
-- canonical participant row keeps the latest lastReadAt of the two, and
-- the extra room is deleted. No-op where each pair has one direct room.

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
        (SELECT string_agg(DISTINCT cp."userId", ',' ORDER BY cp."userId") FROM chat_participants cp WHERE cp."roomId" = cr.id) AS participant_pair,
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

      -- Keep the most recent read position per user across both rooms.
      UPDATE chat_participants cp
      SET "lastReadAt" = o."lastReadAt"
      FROM chat_participants o
      WHERE cp."roomId" = canonical_id
        AND o."roomId" = other_id
        AND o."userId" = cp."userId"
        AND o."lastReadAt" IS NOT NULL
        AND (cp."lastReadAt" IS NULL OR o."lastReadAt" > cp."lastReadAt");

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

-- Hard guarantee going forward: one direct room per pair, enforced by the
-- DB. directKey = the two participant userIds, sorted, ':'-joined. Backfilled
-- AFTER the merge above so every pair has exactly one room to key. NULL for
-- group/system rooms (a unique index allows any number of NULLs).
ALTER TABLE "chat_rooms" ADD COLUMN "directKey" TEXT;

UPDATE chat_rooms cr
SET "directKey" = sub.pair_key
FROM (
  SELECT cp."roomId", string_agg(DISTINCT cp."userId", ':' ORDER BY cp."userId") AS pair_key, count(DISTINCT cp."userId") AS n
  FROM chat_participants cp
  WHERE cp."userId" IS NOT NULL
  GROUP BY cp."roomId"
) sub
WHERE cr.id = sub."roomId" AND cr.type = 'direct' AND sub.n = 2;

CREATE UNIQUE INDEX "chat_rooms_directKey_key" ON "chat_rooms"("directKey");
