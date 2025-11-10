# Prisma Relation Syntax Fix

## Problem
Contractor/person creation was failing with:
```
Unknown argument `idFormatTemplateId`. Available options are marked with ?.
```

Even though:
- ✅ Database column `idFormatTemplateId` exists
- ✅ Prisma schema has the field defined
- ✅ Prisma client was regenerated

## Root Cause

Prisma requires using **relation syntax** instead of **foreign key fields** directly when creating records with relations.

### What We Were Doing (Wrong)
```javascript
await prisma.persons.create({
  data: {
    fullName: "Charles Mumanyi",
    nationalId: "63-123456A78",
    idFormatTemplateId: "zw-national-id",  // ❌ Direct foreign key
    driverLicenseTemplateId: "dl-zw"       // ❌ Direct foreign key
  }
})
```

### What Prisma Expects (Correct)
```javascript
await prisma.persons.create({
  data: {
    fullName: "Charles Mumanyi",
    nationalId: "63-123456A78",
    id_format_templates: {                  // ✅ Relation name
      connect: { id: "zw-national-id" }
    },
    driver_license_templates: {             // ✅ Relation name
      connect: { id: "dl-zw" }
    }
  }
})
```

## Why This Happens

Prisma's schema has TWO ways to reference relations:

### 1. Foreign Key Field (Database)
```prisma
model Persons {
  idFormatTemplateId String?  // Foreign key column in database
  // ...
}
```

### 2. Relation Field (Prisma)
```prisma
model Persons {
  id_format_templates IdFormatTemplates? @relation(fields: [idFormatTemplateId], references: [id])
  // ...
}
```

**In `create()` operations, you MUST use the relation field (#2), not the foreign key field (#1).**

## Solution

Updated `src/app/api/persons/route.ts` to use relation syntax:

### Before (Lines 174-194)
```javascript
const createData: any = {
  fullName,
  email: email || null,
  phone,
  nationalId,
  idFormatTemplateId: idFormatTemplateId || null,           // ❌ Wrong
  driverLicenseNumber: driverLicenseNumber || null,
  driverLicenseTemplateId: driverLicenseTemplateId || null, // ❌ Wrong
  dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
  address: address || null,
  notes: notes || null,
  createdBy: session.user.id,
}

const newPerson = await prisma.persons.create({
  data: createData as any,
  include: {
    id_format_templates: true,
    driver_license_templates: true
  }
})
```

### After (Lines 174-206)
```javascript
const createData: any = {
  fullName,
  email: email || null,
  phone,
  nationalId,
  driverLicenseNumber: driverLicenseNumber || null,
  dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
  address: address || null,
  notes: notes || null,
  createdBy: session.user.id,
}

// Add ID format template relation if provided
if (idFormatTemplateId) {
  createData.id_format_templates = {        // ✅ Relation field
    connect: { id: idFormatTemplateId }     // ✅ Connect syntax
  }
}

// Add driver license template relation if provided
if (driverLicenseTemplateId) {
  createData.driver_license_templates = {   // ✅ Relation field
    connect: { id: driverLicenseTemplateId } // ✅ Connect syntax
  }
}

const newPerson = await prisma.persons.create({
  data: createData as any,
  include: {
    id_format_templates: true,
    driver_license_templates: true
  }
})
```

## Prisma Relation Operations

### Connect (Link to existing record)
```javascript
// Link person to existing template
id_format_templates: {
  connect: { id: "zw-national-id" }
}
```

### Create (Create new related record)
```javascript
// Create new template and link to person
id_format_templates: {
  create: {
    name: "New Template",
    pattern: "...",
    example: "..."
  }
}
```

### Disconnect (Remove link)
```javascript
// Remove connection
id_format_templates: {
  disconnect: true
}
```

## Testing

### Test Request
```json
POST /api/persons
{
  "fullName": "Charles Mumanyi",
  "email": "",
  "phone": "+263 777888887",
  "nationalId": "63-123456A78",
  "idFormatTemplateId": "zw-national-id",
  "notes": "Construction"
}
```

### Expected Response
```json
{
  "id": "...",
  "fullName": "Charles Mumanyi",
  "phone": "+263 777888887",
  "nationalId": "63-123456A78",
  "id_format_templates": {
    "id": "zw-national-id",
    "name": "Zimbabwe National ID",
    "pattern": "^\\d{2}-\\d{6}[A-Z]\\d{2}$",
    "format": "##-######?##",
    "example": "63-123456A78"
  },
  "driver_license_templates": null,
  // ... other fields
}
```

## Key Takeaways

1. **Never use foreign key fields directly in `create()`**
   - Use: `id_format_templates: { connect: { id: "..." } }`
   - Not: `idFormatTemplateId: "..."`

2. **Relation field names are snake_case (table names)**
   - Database table: `id_format_templates`
   - Prisma relation: `id_format_templates`
   - Foreign key: `idFormatTemplateId` (camelCase)

3. **Foreign keys still exist in the database**
   - The database column `idFormatTemplateId` is still there
   - But Prisma manages it through the relation field
   - You don't set it directly in create/update operations

4. **Use `connect` for linking to existing records**
   - `connect: { id: "..." }` - Link by ID
   - `connect: { email: "..." }` - Link by unique field
   - `create: { ... }` - Create new related record

## Related Documentation

- Prisma Relations: https://www.prisma.io/docs/concepts/components/prisma-schema/relations
- Relation Queries: https://www.prisma.io/docs/concepts/components/prisma-client/relation-queries
- Nested Writes: https://www.prisma.io/docs/concepts/components/prisma-client/relation-queries#nested-writes

## Files Modified

- `src/app/api/persons/route.ts` (lines 174-206)

## Result

✅ Contractor creation now works correctly with ID format template linking!
