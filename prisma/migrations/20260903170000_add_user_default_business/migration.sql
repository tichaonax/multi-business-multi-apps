-- Admin-settable default business for a user account. When set, this business
-- is selected automatically on login, taking priority over the user's last
-- accessed business.
ALTER TABLE "users" ADD COLUMN "defaultBusinessId" TEXT;
