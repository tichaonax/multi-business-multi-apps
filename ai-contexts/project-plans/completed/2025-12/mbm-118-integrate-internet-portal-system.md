# Feature Development Session Template

> **Template Type:** Feature Development
> **Version:** 1.0
> **Last Updated:** December 9, 2025

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
The proposed system introduces a Web Portal Integration Management Module designed to integrate seamlessly with an existing internet portal system. Its primary purpose is to enable creation, management, and sale of custom access tokens while handling related accounting and reporting operations.


**Ticket:** mbm-118

**Feature Name:** Integrate Internet Portal System

**Feature Description:**
<!-- Describe the internet portal system integration - what it does, how users interact with it, business value -->
Web Portal Integration Management System — Overview

Core Features
Role-Based Permissions

Integration Setup Permission: Allows configuration of system-level integration with the portal API.

Token Configuration Permission: Enables creation and management of preconfigured tokens, including defining pricing tiers and allocation limits.

Token Sales Permission: Grants the ability to request, sell, and manage tokens through the user interface (UI).

Expense Account Integration

During initial setup, an expense account is automatically created.

This account tracks all income generated from direct token sales within the system.

Token Lifecycle Management

Upon successful payment, the system initiates a token request via the API.

A receipt is generated containing the token, its associated data limits, and related metadata.

Tokens can be printed only after successful payment.

The system maintains a comprehensive ledger of all tokens issued and their associated data usage.

Tokens can be voided via a dedicated API call, accessible through the UI.

Tokens can also be reset, by this a user who does not want to be purchase a new token can request a previous issued token to be extended that way they continue to use the same token. A token can be extended if it is still on the token server otherwise a new token will need to be issued.

Data Synchronization & Usage Tracking

The UI can query the API to retrieve data usage statistics per token.

Retrieved data automatically updates the internal records and display tables.

Restaurant Menu Integration

Admins can create “Wi-Fi Menu Items” that appear alongside regular restaurant products.

When such an item is purchased, the system automatically requests a corresponding token upon payment.

The receipt includes token details appended at the bottom for customer reference.

Token Sales Module

Dedicated section within the module for direct token sales and receipt printing.

Proceeds from token sales are recorded in the token expense account.

Reporting & Access Control

Built-in reporting tools provide insights into token sales, usage, and revenues.

The module appears in the system sidebar menu only for users with the appropriate permissions.


**Target Module/Component:**
- WiFi Portal Module (new standalone admin module)
- Restaurant POS System (integration with custom pricing)
- Grocery POS System (integration with custom pricing)
- Business Settings (business-level configuration for restaurants & groceries)
- Admin Business Management (enable/disable tokens in POS per business)
- Expense Account System (automatic WiFi revenue tracking)

**API Endpoints (if applicable):**
**WiFi Portal Admin APIs:**
- `/api/wifi-portal/integration` - Setup/manage portal integration
- `/api/wifi-portal/token-configs` - Global token configurations (admin)
- `/api/wifi-portal/tokens` - Create/manage/sync tokens
- `/api/wifi-portal/sales` - Record token sales
- `/api/wifi-portal/stats` - Analytics and reporting

**Business-Specific APIs (Restaurants & Groceries):**
- `/api/business/[businessId]/wifi-tokens` - Manage business's token menu (add/remove tokens with custom pricing)

**UI/UX Requirements:**
<!-- Describe the user interface components, screens, or interactions -->

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


**Acceptance Criteria:**
1. **Portal Integration:**
   - [ ] Admin can setup portal integration with ESP32 API
   - [ ] System validates API key and creates WiFi expense account automatically
   - [ ] Portal connection status is displayed

2. **Global Token Configuration (Admin):**
   - [ ] Admin can create token packages with base price (e.g., 2hr/$5, 4hr/$10)
   - [ ] Token packages include: name, duration, bandwidth limits, base price
   - [ ] Token packages are available to all restaurant businesses

3. **Restaurant & Grocery Business Settings:**
   - [ ] Restaurant and grocery businesses have "Show Tokens in POS" toggle in business settings
   - [ ] Flag only appears for restaurant and grocery business types
   - [ ] Toggling flag controls visibility of WiFi tokens in that business's POS

4. **Business Token Menu Management (Restaurants & Groceries):**
   - [ ] Restaurant managers can view all global token configurations
   - [ ] Grocery managers can view all global token configurations
   - [ ] Each business can add tokens to their menu with custom prices
   - [ ] Same token can have different prices at different businesses (Restaurant: $7, Grocery: $4)
   - [ ] Each business can choose selective offering (only some tokens, not all)
   - [ ] Changes saved to BusinessTokenMenuItems table

5. **POS Integration (Restaurants & Groceries):**
   - [ ] Restaurant POS loads only tokens enabled for that specific restaurant
   - [ ] Grocery POS loads only tokens enabled for that specific grocery business
   - [ ] WiFi tokens appear as menu category in restaurant POS
   - [ ] WiFi tokens appear in product grid in grocery POS
   - [ ] Tokens display business-specific price (not base price)
   - [ ] Adding token to cart works like regular menu items/products
   - [ ] On payment completion, token is automatically created via ESP32 API

6. **Token Generation & Receipt:**
   - [ ] Token created successfully on ESP32 portal
   - [ ] Token details saved to database with business linkage (restaurant or grocery)
   - [ ] Sale recorded at business-specific price
   - [ ] Revenue deposited to WiFi expense account
   - [ ] Receipt includes: token code, duration, bandwidth, instructions, business-specific price

7. **Token Management:**
   - [ ] Tokens can be extended (reset usage)
   - [ ] Tokens can be disabled (revoke access)
   - [ ] Token usage syncs from ESP32 portal to database

8. **Reporting:**
   - [ ] Reports show sales revenue per business (restaurants & groceries)
   - [ ] Reports show tokens sold by package type
   - [ ] Reports show active vs expired tokens
   - [ ] Reports include bandwidth usage statistics

9. **Business Type Validation:**
   - [ ] Only restaurant and grocery businesses can enable "Show Tokens in POS"
   - [ ] Hardware and clothing businesses cannot access WiFi token features
   - [ ] Validation enforced at API and UI levels

10. **No Regressions:**
    - [ ] Existing POS functionality unchanged for businesses without tokens enabled
    - [ ] Regular menu items/products work as before
    - [ ] Receipt printing works for non-WiFi items

---

## 📐 Technical Specifications

<!-- Add technical details, architecture notes, or design patterns -->

**Technologies:**
- Next.js (App Router)
- Prisma ORM
- PostgreSQL
- TypeScript
- React (client components for forms and POS)
- ESP32 Portal API (external HTTP REST API)

**Dependencies:**
- ESP32 WiFi Portal Server (external hardware/software)
- Existing expense account system
- Existing receipt printing system
- Existing restaurant POS system
- Existing grocery POS system
- Permission/role system
- Business membership/role system

**Data Models:**

1. **PortalIntegrations** (One per business)
   - id (UUID, primary key)
   - businessId (foreign key to Businesses, unique)
   - apiKey (ESP32 API authentication key)
   - portalIpAddress (IP address of ESP32 portal server)
   - portalPort (Port number for ESP32 API)
   - isActive (boolean, portal enabled/disabled)
   - showTokensInPOS (boolean, controls POS visibility for restaurants & groceries)
   - createdAt, updatedAt (timestamps)
   - createdBy (foreign key to Users)
   - **Relations:** Business (one-to-one), User (creator)
   - **Note:** Only one integration per business

2. **TokenConfigurations** (Global admin-level configs)
   - id (UUID, primary key)
   - name (e.g., "2 Hour WiFi")
   - description (optional description)
   - durationMinutes (token validity duration, e.g., 120)
   - bandwidthDownMb (download bandwidth limit, e.g., 500)
   - bandwidthUpMb (upload bandwidth limit, e.g., 100)
   - basePrice (decimal, default admin price, e.g., $5.00)
   - isActive (boolean, config enabled/disabled)
   - displayOrder (integer, UI sort order)
   - createdAt, updatedAt (timestamps)
   - **Relations:** BusinessTokenMenuItems (one-to-many)
   - **Note:** Available to all restaurant and grocery businesses

3. **BusinessTokenMenuItems** (KEY MODEL - per-business token menu)
   - id (UUID, primary key)
   - businessId (foreign key to Businesses - restaurant or grocery)
   - tokenConfigId (foreign key to TokenConfigurations)
   - businessPrice (decimal, custom price for this business, can differ from basePrice)
   - isActive (boolean, token enabled in this business's menu)
   - displayOrder (integer, UI sort order for this business)
   - createdAt, updatedAt (timestamps)
   - **Unique Constraint:** [businessId, tokenConfigId]
   - **Relations:** Business, TokenConfiguration
   - **Purpose:** Maps global tokens to specific business menus with custom pricing
   - **Examples:**
     - Restaurant A: 2hr token at $7 (markup)
     - Grocery A: 2hr token at $4 (promotion)
     - Restaurant B: 2hr token at $6 (moderate markup)

4. **WifiTokens** (Token ledger - all issued tokens)
   - id (UUID, primary key)
   - businessId (foreign key to Businesses - which business sold it)
   - tokenConfigId (foreign key to TokenConfigurations)
   - businessTokenMenuItemId (foreign key to BusinessTokenMenuItems - null if direct sale)
   - token (string, 8-character alphanumeric code from ESP32, unique)
   - status (enum: 'active', 'expired', 'disabled')
   - createdAt (timestamp, token creation time)
   - firstUsedAt (timestamp, nullable, first connection time)
   - expiresAt (timestamp, token expiration time)
   - bandwidthUsedDown (decimal, MB downloaded)
   - bandwidthUsedUp (decimal, MB uploaded)
   - usageCount (integer, number of connections)
   - lastSyncedAt (timestamp, last sync from ESP32)
   - **Relations:** Business, TokenConfiguration, BusinessTokenMenuItem
   - **Purpose:** Complete audit trail of all tokens

5. **WifiTokenSales** (Sales transactions)
   - id (UUID, primary key)
   - businessId (foreign key to Businesses - restaurant or grocery)
   - wifiTokenId (foreign key to WifiTokens)
   - expenseAccountId (foreign key to ExpenseAccounts - WiFi revenue account)
   - saleAmount (decimal, actual sale price - business-specific)
   - paymentMethod (enum: 'CASH', 'CARD', 'MOBILE')
   - soldAt (timestamp, sale time)
   - soldBy (foreign key to Users)
   - receiptPrinted (boolean, receipt printed status)
   - **Relations:** Business, WifiToken, ExpenseAccount, User
   - **Purpose:** Track all token sales and revenue

**Integration Points:**
1. **Expense Account System:**
   - Automatic creation of WiFi revenue expense account on portal setup
   - Sales deposited automatically to WiFi expense account
   - Tracks revenue per business (restaurant or grocery)

2. **Receipt Printing System:**
   - Extended to include WiFi token details
   - Token code, duration, bandwidth, connection instructions
   - Business-specific price displayed (not base price)

3. **Restaurant POS System:**
   - Dynamic loading of WiFi tokens for current restaurant
   - Tokens displayed as menu category "WiFi Access"
   - Cart integration (add to cart like menu items)
   - Payment triggers token generation via ESP32 API

4. **Grocery POS System:**
   - Dynamic loading of WiFi tokens for current grocery business
   - Tokens displayed in product grid alongside groceries
   - Cart integration (add to cart like products)
   - Payment triggers token generation via ESP32 API

5. **Permission System:**
   - New permissions: canSetupPortalIntegration, canConfigureWifiTokens, canSellWifiTokens, canViewWifiReports
   - Business-specific permission: canManageBusinessWifiMenu
   - Role-based access control for WiFi portal features

6. **Business Settings:**
   - showTokensInPOS flag per business
   - Only visible for restaurant and grocery business types
   - Controls POS visibility of WiFi tokens

**ESP32 Portal API Documentation:**
Please refer to this document for complete API definitions
C:\Users\ticha\apps\multi-business-multi-apps\ai-contexts\wip\ESP32 Portal Token API Documentation.md
---

## 📐 Business Token Menu Architecture

### Global Token Configurations (Admin Level)
Admins create token packages in the WiFi Portal module that define:
- **Name:** e.g., "2 Hour WiFi", "4 Hour WiFi", "Full Day WiFi"
- **Duration:** e.g., 120 minutes, 240 minutes, 1440 minutes
- **Bandwidth Limits:** Download/Upload speeds (e.g., 500MB down, 100MB up)
- **Base Price:** Default admin price (e.g., $5.00)

These configurations are **global** and available to all restaurant and grocery businesses.

### Business-Specific Token Menu (Per Restaurant or Grocery)
Each restaurant or grocery business can:
1. **Select which tokens to offer** (selective offering)
2. **Set custom prices** (can differ from base price)
3. **Enable/disable tokens** for their specific menu
4. **Control display order** in their POS

**Examples:**
- 🍕 **Restaurant A:** Offers 2hr ($7 markup) and 4hr ($12 markup) tokens
- 🛒 **Grocery Store A:** Offers only 2hr token at $4 (promotional discount)
- 🍕 **Restaurant B:** Offers 2hr ($6), 4hr ($10), Full Day ($20)
- 🛒 **Grocery Store B:** Offers 2hr ($3 aggressive discount) and Full Day ($15)

### POS Integration Flow

**Restaurant POS (Example: Restaurant A):**
1. Staff opens POS for Restaurant A
2. System queries: `SELECT * FROM business_token_menu_items WHERE businessId = 'Restaurant A' AND isActive = true`
3. POS displays tokens as menu category "WiFi Access" with business-specific prices
4. Staff adds "2hr WiFi - $7.00" to cart
5. Customer pays → System calls ESP32 API to create token
6. System records sale at $7, deposits to WiFi expense account
7. Receipt prints: "WiFi Access - 2hr - $7.00" + token code + instructions

**Grocery POS (Example: Grocery Store A):**
1. Cashier opens POS for Grocery Store A
2. System queries: `SELECT * FROM business_token_menu_items WHERE businessId = 'Grocery A' AND isActive = true`
3. POS displays tokens in product grid alongside groceries with business-specific prices
4. Customer adds "2hr WiFi - $6.00" to cart
5. Customer pays → System calls ESP32 API to create token
6. System records sale at $6, deposits to WiFi expense account
7. Receipt prints: "WiFi Access - 2hr - $6.00" + token code + instructions

### Pricing Logic
- **Base Price:** Set by admin in TokenConfigurations (e.g., $5)
- **Business Price:** Customized per business in BusinessTokenMenuItems (e.g., $7 or $4)
- **Display Price:** POS always shows business-specific price
- **Sale Price:** Recorded as business-specific price in WifiTokenSales
- **Use Cases:**
  - **Markups:** High-end restaurant charges $8 for $5 base token
  - **Promotions:** Grocery store discounts to $3 for customer loyalty
  - **Break-even:** Business sells at base price $5 (no markup/discount)

### Business Type Restrictions
- **Allowed:** Restaurant, Grocery
- **Blocked:** Hardware, Clothing, Construction, etc.
- **Validation:** Enforced at API level and UI level
- **Error Handling:** 403 Forbidden for unauthorized business types

---

## 🧪 Testing Requirements

**Unit Tests:**
- ESP32 API client methods (mock API responses)
- Token validation utilities (format, expiration checks)
- Permission checks for WiFi portal features
- Business type validation (restaurant/grocery allowed, hardware/clothing blocked)
- Price calculation logic (base price vs business price)

**Integration Tests:**
- Portal integration setup flow (API key validation, expense account creation)
- Token creation and sales recording (atomic transactions)
- Expense account deposit automation (revenue tracking)
- Usage sync from ESP32 portal to database
- Business token menu CRUD operations
- POS cart integration (add token, calculate price, payment flow)

**E2E Tests:**
1. **Setup Flow:**
   - Admin sets up portal integration
   - System validates ESP32 API key
   - WiFi expense account created automatically
   - Portal connection status displayed

2. **Token Configuration (Admin):**
   - Admin creates token package: "2hr WiFi - Base $5"
   - Token visible to all restaurant and grocery businesses

3. **Direct Sale (WiFi Portal Module):**
   - Staff sells token directly from WiFi portal
   - Receipt printed with token code
   - Token verified in ledger

4. **Restaurant Menu Setup:**
   - Admin enables "Show Tokens in POS" for Restaurant A
   - Restaurant A manager navigates to `/restaurant/wifi-tokens`
   - Adds 2hr token to menu at custom price $7 (markup)
   - Restaurant B manager adds same token at $4 (promotion)
   - Changes saved to BusinessTokenMenuItems table

5. **Grocery Menu Setup:**
   - Admin enables "Show Tokens in POS" for Grocery Store A
   - Grocery A manager navigates to `/grocery/wifi-tokens`
   - Adds 2hr token to menu at custom price $6
   - Grocery B manager adds same token at $3 (discount)

6. **Restaurant POS Sale:**
   - Staff opens POS for Restaurant A
   - WiFi tokens appear as "WiFi Access" category
   - Staff adds "2hr WiFi - $7" to cart
   - Customer pays $7
   - Token created via ESP32 API
   - Receipt shows: token code, duration, bandwidth, instructions, $7
   - Revenue deposited to WiFi expense account

7. **Grocery POS Sale:**
   - Cashier opens POS for Grocery Store A
   - WiFi tokens appear in product grid
   - Customer adds "2hr WiFi - $6" to cart
   - Customer pays $6
   - Token created via ESP32 API
   - Receipt shows: token code, duration, bandwidth, instructions, $6

8. **Token Management:**
   - Admin extends token (resets usage counter)
   - Admin disables token (revokes access)
   - System syncs usage data from ESP32 portal

9. **Business Type Validation:**
   - Admin tries to enable tokens for hardware business → BLOCKED
   - Admin tries to enable tokens for clothing business → BLOCKED
   - Only restaurants and groceries can manage WiFi menu
   - API returns 403 Forbidden for invalid business types

10. **Reporting:**
    - Reports show sales revenue per business
    - Reports show tokens sold by package type
    - Reports show active vs expired tokens
    - Reports include bandwidth usage statistics

**Manual Testing with ESP32 Portal:**
- Test with actual ESP32 hardware
- Verify token grants guest WiFi access
- Verify bandwidth limits enforced
- Test offline scenarios (ESP32 unreachable)
- Test concurrent token creation

---

## 📝 Session Notes

### Implementation Phases
The implementation is broken into 8 phases:
1. **Phase 1:** Database Schema & Permissions (8 tasks)
2. **Phase 2:** Portal API Client Library (5 tasks)
3. **Phase 3:** Backend API Endpoints (12 tasks)
4. **Phase 4:** UI - Setup & Configuration (5 tasks)
5. **Phase 5:** UI - Token Sales & POS (5 tasks)
6. **Phase 6:** Restaurant & Grocery Menu Integration (10 tasks)
7. **Phase 7:** Reporting & Analytics (3 tasks)
8. **Phase 8:** Testing & Documentation (6 tasks)

**Total:** 76 tasks across 8 phases

### Risk Assessment
**High Risks:**
1. **External API Dependency (ESP32 Portal):**
   - Risk: Portal unreachable, network failures, API changes
   - Mitigation: Comprehensive error handling, retry queue, graceful degradation

2. **Atomic Transaction Failures:**
   - Risk: Token created on ESP32 but not saved in DB (or vice versa)
   - Mitigation: Database transactions, idempotency keys, reconciliation job

**Medium Risks:**
3. **POS Integration Complexity:**
   - Risk: Breaking existing restaurant/grocery POS flow
   - Mitigation: Thorough testing, feature flags, rollback plan

4. **Permission Confusion:**
   - Risk: Users unsure who can access WiFi portal
   - Mitigation: Clear permission names, default to owner/manager roles

### Rollback Plan
If deployment fails:
1. Drop new database tables (wifi_token_sales, wifi_tokens, business_token_menu_items, token_configurations, portal_integrations)
2. Revert Git commit
3. Remove WiFi permissions from permissions.ts
4. Delete auto-created WiFi expense accounts
5. Verify existing POS functionality unchanged

### Database Conventions
- **Models:** PascalCase (PortalIntegrations, WifiTokens, BusinessTokenMenuItems)
- **Columns:** camelCase (apiKey, bandwidthDownMb, businessPrice)
- **Tables:** snake_case (portal_integrations, wifi_tokens, business_token_menu_items)

### UI/UX Standards
- Use `useConfirm()` hook instead of browser confirm()
- Use `useAlert()` hook instead of browser alert()
- Use `DateInput` component for all date fields
- Toast notifications for success messages
- Loading states for all async operations
- Form validation with inline errors

### ESP32 API Key Details
- Base URL: `http://{portalIpAddress}:{portalPort}`
- Endpoints: `/api/token` (POST), `/api/token/info` (GET), `/api/token/extend` (POST), `/api/token/disable` (POST)
- Auth: API key in form data (`api_key` parameter)
- Token format: 8-character alphanumeric (e.g., "A3K9M7P2")
- Max duration: 43,200 minutes (30 days)
- Max devices per token: 2

### Additional Constraints
- Only one portal integration per business
- Token codes must be unique across entire system
- Business type validation at both API and UI levels
- Receipt printing requires successful token creation
- Usage sync is manual or scheduled (not real-time)

---

## ✅ Start Session

Ready to begin feature development. Please:

1. Review the feature requirements
2. Propose an implementation plan
3. Identify technical challenges or considerations
4. Suggest a testing strategy

---
