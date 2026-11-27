-- MBM-351: signed-in users screen, sign users out from another workstation, suspend a user.

-- Suspension (separate from isActive/deactivation so lifting it restores the user as they were)
ALTER TABLE "users" ADD COLUMN "isSuspended" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "suspendedAt" TIMESTAMP(3),
  ADD COLUMN "suspendedBy" TEXT,
  ADD COLUMN "suspensionReason" TEXT;

-- One row per sign-in; id = the JWT's sessionId
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "loginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceLabel" TEXT,
    "hostname" TEXT,
    "endedAt" TIMESTAMP(3),
    "endReason" VARCHAR(20),
    "endedBy" TEXT,
    "endMessage" TEXT,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "user_sessions_userId_endedAt_idx" ON "user_sessions"("userId", "endedAt");
CREATE INDEX "user_sessions_endedAt_lastSeenAt_idx" ON "user_sessions"("endedAt", "lastSeenAt");

ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
