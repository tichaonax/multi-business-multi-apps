-- Dedicated "System Alerts" room (e.g. vehicle license compliance digests)
-- — a real, separately-membershipped ChatRooms row, not messages dropped
-- into General with a per-message recipient filter. Same defense as
-- chat_rooms_general_singleton against the getGeneralRoom()-style create
-- race: Postgres refuses a second "System Alerts"/"system" row outright.
CREATE UNIQUE INDEX IF NOT EXISTS "chat_rooms_system_alerts_singleton"
  ON "chat_rooms" (name)
  WHERE name = 'System Alerts' AND type = 'system';
