-- Add receiptNumber to supplier_payment_requests
ALTER TABLE "supplier_payment_requests" ADD COLUMN "receiptNumber" TEXT;

-- Create supplier_payment_request_items table
CREATE TABLE "supplier_payment_request_items" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT,
    "subcategoryId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "supplier_payment_request_items_pkey" PRIMARY KEY ("id")
);

-- Index on requestId for fast lookups
CREATE INDEX "supplier_payment_request_items_requestId_idx" ON "supplier_payment_request_items"("requestId");

-- Foreign key: requestId → supplier_payment_requests.id (cascade delete)
ALTER TABLE "supplier_payment_request_items" ADD CONSTRAINT "supplier_payment_request_items_requestId_fkey"
    FOREIGN KEY ("requestId") REFERENCES "supplier_payment_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Foreign key: categoryId → expense_categories.id (optional)
ALTER TABLE "supplier_payment_request_items" ADD CONSTRAINT "supplier_payment_request_items_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "expense_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign key: subcategoryId → expense_subcategories.id (optional)
ALTER TABLE "supplier_payment_request_items" ADD CONSTRAINT "supplier_payment_request_items_subcategoryId_fkey"
    FOREIGN KEY ("subcategoryId") REFERENCES "expense_subcategories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
