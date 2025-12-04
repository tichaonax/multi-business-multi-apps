# Seed Data Management for Read-Only Git Access

## The Real-World Constraint

**Scenario:**
- User deploys from Git (read-only access, can't commit)
- Refines products with rich metadata over time
- Wants enriched data available for next fresh install
- **Cannot push updated JSON files back to Git repository**

**Question:** How do they distribute improved seed data to new installations?

---

## Viable Solutions

---

## ⭐ Solution 1: Database-First with Export/Import (RECOMMENDED)

### Concept
Templates live in the **database**, not Git. Share via export → import workflow.

### How It Works

#### A. Current Installation (Source)
```
1. Admin refines products in live business
2. Export via UI → Downloads "clothing-v3.1.0.json" to local machine
3. File contains all enriched data (1,500 products)
```

#### B. Fresh Installation (Target)
```
1. Deploy from Git (gets v3.0.0 default)
2. Admin uploads "clothing-v3.1.0.json" via UI
3. System imports as new template
4. Set as default for future seeds
```

### Workflow Diagram
```
┌─────────────────────────────────────────────────────────────┐
│ Installation A (Production)                                │
├─────────────────────────────────────────────────────────────┤
│ 1. Has 1,500 enriched products                              │
│ 2. Navigate to /admin/seed-templates                        │
│ 3. Click "Export Template"                                  │
│    - Select source business: HXI Fashions                   │
│    - Version: 3.1.0                                         │
│    - Downloads: clothing-v3.1.0.json (5MB file)             │
└─────────────────────────────────────────────────────────────┘
                           ↓
                    [Save to USB/Email/Cloud]
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Installation B (Fresh/Staging/New Server)                   │
├─────────────────────────────────────────────────────────────┤
│ 1. Deploy from Git (empty DB + default v3.0 template)      │
│ 2. Navigate to /admin/seed-templates                        │
│ 3. Click "Import Template"                                  │
│    - Upload: clothing-v3.1.0.json                           │
│    - System validates and saves to database                 │
│ 4. Set as system default                                    │
│ 5. Future businesses get v3.1.0 data                        │
└─────────────────────────────────────────────────────────────┘
```

### Implementation

#### Export UI
```typescript
// /admin/seed-templates/[id]/export

export default function ExportTemplatePage() {
  const handleExport = async () => {
    const response = await fetch(`/api/admin/seed-templates/${templateId}/download`)
    const blob = await response.blob()
    
    // Trigger download
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `clothing-v3.1.0-${Date.now()}.json`
    a.click()
  }

  return (
    <button onClick={handleExport}>
      📥 Download Template (5.2 MB)
    </button>
  )
}
```

#### Import UI
```typescript
// /admin/seed-templates/import

export default function ImportTemplatePage() {
  const [file, setFile] = useState<File | null>(null)

  const handleImport = async () => {
    const formData = new FormData()
    formData.append('template', file)
    
    const response = await fetch('/api/admin/seed-templates/import', {
      method: 'POST',
      body: formData
    })

    const result = await response.json()
    // Show success, ask if should set as default
  }

  return (
    <div>
      <input 
        type="file" 
        accept=".json"
        onChange={(e) => setFile(e.target.files?.[0])}
      />
      <button onClick={handleImport}>
        📤 Import Template
      </button>
    </div>
  )
}
```

#### API: Download Template
```typescript
// /api/admin/seed-templates/[id]/download

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const template = await prisma.seedDataTemplates.findUnique({
    where: { id: params.id }
  })

  if (!template) {
    return new Response('Not found', { status: 404 })
  }

  // Return as downloadable JSON
  const json = JSON.stringify(template.templateData, null, 2)
  
  return new Response(json, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${template.businessType}-v${template.version}.json"`
    }
  })
}
```

#### API: Import Template
```typescript
// /api/admin/seed-templates/import

export async function POST(req: Request) {
  const formData = await req.formData()
  const file = formData.get('template') as File
  
  const content = await file.text()
  const templateData = JSON.parse(content)

  // Validate structure
  if (!templateData.version || !templateData.products) {
    return Response.json({ error: 'Invalid template format' }, { status: 400 })
  }

  // Create in database
  const template = await prisma.seedDataTemplates.create({
    data: {
      name: `Imported: ${templateData.metadata.name}`,
      businessType: templateData.businessType,
      version: templateData.version,
      templateData: templateData,
      productCount: templateData.products.length,
      isActive: true,
      isSystemDefault: false, // Admin sets this later
      createdBy: session.user.id
    }
  })

  return Response.json({ success: true, template })
}
```

### Pros
✅ **No Git access needed** - works with read-only deployments
✅ **Admin-friendly** - download/upload via UI
✅ **Flexible distribution** - USB drive, email, cloud storage
✅ **Version control in DB** - all versions tracked
✅ **Audit trail** - who imported what, when

### Cons
❌ **Manual process** - not automated
❌ **File sharing overhead** - need to distribute JSON files
❌ **Risk of version skew** - different installations have different templates

---

## Solution 2: Centralized Template Server (Auto-Sync)

### Concept
Host a **central template registry** that all installations can pull from (read-only).

### Architecture
```
┌──────────────────────────────────────────────────────────┐
│ Central Template Server                                  │
│ https://templates.yourdomain.com                         │
├──────────────────────────────────────────────────────────┤
│ - Hosts all approved seed templates                      │
│ - Public read access (or authenticated)                  │
│ - Admin can upload new versions                          │
│ - Auto-versioning and distribution                       │
└──────────────────────────────────────────────────────────┘
                          ↑ ↓
        ┌─────────────────┴──────────────────┐
        ↓                                     ↓
┌──────────────────┐              ┌──────────────────┐
│ Installation A   │              │ Installation B   │
│ (Production)     │              │ (Fresh/Staging)  │
├──────────────────┤              ├──────────────────┤
│ 1. Export template│              │ 1. Sync templates │
│ 2. Upload to      │              │ 2. Auto-downloads │
│    central server │              │    latest versions│
│                  │              │ 3. Ready to use   │
└──────────────────┘              └──────────────────┘
```

### Implementation

#### Central Server Setup
```typescript
// Simple Express/Next.js API
// Deployed on Vercel/Netlify (read-only static hosting)

// GET /api/templates/manifest.json
{
  "templates": [
    {
      "id": "clothing_v3_1_0",
      "businessType": "clothing",
      "version": "3.1.0",
      "url": "https://templates.yourdomain.com/clothing-v3.1.0.json",
      "size": 5242880,
      "checksum": "sha256:abc123...",
      "createdAt": "2025-12-15T10:00:00Z",
      "isDefault": true
    }
  ]
}

// GET /api/templates/clothing-v3.1.0.json
// Returns the full template JSON
```

#### Client-Side Sync
```typescript
// In each installation's codebase
// src/lib/sync-templates.ts

export async function syncTemplatesFromRegistry() {
  const REGISTRY_URL = process.env.TEMPLATE_REGISTRY_URL || 
                       'https://templates.yourdomain.com'

  try {
    // Fetch manifest
    const manifest = await fetch(`${REGISTRY_URL}/api/templates/manifest.json`)
      .then(r => r.json())

    for (const remoteTemplate of manifest.templates) {
      // Check if we have this version
      const existing = await prisma.seedDataTemplates.findFirst({
        where: {
          businessType: remoteTemplate.businessType,
          version: remoteTemplate.version
        }
      })

      if (!existing) {
        console.log(`📥 Downloading new template: ${remoteTemplate.version}`)
        
        // Download template
        const templateData = await fetch(remoteTemplate.url).then(r => r.json())
        
        // Import to database
        await prisma.seedDataTemplates.create({
          data: {
            name: templateData.metadata.name,
            businessType: remoteTemplate.businessType,
            version: remoteTemplate.version,
            templateData: templateData,
            productCount: templateData.products.length,
            isActive: true,
            isSystemDefault: remoteTemplate.isDefault,
            createdBy: 'system'
          }
        })

        console.log(`✅ Imported ${remoteTemplate.version}`)
      }
    }
  } catch (error) {
    console.error('Failed to sync templates:', error)
    // Fail gracefully - use local templates
  }
}
```

#### Auto-Sync on Startup
```typescript
// src/app/api/startup/route.ts
// Called once on app startup or via cron

export async function GET() {
  await syncTemplatesFromRegistry()
  return Response.json({ status: 'synced' })
}
```

#### Upload to Central Server (Admin Only)
```typescript
// Admin interface in Installation A
// Exports template and uploads to central server

async function uploadToCentral(templateId: string) {
  const template = await prisma.seedDataTemplates.findUnique({
    where: { id: templateId }
  })

  // Upload to central server (authenticated)
  await fetch('https://templates.yourdomain.com/api/admin/templates', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ADMIN_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(template.templateData)
  })
}
```

### Pros
✅ **Fully automated** - no manual file sharing
✅ **Always up-to-date** - installations auto-sync
✅ **Single source of truth** - central registry
✅ **Audit trail** - all uploads tracked centrally
✅ **Works with read-only Git** - pulls from external source

### Cons
❌ **Infrastructure required** - need to host central server
❌ **External dependency** - installations need internet
❌ **Security concerns** - need to secure upload endpoint
❌ **Complexity** - more moving parts

---

## Solution 3: Hybrid Local + Optional Sync

### Concept
Combine **local export/import** (Solution 1) with **optional central sync** (Solution 2).

### How It Works

#### Default Behavior (No Central Server)
```
Export → Download JSON → Share manually → Import
(Same as Solution 1)
```

#### Optional: Enable Central Sync
```
1. Admin configures central registry URL
2. Export button offers: "Download" OR "Upload to Registry"
3. Fresh installs auto-sync from registry if configured
4. Falls back to local templates if registry unavailable
```

### Implementation
```typescript
// Environment variable (optional)
TEMPLATE_REGISTRY_URL=https://templates.yourdomain.com
TEMPLATE_REGISTRY_KEY=secret_admin_key

// Export UI with options
<button onClick={downloadToLocal}>
  📥 Download Template
</button>

{process.env.TEMPLATE_REGISTRY_URL && (
  <button onClick={uploadToCentral}>
    ☁️ Upload to Central Registry
  </button>
)}

// Sync logic with fallback
async function ensureTemplates() {
  if (process.env.TEMPLATE_REGISTRY_URL) {
    try {
      await syncTemplatesFromRegistry()
      return // Success
    } catch (error) {
      console.warn('Central sync failed, using local templates')
    }
  }
  
  // Fallback: Load from local JSON files (bundled in Git)
  await loadLocalTemplates()
}
```

### Pros
✅ **Flexible** - works with or without central server
✅ **Gradual adoption** - start local, add sync later
✅ **Resilient** - falls back if central unavailable
✅ **Best of both worlds**

### Cons
❌ **More complex** - two code paths to maintain

---

## Solution 4: Backup-Based Distribution

### Concept
Use the **existing backup system** to share seed data.

### How It Works

#### A. Export as "Seed Backup"
```
1. Admin exports products from business
2. Special "Seed Backup" mode:
   - Zeros out all quantities
   - Strips business-specific IDs
   - Creates importable backup file
3. Shares backup file (.dump or .json)
```

#### B. Import as "Seed Template"
```
1. Fresh installation receives backup file
2. Admin imports via /admin/restore
3. Option: "Import as Seed Template" (not full restore)
4. System converts backup → template format
5. Template available for future seeds
```

### Implementation
```typescript
// Export seed backup
export async function exportSeedBackup(businessId: string) {
  const products = await prisma.businessProducts.findMany({
    where: { businessId },
    include: { category: true, subcategories: true }
  })

  // Transform to seed format
  const seedData = products.map(p => ({
    sku: p.sku,
    name: p.name,
    description: p.description,
    categoryName: p.category.name,
    // ... zero out quantities, strip IDs
  }))

  return {
    type: 'seed_template',
    businessType: 'clothing',
    version: 'custom',
    products: seedData
  }
}

// Import as template
export async function importSeedBackup(file: File) {
  const data = await parseBackupFile(file)
  
  if (data.type === 'seed_template') {
    // Import as template, not as business restore
    await prisma.seedDataTemplates.create({
      data: {
        name: `Imported from backup`,
        businessType: data.businessType,
        templateData: data,
        // ...
      }
    })
  }
}
```

### Pros
✅ **Reuses existing system** - backup/restore already exists
✅ **Familiar workflow** - admins know backups
✅ **File-based** - works with read-only Git

### Cons
❌ **Overloading backup concept** - confusing semantics
❌ **Large files** - backups include more than just products
❌ **Extra transformation** - backup → template conversion

---

## Comparison Matrix

| Solution | Git Access | Automation | Infrastructure | Complexity | Distribution |
|----------|-----------|------------|----------------|------------|--------------|
| **1. DB Export/Import** | Not needed | Manual | None | Low | File sharing |
| **2. Central Server** | Not needed | Automatic | Required | High | Auto-sync |
| **3. Hybrid** | Not needed | Optional | Optional | Medium | Flexible |
| **4. Backup-Based** | Not needed | Manual | None | Medium | File sharing |

---

## 🏆 RECOMMENDED: Solution 1 (Export/Import) + Future Option for Solution 3 (Hybrid)

### Why This Progression Makes Sense

#### Phase 1: Start Simple (Solution 1)
```
✅ Implement export/import UI
✅ Download/upload JSON files
✅ No infrastructure needed
✅ Works immediately for read-only Git users
```

**Workflow:**
```
Production Server                  Fresh Install
      ↓                                  ↑
Export to JSON file    →    Share    →  Import from JSON
      ↓                                  ↑
Download to laptop    →    USB/Email →  Upload via UI
```

#### Phase 2: Add Central Sync (Optional Enhancement)
```
✅ Deploy simple template registry
✅ Add "Upload to Registry" button
✅ Fresh installs auto-sync on startup
✅ Falls back to local if unavailable
```

**Workflow:**
```
Production Server  →  Central Registry  →  Fresh Install
      ↓                      ↓                   ↑
Export template  →  Auto-uploads  →  Auto-syncs on startup
```

### Implementation Plan

#### Step 1: Database Schema
```sql
-- Already proposed in SEED_DATA_MANAGEMENT_PROPOSAL.md
CREATE TABLE seed_data_templates (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  businessType VARCHAR(50),
  version VARCHAR(20),
  isSystemDefault BOOLEAN,
  templateData JSONB,
  createdBy UUID,
  -- ... other fields
);
```

#### Step 2: Export Functionality
```typescript
// /admin/seed-templates/[id]/export page
// Download button → Returns JSON file
```

#### Step 3: Import Functionality
```typescript
// /admin/seed-templates/import page
// Upload JSON → Validate → Import to database
```

#### Step 4: Set as Default
```typescript
// Admin can mark imported template as system default
// Future seeds use this version
```

#### Step 5: (Future) Add Central Sync
```typescript
// Optional: Configure central registry
// Auto-sync on startup if configured
```

---

## Real-World Workflow Example

### Scenario: Customer with Read-Only Git Access

```
┌─────────────────────────────────────────────────────────────┐
│ Month 1: Initial Deployment                                 │
├─────────────────────────────────────────────────────────────┤
│ 1. Deploy from Git (read-only)                              │
│ 2. Database has default v3.0 template (1,067 products)      │
│ 3. Create clothing business, seed products                  │
│ 4. Button disabled (products exist)                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Month 2-6: Refine Products                                  │
├─────────────────────────────────────────────────────────────┤
│ 1. Add sustainability metadata to 500 products              │
│ 2. Improve descriptions, add care instructions             │
│ 3. Add 200 new products with rich metadata                 │
│ 4. Now have 1,267 products with enhanced data               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Month 7: Need Staging Environment                           │
├─────────────────────────────────────────────────────────────┤
│ 1. Deploy staging from Git (fresh database)                │
│ 2. Has old v3.0 template (1,067 products, no metadata)     │
│ 3. PROBLEM: Want enriched data from production!            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ SOLUTION: Export from Production                            │
├─────────────────────────────────────────────────────────────┤
│ Production Server:                                          │
│ 1. Navigate to /admin/seed-templates                        │
│ 2. Click "Export Template from Business"                    │
│ 3. Select: HXI Fashions                                     │
│ 4. Version: 3.1.0                                           │
│ 5. Download: clothing-v3.1.0.json (6.5 MB)                  │
│    → Save to laptop/USB                                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ SOLUTION: Import to Staging                                 │
├─────────────────────────────────────────────────────────────┤
│ Staging Server:                                             │
│ 1. Navigate to /admin/seed-templates                        │
│ 2. Click "Import Template"                                  │
│ 3. Upload: clothing-v3.1.0.json                             │
│ 4. System validates (✓ 1,267 products, ✓ all fields valid) │
│ 5. Click "Set as Default"                                   │
│ 6. Now staging has enriched seed data!                      │
│    → Future businesses get v3.1.0                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Bonus: Share with Other Customers                           │
├─────────────────────────────────────────────────────────────┤
│ 1. Email clothing-v3.1.0.json to other installations        │
│ 2. They import via same process                             │
│ 3. Everyone benefits from enriched data!                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Answer to Your Questions

**A. Templates in Git?**
- ❌ No - Don't require Git write access
- ✅ Yes - Bundle default templates in Git (for fresh installs)
- ✅ Yes - Allow import of newer templates via UI (no Git needed)

**B. When you export enriched data, should it:**
- ✅ Save JSON file to download (primary)
- ✅ Save to database (always)
- ⚠️ Optionally upload to central registry (future enhancement)
- ❌ Not auto-create migration (requires Git access)

**C. Should system auto-update existing templates?**
- ❌ No auto-update (admin decides)
- ✅ Keep all versions (history)
- ✅ Admin marks one as "system default"
- ✅ Show notification when newer version imported

---

## Conclusion

**For read-only Git deployments, use Solution 1 (Export/Import) because:**

1. ✅ **No Git write access needed** - works with read-only clones
2. ✅ **Simple implementation** - just file upload/download
3. ✅ **Admin-friendly** - UI-based, no command line
4. ✅ **Flexible distribution** - share via any file transfer method
5. ✅ **Future-proof** - can add central sync later without breaking changes

**Implementation Priority:**
1. Phase 1: Export/Import UI (this solves your immediate need)
2. Phase 2: Admin template management (view, activate, delete)
3. Phase 3: (Optional) Central registry sync (if multiple installations need coordination)

**Ready to proceed with Solution 1 implementation?**
