-- CreateTable: payment_notes
-- Stores reusable note phrases for expense account payments, scoped per user

CREATE TABLE "payment_notes" (
    "id"         TEXT NOT NULL,
    "userId"     TEXT,
    "note"       TEXT NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "isActive"   BOOLEAN NOT NULL DEFAULT true,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_notes_pkey" PRIMARY KEY ("id")
);

-- FK to users
ALTER TABLE "payment_notes" ADD CONSTRAINT "payment_notes_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Index for fast per-user lookups
CREATE INDEX "payment_notes_userId_idx" ON "payment_notes"("userId");
