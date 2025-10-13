# Claude Code Workflow

## Database ORM Policy

**CRITICAL:** This project uses Prisma exclusively. Do NOT use Drizzle ORM.

### Prisma Only
- **Database Schema**: Use `prisma/schema.prisma` for all database models
- **Database Client**: Use `@prisma/client` for all database operations
- **Migrations**: Use `npx prisma migrate` commands only
- **Code Generation**: Use `npx prisma generate` only

### Prohibited: Drizzle ORM
- ❌ Never use `drizzle-kit` commands
- ❌ Never import from `drizzle-orm`
- ❌ Never create `drizzle.config.ts` files
- ❌ Never use Drizzle schema definitions

### Available Scripts
```bash
npm run db:generate    # Prisma client generation
npm run db:migrate     # Development migrations
npm run db:deploy      # Production migrations
npm run db:studio      # Database GUI
npm run db:reset       # Reset database
npm run db:pull        # Pull schema from database
npm run db:push        # Push schema to database
```
## Standard Workflow
1. First think through the problem, read the codebase for relevant files, and write a plan to projectplan.md.
2. The plan should have a list of todo items that you can check off as you complete them
3. Before you begin working, check in with me and I will verify the plan.
4. Then, begin working on the todo items, marking them as complete as you go.
5. Please every step of the way just give me a high level explanation of what changes you made.
6. Make every task and code change you do as simple as possible. We want to avoid making any massive or complex changes. Every change should impact as little code as possible. Everything is about simplicity.
7. Finally, add a review section to the projectplan.md file with a summary of the changes you made and any other relevant information.

## Development Server Management

**Kill all processes on a specific port (Windows PowerShell only):**
```powershell
Stop-Process -Id (Get-NetTCPConnection -LocalPort 8080).OwningProcess -Force
```

**Default development port:** 8080 (use this going forward to avoid conflicts with other local apps)

**Port notes:**
- The electricity-tokens app commonly uses port 3000 (and in some setups 3001).
- The sync service default was changed from 3001 to 8765 to avoid that conflict — prefer 8765 for the sync service when running locally or as a Windows service.

**Note:** The PowerShell command only works on Windows. It kills ALL associated processes for the port automatically, which is much more effective than killing individual processes. For other platforms, use standard process management commands.

## Windows Service Management (node-windows)

**CRITICAL:** Windows services created by `node-windows` have specific requirements for detection and management. ALWAYS follow these patterns.

### Critical Rule #1: Service Name Suffix

**node-windows automatically appends `.exe` to service names during registration.**

```javascript
// ❌ INCORRECT - Service will NOT be found
const SERVICE_NAME = 'multibusinesssyncservice'
spawnSync('sc', ['query', SERVICE_NAME])  // FAILS

// ✅ CORRECT - Service will be found
const SERVICE_NAME = 'multibusinesssyncservice.exe'
spawnSync('sc.exe', ['query', SERVICE_NAME])  // WORKS
```

**Pattern from electricity-tokens:**
```javascript
// Helper function to build correct service name
const buildServiceExpectedName = (serviceName) => `${serviceName}.exe`

// Usage in queries
const queryResult = spawnSync('sc.exe', ['query', buildServiceExpectedName('ElectricityTracker')], {
  encoding: 'utf-8',
  windowsHide: true
})
```

### Critical Rule #2: Use Explicit .exe Commands

**Always use `.exe` suffix for Windows commands to avoid PowerShell alias conflicts.**

```javascript
// ❌ INCORRECT - May use PowerShell aliases
const SC = process.env.SC_COMMAND || 'sc'
const result = spawnSync('taskkill', ['/F', '/PID', pid])

// ✅ CORRECT - Explicit .exe commands
const SC = 'sc.exe'  // Not just 'sc'
const result = spawnSync('taskkill.exe', ['/F', '/PID', pid])
```

**From electricity-tokens config.js:**
```javascript
commands: {
  SC_COMMAND: 'sc.exe',           // Not 'sc'
  TASKKILL_COMMAND: 'taskkill.exe', // Not 'taskkill'
  NETSTAT_COMMAND: 'netstat.exe'    // Not 'netstat'
}
```

### Service Detection Pattern

**Complete working pattern from electricity-tokens:**

```javascript
function stopWindowsServiceAndCleanup() {
  const { spawnSync } = require('child_process')

  // CRITICAL: Use .exe suffix for both service name and command
  const SERVICE_NAME = 'multibusinesssyncservice.exe'
  const SC = 'sc.exe'

  // Query service status
  const queryResult = spawnSync(SC, ['query', SERVICE_NAME], {
    encoding: 'utf-8',
    windowsHide: true
  })

  const output = queryResult.stdout || ''

  // Check various states
  if (output.includes('does not exist') || output.includes('1060')) {
    return true  // Not installed
  }

  if (output.includes('RUNNING') || output.includes('START_PENDING')) {
    // Stop the service
    spawnSync(SC, ['stop', SERVICE_NAME], {
      encoding: 'utf-8',
      windowsHide: true
    })
  }
}
```

### PowerShell Port Detection

**Use PowerShell Get-NetTCPConnection for reliable port detection (more reliable than netstat):**

```javascript
function findProcessByPort(port = 8080) {
  const { spawnSync } = require('child_process')

  const result = spawnSync('powershell', [
    '-Command',
    `Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess`
  ], {
    encoding: 'utf-8',
    windowsHide: true
  })

  if (result.stdout) {
    const pid = parseInt(result.stdout.trim(), 10)
    if (!isNaN(pid) && pid > 0) {
      return pid
    }
  }

  return null
}
```

### Complete Service Stop Flow

**From electricity-tokens hybrid-service-manager.js:**

1. **Check service status** using `sc.exe query servicename.exe`
2. **Stop service gracefully** using `sc.exe stop servicename.exe`
3. **Wait for STOPPED state** (up to 30 seconds)
4. **Kill process on port** using PowerShell Get-NetTCPConnection
5. **Kill stale node.exe processes** using `taskkill.exe /F /IM node.exe`
6. **Clean up Prisma temp files** (remove `.tmp` files from `.prisma/client/`)
7. **Wait for file handles to release** (3 seconds)

### Common Mistakes to Avoid

1. **❌ Missing .exe suffix**: `sc query multibusinesssyncservice` (FAILS)
2. **✅ Correct with .exe**: `sc.exe query multibusinesssyncservice.exe` (WORKS)

3. **❌ Using sc without .exe**: May use PowerShell alias
4. **✅ Using sc.exe explicitly**: Avoids alias conflicts

5. **❌ Using netstat for port detection**: Less reliable on modern Windows
6. **✅ Using PowerShell Get-NetTCPConnection**: More reliable and accurate

### Reference Implementation

**Location**: `C:/electricity-app/electricity-tokens/scripts/windows-service/`
- `hybrid-service-manager.js` - Complete service management
- `buildexpectedservicename.js` - Helper for .exe suffix
- `config.js` - Command configuration with .exe extensions

**Always reference electricity-tokens implementation when working with Windows services.**

## Security & Permissions

**CRITICAL:** Every UI component, page, and feature MUST implement proper user permissions from the start. Do NOT develop any UI without considering security implications.

### Required for Every UI Development:

1. **Permission Checking**: Use `@/lib/permission-utils` functions like:
   - `hasPermission(user, 'specificPermission')` 
   - `canAccessModule(user, 'moduleName')`
   - `isSystemAdmin(user)` or `isBusinessOwner(user)`

2. **Component-Level Security**: Wrap sensitive UI elements with permission checks
   ```tsx
   {hasPermission(user, 'canManageUsers') && (
     <UserManagementButton />
   )}
   ```

3. **Page-Level Protection**: Implement route guards and access controls

4. **Business Context**: Consider multi-business permissions and business membership roles

5. **Graceful Degradation**: Show appropriate messages or alternative UI for insufficient permissions

### Permission System Architecture:
- **System Level**: Global roles (admin, manager, employee, user)
- **Business Level**: Business-specific roles and permissions per membership
- **Module Level**: Fine-grained permissions for specific features

**Remember**: It's much easier to implement permissions during initial development than to retrofit them later. Always think security-first when building any UI.

## Critical Schema Change Warning

**⚠️ ABSOLUTE PRODUCTION CRITICAL ⚠️**: NEVER make schema changes without explicit permission. This is a production database with live data.

### Pre-Schema Change Checklist:
1. **STOP and ask the user first** before making ANY schema changes
2. **Understand the production impact** - will this require migrations?
3. **Check if database structure matches current schema** with `npx prisma db pull`
4. **Verify if APIs work with current schema** by testing actual model names
5. **If schemas don't match**: Fix APIs to match DB, NOT the other way around

### Safe API Fix Pattern:
```typescript
// ✅ SAFE - Fix API to match current database schema
await prisma.vehicle_drivers.findMany() // Use actual table names

// ❌ DANGEROUS - Don't change schema to match APIs
model VehicleDriver { @@map("vehicle_drivers") } // Requires migration
```

**Remember**: In production, **APIs adapt to database**, not database to APIs.

## Production Database Safety

**⚠️ CRITICAL PRODUCTION WARNING**: This database mirrors production data and must be handled with extreme care.

### Migration Safety Rules:
1. **NEVER use `prisma migrate reset`** - This will destroy all production data
2. **Always use forward migrations** - Only add new tables/columns, never destructive changes
3. **Check existing columns before adding** - Use `prisma db pull` to sync schema with actual database state
4. **Test migrations in development first** - Always test migration scripts before applying to production
5. **Create manual migration files** when Prisma migration system has conflicts
6. **Always backup before major changes** - Though we can't reset, we still need to be extremely careful

### Current Migration Issues:
- `20250914103400_add_restaurant_menu_features` migration has column conflicts (`isAvailable` already exists)
- Need to fix this migration before applying new business balance tracking migration
- Database schema is out of sync with migration files due to manual changes

### Production Database Workflow:
1. Always run `npx prisma db pull` first to sync schema with actual database
2. Create minimal forward-only migrations
3. Apply migrations with `npx prisma migrate deploy` (never migrate dev in production)
4. Verify changes with database queries before proceeding

## Global Settings Compliance

**CRITICAL:** Any UI that involves dates, phone numbers, or driver's licenses MUST conform to global settings.

### Required Components for Input Fields:

1. **Date Inputs**: Always use `@/components/ui/date-input` for consistent date formatting
2. **Phone Number Inputs**: Always use `@/components/ui/phone-number-input` for proper phone formatting 
3. **National ID Inputs**: Always use `@/components/ui/national-id-input` for ID validation and formatting
4. **Driver License Inputs**: Always use `@/components/ui/driver-license-input` when applicable

### Display Formatting:

1. **Date Display**: Use `formatDateByFormat(dateString, globalDateFormat)` from `@/lib/country-codes`
2. **Phone Display**: Use `formatPhoneNumberForDisplay(phoneNumber)` from `@/lib/country-codes`
3. **Import Settings Context**: Use `useDateFormat()` from `@/contexts/settings-context` for global date format

### Example Usage:
```tsx
import { formatDateByFormat, formatPhoneNumberForDisplay } from '@/lib/country-codes'
import { useDateFormat } from '@/contexts/settings-context'
import { PhoneNumberInput } from '@/components/ui/phone-number-input'
import { NationalIdInput } from '@/components/ui/national-id-input'
import { DateInput } from '@/components/ui/date-input'

const { format: globalDateFormat } = useDateFormat()
const formatDate = (dateString: string) => formatDateByFormat(dateString, globalDateFormat)
```

**Remember**: Global settings ensure consistent user experience across different regions and countries. Always use these components and formatting functions instead of raw HTML inputs or browser defaults.

### **MANDATORY TEMPLATE INPUTS REMINDER**

**⚠️ CRITICAL DEVELOPER REMINDER**: When creating ANY form that captures user data, you MUST use the appropriate template input components:

#### **Required for ALL Forms Containing:**
- 📱 **Phone Numbers**: MUST use `PhoneNumberInput` - Never use basic `<input type="tel">`
- 🆔 **National IDs**: MUST use `NationalIdInput` with template validation
- 📅 **Dates**: MUST use `DateInput` with global date format support
- 🚗 **Driver Licenses**: MUST use `DriverLicenseInput` when applicable

#### **Enforcement Rules:**
1. **No Raw Inputs**: Never use `<input type="tel">`, `<input type="date">`, or basic text inputs for these fields
2. **Template Validation**: All inputs must validate against country/region-specific templates
3. **Consistent Formatting**: Users expect consistent formatting across the entire application
4. **Global Compliance**: These components ensure compliance with different country standards

#### **Common Violations to Avoid:**
```tsx
// ❌ WRONG - Basic HTML inputs
<input type="tel" placeholder="Phone" />
<input type="text" placeholder="National ID" />
<input type="date" />

// ✅ CORRECT - Template components
<PhoneNumberInput value={phone} onChange={handlePhoneChange} />
<NationalIdInput value={id} templateId={template} onChange={handleIdChange} />
<DateInput value={date} onChange={handleDateChange} />
```

**💡 Quick Check**: Before submitting any form-related code, verify you're using template components for phone, ID, date, and driver license fields.

## Content Layout Standards

**CRITICAL:** Every page MUST use the `ContentLayout` component for consistent spacing, typography, and user experience.

### ContentLayout Component Location:
`@/components/layout/content-layout`

### Usage Pattern:
```tsx
import { ContentLayout } from '@/components/layout/content-layout'

export default function MyPage() {
  return (
    <ContentLayout
      title="Page Title"
      subtitle="Optional description of the page"
      breadcrumb={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Section', href: '/section' },
        { label: 'Current Page', isActive: true }
      ]}
      headerActions={<Button>Action</Button>}
      maxWidth="7xl" // Optional: sm|md|lg|xl|2xl|4xl|6xl|7xl|full
    >
      {/* Page content goes here */}
      <div className="space-y-6">
        {/* Your components */}
      </div>
    </ContentLayout>
  )
}
```

### ContentLayout Benefits:
- **Consistent Spacing**: Automatic responsive margins and padding
- **Typography**: Standardized title and subtitle styling with theme support
- **Breadcrumbs**: Automatic navigation breadcrumb generation
- **Header Actions**: Consistent placement of page-level actions (buttons, etc.)
- **Responsive**: Mobile-first design that adapts to all screen sizes
- **Theme Support**: Full dark/light mode integration
- **Professional Layout**: Prevents content from touching screen edges

### Required Implementation:
1. **All New Pages**: Must use ContentLayout from the start
2. **Existing Pages**: Should be updated to use ContentLayout when modified
3. **Nested Layouts**: Works with `MainLayout` and other layout components
4. **Theme Classes**: Use theme-aware utility classes within content

### Layout Hierarchy:
```
RootLayout (with GlobalHeader + ThemeProvider)
├── MainLayout (sidebar for authenticated pages)
│   └── ContentLayout (consistent content spacing)
│       └── YourPageContent
```

### Theme-Aware Styling:
Always use these utility classes within ContentLayout content:
- `text-primary` instead of `text-gray-900`
- `text-secondary` instead of `text-gray-600` 
- `card` instead of `bg-white rounded-lg shadow-md`
- `page-background` instead of `bg-gray-50`

**Remember**: Good layout consistency creates professional user experiences and reduces development time through reusable patterns.

## Explicit Data Flow Pattern (No Fallbacks)

**CRITICAL**: Never use fallback logic in APIs. Every data path must be explicit and deterministic based on the payload.

### Anti-Pattern (NEVER DO THIS):
```typescript
// ❌ BAD: Ambiguous fallback logic
if (paymentType === 'contractor') {
  // First try as personId, then try as projectContractorId
  let person = await findPerson(contractorId)
  if (!person) {
    // Fallback to project contractor
    let projectContractor = await findProjectContractor(contractorId)
  }
}
```

### Correct Pattern (ALWAYS DO THIS):
```typescript
// ✅ GOOD: Explicit paths based on payload data
switch (paymentType) {
  case 'contractor':
    // contractorId is ALWAYS a person.id from /api/persons
    const person = await prisma.person.findUnique({ where: { id: contractorId } })
    return createPersonPayment(person)

  case 'project':
    // contractorId is ALWAYS a projectContractor.id when project is involved
    const projectContractor = await prisma.projectContractor.findUnique({ where: { id: contractorId } })
    return createProjectPayment(projectContractor, projectId)

  case 'category':
    // No contractor involved
    return createCategoryExpense(category)

  default:
    throw new Error(`Unknown payment type: ${paymentType}`)
}
```

### Key Principles:
1. **Radio Button Determines Data Type**: The UI selection explicitly defines what type of data is sent
2. **API Uses Switch/Case**: Never use if/else chains that try multiple data interpretations
3. **Payload Structure is Explicit**: Each paymentType has a known, documented data structure
4. **No "Try This, Then That"**: Each path is deterministic and single-purpose
5. **Clear Error Messages**: If data doesn't match expected type, fail fast with clear error

### Documentation Requirement:
Every API endpoint that accepts multiple data types must document the exact payload structure for each type:

```typescript
/**
 * Personal Expense Creation API
 *
 * paymentType: 'category'
 * - contractorId: null
 * - projectId: null
 * - category: required string
 *
 * paymentType: 'contractor'
 * - contractorId: required person.id (from /api/persons)
 * - projectId: null
 * - category: ignored
 *
 * paymentType: 'project'
 * - contractorId: required projectContractor.id (from /api/construction/project-contractors)
 * - projectId: required project.id
 * - category: ignored
 */
```

**Remember**: Explicit is better than implicit. Deterministic is better than adaptive. Clear errors are better than silent failures.

## Permission Templates & Collapsible Custom Permissions

### Permission Template System

The application includes a comprehensive permission template system that allows admins to create reusable permission sets for different business types.

#### Key Components:
- **Admin Templates Page**: `/admin/permission-templates`
- **Database Model**: `PermissionTemplate` with business-type-specific permissions
- **User Assignment**: Templates can be assigned during user creation/editing
- **Template + Custom**: Users can select a template AND make additional custom changes

#### Template Features:
- **Business Type Filtering**: Only relevant templates show for each business type
- **Template Inheritance**: Custom permissions build on top of template base
- **Visual Indicators**: Clear labeling when templates are active
- **Admin Management**: Full CRUD operations for system admins only

### Collapsible Custom Permissions UX

**CRITICAL**: Custom permissions sections use intelligent collapsible behavior to prevent accidental changes and improve UX.

#### Smart Default Behavior:

1. **Collapsed by Default** (editing existing users):
   - Custom permissions start collapsed if user already has custom permissions or templates
   - Keeps UI clean when editing users with existing complex permissions

2. **Expanded on First Use** (enabling for first time):
   - Automatically expands when user enables custom permissions checkbox
   - Automatically expands when user selects a permission template
   - Makes permission editor immediately visible for configuration

#### Checkbox Protection:

```tsx
// Checkbox disabled when custom permissions are enabled but section collapsed
disabled={membership.useCustomPermissions && collapsedPermissions[index]}
```

**Key Rules:**
- ✅ **Can Enable**: Checkbox works to enable custom permissions
- ❌ **Cannot Disable**: Checkbox disabled when custom permissions enabled + collapsed
- 📝 **Must Expand**: Users must expand section to see what they're disabling
- 💡 **Helper Text**: Shows "(expand below to disable)" when disabled

#### Visual Feedback:
- **Disabled State**: `opacity-50 cursor-not-allowed` styling
- **Helper Text**: Clear instructions when checkbox is disabled
- **Expand/Collapse Icons**: Up/down arrows with "Expand"/"Collapse" labels
- **Collapsed Message**: "Custom permissions are collapsed. Click 'Expand' above to view and edit permissions."

#### Implementation Locations:
- **User Edit Modal**: `@/components/user-management/user-edit-modal.tsx`
- **User Creation Wizard**: `@/components/user-management/user-creation-wizard.tsx`
- **Permission Templates API**: `@/app/api/admin/permission-templates/`

#### Database Schema:
```prisma
model BusinessMembership {
  // ... other fields
  templateId String? @map("template_id") // Reference to PermissionTemplate
  template   PermissionTemplate? @relation(fields: [templateId], references: [id])
}

model PermissionTemplate {
  id           String @id @default(uuid())
  name         String
  businessType String // clothing, restaurant, construction, etc.
  permissions  Json
  // ... other fields
  businessMemberships BusinessMembership[]
}
```

#### User Experience Benefits:
- **Prevents Accidents**: Cannot accidentally disable custom permissions when collapsed
- **Clear Intent**: Users must expand to see what they're changing
- **Clean Interface**: Existing permissions don't clutter the UI
- **Intuitive Flow**: Automatic expansion when enabling features
- **Consistent UX**: Same behavior across creation and editing workflows

**Remember**: This UX pattern prevents costly mistakes while maintaining discoverability and ease of use.

## Database Naming Standards

**CRITICAL**: All database models and API calls MUST follow consistent naming conventions across the entire application to prevent runtime errors and maintain code consistency.

### Prisma Schema Standards

#### Model Naming Convention:
- **Database Tables**: Use `snake_case` for actual table names in the database
- **Prisma Models**: Use `PascalCase` for Prisma model definitions  
- **Table Mapping**: Use `@@map()` directive to map PascalCase models to snake_case table names

#### Correct Pattern:
```prisma
model JobTitle {
  id                 String               @id
  title              String               @unique
  description        String?
  responsibilities   String[]
  department         String?
  level              String?
  is_active          Boolean              @default(true)
  created_at         DateTime             @default(now())
  updated_at         DateTime             @default(now())
  employee_contracts employee_contracts[]
  employees          employees[]

  @@map("job_titles")
}

model Employee {
  id                   String                @id
  employee_number      String                @unique
  full_name            String
  email                String?               @unique
  phone                String
  national_id          String                @unique
  job_title_id         String
  compensation_type_id String
  is_active            Boolean               @default(true)
  created_at           DateTime              @default(now())
  updated_at           DateTime              @default(now())
  
  job_titles          JobTitle              @relation(fields: [job_title_id], references: [id])
  compensation_types  CompensationType      @relation(fields: [compensation_type_id], references: [id])

  @@map("employees")
}

model BenefitType {
  id                String              @id
  name              String              @unique
  type              String
  default_amount    Decimal?            @db.Decimal(12, 2)
  is_percentage     Boolean             @default(false)
  is_active         Boolean             @default(true)
  created_at        DateTime            @default(now())
  updated_at        DateTime            @default(now())

  @@map("benefit_types")
}

model CompensationType {
  id                    String               @id
  name                  String               @unique
  type                  String
  base_amount           Decimal?             @db.Decimal(12, 2)
  commission_percentage Decimal?             @db.Decimal(5, 2)
  is_active             Boolean              @default(true)
  created_at            DateTime             @default(now())
  updated_at            DateTime             @default(now())

  @@map("compensation_types")
}

model DisciplinaryAction {
  id              String    @id
  employee_id     String
  action_type     String
  violation_type  String
  title           String
  description     String
  incident_date   DateTime
  action_date     DateTime
  severity        String    @default("low")
  is_active       Boolean   @default(true)
  created_at      DateTime  @default(now())
  updated_at      DateTime  @default(now())

  @@map("disciplinary_actions")
}
```

### API Client Usage Standards

#### Prisma Client Calls:
- **ALWAYS use camelCase** when calling Prisma client methods
- This matches the generated Prisma client naming convention
- Never use snake_case for Prisma client calls

#### Correct API Patterns (Based on electricity-tokens):
```typescript
// ✅ CORRECT - Use camelCase for Prisma client calls (matches generated client)
const users = await prisma.user.findMany({
  where: { isActive: true },
  orderBy: { name: 'asc' }
})

const purchases = await prisma.tokenPurchase.findMany({
  include: {
    createdBy: {
      select: { name: true, email: true }
    },
    contribution: {
      select: { contributionAmount: true }
    }
  }
})

const contributions = await prisma.userContribution.findMany({
  where: { userId: 'some-id' }
})

const auditLogs = await prisma.auditLog.findMany({
  where: { userId: userId }
})

// ❌ INCORRECT - Never use snake_case or table names for Prisma client calls
const users = await prisma.users.findMany()              // Wrong!
const purchases = await prisma.token_purchases.findMany() // Wrong!
const contributions = await prisma.user_contributions.findMany() // Wrong!
```

### Consistent Implementation Rules

#### 1. Schema Design (ELECTRICITY-TOKENS PATTERN):
- Use `PascalCase` for ALL model names (User, TokenPurchase, UserContribution, BusinessMembership)
- Use `@@map("snake_case_table_name")` for ALL models without exception
- Use `camelCase` for ALL field names in schema (userId, isActive, createdAt)
- Database uses snake_case field names automatically via Prisma mapping

#### 2. API Routes (ELECTRICITY-TOKENS PATTERN):
- Always use `prisma.modelName` where modelName is camelCase (prisma.user, prisma.tokenPurchase)
- Generated Prisma client converts PascalCase models to camelCase properties
- Field names in queries use camelCase as defined in schema (isActive, createdAt, userId)

#### 3. Field Naming (ELECTRICITY-TOKENS PATTERN):
- Schema fields: `camelCase` (isActive, createdAt, userId) 
- Database fields: automatically mapped to `snake_case` (is_active, created_at, user_id)
- Prisma client queries: `camelCase` for field references
- TypeScript interfaces: `camelCase` for property names

#### 4. Error Prevention:
- **Runtime Errors**: Using snake_case for Prisma client calls results in "Cannot read properties of undefined" errors
- **Type Safety**: Consistent naming enables proper TypeScript checking
- **Code Maintainability**: Uniform patterns reduce confusion and bugs

### Reference Implementation
Based on the working pattern from the electricity-tokens repository, this naming convention ensures:
- **Database Consistency**: All tables use snake_case names
- **Type Safety**: Proper TypeScript inference and checking
- **Developer Experience**: Predictable API patterns
- **Error Prevention**: Eliminates runtime undefined method errors

### CORRECT Example (From electricity-tokens):
```prisma
model User {
  id                    String   @id @default(cuid())
  email                 String   @unique
  name                  String
  isActive              Boolean  @default(true)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  // Relations
  contributions     UserContribution[]
  createdPurchases  TokenPurchase[]
  
  @@map("users")
}

model TokenPurchase {
  id           String   @id @default(cuid())
  totalTokens  Float
  totalPayment Float
  createdById  String
  
  createdBy    User               @relation(fields: [createdById], references: [id])
  contribution UserContribution?
  
  @@map("token_purchases")
}
```

### Migration Guidelines (ELECTRICITY-TOKENS PATTERN):
1. Convert ALL model names to PascalCase (User, BusinessMembership, TokenPurchase)
2. Convert ALL field names to camelCase (userId, isActive, createdAt)
3. Add `@@map("snake_case_table_name")` for ALL models
4. Update all API routes to use camelCase Prisma client calls (prisma.user, prisma.businessMembership)
5. Test all affected API endpoints
6. Regenerate Prisma client with `npx prisma generate`

**CRITICAL**: This naming standard follows the electricity-tokens repository exactly and is MANDATORY across the entire application. Always read this section before working on database-related code.

## API Response Structure & UI Data Consumption Patterns

**CRITICAL**: Understanding the difference between database table names, Prisma relation names, API responses, and UI data consumption is essential to prevent runtime errors.

### Key Understanding: Database vs API vs UI

#### 1. Database Table Names (snake_case):
```sql
-- Physical database tables
users
token_purchases  
user_contributions
employees
employee_contracts
job_titles
```

#### 2. Prisma Schema Model Names (PascalCase):
```prisma
model User { @@map("users") }
model TokenPurchase { @@map("token_purchases") }
model UserContribution { @@map("user_contributions") }
model Employee { @@map("employees") }
model EmployeeContract { @@map("employee_contracts") }
model JobTitle { @@map("job_titles") }
```

#### 3. Prisma Client Calls (camelCase):
```typescript
// Generated Prisma client uses camelCase
await prisma.user.findMany()
await prisma.tokenPurchase.findMany()
await prisma.userContribution.findMany()
await prisma.employee.findMany()
await prisma.employeeContract.findMany()
await prisma.jobTitle.findMany()
```

#### 4. Prisma Relation Names in Schema:
```prisma
model Employee {
  jobTitles JobTitle @relation(fields: [jobTitleId], references: [id])
  employeeContracts EmployeeContract[]
  // Note: Relation names can be plural or singular based on relationship type
}
```

#### 5. API Response Data Structure:
```typescript
// What the API actually returns (includes both raw relations AND formatted data)
{
  id: "cmfbn5n2q00071pbg4kwpt01i",
  fullName: "Emily Wilson",
  // Raw Prisma relations (plural table-based names):
  jobTitles: { id: "...", title: "Assistant Manager" },
  employeeContracts: [...],
  compensationTypes: { id: "...", name: "Sales Commission" },
  // Formatted data for UI consumption (singular names):
  jobTitle: { id: "...", title: "Assistant Manager" },
  compensationType: { id: "...", name: "Sales Commission" },
  primaryBusiness: { id: "...", name: "TechCorp Solutions" }
}
```

### Critical Rules for UI Development:

1. **Always check the actual API response structure first**
2. **Use formatted singular names in UI** (`jobTitle`, `compensationType`, `primaryBusiness`)
3. **Use plural relation names with fallbacks for arrays** (`employeeContracts || []`)
4. **Never assume field names - always verify with actual API data**

### Pattern from electricity-tokens App:
```typescript
// electricity-tokens uses this pattern:
interface ContributionData {
  user: { id: string; name: string; email: string }    // Singular
  purchase: { id: string; totalTokens: number }        // Singular
}

// UI consumes like:
contribution.user.name
contribution.purchase.totalTokens
```

### Common Mistakes to Avoid:

1. **❌ Mixing table names with data access**: Using `employee.contracts` when it should be `employee.employeeContracts`
2. **❌ Assuming relation names**: Not checking actual API response structure
3. **❌ Using raw Prisma relations in UI**: Using `employee.jobTitles` instead of `employee.jobTitle`
4. **❌ No fallbacks for missing data**: Not using `|| []` for potentially undefined arrays

### Debugging Workflow:

1. **First**: Check actual API response structure with browser DevTools or API testing
2. **Second**: Verify what fields are available in the response
3. **Third**: Update UI to use the correct field names with appropriate fallbacks
4. **Never**: Modify API to match incorrect UI expectations

**Remember**: The API response structure is the source of truth. UI must adapt to match API data, not the other way around.

## Database Recovery Seed Scripts

### Overview
Comprehensive seed scripts for restoring all employee-related reference data after database resets. These scripts ensure dropdowns and form validation work correctly.

### Individual Seed Scripts

#### 1. ID Format Templates: `seed-id-templates.js`
Seeds 5 African country ID format templates for employee national ID validation.

**Usage:**
```bash
cd scripts
node seed-id-templates.js
```

**Templates:**
- Zimbabwe National ID (ZW): 63-123456A78
- South Africa ID Number (ZA): 8001015009087
- Botswana Omang (BW): 123456789
- Kenya National ID (KE): 12345678
- Zambia NRC (ZM): 123456/78/1

#### 2. Job Titles: `seed-job-titles.js`
Seeds 29 common job titles for construction and business sectors.

**Usage:**
```bash
cd scripts
node seed-job-titles.js
```

**Includes:** General Manager, Site Supervisor, Civil Engineer, Accountant, Mason, Carpenter, etc.

#### 3. Compensation Types: `seed-compensation-types.js`
Seeds 15 compensation structure types for employee contracts.

**Usage:**
```bash
cd scripts
node seed-compensation-types.js
```

**Types:** Hourly Rate, Monthly Salary, Commission Only, Base + Commission, Project Based, etc.

#### 4. Benefit Types: `seed-benefit-types.js`
Seeds 28 employee benefit types for contract management.

**Usage:**
```bash
cd scripts
node seed-benefit-types.js
```

**Benefits:** Health Insurance, Medical Aid, Pension Fund, Housing Allowance, Annual Leave, etc.

#### 5. Phone Format Templates: `seed-phone-templates.js`
Seeds 7 international phone number format templates.

**Usage:**
```bash
cd scripts
node seed-phone-templates.js
```

**Countries:** Zimbabwe, South Africa, Botswana, Kenya, Zambia, UK, US

#### 6. Date Format Templates: `seed-date-templates.js`
Seeds 5 international date format templates.

**Usage:**
```bash
cd scripts
node seed-date-templates.js
```

**Formats:** DD/MM/YYYY (ZW/UK), MM/DD/YYYY (US), YYYY-MM-DD (ISO), DD-MM-YYYY (ZA), DD.MM.YYYY (EU)

### Combined Recovery Script: `seed-all-employee-data.js`

**MAIN RECOVERY SCRIPT** - Use this after database resets to restore all employee reference data.

**Usage:**
```bash
cd scripts
node seed-all-employee-data.js
```

**What it seeds:**
- 5 ID format templates
- 7 Phone format templates
- 5 Date format templates
- 29 Job titles
- 15 Compensation types
- 28 Benefit types

**Total:** 89 reference data records essential for employee management functionality.

### Post-Database Reset Workflow

1. **After any database reset/migration:**
   ```bash
   cd C:/Users/ticha/apps/multi-business-multi-apps/scripts
   node seed-all-employee-data.js
   ```

2. **Verify seeding success:**
   - Check employee creation form dropdowns populate correctly
   - Test ID format validation with different country templates
   - Ensure phone number formatting works
   - Verify contract creation has all required reference data

3. **Individual script recovery (if needed):**
   ```bash
   # If only specific data is missing:
   node seed-job-titles.js          # Just job titles
   node seed-compensation-types.js  # Just compensation types
   node seed-benefit-types.js       # Just benefit types
   ```

### Script Dependencies
- Requires `@prisma/client` package
- Uses `require()` for Node.js compatibility
- Each script is self-contained and can run independently
- All scripts include error handling and detailed console output

**CRITICAL**: Always run `seed-all-employee-data.js` after database resets to ensure employee management functionality works correctly.

## Global Component Reuse - Employee & User Management

**CRITICAL REMINDER**: Employee and User management systems already exist at a global level and MUST be reused for business-specific implementations.

### Key Principle: No Duplication
- **Employee Management**: Located at `/employees` - comprehensive global system
- **User Management**: Located at `/users` - comprehensive global system
- **Business-Specific Access**: Restaurant users should access `/employees?businessType=restaurant`

### Global Components with Business Filtering:
1. **Employee System** (`/app/employees/page.tsx`):
   - Uses `buildEmployeeQueryFilter(user)` for access control
   - Automatically filters employees by user's business memberships
   - Restaurant users only see employees with `primaryBusinessId` matching their restaurant business

2. **User System** (`/app/users/page.tsx`):
   - Uses business membership filtering
   - Restaurant managers only see users within their business scope

3. **Existing Infrastructure**:
   - `@/lib/employee-access-control.ts` - handles business-based employee filtering
   - `@/components/employees/add-employee-modal.tsx` - global employee creation
   - `@/app/api/employees/route.ts` - API with built-in business filtering

### DO NOT Create Duplicate Components:
- ❌ **Restaurant-specific employee forms**
- ❌ **Restaurant-specific user management UI**
- ❌ **Duplicate API endpoints for restaurant employees**
- ❌ **Business-specific employee modals or pages**

### Correct Implementation Pattern:
```tsx
// ✅ CORRECT - Restaurant employees page redirects to global system
export default function RestaurantEmployeesPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to global employee system with restaurant filter
    router.push('/employees?businessType=restaurant')
  }, [])

  return <RedirectUI />
}

// ❌ INCORRECT - Creating duplicate employee management
export default function RestaurantEmployeesPage() {
  return <CustomRestaurantEmployeeForm /> // Don't do this!
}
```

### Permission & Business Filtering Logic:
The global systems automatically handle:
- **Business Membership Filtering**: Users only see employees/users within their assigned businesses
- **Role-Based Access**: Different permissions based on business role (owner, manager, employee)
- **Primary Business Assignment**: Restaurant employees are filtered by `primaryBusinessId`
- **Department Access**: Optional department-level filtering within businesses

### Implementation Rules:
1. **Always use global `/employees` and `/users` systems**
2. **Add business type query parameters for filtering**: `?businessType=restaurant`
3. **Rely on existing `employee-access-control.ts` for permissions**
4. **Create redirect pages for business-specific routes** that lead to global systems
5. **Never duplicate existing employee/user management functionality**

### Benefits of This Approach:
- **Single Source of Truth**: All employee data managed in one place
- **Consistent UX**: Same interface patterns across all business types
- **Reduced Maintenance**: Changes benefit all business types simultaneously
- **Proper Security**: Centralized permission and access control logic
- **Cross-Business Features**: Users can be assigned to multiple businesses

**Remember**: The global employee and user management systems are feature-complete with proper business filtering. Always check for existing global components before creating business-specific duplicates.

## Admin User Creation After Database Reset

**CRITICAL**: Always create the admin user after any database reset, migration, or when login fails due to missing users.

### Quick Admin Creation Command:
```bash
cd "C:\Users\ticha\apps\multi-business-multi-apps"
npm run create-admin
```

### Default Admin Credentials:
- **Email**: admin@business.local
- **Password**: admin123
- **Role**: admin (system administrator with full permissions)

### When to Run Admin Creation:
1. **After database resets**: `npx prisma migrate reset`
2. **After fresh database setup**: New environment or clean installation
3. **Login failures**: When "cannot login as admin@business.local" or "no users at all"
4. **Migration issues**: After major schema changes that affect user tables

### Automatic Admin User Features:
- **System Admin Role**: Full access to all business modules and administration features
- **All Permissions**: Can access construction, restaurant, grocery, clothing, hardware, and personal modules
- **User Management**: Can create and manage other users and their permissions
- **Business Management**: Can create and manage businesses and assign users to them

### Verification Steps After Admin Creation:
1. **Test Login**: Navigate to `/auth/signin` and login with admin@business.local / admin123
2. **Check Dashboard Access**: Verify dashboard loads without errors
3. **Verify Module Access**: Confirm all business modules (restaurant, grocery, clothing, hardware, etc.) are visible in sidebar
4. **Test Admin Functions**: Access system administration, user management, and business management features

### Script Location:
`scripts/create-admin.js` - Creates admin user with proper permissions and business memberships

**Remember**: Always run `npm run create-admin` immediately after any database reset to restore system access. This prevents authentication issues and ensures proper system functionality.

