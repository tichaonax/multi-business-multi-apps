-- MBM-271: Advance/Receipt Accountability — capture fields + submit/review/approve workflow

-- ── Richer receipt capture ──────────────────────────────────────────────────
ALTER TABLE "expense_payment_receipts" ADD COLUMN "receipt_number" TEXT;
ALTER TABLE "expense_payment_receipts" ADD COLUMN "image_id" TEXT;

ALTER TABLE "expense_payment_receipts"
  ADD CONSTRAINT "expense_payment_receipts_image_id_fkey"
  FOREIGN KEY ("image_id") REFERENCES "images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── Submit / review / approve workflow ──────────────────────────────────────
CREATE TYPE "ReceiptReviewStatus" AS ENUM ('PENDING', 'SUBMITTED', 'APPROVED');

CREATE TABLE "expense_payment_receipt_reviews" (
  "id"               TEXT NOT NULL,
  "expense_payment_id" TEXT NOT NULL,
  "status"           "ReceiptReviewStatus" NOT NULL DEFAULT 'PENDING',
  "expected_amount"  DECIMAL(12,2) NOT NULL,
  "submitted_by"     TEXT,
  "submitted_at"     TIMESTAMP(3),
  "reviewed_by"      TEXT,
  "reviewed_at"      TIMESTAMP(3),
  "review_note"      TEXT,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       TIMESTAMP(3) NOT NULL,

  CONSTRAINT "expense_payment_receipt_reviews_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "expense_payment_receipt_reviews_expense_payment_id_key" ON "expense_payment_receipt_reviews"("expense_payment_id");
CREATE INDEX "expense_payment_receipt_reviews_status_idx" ON "expense_payment_receipt_reviews"("status");

ALTER TABLE "expense_payment_receipt_reviews"
  ADD CONSTRAINT "expense_payment_receipt_reviews_expense_payment_id_fkey"
  FOREIGN KEY ("expense_payment_id") REFERENCES "expense_account_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "expense_payment_receipt_reviews"
  ADD CONSTRAINT "expense_payment_receipt_reviews_submitted_by_fkey"
  FOREIGN KEY ("submitted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "expense_payment_receipt_reviews"
  ADD CONSTRAINT "expense_payment_receipt_reviews_reviewed_by_fkey"
  FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
