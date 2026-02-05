-- AlterTable: Add role template fields to job_titles
-- These fields support auto-populating employee data when selecting predefined role templates

ALTER TABLE "job_titles" ADD COLUMN "jobSummary" TEXT;
ALTER TABLE "job_titles" ADD COLUMN "skillsRequired" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "job_titles" ADD COLUMN "qualifications" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "job_titles" ADD COLUMN "businessType" TEXT;
ALTER TABLE "job_titles" ADD COLUMN "isRoleTemplate" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "job_titles" ADD COLUMN "defaultNotes" TEXT;
ALTER TABLE "job_titles" ADD COLUMN "defaultPermissionPreset" TEXT;
