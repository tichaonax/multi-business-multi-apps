-- CreateTable business_loan_managers
CREATE TABLE "business_loan_managers" (
    "id"        TEXT NOT NULL,
    "loan_id"   TEXT NOT NULL,
    "user_id"   TEXT NOT NULL,
    "added_by"  TEXT NOT NULL,
    "added_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_loan_managers_pkey" PRIMARY KEY ("id")
);

-- Unique: one row per loan+user
CREATE UNIQUE INDEX "business_loan_managers_loan_id_user_id_key" ON "business_loan_managers"("loan_id", "user_id");
CREATE INDEX "business_loan_managers_user_id_idx" ON "business_loan_managers"("user_id");

-- ForeignKeys
ALTER TABLE "business_loan_managers"
    ADD CONSTRAINT "business_loan_managers_loan_id_fkey"
    FOREIGN KEY ("loan_id") REFERENCES "business_loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "business_loan_managers"
    ADD CONSTRAINT "business_loan_managers_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "business_loan_managers"
    ADD CONSTRAINT "business_loan_managers_added_by_fkey"
    FOREIGN KEY ("added_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: every existing loan's managedByUserId becomes a manager row
INSERT INTO "business_loan_managers" ("id", "loan_id", "user_id", "added_by", "added_at")
SELECT gen_random_uuid(), bl.id, bl.managed_by_user_id, bl.created_by, bl.created_at
FROM "business_loans" bl
ON CONFLICT ("loan_id", "user_id") DO NOTHING;
