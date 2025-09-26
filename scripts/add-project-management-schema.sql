-- Add Project Management Schema Enhancement
-- This script adds the new project management tables and fields to support generic projects

-- Create ProjectType table
CREATE TABLE IF NOT EXISTS "project_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL UNIQUE,
    "description" TEXT,
    "businessType" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_types_pkey" PRIMARY KEY ("id")
);

-- Create generic Project table
CREATE TABLE IF NOT EXISTS "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "projectTypeId" TEXT NOT NULL,
    "businessType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "budget" DECIMAL(12,2),
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- Add foreign key relationships for projects table
ALTER TABLE "projects" ADD CONSTRAINT "projects_projectTypeId_fkey"
    FOREIGN KEY ("projectTypeId") REFERENCES "project_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "projects" ADD CONSTRAINT "projects_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add backward compatibility fields to construction_projects
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'construction_projects' AND column_name = 'projectTypeId') THEN
        ALTER TABLE "construction_projects" ADD COLUMN "projectTypeId" TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'construction_projects' AND column_name = 'businessType') THEN
        ALTER TABLE "construction_projects" ADD COLUMN "businessType" TEXT DEFAULT 'construction';
    END IF;
END $$;

-- Add foreign key for construction_projects to project_types (nullable for backward compatibility)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'construction_projects_projectTypeId_fkey') THEN
        ALTER TABLE "construction_projects" ADD CONSTRAINT "construction_projects_projectTypeId_fkey"
            FOREIGN KEY ("projectTypeId") REFERENCES "project_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Add backward compatibility fields to project_contractors
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'project_contractors' AND column_name = 'constructionProjectId') THEN
        ALTER TABLE "project_contractors" ADD COLUMN "constructionProjectId" TEXT;
    END IF;
END $$;

-- Update project_contractors foreign key relationships
DO $$
BEGIN
    -- Add relationship to generic projects
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'project_contractors_projectId_projects_fkey') THEN
        ALTER TABLE "project_contractors" ADD CONSTRAINT "project_contractors_projectId_projects_fkey"
            FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- Add relationship to construction projects (backward compatibility)
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'project_contractors_constructionProjectId_fkey') THEN
        ALTER TABLE "project_contractors" ADD CONSTRAINT "project_contractors_constructionProjectId_fkey"
            FOREIGN KEY ("constructionProjectId") REFERENCES "construction_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Add backward compatibility fields to project_stages
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'project_stages' AND column_name = 'constructionProjectId') THEN
        ALTER TABLE "project_stages" ADD COLUMN "constructionProjectId" TEXT;
    END IF;
END $$;

-- Update project_stages foreign key relationships
DO $$
BEGIN
    -- Add relationship to generic projects
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'project_stages_projectId_projects_fkey') THEN
        ALTER TABLE "project_stages" ADD CONSTRAINT "project_stages_projectId_projects_fkey"
            FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- Add relationship to construction projects (backward compatibility)
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'project_stages_constructionProjectId_fkey') THEN
        ALTER TABLE "project_stages" ADD CONSTRAINT "project_stages_constructionProjectId_fkey"
            FOREIGN KEY ("constructionProjectId") REFERENCES "construction_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Add enhanced fields to project_transactions
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'project_transactions' AND column_name = 'constructionProjectId') THEN
        ALTER TABLE "project_transactions" ADD COLUMN "constructionProjectId" TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'project_transactions' AND column_name = 'transactionSubType') THEN
        ALTER TABLE "project_transactions" ADD COLUMN "transactionSubType" TEXT;
    END IF;
END $$;

-- Update project_transactions foreign key relationships
DO $$
BEGIN
    -- Add relationship to generic projects
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'project_transactions_projectId_projects_fkey') THEN
        ALTER TABLE "project_transactions" ADD CONSTRAINT "project_transactions_projectId_projects_fkey"
            FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- Add relationship to construction projects (backward compatibility)
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'project_transactions_constructionProjectId_fkey') THEN
        ALTER TABLE "project_transactions" ADD CONSTRAINT "project_transactions_constructionProjectId_fkey"
            FOREIGN KEY ("constructionProjectId") REFERENCES "construction_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "project_types_businessType_idx" ON "project_types"("businessType");
CREATE INDEX IF NOT EXISTS "project_types_isActive_idx" ON "project_types"("isActive");
CREATE INDEX IF NOT EXISTS "projects_businessType_idx" ON "projects"("businessType");
CREATE INDEX IF NOT EXISTS "projects_status_idx" ON "projects"("status");
CREATE INDEX IF NOT EXISTS "projects_createdBy_idx" ON "projects"("createdBy");
CREATE INDEX IF NOT EXISTS "project_transactions_transactionSubType_idx" ON "project_transactions"("transactionSubType");

-- Insert initial project types
INSERT INTO "project_types" ("id", "name", "description", "businessType", "isSystem", "isActive", "createdAt", "updatedAt")
VALUES
    ('pt_construction_new', 'New Construction', 'Building new structures from the ground up', 'construction', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('pt_construction_reno', 'Renovation', 'Updating and improving existing structures', 'construction', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('pt_construction_repair', 'Repair & Maintenance', 'Fixing and maintaining existing structures', 'construction', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('pt_construction_demo', 'Demolition', 'Tearing down existing structures', 'construction', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('pt_restaurant_kitchen', 'Kitchen Upgrade', 'Upgrading kitchen equipment and layout', 'restaurant', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('pt_restaurant_dining', 'Dining Room Renovation', 'Renovating dining area and customer spaces', 'restaurant', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('pt_restaurant_menu', 'Menu Development', 'Creating and testing new menu items', 'restaurant', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('pt_restaurant_equipment', 'Equipment Installation', 'Installing new restaurant equipment', 'restaurant', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('pt_personal_home', 'Home Improvement', 'Personal home improvement projects', 'personal', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('pt_personal_vehicle', 'Vehicle Maintenance', 'Personal vehicle maintenance and repair', 'personal', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('pt_personal_investment', 'Investment Property', 'Investment property development or maintenance', 'personal', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('pt_personal_other', 'Other Personal', 'Other personal projects and expenses', 'personal', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;

-- Output success message
DO $$
BEGIN
    RAISE NOTICE 'Project management schema enhancement completed successfully!';
    RAISE NOTICE 'Added tables: project_types, projects';
    RAISE NOTICE 'Enhanced tables: construction_projects, project_contractors, project_stages, project_transactions';
    RAISE NOTICE 'Inserted % project types', (SELECT COUNT(*) FROM project_types);
END $$;