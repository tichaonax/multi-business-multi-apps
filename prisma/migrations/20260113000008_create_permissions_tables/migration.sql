-- Migration: Create permissions and user_permissions tables
-- Created: 2026-01-13
-- Purpose: Add permissions system tables
-- Expected Impact: Allows backup system to query permissions and user_permissions

-- Create permissions table if it doesn't exist
CREATE TABLE IF NOT EXISTS "permissions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "isSystemPermission" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on name
CREATE UNIQUE INDEX IF NOT EXISTS "permissions_name_key" ON "permissions"("name");

-- Create user_permissions table if it doesn't exist
CREATE TABLE IF NOT EXISTS "user_permissions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedBy" TEXT,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "user_permissions_userId_permissionId_key" ON "user_permissions"("userId", "permissionId");

-- Add foreign key constraints
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_permissions_permissionId_fkey') THEN
        ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_permissions_userId_fkey') THEN
        ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END$$;
