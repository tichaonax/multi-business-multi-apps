-- Add structured name + profile photo to Users, kept in sync with a linked
-- Employees row going forward (see link-employee / employee / user-profile
-- update routes). `name` stays the authoritative display string every
-- existing reader already uses.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "firstName" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastName" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "profilePhotoUrl" TEXT;

-- Pass 1: give every user (linked or not) a reasonable firstName/lastName
-- split from their existing name, so standalone users (no Employee record)
-- aren't left with empty fields.
UPDATE "users"
SET
  "firstName" = split_part(trim("name"), ' ', 1),
  "lastName" = NULLIF(trim(substring(trim("name") from position(' ' in trim("name")) + 1)), '')
WHERE position(' ' in trim("name")) > 0;

UPDATE "users"
SET "firstName" = trim("name"), "lastName" = NULL
WHERE position(' ' in trim("name")) = 0;

-- Pass 2: for every already-linked Employee/User pair, the Employee record
-- takes precedence on any mismatch (per explicit instruction) — this is the
-- actual fix for cases like a photo set on the Employee side never showing
-- up anywhere that reads from Users (e.g. Team Chat).
UPDATE "users" u
SET
  "firstName" = e."firstName",
  "lastName" = e."lastName",
  "name" = e."fullName",
  "profilePhotoUrl" = e."profilePhotoUrl"
FROM "employees" e
WHERE e."userId" = u.id;
