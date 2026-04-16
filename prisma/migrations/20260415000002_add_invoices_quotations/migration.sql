-- MBM-178: Invoices & Quotations

-- Enums
CREATE TYPE "InvoiceType"   AS ENUM ('INVOICE', 'QUOTATION');
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- Extend businesses: logo, sequential counters, optional start-number override
ALTER TABLE "businesses"
  ADD COLUMN "logoImageId"           TEXT,
  ADD COLUMN "invoiceCounter"        INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "quotationCounter"      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "invoiceStartNumber"    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "quotationStartNumber"  INTEGER NOT NULL DEFAULT 0;

-- Invoices table
CREATE TABLE "invoices" (
  "id"              TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "businessId"      TEXT        NOT NULL,
  "type"            "InvoiceType"   NOT NULL,
  "number"          TEXT        NOT NULL,
  "status"          "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "customerId"      TEXT,
  "customerName"    TEXT        NOT NULL,
  "customerEmail"   TEXT,
  "customerPhone"   TEXT,
  "customerAddress" TEXT,
  "preparedById"    TEXT        NOT NULL,
  "preparedByName"  TEXT        NOT NULL,
  "issueDate"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validUntilDate"  TIMESTAMP(3) NOT NULL,
  "notes"           TEXT,
  "subtotal"        DECIMAL(12,2) NOT NULL DEFAULT 0,
  "discountAmount"  DECIMAL(12,2) NOT NULL DEFAULT 0,
  "taxAmount"       DECIMAL(12,2) NOT NULL DEFAULT 0,
  "total"           DECIMAL(12,2) NOT NULL DEFAULT 0,
  "currency"        TEXT        NOT NULL DEFAULT 'USD',
  "currencySymbol"  TEXT        NOT NULL DEFAULT '$',
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "invoices_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "invoices_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "invoices_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "business_customers"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "invoices_businessId_number_key" ON "invoices"("businessId", "number");
CREATE INDEX "invoices_businessId_type_idx" ON "invoices"("businessId", "type");
CREATE INDEX "invoices_businessId_status_idx" ON "invoices"("businessId", "status");

-- Invoice items table
CREATE TABLE "invoice_items" (
  "id"          TEXT          NOT NULL DEFAULT gen_random_uuid()::text,
  "invoiceId"   TEXT          NOT NULL,
  "description" TEXT          NOT NULL,
  "quantity"    DECIMAL(10,2) NOT NULL DEFAULT 1,
  "unitPrice"   DECIMAL(10,2) NOT NULL DEFAULT 0,
  "discount"    DECIMAL(10,2) NOT NULL DEFAULT 0,
  "total"       DECIMAL(10,2) NOT NULL DEFAULT 0,
  "sortOrder"   INTEGER       NOT NULL DEFAULT 0,

  CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "invoice_items_invoiceId_idx" ON "invoice_items"("invoiceId");
