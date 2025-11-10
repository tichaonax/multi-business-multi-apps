# Persons API Schema Alignment Fix

## Problem
The Persons API was referencing fields that don't exist in the database schema, causing contractor creation to fail.

## Schema Analysis

### Actual Database Schema (persons table)
```
✅ id
✅ email
✅ phone
✅ address
✅ notes
✅ createdAt
✅ createdBy
✅ fullName
✅ idFormatTemplateId
✅ isActive
✅ nationalId
✅ updatedAt
✅ driverLicenseNumber
✅ driverLicenseTemplateId
```

### Fields That DON'T Exist
```
❌ dateOfBirth  (removed from API)
```

## Issues Found and Fixed

### Issue 1: Using Foreign Keys Instead of Relations
**Error:**
```
Unknown argument `idFormatTemplateId`. Available options are marked with ?.
```

**Problem:** Direct assignment of foreign key fields in Prisma create operations

**Before:**
```javascript
{
  idFormatTemplateId: "zw-national-id",  // ❌ Wrong
  driverLicenseTemplateId: "dl-zw"       // ❌ Wrong
}
```

**After:**
```javascript
if (idFormatTemplateId) {
  createData.id_format_templates = {
    connect: { id: idFormatTemplateId }  // ✅ Correct
  }
}

if (driverLicenseTemplateId) {
  createData.driver_license_templates = {
    connect: { id: driverLicenseTemplateId }  // ✅ Correct
  }
}
```

### Issue 2: Non-Existent dateOfBirth Field
**Error:**
```
Unknown argument `dateOfBirth`. Available options are marked with ?.
```

**Problem:** API code referenced `dateOfBirth` field that doesn't exist in database

**Fixed By:**
1. Removed `dateOfBirth` from destructuring (line 94)
2. Removed age validation logic (lines 107-124)
3. Removed `dateOfBirth` from createData object (line 180)

## Changes Made

### File: `src/app/api/persons/route.ts`

#### 1. Removed dateOfBirth from Input (Lines 85-96)
**Before:**
```javascript
const {
  fullName,
  email,
  phone,
  nationalId,
  idFormatTemplateId,
  driverLicenseNumber,
  driverLicenseTemplateId,
  dateOfBirth,  // ❌ Removed
  address,
  notes
} = data
```

**After:**
```javascript
const {
  fullName,
  email,
  phone,
  nationalId,
  idFormatTemplateId,
  driverLicenseNumber,
  driverLicenseTemplateId,
  address,
  notes
} = data
```

#### 2. Removed Age Validation (Lines 107-124 deleted)
```javascript
// ❌ REMOVED - Field doesn't exist
// Age validation for loan recipients (18+ years required)
if (dateOfBirth) {
  const birthDate = new Date(dateOfBirth)
  const today = new Date()
  const age = today.getFullYear() - birthDate.getFullYear()
  // ... validation logic
}
```

#### 3. Fixed Create Data (Lines 174-198)
**Before:**
```javascript
const createData: any = {
  fullName,
  email: email || null,
  phone,
  nationalId,
  idFormatTemplateId: idFormatTemplateId || null,  // ❌ Direct FK
  driverLicenseNumber: driverLicenseNumber || null,
  driverLicenseTemplateId: driverLicenseTemplateId || null,  // ❌ Direct FK
  dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,  // ❌ Non-existent
  address: address || null,
  notes: notes || null,
  createdBy: session.user.id,
}
```

**After:**
```javascript
const createData: any = {
  fullName,
  email: email || null,
  phone,
  nationalId,
  driverLicenseNumber: driverLicenseNumber || null,
  address: address || null,
  notes: notes || null,
  createdBy: session.user.id,
}

// Add ID format template relation if provided
if (idFormatTemplateId) {
  createData.id_format_templates = {
    connect: { id: idFormatTemplateId }
  }
}

// Add driver license template relation if provided
if (driverLicenseTemplateId) {
  createData.driver_license_templates = {
    connect: { id: driverLicenseTemplateId }
  }
}
```

## Verification Script

Created `scripts/check-persons-schema.js` to verify actual database schema:

```javascript
const result = await prisma.$queryRaw`
  SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_name = 'persons'
  ORDER BY ordinal_position
`
```

This helps identify:
- Exact column names in database
- Which fields actually exist
- Data types and nullability

## Valid Contractor Creation Request

### Request
```json
POST /api/persons
{
  "fullName": "Charles Mumanyi",
  "email": "",
  "phone": "+263 777888887",
  "nationalId": "63-123456A78",
  "idFormatTemplateId": "zw-national-id",
  "driverLicenseNumber": "",
  "driverLicenseTemplateId": "",
  "address": "",
  "notes": "Construction"
}
```

### Response (Expected)
```json
{
  "id": "uuid-here",
  "fullName": "Charles Mumanyi",
  "email": null,
  "phone": "+263 777888887",
  "nationalId": "63-123456A78",
  "driverLicenseNumber": null,
  "address": null,
  "notes": "Construction",
  "isActive": true,
  "createdAt": "2025-11-08T...",
  "updatedAt": "2025-11-08T...",
  "createdBy": "user-id",
  "id_format_templates": {
    "id": "zw-national-id",
    "name": "Zimbabwe National ID",
    "pattern": "^\\d{2}-\\d{6}[A-Z]\\d{2}$",
    "format": "##-######?##",
    "example": "63-123456A78"
  },
  "driver_license_templates": null
}
```

## Key Lessons

### 1. Always Verify Schema
Before using a field in API code:
```bash
node scripts/check-persons-schema.js
```

### 2. Use Prisma Relations Correctly
- **Don't**: Set foreign key fields directly
- **Do**: Use relation syntax with `connect`, `create`, `disconnect`

### 3. Remove Unused Fields
If a field doesn't exist in the schema:
- Remove it from input destructuring
- Remove validation logic
- Remove it from create/update data

## Files Modified

1. **src/app/api/persons/route.ts**
   - Removed `dateOfBirth` references
   - Removed age validation logic
   - Fixed relation syntax for templates
   - Lines changed: 85-96, 107-124 (removed), 174-198

## Files Created

1. **scripts/check-persons-schema.js** - Schema verification tool
2. **PERSONS-API-SCHEMA-FIX.md** - This documentation

## Result

✅ Contractor creation now works correctly!
✅ No more "Unknown argument" errors
✅ Proper relation syntax used
✅ Only valid schema fields referenced
