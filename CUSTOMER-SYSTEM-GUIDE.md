# Universal Customer Management System

## Overview

The Universal Customer Management System provides a centralized customer database that works across all business divisions (clothing, hardware, grocery, restaurant, etc.) while maintaining division-specific customer data and relationships.

## System Architecture

### Core Models

#### 1. UniversalCustomer
Central customer identity that exists once per unique person or business entity.

**Key Fields:**
- `customerNumber`: Global customer ID (format: `UCST-000001`)
- `type`: INDIVIDUAL, BUSINESS, EMPLOYEE, USER, GOVERNMENT, NGO
- `fullName`: Primary customer name
- `primaryEmail`, `primaryPhone`: Primary contact info
- `nationalId`: Unique identifier for individuals
- `linkedUserId`: Link to User account (if customer has app access)
- `linkedEmployeeId`: Link to Employee record (if customer is an employee)

**Use Cases:**
- Track customer across multiple business divisions
- Prevent duplicate customer records
- Enable 360° customer view
- Link customers to employee and user accounts

#### 2. CustomerDivisionAccount
Business-specific customer account that stores division-level data.

**Key Fields:**
- `divisionCustomerNumber`: Business-specific customer ID (format: `CLO-CUST-000001`)
- `universalCustomerId`: Reference to UniversalCustomer
- `businessId`: Which business division this account belongs to
- `creditLimit`, `currentBalance`: Financial data per division
- `loyaltyPoints`, `loyaltyTier`: Loyalty program data per division
- `allowLayby`, `allowCredit`: Division-specific payment permissions
- `preferences`, `customFields`: Business-specific customer data

**Use Cases:**
- Store clothing-specific preferences (sizes, styles)
- Track restaurant-specific data (dietary restrictions, favorite tables)
- Manage hardware customer credit limits
- Handle grocery store loyalty programs

### Relationships

```
UniversalCustomer (1) ──→ (many) CustomerDivisionAccount
UniversalCustomer (1) ──→ (0..1) User (app access)
UniversalCustomer (1) ──→ (0..1) Employee (employee link)

CustomerDivisionAccount (1) ──→ (1) Business
CustomerDivisionAccount (1) ──→ (many) BusinessOrder
CustomerDivisionAccount (1) ──→ (many) CustomerLayby
CustomerDivisionAccount (1) ──→ (many) CustomerCredit
```

## API Endpoints

### Customer Management

#### List/Search Customers
```
GET /api/customers?search=john&businessId=xxx&type=INDIVIDUAL&page=1&limit=50
```

**Returns:** Universal customers with their division accounts

#### Get Customer Details
```
GET /api/customers/{customerId}
```

**Returns:** Full customer profile with all division accounts, linked accounts, activity

#### Create Customer
```
POST /api/customers
{
  "type": "INDIVIDUAL",
  "fullName": "John Doe",
  "primaryEmail": "john@example.com",
  "primaryPhone": "+263771234567",
  "businessId": "business-id-here",  // Optional: Create division account immediately
  "allowLayby": true,
  "allowCredit": false
}
```

**Returns:** Created customer with division account (if businessId provided)

#### Update Customer
```
PUT /api/customers/{customerId}
{
  "fullName": "John Updated",
  "primaryPhone": "+263779999999"
}
```

### Division Account Management

#### List Customer's Division Accounts
```
GET /api/customers/{customerId}/division-accounts
```

#### Create Division Account
```
POST /api/customers/{customerId}/division-accounts
{
  "businessId": "business-id",
  "accountType": "RETAIL",
  "allowCredit": true,
  "creditLimit": 5000
}
```

#### Update Division Account
```
PUT /api/customers/{customerId}/division-accounts/{accountId}
{
  "creditLimit": 10000,
  "status": "ACTIVE"
}
```

## Order System Integration

### Dual Customer Support

The system supports **both old and new** customer references during transition:

**Old Way (Legacy):**
```javascript
{
  "customerId": "business-customer-id",  // BusinessCustomer ID
  // ... other order data
}
```

**New Way (Recommended):**
```javascript
{
  "divisionAccountId": "division-account-id",  // CustomerDivisionAccount ID
  // ... other order data
}
```

### Creating Orders with New System

1. Search for customer in universal system
2. Get appropriate CustomerDivisionAccount for the business
3. Use `divisionAccountId` when creating order

```javascript
// 1. Find customer
const customerResponse = await fetch('/api/customers?search=john&businessId=xxx')
const { customers } = await customerResponse.json()
const customer = customers[0]

// 2. Get division account for this business
const divisionAccount = customer.divisionAccounts.find(
  acc => acc.businessId === currentBusinessId
)

// 3. Create order with division account
await fetch('/api/universal/orders', {
  method: 'POST',
  body: JSON.stringify({
    divisionAccountId: divisionAccount.id,  // ← Use this
    businessId: currentBusinessId,
    items: [...],
    // ... other data
  })
})
```

## Migration Strategy

### Phase 1: Parallel Systems (Current)
- ✅ UniversalCustomer + CustomerDivisionAccount exist
- ✅ BusinessCustomer still exists (backward compatibility)
- ✅ Orders can use `customerId` OR `divisionAccountId`
- ✅ APIs support both systems

### Phase 2: Data Migration (When Ready)
Run migration script:
```bash
cd scripts
node migrate-to-universal-customers.js
```

This will:
1. Convert BusinessCustomer → UniversalCustomer + CustomerDivisionAccount
2. Link existing orders to division accounts
3. Preserve all data including orders, loyalty points, etc.

### Phase 3: UI Updates (Business-Specific)
Update business-specific order creation UIs:
- Clothing POS
- Restaurant POS
- Hardware sales
- Grocery checkout

All should use `/api/customers` and `divisionAccountId`

### Phase 4: Deprecation (Future)
- Once all UIs updated, deprecate BusinessCustomer
- Remove `customerId` field from new orders
- Keep old orders for historical data

## Business-Specific Features

### Clothing Store
**Division Account Custom Fields:**
```json
{
  "preferences": {
    "preferredSizes": { "shirt": "L", "pants": "32" },
    "stylePreferences": ["casual", "formal"],
    "favoriteColors": ["blue", "black"]
  },
  "customFields": {
    "lastFitting": "2024-01-15",
    "seamstressNotes": "Prefers slim fit"
  }
}
```

### Restaurant
**Division Account Custom Fields:**
```json
{
  "preferences": {
    "dietaryRestrictions": ["vegetarian"],
    "allergies": ["nuts", "shellfish"],
    "favoriteTable": "table-12",
    "spiceLevel": "medium"
  },
  "customFields": {
    "reservationHistory": 45,
    "averageSpend": 85.50
  }
}
```

### Hardware Store
**Division Account Custom Fields:**
```json
{
  "preferences": {
    "projectTypes": ["plumbing", "electrical"],
    "contractorType": "professional",
    "preferredBrands": ["DeWalt", "Makita"]
  },
  "customFields": {
    "businessLicense": "HW-12345",
    "bulkDiscountTier": "gold"
  }
}
```

## Permissions

### Required Permissions
- `canAccessCustomers`: View customer list and details
- `canManageCustomers`: Create, edit customers
- `canCreateCustomers`: Create new customers
- `canEditCustomers`: Update customer info
- `canDeleteCustomers`: Deactivate customers
- `canManageDivisionAccounts`: Manage business-specific accounts
- `canManageLaybys`: Handle payment plans
- `canManageCredit`: Manage credit accounts
- `canLinkCustomerAccounts`: Link to user/employee accounts

### Permission Presets
- **Business Owner**: Full customer management
- **Business Manager**: Manage except deletion
- **Employee**: View only
- **System Admin**: Full access across all businesses

## UI Components

### Global Customer Management
**Route:** `/customers`

**Features:**
- Search across all customers
- Filter by type, business
- View 360° customer profile
- Manage division accounts
- View activity across all businesses

### Customer Creation Flow
1. Check for duplicates (email, phone, national ID)
2. Create UniversalCustomer
3. Optionally create CustomerDivisionAccount for specific business
4. Set permissions (layby, credit)

### Customer Detail View
**Tabs:**
- **Overview**: Personal info, contact, linked accounts
- **Division Accounts**: All business-specific accounts
- **Activity**: Orders, laybys, credit across all businesses

## Best Practices

### When to Create Universal Customer
- **Always** check for existing customer first (email, phone, national ID)
- Avoid duplicate customers across businesses
- Link to employee/user accounts when applicable

### When to Create Division Account
- Customer makes first purchase at a business
- Customer explicitly requests account at a business
- Batch import from business-specific data

### Custom Fields Strategy
- Store **business-agnostic** data in UniversalCustomer
- Store **business-specific** data in CustomerDivisionAccount.customFields
- Use structured JSON for complex preferences

### Performance Considerations
- Index on `primaryEmail`, `primaryPhone`, `nationalId`
- Paginate customer lists (default 50 per page)
- Use `includeItems: false` for order lists when not needed

## Troubleshooting

### Customer Not Found in Business
**Issue:** Customer exists but doesn't show up in specific business

**Solution:** Check if CustomerDivisionAccount exists for that business
```javascript
const divisionAccount = await prisma.customerDivisionAccount.findFirst({
  where: {
    universalCustomerId: customerId,
    businessId: businessId
  }
})

if (!divisionAccount) {
  // Create division account
  await prisma.customerDivisionAccount.create({
    data: {
      universalCustomerId: customerId,
      businessId: businessId,
      divisionCustomerNumber: generateDivisionNumber(business),
      // ... other fields
    }
  })
}
```

### Order Creation Fails
**Issue:** Order references customerId that doesn't exist

**Solution:** Use `divisionAccountId` instead
```javascript
// ❌ Old way (may fail)
{ customerId: "old-business-customer-id" }

// ✅ New way (recommended)
{ divisionAccountId: "division-account-id" }
```

### Duplicate Customers
**Issue:** Same person exists as multiple UniversalCustomers

**Solution:** Use merge script (coming soon) or manually consolidate:
1. Choose primary customer record
2. Move division accounts to primary
3. Update order references
4. Soft delete duplicate

## Future Enhancements

### Planned Features
- **Customer Merge Tool**: Consolidate duplicate customers
- **Customer Communication History**: Track all interactions
- **Customer Segmentation**: Advanced filtering and grouping
- **Customer Import/Export**: Bulk operations
- **Customer Portal**: Self-service customer accounts
- **Cross-Business Loyalty**: Unified loyalty program

### API Additions
- `POST /api/customers/merge`: Merge duplicate customers
- `GET /api/customers/{id}/timeline`: Full activity timeline
- `POST /api/customers/import`: Bulk import
- `GET /api/customers/segments`: Customer segmentation

## Support

For questions or issues with the customer management system:
1. Check this documentation
2. Review API endpoint documentation
3. Consult schema.prisma for data structure
4. Review migration scripts in `/scripts` folder
