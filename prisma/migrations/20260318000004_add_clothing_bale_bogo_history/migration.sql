-- CreateTable: clothing_bale_bogo_history
CREATE TABLE "clothing_bale_bogo_history" (
    "id"             TEXT NOT NULL,
    "baleId"         TEXT NOT NULL,
    "changedBy"      TEXT NOT NULL,
    "action"         TEXT NOT NULL,
    "previousActive" BOOLEAN,
    "newActive"      BOOLEAN NOT NULL,
    "previousRatio"  INTEGER,
    "newRatio"       INTEGER NOT NULL,
    "notes"          TEXT,
    "changedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clothing_bale_bogo_history_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "clothing_bale_bogo_history" ADD CONSTRAINT "clothing_bale_bogo_history_baleId_fkey"
  FOREIGN KEY ("baleId") REFERENCES "clothing_bales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clothing_bale_bogo_history" ADD CONSTRAINT "clothing_bale_bogo_history_changedBy_fkey"
  FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
