-- AlterTable: add approvalStatus, approvedBy, approvedAt to per_diem_entries
ALTER TABLE "per_diem_entries" ADD COLUMN "approvalStatus" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "per_diem_entries" ADD COLUMN "approvedBy" TEXT;
ALTER TABLE "per_diem_entries" ADD COLUMN "approvedAt" TIMESTAMP(3);
