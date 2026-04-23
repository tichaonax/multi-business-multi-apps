-- MBM-189: Policy Management & Employee Acknowledgment System
-- Creates policy_templates, policies, policy_versions, policy_assignments, policy_acknowledgments
-- and the required enums.

CREATE TYPE "PolicyCategory" AS ENUM ('HR', 'SAFETY', 'IT', 'FINANCE', 'CODE_OF_CONDUCT', 'OTHER');
CREATE TYPE "PolicyContentType" AS ENUM ('RICH_TEXT', 'PDF');
CREATE TYPE "PolicyStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "PolicyVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "PolicyAssignmentScope" AS ENUM ('ALL_EMPLOYEES', 'BY_ROLE', 'INDIVIDUAL');

-- System-seeded read-only policy templates
CREATE TABLE "policy_templates" (
    "id"          TEXT NOT NULL,
    "title"       TEXT NOT NULL,
    "category"    "PolicyCategory" NOT NULL,
    "description" TEXT,
    "content"     TEXT NOT NULL,
    "isActive"    BOOLEAN NOT NULL DEFAULT true,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policy_templates_pkey" PRIMARY KEY ("id")
);

-- Policy documents (owned by a business)
CREATE TABLE "policies" (
    "id"             TEXT NOT NULL,
    "businessId"     TEXT NOT NULL,
    "title"          TEXT NOT NULL,
    "description"    TEXT,
    "category"       "PolicyCategory" NOT NULL,
    "contentType"    "PolicyContentType" NOT NULL DEFAULT 'RICH_TEXT',
    "status"         "PolicyStatus" NOT NULL DEFAULT 'DRAFT',
    "currentVersion" INTEGER NOT NULL DEFAULT 0,
    "isPublic"       BOOLEAN NOT NULL DEFAULT false,
    "createdById"    TEXT NOT NULL,
    "publishedAt"    TIMESTAMP(3),
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "policies_pkey" PRIMARY KEY ("id")
);

-- Immutable version snapshots of a policy
CREATE TABLE "policy_versions" (
    "id"            TEXT NOT NULL,
    "policyId"      TEXT NOT NULL,
    "version"       INTEGER NOT NULL,
    "status"        "PolicyVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "content"       TEXT,
    "fileId"        TEXT,
    "changeNote"    TEXT,
    "createdById"   TEXT NOT NULL,
    "publishedById" TEXT,
    "publishedAt"   TIMESTAMP(3),
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policy_versions_pkey" PRIMARY KEY ("id")
);

-- Assignment of a policy version to employees
CREATE TABLE "policy_assignments" (
    "id"            TEXT NOT NULL,
    "policyId"      TEXT NOT NULL,
    "policyVersion" INTEGER NOT NULL,
    "businessId"    TEXT NOT NULL,
    "scope"         "PolicyAssignmentScope" NOT NULL DEFAULT 'INDIVIDUAL',
    "roleTarget"    TEXT,
    "userId"        TEXT,
    "dueDate"       TIMESTAMP(3),
    "notes"         TEXT,
    "assignedById"  TEXT NOT NULL,
    "assignedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive"      BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "policy_assignments_pkey" PRIMARY KEY ("id")
);

-- Acknowledgment records (one per user per assignment)
CREATE TABLE "policy_acknowledgments" (
    "id"                 TEXT NOT NULL,
    "policyAssignmentId" TEXT NOT NULL,
    "policyId"           TEXT NOT NULL,
    "policyVersion"      INTEGER NOT NULL,
    "userId"             TEXT NOT NULL,
    "businessId"         TEXT NOT NULL,
    "disclaimerText"     TEXT NOT NULL,
    "scrolledToEnd"      BOOLEAN NOT NULL DEFAULT false,
    "ipAddress"          TEXT,
    "userAgent"          TEXT,
    "waivedById"         TEXT,
    "waivedReason"       TEXT,
    "acknowledgedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policy_acknowledgments_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "policies_businessId_status_idx" ON "policies"("businessId", "status");
CREATE INDEX "policies_businessId_category_idx" ON "policies"("businessId", "category");

CREATE UNIQUE INDEX "policy_versions_policyId_version_key" ON "policy_versions"("policyId", "version");
CREATE INDEX "policy_versions_policyId_status_idx" ON "policy_versions"("policyId", "status");

CREATE INDEX "policy_assignments_policyId_businessId_idx" ON "policy_assignments"("policyId", "businessId");
CREATE INDEX "policy_assignments_userId_isActive_idx" ON "policy_assignments"("userId", "isActive");
CREATE INDEX "policy_assignments_businessId_scope_idx" ON "policy_assignments"("businessId", "scope");

CREATE UNIQUE INDEX "policy_acknowledgments_policyAssignmentId_userId_key" ON "policy_acknowledgments"("policyAssignmentId", "userId");
CREATE INDEX "policy_acknowledgments_userId_businessId_idx" ON "policy_acknowledgments"("userId", "businessId");
CREATE INDEX "policy_acknowledgments_policyId_policyVersion_idx" ON "policy_acknowledgments"("policyId", "policyVersion");

-- Foreign keys
ALTER TABLE "policies" ADD CONSTRAINT "policies_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "policies" ADD CONSTRAINT "policies_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "policy_versions" ADD CONSTRAINT "policy_versions_policyId_fkey"
    FOREIGN KEY ("policyId") REFERENCES "policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "policy_versions" ADD CONSTRAINT "policy_versions_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "policy_versions" ADD CONSTRAINT "policy_versions_publishedById_fkey"
    FOREIGN KEY ("publishedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "policy_assignments" ADD CONSTRAINT "policy_assignments_policyId_fkey"
    FOREIGN KEY ("policyId") REFERENCES "policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "policy_assignments" ADD CONSTRAINT "policy_assignments_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "policy_assignments" ADD CONSTRAINT "policy_assignments_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "policy_assignments" ADD CONSTRAINT "policy_assignments_assignedById_fkey"
    FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "policy_acknowledgments" ADD CONSTRAINT "policy_acknowledgments_policyAssignmentId_fkey"
    FOREIGN KEY ("policyAssignmentId") REFERENCES "policy_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "policy_acknowledgments" ADD CONSTRAINT "policy_acknowledgments_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "policy_acknowledgments" ADD CONSTRAINT "policy_acknowledgments_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "policy_acknowledgments" ADD CONSTRAINT "policy_acknowledgments_waivedById_fkey"
    FOREIGN KEY ("waivedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
