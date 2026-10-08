-- chat_participants had no unique constraint on (roomId, userId), so
-- getOrCreateSystemAlertsRoom's createMany({ skipDuplicates: true }) — run
-- on every sweep (nightly cron, throttled lazy trigger, manual admin
-- button) — had nothing to dedupe against and silently inserted a new
-- participant row every time instead of skipping. GET /api/chat/rooms
-- builds one "room" card per ChatParticipants row, so this is what actually
-- flooded the chat list with duplicate "System Alerts" entries — not a
-- duplicate ChatRooms row (that part was already fixed and stayed fixed).

-- Keep exactly one row per (roomId, userId) — the earliest joinedAt (ties
-- broken by id) — and delete the rest.
DELETE FROM chat_participants cp
USING chat_participants cp2
WHERE cp."roomId" IS NOT NULL
  AND cp."userId" IS NOT NULL
  AND cp."roomId" = cp2."roomId"
  AND cp."userId" = cp2."userId"
  AND cp.id <> cp2.id
  AND (cp."joinedAt" > cp2."joinedAt" OR (cp."joinedAt" = cp2."joinedAt" AND cp.id > cp2.id));

-- Now safe to add — closes the gap for good.
CREATE UNIQUE INDEX IF NOT EXISTS "chat_participants_roomId_userId_key"
  ON "chat_participants" ("roomId", "userId");
