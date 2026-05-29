-- MBM-224: Warehouse Order Reference Locking
-- Tracks order#/tracking# lifecycle to prevent duplicate imports

CREATE TABLE warehouse_reference_locks (
  id               TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "referenceType"  VARCHAR(20) NOT NULL,
  "referenceValue" TEXT        NOT NULL,
  "originalQty"    INTEGER,
  "importedQty"    INTEGER     NOT NULL DEFAULT 0,
  "isLocked"       BOOLEAN     NOT NULL DEFAULT false,
  "autoLocked"     BOOLEAN     NOT NULL DEFAULT false,
  "lockedAt"       TIMESTAMPTZ,
  "lockedById"     TEXT        REFERENCES users(id),
  "lockReason"     TEXT,
  notes            TEXT,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT warehouse_reference_locks_pkey PRIMARY KEY (id),
  CONSTRAINT warehouse_reference_locks_type_value_key UNIQUE ("referenceType", "referenceValue")
);

CREATE INDEX warehouse_reference_locks_value_idx ON warehouse_reference_locks ("referenceValue");
CREATE INDEX warehouse_reference_locks_type_locked_idx ON warehouse_reference_locks ("referenceType", "isLocked");
