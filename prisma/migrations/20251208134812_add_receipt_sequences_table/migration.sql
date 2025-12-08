-- Create receipt_sequences table
-- This table tracks receipt numbering sequences per business per date

CREATE TABLE "receipt_sequences" (
    "businessId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "lastSequence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receipt_sequences_pkey" PRIMARY KEY ("businessId","date")
);

-- Add foreign key constraint to businesses table
ALTER TABLE "receipt_sequences" ADD CONSTRAINT "receipt_sequences_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
