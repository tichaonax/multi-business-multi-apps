# Seed Data Distribution Strategies - Brainstorming

## The Core Problem

**Scenario:** 
1. Fresh install of application (empty database)
2. Admin has refined seed data over time (1,500 products with rich metadata)
3. Want fresh installs to get the **latest enriched data**, not old v1.0 data
4. But seed data must be **available immediately** (can't depend on live database)

**Challenge:** How do we distribute improved seed data to new installations?

---

## Option 1: Migrations with Seed Data (Traditional) ⭐ RECOMMENDED

### Concept
Bundle the **latest seed template JSON** directly in migrations, making it part of the application codebase.

### How It Works

#### A. Generate Seed Data Migration
```typescript
// When admin exports template, optionally generate migration
// File: prisma/migrations/20251215_seed_clothing_v3/migration.sql

-- Insert seed template into database
INSERT INTO "seed_data_templates" (
  "id", "name", "businessType", "version", 
  "isActive", "isSystemDefault", "productCount",
  "templateData", "createdBy", "createdAt"
) VALUES (
  'template_clothing_v3',
  'Clothing Products v3.0',
  'clothing',
  '3.0.0',
  true,
  true,
  1067,
  '{"version":"3.0.0","businessType":"clothing",...}',  -- Full JSON
  'system',
  NOW()
);
```

#### B. JSON File in Migration Folder
```
prisma/migrations/
  └── 20251215_seed_clothing_v3/
      ├── migration.sql          (INSERT template record)
      └── template-data.json     (Full product data)
```

Migration SQL reads and inserts the JSON:
```sql
-- Load JSON from file and insert
INSERT INTO "seed_data_templates" 
  ("templateData", ...)
VALUES (
  pg_read_file('/path/to/template-data.json')::json,
  ...
);
```

### Workflow
```
1. Fresh Install
   ↓
2. Run Migrations (prisma migrate deploy)
   ↓
3. Seed templates automatically in database
   ↓
4. Business created → Seed button available
   ↓
5. Click → Imports from database template
```

### Pros
✅ Seed data is **part of the codebase** (version controlled)
✅ Fresh installs get latest data automatically
✅ No external dependencies
✅ Works in CI/CD pipelines
✅ Can rollback migrations if needed

### Cons
❌ Large JSON in migrations (could be 5-10MB)
❌ Migration files become heavy
❌ Harder to diff in Git

### Implementation
```typescript
// prisma/migrations/20251215_seed_clothing_v3/migration.sql

-- Create the template record
INSERT INTO "seed_data_templates" (
  "id",
  "name",
  "businessType",
  "version",
  "description",
  "isActive",
  "isSystemDefault",
  "productCount",
  "categoryCount",
  "createdBy",
  "createdAt",
  "updatedAt",
  "templateData"
) VALUES (
  'clothing_v3_default',
  'Clothing Products v3.0',
  'clothing',
  '3.0.0',
  'Enhanced with sustainability and care instruction metadata',
  true,
  true,
  1067,
  48,
  'system',
  NOW(),
  NOW(),
  '{"version":"3.0.0","metadata":{...},"products":[...]}'::jsonb
);
```

---

## Option 2: Post-Migration Seed Script (Prisma Pattern) ⭐ RECOMMENDED

### Concept
Use Prisma's `seed` script to populate templates after migrations run.

### How It Works

#### A. Create Seed Script
```typescript
// prisma/seed.ts

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Load latest seed templates
  const templates = [
    {
      file: 'seed-data/templates/clothing-v3.0.0.json',
      businessType: 'clothing',
      isDefault: true
    },
    {
      file: 'seed-data/templates/restaurant-v2.5.0.json',
      businessType: 'restaurant',
      isDefault: true
    },
    // ... more templates
  ]

  for (const template of templates) {
    const templateData = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), template.file), 'utf-8')
    )

    // Upsert template (update if exists, create if not)
    await prisma.seedDataTemplates.upsert({
      where: {
        businessType_version: {
          businessType: template.businessType,
          version: templateData.version
        }
      },
      create: {
        id: `${template.businessType}_${templateData.version.replace(/\./g, '_')}`,
        name: templateData.metadata.name,
        businessType: template.businessType,
        version: templateData.version,
        description: templateData.metadata.description,
        isActive: true,
        isSystemDefault: template.isDefault,
        productCount: templateData.products.length,
        categoryCount: templateData.categories.length,
        templateData: templateData,
        createdBy: 'system'
      },
      update: {
        templateData: templateData,
        productCount: templateData.products.length,
        categoryCount: templateData.categories.length,
        isSystemDefault: template.isDefault,
        updatedAt: new Date()
      }
    })

    console.log(`✅ Loaded ${template.businessType} template v${templateData.version}`)
  }

  console.log('🎉 Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

#### B. Update package.json
```json
{
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
  }
}
```

#### C. Run After Migrations
```bash
# In deployment/fresh install
npm run prisma migrate deploy
npm run prisma db seed   # ← Loads seed templates
```

### Workflow
```
1. Fresh Install
   ↓
2. Run Migrations (schema/structure)
   ↓
3. Run Seed Script (data/templates)
   ↓
4. Templates in database
   ↓
5. Business created → Seed button works
```

### Pros
✅ **Cleaner migrations** (no huge JSON)
✅ **Separate data from schema** changes
✅ **Standard Prisma pattern**
✅ Can update templates without migrations
✅ Idempotent (safe to rerun)

### Cons
❌ Extra step in deployment (must remember to seed)
❌ Could forget to run on fresh install

### Solution to Cons
```typescript
// In startup script or health check
async function ensureSeedTemplates() {
  const templateCount = await prisma.seedDataTemplates.count({
    where: { isSystemDefault: true }
  })

  if (templateCount === 0) {
    console.warn('⚠️  No seed templates found! Running seed...')
    // Auto-run seed or show warning
  }
}
```

---

## Option 3: Bundled JSON Files (Current + Enhanced)

### Concept
Keep JSON files in `seed-data/templates/` directory, committed to Git. On fresh install, application auto-loads them.

### How It Works

#### A. Directory Structure
```
seed-data/
  └── templates/
      ├── clothing-v3.0.0.json       (Latest - 1067 products)
      ├── clothing-v2.5.0.json       (Previous)
      ├── restaurant-v2.5.0.json     (Latest)
      └── manifest.json              (Metadata about templates)
```

#### B. Manifest File
```json
{
  "templates": [
    {
      "file": "clothing-v3.0.0.json",
      "businessType": "clothing",
      "version": "3.0.0",
      "isDefault": true,
      "productCount": 1067,
      "createdAt": "2025-12-15T10:00:00Z",
      "description": "Enhanced metadata with sustainability"
    },
    {
      "file": "restaurant-v2.5.0.json",
      "businessType": "restaurant",
      "version": "2.5.0",
      "isDefault": true,
      "productCount": 234
    }
  ]
}
```

#### C. Auto-Load on Startup
```typescript
// src/lib/ensure-seed-templates.ts

export async function ensureSeedTemplatesLoaded() {
  // Check if default templates exist in database
  const existingDefaults = await prisma.seedDataTemplates.findMany({
    where: { isSystemDefault: true }
  })

  if (existingDefaults.length > 0) {
    return // Already loaded
  }

  console.log('📦 Loading seed templates from files...')

  // Read manifest
  const manifestPath = path.join(process.cwd(), 'seed-data', 'templates', 'manifest.json')
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))

  // Load each template
  for (const template of manifest.templates) {
    const filePath = path.join(process.cwd(), 'seed-data', 'templates', template.file)
    const templateData = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

    await prisma.seedDataTemplates.create({
      data: {
        id: `${template.businessType}_default`,
        name: template.description || `${template.businessType} Default Template`,
        businessType: template.businessType,
        version: template.version,
        isActive: true,
        isSystemDefault: template.isDefault,
        productCount: template.productCount,
        templateData: templateData,
        createdBy: 'system'
      }
    })
  }

  console.log('✅ Seed templates loaded')
}
```

#### D. Call on App Startup
```typescript
// src/app/api/startup/route.ts or middleware

import { ensureSeedTemplatesLoaded } from '@/lib/ensure-seed-templates'

export async function GET() {
  await ensureSeedTemplatesLoaded()
  return Response.json({ status: 'ok' })
}
```

Or in middleware:
```typescript
// middleware.ts
if (request.url.includes('/inventory') || request.url.includes('/menu')) {
  await ensureSeedTemplatesLoaded()
}
```

### Workflow
```
1. Fresh Install
   ↓
2. First Request to App
   ↓
3. Check: Templates in DB? No
   ↓
4. Load from seed-data/templates/
   ↓
5. Insert into database
   ↓
6. Seed button now works
```

### Pros
✅ **No manual step** (auto-loads on first use)
✅ **Simple deployment** (just deploy code)
✅ **Templates version-controlled** in Git
✅ Can update templates by updating files + redeploying

### Cons
❌ First request is slower (one-time cost)
❌ Templates in Git (large files)
❌ Could miss loading if check logic fails

---

## Option 4: Hybrid: Migration + JSON Files ⭐ BEST OF BOTH WORLDS

### Concept
Combine migration (creates template records) with JSON files (holds actual data).

### How It Works

#### A. Migration Creates Template Records
```sql
-- prisma/migrations/20251215_seed_templates/migration.sql

-- Create clothing template record (empty data initially)
INSERT INTO "seed_data_templates" (
  "id", "name", "businessType", "version",
  "isActive", "isSystemDefault", 
  "templateData", "createdBy"
) VALUES (
  'clothing_default',
  'Clothing Products Default',
  'clothing',
  '3.0.0',
  true,
  true,
  '{"version":"3.0.0","products":[]}'::jsonb,  -- Placeholder
  'system'
);

-- Add flag to indicate data needs loading
ALTER TABLE "seed_data_templates" 
ADD COLUMN IF NOT EXISTS "dataLoaded" BOOLEAN DEFAULT false;
```

#### B. Lazy-Load Data on First Use
```typescript
// src/lib/get-seed-template.ts

export async function getSeedTemplate(businessType: string) {
  let template = await prisma.seedDataTemplates.findFirst({
    where: { 
      businessType,
      isSystemDefault: true 
    }
  })

  // Check if data is loaded
  if (template && !template.dataLoaded) {
    console.log(`📦 Loading ${businessType} template data...`)
    
    const filePath = path.join(
      process.cwd(), 
      'seed-data', 
      'templates',
      `${businessType}-v${template.version}.json`
    )
    
    const templateData = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    
    // Update with actual data
    template = await prisma.seedDataTemplates.update({
      where: { id: template.id },
      data: {
        templateData: templateData,
        productCount: templateData.products.length,
        dataLoaded: true
      }
    })
  }

  return template
}
```

### Workflow
```
1. Fresh Install
   ↓
2. Run Migrations → Template records exist (no data)
   ↓
3. User clicks "Seed Products"
   ↓
4. Check: template.dataLoaded? No
   ↓
5. Load from JSON file
   ↓
6. Update database with data
   ↓
7. Apply to business
```

### Pros
✅ **Migration ensures structure** exists
✅ **Data loads on-demand** (not upfront)
✅ **Small migrations** (no huge JSON)
✅ **Automatic** (no manual steps)
✅ **Caching** (data in DB after first load)

### Cons
❌ Slightly complex (two-step loading)
❌ First seed per business type is slower

---

## Option 5: External Template Registry (Advanced)

### Concept
Host seed templates on external service (S3, CDN, or registry server). Fresh installs download latest templates.

### How It Works

#### A. Template Registry Service
```
https://templates.yourdomain.com/
  ├── manifest.json
  ├── clothing/
  │   ├── v3.0.0.json
  │   ├── v2.5.0.json
  │   └── latest.json → v3.0.0.json
  └── restaurant/
      ├── v2.5.0.json
      └── latest.json → v2.5.0.json
```

#### B. Download on Startup
```typescript
async function syncTemplatesFromRegistry() {
  const response = await fetch('https://templates.yourdomain.com/manifest.json')
  const manifest = await response.json()

  for (const template of manifest.templates) {
    const existing = await prisma.seedDataTemplates.findFirst({
      where: {
        businessType: template.businessType,
        version: template.version
      }
    })

    if (!existing || template.updatedAt > existing.updatedAt) {
      // Download and import
      const templateData = await fetch(template.url).then(r => r.json())
      
      await prisma.seedDataTemplates.upsert({
        where: { id: template.id },
        create: { ...templateData },
        update: { templateData }
      })
    }
  }
}
```

### Pros
✅ **Always latest** (can update without redeploying)
✅ **No large files in Git**
✅ **Centralized distribution**
✅ **Version management** external to app

### Cons
❌ **External dependency** (requires internet)
❌ **Infrastructure cost** (hosting)
❌ **Fails if registry down**
❌ **Overkill for single installation**

---

## Recommended Approach: Hybrid Option 4 🏆

### Why This Works Best

1. **Fresh Install (Day 1)**
   - Run migrations → Template records created (placeholder data)
   - Template exists in DB but `dataLoaded = false`

2. **First Use (Admin creates business)**
   - Click "Seed Products"
   - System checks: `dataLoaded? false`
   - Loads from `seed-data/templates/clothing-v3.0.0.json`
   - Updates DB with full data
   - Applies to business

3. **Subsequent Uses**
   - Template data already in DB (`dataLoaded = true`)
   - Fast seeding from database

4. **When You Refine Data**
   - Export from live business → Create v3.1.0
   - Save to `seed-data/templates/clothing-v3.1.0.json`
   - Create new migration or update manifest
   - Deploy → Fresh installs get v3.1.0
   - Existing installs can update manually

### Implementation Steps

#### Step 1: Migration
```sql
-- Creates template metadata, not full data
INSERT INTO "seed_data_templates" VALUES (
  'clothing_default',
  'Clothing Products v3.0.0',
  'clothing',
  '3.0.0',
  true,
  true,
  0,  -- productCount updated on load
  '{"version":"3.0.0"}'::jsonb,  -- Minimal placeholder
  false,  -- dataLoaded flag
  'system',
  NOW()
);
```

#### Step 2: Template File
```
seed-data/
  └── templates/
      ├── manifest.json              (Lists all templates)
      └── clothing-v3.0.0.json       (Full data - 1067 products)
```

#### Step 3: Lazy Loading Logic
```typescript
// Automatically loads when needed
const template = await getSeedTemplate('clothing')
// Now has full data
```

### Workflow for Your Use Case

```
┌─────────────────────────────────────────────────────────────┐
│ Scenario: Fresh Install with Better Data                   │
└─────────────────────────────────────────────────────────────┘

1. Fresh Install (new server/instance)
   ↓
2. Run: prisma migrate deploy
   → Template records created (no data yet)
   ↓
3. Admin creates first clothing business
   ↓
4. Navigate to /clothing/inventory
   ↓
5. See: "🌱 Seed Products" button
   ↓
6. Click → System detects template.dataLoaded = false
   ↓
7. Loads from seed-data/templates/clothing-v3.0.0.json
   ↓
8. Caches in database (dataLoaded = true)
   ↓
9. Imports 1,067 products with rich metadata
   ↓
10. Button changes to "✅ Products Seeded"

┌─────────────────────────────────────────────────────────────┐
│ Scenario: Export Enriched Data                             │
└─────────────────────────────────────────────────────────────┘

1. Admin refines products in HXI Fashions
   → Adds sustainability data, better descriptions
   ↓
2. Navigate to /admin/seed-templates/export
   ↓
3. Select HXI Fashions as source
   ↓
4. Name: "Clothing Products v3.1.0"
   ↓
5. Export creates:
   - Database record (template metadata)
   - JSON file: seed-data/templates/clothing-v3.1.0.json
   ↓
6. Optionally: Set as new default
   ↓
7. Commit JSON file to Git
   ↓
8. Deploy → New installs get v3.1.0
```

---

## Comparison Matrix

| Feature | Option 1 (Migration) | Option 2 (Seed Script) | Option 3 (JSON Files) | Option 4 (Hybrid) | Option 5 (Registry) |
|---------|---------------------|----------------------|---------------------|------------------|-------------------|
| Fresh install auto-loads | ✅ Yes | ⚠️ Need to run | ✅ Yes | ✅ Yes | ⚠️ Need internet |
| Small migrations | ❌ No | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| No external deps | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No |
| Version controlled | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No |
| Easy to update | ❌ Hard | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| Performance | ✅ Fast | ✅ Fast | ⚠️ First load | ✅ Fast after load | ⚠️ Network |
| Complexity | Low | Low | Low | Medium | High |
| **RECOMMENDED** | | | | **🏆 YES** | |

---

## Open Questions

1. **Should we support multiple template versions** at once, or just "latest"?
   - Answer: Both - keep history but mark one as default

2. **What happens if template file is missing** when trying to load?
   - Answer: Fallback to embedded minimal template or show error

3. **Should template loading be async** (background job)?
   - Answer: For first load, show loading indicator; subsequent uses instant

4. **Can users edit templates** after loading?
   - Answer: No - templates are read-only; edit in source business, then export new version

5. **How to handle breaking changes** in template structure?
   - Answer: Version the schema; migration can transform old → new format

---

## Next Steps for Decision

**Please clarify:**

A. Do you prefer **Option 4 (Hybrid)**? Or another option?

B. Should templates be:
   - ✅ In Git (version controlled)
   - ❌ Only in database (not in Git)

C. When you export enriched data, should it:
   - Auto-create migration?
   - Just save JSON file?
   - Both?

D. Should the system auto-update existing templates, or keep all versions?

Let me know your preference and I'll implement the chosen approach! 🚀
