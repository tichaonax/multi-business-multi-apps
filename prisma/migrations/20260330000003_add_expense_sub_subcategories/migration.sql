-- Add expense_sub_subcategories table (4th level of the domain hierarchy)
-- expense_domains → expense_categories → expense_subcategories → expense_sub_subcategories

CREATE TABLE IF NOT EXISTS expense_sub_subcategories (
  id              TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "subcategoryId" TEXT        NOT NULL,
  name            TEXT        NOT NULL,
  emoji           TEXT,
  "isUserCreated" BOOLEAN     NOT NULL DEFAULT false,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT expense_sub_subcategories_pkey PRIMARY KEY (id),
  CONSTRAINT expense_sub_subcategories_subcategoryId_name_key UNIQUE ("subcategoryId", name),
  CONSTRAINT expense_sub_subcategories_subcategoryId_fkey
    FOREIGN KEY ("subcategoryId") REFERENCES expense_subcategories(id) ON DELETE CASCADE
);
