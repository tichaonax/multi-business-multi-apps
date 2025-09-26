const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Setting up project management schema...')

  try {
    console.log('📝 Creating ProjectType table...')

    // Create project_types table
    await prisma.$executeRaw`
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
    `

    console.log('📝 Creating generic Project table...')

    // Create projects table
    await prisma.$executeRaw`
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
    `

    console.log('🔗 Adding foreign key relationships...')

    // Add foreign key relationships
    try {
      await prisma.$executeRaw`
        ALTER TABLE "projects" ADD CONSTRAINT "projects_projectTypeId_fkey"
            FOREIGN KEY ("projectTypeId") REFERENCES "project_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
      `
    } catch (e) {
      if (!e.message.includes('already exists')) {
        console.log('⚠️ Foreign key projects_projectTypeId_fkey may already exist')
      }
    }

    try {
      await prisma.$executeRaw`
        ALTER TABLE "projects" ADD CONSTRAINT "projects_createdBy_fkey"
            FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      `
    } catch (e) {
      if (!e.message.includes('already exists')) {
        console.log('⚠️ Foreign key projects_createdBy_fkey may already exist')
      }
    }

    console.log('🔧 Adding backward compatibility fields...')

    // Add backward compatibility fields to construction_projects
    try {
      await prisma.$executeRaw`ALTER TABLE "construction_projects" ADD COLUMN "projectTypeId" TEXT;`
    } catch (e) {
      console.log('⚠️ Column projectTypeId may already exist in construction_projects')
    }

    try {
      await prisma.$executeRaw`ALTER TABLE "construction_projects" ADD COLUMN "businessType" TEXT DEFAULT 'construction';`
    } catch (e) {
      console.log('⚠️ Column businessType may already exist in construction_projects')
    }

    // Add project transactions enhancement
    try {
      await prisma.$executeRaw`ALTER TABLE "project_transactions" ADD COLUMN "constructionProjectId" TEXT;`
    } catch (e) {
      console.log('⚠️ Column constructionProjectId may already exist in project_transactions')
    }

    try {
      await prisma.$executeRaw`ALTER TABLE "project_transactions" ADD COLUMN "transactionSubType" TEXT;`
    } catch (e) {
      console.log('⚠️ Column transactionSubType may already exist in project_transactions')
    }

    console.log('📊 Creating indexes for performance...')

    // Create indexes
    try {
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "project_types_businessType_idx" ON "project_types"("businessType");`
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "project_types_isActive_idx" ON "project_types"("isActive");`
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "projects_businessType_idx" ON "projects"("businessType");`
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "projects_status_idx" ON "projects"("status");`
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "projects_createdBy_idx" ON "projects"("createdBy");`
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "project_transactions_transactionSubType_idx" ON "project_transactions"("transactionSubType");`
    } catch (e) {
      console.log('⚠️ Some indexes may already exist')
    }

    console.log('🌱 Seeding initial project types...')

    // Insert initial project types
    const projectTypes = [
      {
        id: 'pt_construction_new',
        name: 'New Construction',
        description: 'Building new structures from the ground up',
        businessType: 'construction'
      },
      {
        id: 'pt_construction_reno',
        name: 'Renovation',
        description: 'Updating and improving existing structures',
        businessType: 'construction'
      },
      {
        id: 'pt_construction_repair',
        name: 'Repair & Maintenance',
        description: 'Fixing and maintaining existing structures',
        businessType: 'construction'
      },
      {
        id: 'pt_construction_demo',
        name: 'Demolition',
        description: 'Tearing down existing structures',
        businessType: 'construction'
      },
      {
        id: 'pt_restaurant_kitchen',
        name: 'Kitchen Upgrade',
        description: 'Upgrading kitchen equipment and layout',
        businessType: 'restaurant'
      },
      {
        id: 'pt_restaurant_dining',
        name: 'Dining Room Renovation',
        description: 'Renovating dining area and customer spaces',
        businessType: 'restaurant'
      },
      {
        id: 'pt_restaurant_menu',
        name: 'Menu Development',
        description: 'Creating and testing new menu items',
        businessType: 'restaurant'
      },
      {
        id: 'pt_restaurant_equipment',
        name: 'Equipment Installation',
        description: 'Installing new restaurant equipment',
        businessType: 'restaurant'
      },
      {
        id: 'pt_personal_home',
        name: 'Home Improvement',
        description: 'Personal home improvement projects',
        businessType: 'personal'
      },
      {
        id: 'pt_personal_vehicle',
        name: 'Vehicle Maintenance',
        description: 'Personal vehicle maintenance and repair',
        businessType: 'personal'
      },
      {
        id: 'pt_personal_investment',
        name: 'Investment Property',
        description: 'Investment property development or maintenance',
        businessType: 'personal'
      },
      {
        id: 'pt_personal_other',
        name: 'Other Personal',
        description: 'Other personal projects and expenses',
        businessType: 'personal'
      }
    ]

    for (const projectType of projectTypes) {
      try {
        await prisma.$executeRaw`
          INSERT INTO "project_types" ("id", "name", "description", "businessType", "isSystem", "isActive", "createdAt", "updatedAt")
          VALUES (${projectType.id}, ${projectType.name}, ${projectType.description}, ${projectType.businessType}, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT ("name") DO NOTHING;
        `
        console.log(`✅ Added project type: ${projectType.name}`)
      } catch (e) {
        console.log(`⚠️ Project type ${projectType.name} may already exist`)
      }
    }

    // Check final counts
    const projectTypeCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "project_types"`
    console.log(`\n🎉 Setup completed! ${projectTypeCount[0].count} project types available.`)

    console.log('\n📋 Next steps:')
    console.log('1. Restart your Next.js development server')
    console.log('2. Run: npx prisma generate')
    console.log('3. Test the enhanced project management system')

  } catch (error) {
    console.error('❌ Error setting up project management schema:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error('💥 Fatal error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })