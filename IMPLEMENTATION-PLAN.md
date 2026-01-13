# Default Page & Slogan Feature - Implementation Plan

## Overview
Add default page selection and business slogan features to allow businesses to customize their landing page and display messaging.

## Phase 1: Database Schema (Migrations) ✅

### Migration 1: Add defaultPage Column
**File**: `prisma/migrations/20260113000000_add_default_page/migration.sql`

```sql
-- Add defaultPage column to businesses table
ALTER TABLE "businesses" ADD COLUMN "defaultPage" VARCHAR(50);

-- Add comment explaining valid values
COMMENT ON COLUMN "businesses"."defaultPage" IS 'Default landing page for business (home, pos, reports, inventory, products, orders, menu, reservations)';

-- Set default values based on business type
UPDATE "businesses"
SET "defaultPage" = 'pos'
WHERE "type" = 'restaurant' AND "defaultPage" IS NULL;

-- Leave others as NULL (will default to 'home' in application logic)
```

**Valid Values by Business Type:**
- Clothing: `home`, `pos`, `reports`, `inventory`, `products`, `orders`
- Restaurant: `home`, `pos`, `reports`, `inventory`, `menu`, `orders`, `reservations`
- Grocery: `home`, `pos`, `reports`, `inventory`, `products`, `orders`
- Hardware: `home`, `pos`, `reports`, `inventory`, `products`, `orders`
- Other: `home`, `reports`

### Migration 2: Add Slogan Fields
**File**: `prisma/migrations/20260113000001_add_business_slogan/migration.sql`

```sql
-- Add slogan column to businesses table
ALTER TABLE "businesses" ADD COLUMN "slogan" VARCHAR(200) DEFAULT 'Where Customer Is King';

-- Add showSlogan column
ALTER TABLE "businesses" ADD COLUMN "showSlogan" BOOLEAN DEFAULT TRUE;

-- Add comments
COMMENT ON COLUMN "businesses"."slogan" IS 'Business slogan displayed on customer-facing screens';
COMMENT ON COLUMN "businesses"."showSlogan" IS 'Whether to display the business slogan on customer displays';
```

### Update Prisma Schema
**File**: `prisma/schema.prisma`

Add to Businesses model (after line 400):
```prisma
defaultPage   String?  @db.VarChar(50)  // Default landing page (home, pos, reports, etc.)
slogan        String?  @default("Where Customer Is King") @db.VarChar(200)
showSlogan    Boolean  @default(true)
```

## Phase 2: Permissions System ✅

### Update Permission Types
**File**: `src/types/permissions.ts`

Add to `CoreBusinessPermissions` interface (after line 104):
```typescript
canChangeDefaultPage: boolean;  // Change business default landing page
```

### Update Permission Presets
**File**: `src/types/permissions.ts`

**Business Owner** (line ~1023):
```typescript
canChangeDefaultPage: true,  // Owners can change default page
```

**Business Manager** (line ~1140):
```typescript
canChangeDefaultPage: true,  // Managers can change default page
```

**Employee** (line ~1148):
```typescript
canChangeDefaultPage: false,  // Employees cannot change default page
```

**Read-Only** (line ~1275):
```typescript
canChangeDefaultPage: false,  // Read-only cannot change default page
```

**System Admin** (line ~1400):
```typescript
canChangeDefaultPage: true,  // Admins can change default page
```

### Update Permission Groups
**File**: `src/types/permissions.ts`

Add to `CORE_PERMISSIONS.coreBusinessManagement` (after line 792):
```typescript
{ key: 'canChangeDefaultPage', label: 'Change Default Page' },
```

## Phase 3: API Updates ✅

### 3.1 Update Business GET API
**File**: `src/app/api/businesses/[businessId]/route.ts` or similar

Ensure response includes:
```typescript
{
  ...business,
  defaultPage: business.defaultPage,
  slogan: business.slogan,
  showSlogan: business.showSlogan
}
```

### 3.2 Update Business PUT/PATCH API
Accept in request body:
```typescript
{
  defaultPage?: string,  // Validate against allowed values
  slogan?: string,  // Max 200 chars
  showSlogan?: boolean
}
```

**Validation Logic:**
```typescript
const validDefaultPages: Record<string, string[]> = {
  clothing: ['home', 'pos', 'reports', 'inventory', 'products', 'orders'],
  restaurant: ['home', 'pos', 'reports', 'inventory', 'menu', 'orders', 'reservations'],
  grocery: ['home', 'pos', 'reports', 'inventory', 'products', 'orders'],
  hardware: ['home', 'pos', 'reports', 'inventory', 'products', 'orders'],
  other: ['home', 'reports']
}

if (defaultPage && !validDefaultPages[businessType]?.includes(defaultPage)) {
  return { error: 'Invalid default page for this business type' }
}
```

### 3.3 Update Customer Display Business API
**File**: `src/app/api/customer-display/business/[businessId]/route.ts`

Add to response:
```typescript
{
  ...businessInfo,
  slogan: business.slogan,
  showSlogan: business.showSlogan
}
```

## Phase 4: UI - Business Admin Form ✅

### 4.1 Business Manage Page
**File**: `src/app/business/manage/page.tsx` or similar

Add form section (after business name/description):

```tsx
{/* Default Landing Page */}
{hasPermission('canChangeDefaultPage') && (
  <div className="space-y-2">
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
      Default Landing Page
    </label>
    <select
      value={formData.defaultPage || 'home'}
      onChange={(e) => setFormData({...formData, defaultPage: e.target.value})}
      className="input-field w-full"
    >
      {getDefaultPageOptions(businessType).map(option => (
        <option key={option.value} value={option.value}>
          {option.icon} {option.label}
        </option>
      ))}
    </select>
    <p className="text-xs text-gray-500">
      Page users will see when they select this business
    </p>
  </div>
)}

{/* Business Slogan */}
<div className="space-y-2">
  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
    Business Slogan
  </label>
  <input
    type="text"
    maxLength={200}
    value={formData.slogan || ''}
    onChange={(e) => setFormData({...formData, slogan: e.target.value})}
    placeholder="Where Customer Is King"
    className="input-field w-full"
  />
  <div className="flex items-center gap-2 mt-2">
    <input
      type="checkbox"
      id="showSlogan"
      checked={formData.showSlogan !== false}
      onChange={(e) => setFormData({...formData, showSlogan: e.target.checked})}
      className="rounded"
    />
    <label htmlFor="showSlogan" className="text-sm text-gray-700 dark:text-gray-300">
      Show slogan on customer display
    </label>
  </div>
  <p className="text-xs text-gray-500">
    Displayed below business name on customer-facing screens
  </p>
</div>
```

### 4.2 Default Page Options Helper
**File**: Create `src/lib/business-default-pages.ts`

```typescript
export interface DefaultPageOption {
  value: string
  label: string
  icon: string
  path: string
}

export function getDefaultPageOptions(businessType: string): DefaultPageOption[] {
  const common = [
    { value: 'home', label: 'Business Home', icon: '🏠', path: `/${businessType}` },
    { value: 'pos', label: 'POS System', icon: '💰', path: `/${businessType}/pos` },
    { value: 'reports', label: 'Sales Reports', icon: '📊', path: `/${businessType}/reports` },
    { value: 'inventory', label: 'Inventory', icon: '📦', path: `/${businessType}/inventory` },
  ]

  const businessSpecific: Record<string, DefaultPageOption[]> = {
    clothing: [
      { value: 'products', label: 'Products', icon: '👗', path: '/clothing/products' },
      { value: 'orders', label: 'Orders', icon: '📦', path: '/clothing/orders' },
    ],
    restaurant: [
      { value: 'menu', label: 'Menu Management', icon: '🍽️', path: '/restaurant/menu' },
      { value: 'orders', label: 'Orders', icon: '📦', path: '/restaurant/orders' },
      { value: 'reservations', label: 'Reservations', icon: '📅', path: '/restaurant/reservations' },
    ],
    grocery: [
      { value: 'products', label: 'Products', icon: '🛒', path: '/grocery/products' },
      { value: 'orders', label: 'Orders', icon: '📦', path: '/grocery/orders' },
    ],
    hardware: [
      { value: 'products', label: 'Products', icon: '🔧', path: '/hardware/products' },
      { value: 'orders', label: 'Orders', icon: '📦', path: '/hardware/orders' },
    ],
  }

  return [...common, ...(businessSpecific[businessType] || [])]
}

export function getDefaultPagePath(businessType: string, defaultPage: string | null): string {
  if (!defaultPage) return `/${businessType}`

  const options = getDefaultPageOptions(businessType)
  const option = options.find(opt => opt.value === defaultPage)
  return option?.path || `/${businessType}`
}
```

## Phase 5: Customer Display Integration ✅

### 5.1 Update Customer Display Page
**File**: `src/app/customer-display/page.tsx`

Update business info state (around line 99):
```typescript
const [businessName, setBusinessName] = useState<string | null>(null)
const [businessPhone, setBusinessPhone] = useState<string | null>(null)
const [slogan, setSlogan] = useState<string | null>(null)
const [showSlogan, setShowSlogan] = useState<boolean>(false)
```

Update fetch business function (around line 240):
```typescript
const response = await fetch(`/api/customer-display/business/${displayBusinessId}`)
const data = await response.json()

if (data.success && data.business) {
  setBusinessName(data.business.name)
  setBusinessPhone(data.business.phone)
  setSlogan(data.business.slogan)
  setShowSlogan(data.business.showSlogan)
  // ... other fields
}
```

### 5.2 Update Display UI
**File**: `src/app/customer-display/page.tsx`

Update business header section (around line 450):
```tsx
{/* Business Name */}
<h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white text-center mb-2">
  {businessName || 'Welcome'}
</h1>

{/* Business Slogan - NEW */}
{showSlogan && slogan && (
  <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 text-center italic">
    "{slogan}"
  </p>
)}

{/* Business Phone */}
{businessPhone && (
  <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 text-center mt-2">
    📞 {formatPhoneNumberForDisplay(businessPhone)}
  </p>
)}
```

## Phase 6: Navigation Logic ✅

### 6.1 Update Business Switch Handler
**File**: `src/contexts/business-permissions-context.tsx`

Update `switchBusiness` function (around line 206):
```typescript
const switchBusiness = async (businessId: string): Promise<void> => {
  // ... existing code ...

  // Navigate to default page if configured
  if (typeof window !== 'undefined' && router) {
    const business = businesses.find(b => b.businessId === businessId)
    const defaultPage = business?.defaultPage
    const businessType = business?.businessType || 'retail'

    if (defaultPage) {
      const path = getDefaultPagePath(businessType, defaultPage)
      router.push(path)
    } else {
      router.push(`/${businessType}`)
    }
  }
}
```

### 6.2 Update Initial Login Navigation
**File**: `src/app/dashboard/page.tsx` or auth handler

After successful login:
```typescript
// Get user's default business
const defaultBusiness = businesses[0]
const defaultPage = defaultBusiness?.defaultPage
const businessType = defaultBusiness?.businessType || 'retail'

if (defaultPage) {
  const path = getDefaultPagePath(businessType, defaultPage)
  router.push(path)
} else {
  router.push('/dashboard')
}
```

## Testing Checklist ✅

### Database & Migrations
- [ ] Run migration for defaultPage column
- [ ] Run migration for slogan fields
- [ ] Verify existing restaurants have defaultPage='pos'
- [ ] Verify default slogan value
- [ ] Verify showSlogan default is TRUE

### Permissions
- [ ] Managers can see default page dropdown
- [ ] Employees cannot see default page dropdown
- [ ] Admin can see default page dropdown
- [ ] Permission checks work correctly

### Business Admin UI
- [ ] Default page dropdown shows correct options per business type
- [ ] Slogan input accepts up to 200 characters
- [ ] ShowSlogan checkbox works
- [ ] Changes save successfully
- [ ] Validation works for invalid default pages

### Customer Display
- [ ] Slogan displays below business name
- [ ] Slogan uses small font (doesn't shift layout)
- [ ] Slogan only shows if showSlogan is TRUE
- [ ] Slogan updates when business switches

### Navigation
- [ ] Switching businesses navigates to default page
- [ ] Restaurant defaults to POS
- [ ] Other businesses default to home if no defaultPage set
- [ ] Navigation respects user permissions

## Files to Create
1. `prisma/migrations/20260113000000_add_default_page/migration.sql`
2. `prisma/migrations/20260113000001_add_business_slogan/migration.sql`
3. `src/lib/business-default-pages.ts`

## Files to Modify
1. `prisma/schema.prisma` - Add new fields to Businesses model
2. `src/types/permissions.ts` - Add canChangeDefaultPage permission
3. `src/app/api/businesses/[businessId]/route.ts` - Return new fields
4. `src/app/api/customer-display/business/[businessId]/route.ts` - Return slogan fields
5. `src/app/business/manage/page.tsx` - Add UI for default page & slogan
6. `src/app/customer-display/page.tsx` - Display slogan
7. `src/contexts/business-permissions-context.tsx` - Add navigation logic

## Implementation Order
1. ✅ Phase 1: Create and run database migrations
2. ✅ Phase 2: Update permissions types and presets
3. ✅ Phase 3: Update API endpoints
4. ✅ Phase 4: Add UI to business admin form
5. ✅ Phase 5: Update customer display
6. ✅ Phase 6: Implement navigation logic
7. ✅ Testing and validation
