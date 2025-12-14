# Feature Development Session Template

> **Template Type:** Feature Development  
> **Version:** 1.0  
> **Last Updated:** October 17, 2025

---

## 🎯 Purpose

For creating new features, screens, or endpoints with structured planning.

---

## 📋 Required Context Documents

**IMPORTANT:** Before starting this session, load the following context documents **IN THE EXACT ORDER LISTED BELOW**.

### Core Contexts (Load in this EXACT order - ONE AT A TIME)

**CRITICAL:** Read these files sequentially. Do not proceed to the next document until you have fully read and understood the previous one.

1. **FIRST:** `ai-contexts/master-context.md` - General principles and conventions
   - ⚠️ Contains critical instruction to read code-workflow.md
   - ⚠️ Defines operating principles
   - ⚠️ Contains mandatory workflow enforcement
   - ⚠️ Defines example adherence requirements

2. **SECOND:** `ai-contexts/code-workflow.md` - Standard workflow and task tracking
   - Contains MANDATORY workflow requirements
   - Requires creating project plan BEFORE any code changes
   - Defines approval checkpoint process

### Feature-Specific Contexts (Load as needed after core contexts)

- `ai-contexts/frontend/component-context.md` - For UI component development
- `ai-contexts/frontend/ui-context.md` - For UI consistency and styling
- `ai-contexts/backend/backend-api-context.md` - For API endpoint development
- `ai-contexts/backend/database-context.md` - For database schema changes
- `ai-contexts/testing/unit-testing-context.md` - For test coverage

### Optional Contexts

- Domain-specific contexts based on the module being developed

**How to load:** Use the Read tool to load each relevant context document before beginning work.

---

## 🚀 Session Objective

<!-- Fill in your specific feature requirements before starting -->

**Ticket:** mbm-117

**Feature Name:** Add sibling expense accounts to capture historical expenses

**Feature Description:**
Periodically we have old expense accounts that need to be added to the system for historical and search capabilities.

For an existing account we want the ability to add one or more of this related expense accounts.
For example say we have an account "Home Bills Expense" recently created and is capturing ongoing expenses.
But we have historical data we want to enter and eventually merge at the end of the data capture at the end. So we will create an sibling expense account say "Home Bills Expense-01". We will start entering old records to this sibling account as the data was created, in other words capture all the historical data, deposits expenses and enter the expense date as the date when it was created. This is important so that when finally the accounts are merged every transaction is at its place. 
So we want ability to create these sibling accounts and they will be appended by the position number indicating same account but sibling. On listing of the accounts they will always appear next to each other.
We now need to modify the data capture for to include a date entry, which if not provided will default to today's date. We will need a date picker for the entry.
When all the data has been captured and complete the account should have zero balance before merging into the main expense account. The expense account cannot be merged if there is balance. Once merged there is no reverse and the sibling account will be deleted from the system. So we will need a workflow to merge the accounts into one.

When making payments into a sibling accounts the UI colors should be visibly different so that the user capturing data cannot make a mistake. A new permission in addition to being allowed to created expense accounts we need a permission to enter historical sibling accounts. Also there needs a new permission to create siblings accounts as well as permission to merge sibling into the main account. Merge will require user to be asked a series of confirmations steps to make them aware once merged there is no going back.

**Target Module/Component:** Expense Accounts Module (`src/app/expense-accounts/`)

**API Endpoints (if applicable):**
- `POST /api/expense-account/[accountId]/sibling` - Create sibling account
- `GET /api/expense-account/siblings/[accountId]` - List sibling accounts
- `POST /api/expense-account/[accountId]/merge` - Merge sibling into parent
- `PUT /api/expense-account/[accountId]/payments` - Modified to support historical dates

**UI/UX Requirements:**

### UX Considerations:

- All date inputs use `DateInput` component (global settings compliant)
- All confirmations use `useConfirm` hook (no browser confirm dialogs)
- All alerts use `useAlert` hook (no browser alert dialogs)
- Success messages use toast notifications
- Form validation with inline error messages
- Loading states for all async operations
- Optimistic UI updates where applicable
- Disabled states for locked/signed payments
- Clear visual indicators for immutable records

**Custom UI Patterns (from `custom/use-custom-ui.md`):**
- Use `useAlert()` hook instead of browser alert()
- Use `useConfirm()` hook instead of browser confirm()
- Success messages via toast notifications or alert system
- Consistent styling with app's design system

### New UI Components Required:
- Sibling account creation modal
- Merge confirmation modal with multi-step confirmations
- Visual indicators for sibling accounts (color coding, badges)
- Modified account list showing sibling relationships
- Enhanced payment form with DateInput component

**Acceptance Criteria:**

### Functional Requirements:
- [ ] Users can create sibling accounts for existing expense accounts
- [ ] Sibling accounts are named with "-01", "-02" suffix pattern
- [ ] Sibling accounts appear next to parent accounts in listings
- [ ] Payment forms include date picker defaulting to today
- [ ] Historical dates are accepted and stored correctly
- [ ] Sibling accounts have distinct visual indicators (color coding)
- [ ] Merge operation requires zero balance validation
- [ ] Merge operation requires multi-step user confirmations
- [ ] Merged sibling accounts are permanently deleted
- [ ] All transactions maintain chronological order after merge

### Permission Requirements:
- [ ] New permissions: create sibling accounts, enter historical data, merge accounts
- [ ] Admin users bypass all permission checks
- [ ] Permission enforcement in UI and API layers
- [ ] Clear permission error messages

### Technical Requirements:
- [ ] Database schema changes use Prisma migrations only
- [ ] No direct database manipulations or db push commands
- [ ] All date handling follows global app settings
- [ ] Custom hooks used instead of browser dialogs
- [ ] Comprehensive error handling and rollback capabilities
- [ ] Migration testing on development before production



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



**Acceptance Criteria:**

---

## 📐 Technical Specifications

<!-- Add technical details, architecture notes, or design patterns -->
1. All database schema changes must use migrations, we have database in production
2. no db push commands or direct database manipulations all database changes require a migration.
3. When new permissions are required the admin does not need explicit permissions on any module or functionality, admin has access period.
4. Do not use default browser alerts etc use custom hooks already in code base
5. Where dates are used they format must be the one setup in app global defaults refer to other code implementation and follow suit.

### Database Schema Changes:
- **New Fields:** `parentAccountId`, `siblingNumber`, `isSibling`, `canMerge`
- **New Indexes:** For efficient sibling account queries
- **Migration Required:** All schema changes must use Prisma migrations (no db push)
- **Production Safety:** Migration-based changes ensure safe production deployment

### API Architecture:
- **New Endpoints:** 4 new API routes for sibling management
- **Modified Endpoints:** Payment creation with historical dates
- **Permission Checks:** Admin users bypass all permission checks
- **Transaction Safety:** Rollback capability for failed merge operations

### UI Component Requirements:
- **Date Handling:** Global settings-compliant date formatting using `DateInput` component
- **Confirmations:** Multi-step confirmation workflow using `useConfirm` hook
- **Alerts:** Success/error messages using `useAlert` hook and toast notifications
- **Visual Indicators:** Color coding and badges for sibling account identification

### Permission Architecture:
- **New Permissions:** 3 new granular permissions (create, historical data entry, merge)
- **Admin Bypass:** Admin users have access to all functionality without explicit permissions
- **Role Validation:** Clear permission enforcement with appropriate error messages

### Testing Requirements:
- **Unit Tests:** Sibling account utilities, merge validation, permission checks
- **Integration Tests:** Full workflow testing, API functionality, database integrity
- **E2E Tests:** User journey validation, permission enforcement, error handling

**Technologies:** Next.js, Prisma, PostgreSQL, TypeScript, Tailwind CSS

**Dependencies:** Existing expense account module dependencies plus new sibling-specific utilities

**Data Models:** Extended ExpenseAccounts model with sibling relationship fields

**Integration Points:** Expense account payments, deposits, and reporting systems

---

## 🧪 Testing Requirements

<!-- Define test coverage expectations -->

**Unit Tests:**
- Sibling account creation logic and validation
- Merge validation (zero balance requirement)
- Permission enforcement and admin bypass logic
- Date handling utilities and global format compliance
- Sibling account naming convention (-01, -02 pattern)

**Integration Tests:**
- Full sibling account workflow (create → populate with historical data → merge)
- API endpoint functionality and error handling
- Database relationship integrity and foreign key constraints
- Transaction rollback capability for failed operations

**E2E Tests:**
- User journey: Create sibling → Enter historical data → Merge workflow
- Permission validation across different user roles (including admin)
- Error handling and edge cases (insufficient permissions, invalid dates)
- Visual indicators and UI state management

### Manual Testing Checklist
- [ ] Sibling account creation with proper naming convention
- [ ] Historical date entry with date picker and global formatting
- [ ] Visual indicators for sibling accounts (color coding, badges)
- [ ] Merge workflow with multi-step confirmations
- [ ] Permission enforcement for different user roles
- [ ] Data integrity after merge (chronological ordering)
- [ ] Rollback scenarios and error recovery

---

## 📝 Session Notes

<!-- Add any additional notes, constraints, or context here -->

### Critical Safety Requirements:
- **Zero Balance Validation:** Sibling accounts must have zero balance before merge
- **Irreversible Operations:** Merge operations cannot be undone - require explicit warnings
- **Multi-step Confirmations:** Use `useConfirm` hook for all destructive operations
- **Transaction Safety:** Implement rollback capabilities for failed merge operations

### Risk Mitigation:
- **Migration Safety:** All database changes use migrations, never direct schema manipulation
- **Admin Access:** Admin users bypass permission checks but operations are still logged
- **Data Integrity:** Maintain chronological ordering of all transactions after merge
- **User Experience:** Clear visual indicators prevent confusion between sibling and regular accounts

### Performance Considerations:
- **Database Indexes:** Add appropriate indexes for sibling relationship queries
- **Query Optimization:** Efficient sibling account listing and relationship traversal
- **UI Responsiveness:** Loading states for all async operations involving sibling accounts

### Future Extensibility:
- **Sibling Numbering:** Support for -01, -02, -03... pattern allows unlimited siblings
- **Relationship Flexibility:** Architecture supports potential future features like account splitting
- **Audit Trail:** All sibling operations should be logged for compliance and debugging

---

**SYNC STATUS:** ✅ Requirements synchronized with project plan on 2025-11-29
**Last Updated:** 2025-11-29 - Added detailed technical specifications, API endpoints, UI requirements, acceptance criteria, and testing requirements from project plan analysis