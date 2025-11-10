# ID Template Dual Fields: Format & Pattern

## Overview
The ID format template system now has TWO separate fields to handle different purposes:

1. **`format`** - Display format for UI (uses `#` and `?` placeholders)
2. **`pattern`** - Regex pattern for validation (actual JavaScript regex)

## Why Two Fields?

### Before (Problem)
Previously, only `pattern` field existed and was being used for both display and validation:
- UI tried to show regex (`^\d{2}-\d{6}[A-Z]\d{2}$`) as placeholder - not user-friendly
- Validation used display format (`##-######?##`) - didn't work as regex

### After (Solution)
```
format:  ##-######?##                    (UI display)
pattern: ^\d{2}-\d{6}[A-Z]\d{2}$        (validation)
example: 63-123456A78                    (sample)
```

## Field Purposes

### `format` Field
**Purpose**: Display format for UI input masks and placeholders
**Format**: Uses placeholder characters
**Where Used**: Form inputs, help text, user guidance

**Placeholder Characters:**
- `#` = Any digit (0-9)
- `?` = Any letter (A-Z)
- Other characters = Literal (e.g., `-`, `/`)

**Examples:**
```
Zimbabwe:     ##-######?##        (shows: 63-123456A78)
South Africa: #############       (shows: 8001015009087)
Kenya:        ########            (shows: 12345678)
Zambia:       ######/##/#         (shows: 123456/78/1)
```

### `pattern` Field
**Purpose**: Regex pattern for server-side validation
**Format**: Valid JavaScript regular expression
**Where Used**: API validation (src/app/api/persons/route.ts:139)

**Examples:**
```javascript
Zimbabwe:     ^\d{2}-\d{6}[A-Z]\d{2}$   // 2 digits, dash, 6 digits, letter, 2 digits
South Africa: ^\d{13}$                   // Exactly 13 digits
Kenya:        ^\d{8}$                    // Exactly 8 digits
Zambia:       ^\d{6}/\d{2}/\d$          // 6 digits, slash, 2 digits, slash, 1 digit
```

## Database Schema

```prisma
model IdFormatTemplates {
  id          String      @id @default(uuid())
  name        String
  description String?
  format      String?     // Display format for UI (e.g., ##-######?##)
  pattern     String      // Regex pattern for validation
  example     String
  countryCode String?
  createdAt   DateTime    @default(now())
  isActive    Boolean     @default(true)
  updatedAt   DateTime    @default(now())
  employees   Employees[]
  persons     Persons[]

  @@map("id_format_templates")
}
```

## Seed Data

All ID templates now include both fields:

```javascript
{
  id: 'zw-national-id',
  name: 'Zimbabwe National ID',
  countryCode: 'ZW',
  format: '##-######?##',                      // ← UI display
  pattern: '^\\d{2}-\\d{6}[A-Z]\\d{2}$',     // ← Validation regex
  example: '63-123456A78',
  description: 'Zimbabwe National Identity Card format',
  isActive: true
}
```

## Files Modified

### 1. Schema
**File**: `prisma/schema.prisma`
**Change**: Added `format String?` field to `IdFormatTemplates` model

### 2. Seed Script (Standard Migration Seed)
**File**: `scripts/seed-migration-data.js`
**Change**: Updated all 5 templates with both `format` and `pattern` fields

```javascript
const templates = [
  {
    id: 'zw-national-id',
    format: '##-######?##',
    pattern: '^\\d{2}-\\d{6}[A-Z]\\d{2}$',
    // ...
  },
  // ... 4 more templates
]
```

**This is now part of standard seeding** - runs automatically:
- After `prisma migrate deploy`
- During `npm run seed`
- In fresh deployments

### 3. Database Update Script
**File**: `scripts/fix-id-patterns.js`
**Purpose**: One-time fix for existing databases
**Change**: Updates both `format` and `pattern` fields

### 4. Test Scripts
**Files Created:**
- `scripts/check-id-template.js` - Tests pattern validation
- `scripts/test-id-template-fields.js` - Verifies both fields exist

## How It Works

### UI Usage (Future Implementation)
```tsx
// Example: Using format for input mask
const template = await prisma.idFormatTemplates.findUnique({
  where: { id: 'zw-national-id' }
})

<Input
  placeholder={template.format}  // Shows: ##-######?##
  pattern={template.pattern}     // HTML5 validation
  title={`Format: ${template.example}`}
/>
```

### API Validation (Current)
```typescript
// src/app/api/persons/route.ts:127-146
const template = await prisma.idFormatTemplates.findUnique({
  where: { id: idFormatTemplateId }
})

const regex = new RegExp(template.pattern)  // ← Uses pattern field
if (!regex.test(nationalId)) {
  return NextResponse.json(
    { error: `National ID format is invalid. Expected format: ${template.example}` },
    { status: 400 }
  )
}
```

## All Templates

### Zimbabwe National ID
```
Format:  ##-######?##
Pattern: ^\d{2}-\d{6}[A-Z]\d{2}$
Example: 63-123456A78
```

### South Africa ID Number
```
Format:  #############
Pattern: ^\d{13}$
Example: 8001015009087
```

### Botswana Omang
```
Format:  #########
Pattern: ^\d{9}$
Example: 123456789
```

### Kenya National ID
```
Format:  ########
Pattern: ^\d{8}$
Example: 12345678
```

### Zambia NRC
```
Format:  ######/##/#
Pattern: ^\d{6}/\d{2}/\d$
Example: 123456/78/1
```

## Migration Path

### For Existing Databases
Run the fix script:
```bash
node scripts/fix-id-patterns.js
```

This will:
1. Add `format` field values
2. Update `pattern` field with correct regex
3. Verify all templates validate correctly

### For Fresh Installs
No action needed! The seed script (`scripts/seed-migration-data.js`) now includes both fields automatically.

### For Production Deployments
The fix is already part of:
1. Schema (`prisma/schema.prisma`)
2. Standard seed script (`scripts/seed-migration-data.js`)
3. Will run automatically on `npm run seed`

## Verification

### Test Both Fields Exist
```bash
node scripts/test-id-template-fields.js
```

Expected output:
```
Zimbabwe National ID Template:
  Format (for UI):    ##-######?##
  Pattern (for regex): ^\d{2}-\d{6}[A-Z]\d{2}$
  Example:            63-123456A78

✅ Both fields are present and correct!
```

### Test Validation Works
```bash
node scripts/check-id-template.js
```

Expected output:
```
Testing ID: "63-123456A78"
  Regex: /^\d{2}-\d{6}[A-Z]\d{2}$/
  Result: ✅ PASS
```

## Benefits

1. **✅ Clear Separation of Concerns**
   - UI uses `format` for display
   - API uses `pattern` for validation

2. **✅ User-Friendly**
   - Users see `##-######?##` not `^\d{2}-\d{6}[A-Z]\d{2}$`
   - Easier to understand expected format

3. **✅ Developer-Friendly**
   - Clear which field to use for what purpose
   - Self-documenting code

4. **✅ Maintainable**
   - Can update display format without affecting validation
   - Can update validation without affecting UI

5. **✅ Standard in Seeding**
   - Part of automated migration seed
   - Consistent across all environments
   - No manual steps required

## Summary

The dual-field system ensures:
- UI gets user-friendly format placeholders (`##-######?##`)
- API gets proper validation regex (`^\d{2}-\d{6}[A-Z]\d{2}$`)
- Both are maintained in standard seeding
- No more validation failures with correct formats!
