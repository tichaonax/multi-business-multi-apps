# ID Validation Fix

## Problem
Contractor/person creation was failing with validation error even when providing the correct national ID format.

**User's Request:**
```json
{
  "fullName": "Charles Mumanyi",
  "phone": "+263 777888887",
  "nationalId": "63-123456A78",
  "idFormatTemplateId": "zw-national-id"
}
```

**Error Response:**
```
400 Bad Request
"National ID format is invalid. Expected format: 63-123456A78"
```

The error message showed the EXACT format the user provided, indicating a bug in the validation logic.

## Root Cause

The ID format templates in the database had **display format patterns** instead of **regex patterns**:

### Before (Broken)
```
Zimbabwe:     ##-######?##
South Africa: ##########?#
Botswana:     #########
Kenya:        ########
Zambia:       ######/##/#
```

These patterns used:
- `#` as placeholder for digits (for UI display)
- `?` as placeholder for letters (for UI display)

**This is NOT valid regex!** The validation code expected actual regex patterns like `^\d{2}-\d{6}[A-Z]\d{2}$`.

### After (Fixed)
```
Zimbabwe:     ^\d{2}-\d{6}[A-Z]\d{2}$
South Africa: ^\d{13}$
Botswana:     ^\d{9}$
Kenya:        ^\d{8}$
Zambia:       ^\d{6}/\d{2}/\d$
```

## Solution

### 1. Fixed Seed Data (`scripts/seed-migration-data.js`)
Updated all ID format templates to use proper regex patterns:

```javascript
{
  id: 'zw-national-id',
  name: 'Zimbabwe National ID',
  countryCode: 'ZW',
  pattern: '^\\d{2}-\\d{6}[A-Z]\\d{2}$',  // ← Fixed
  example: '63-123456A78',
  description: 'Zimbabwe National Identity Card format',
  isActive: true
}
```

### 2. Updated Database (`scripts/fix-id-patterns.js`)
Created and ran script to update existing database records with correct patterns:

```javascript
const templates = [
  { id: 'zw-national-id', pattern: '^\\d{2}-\\d{6}[A-Z]\\d{2}$' },
  { id: 'za-id-number', pattern: '^\\d{13}$' },
  { id: 'bw-omang', pattern: '^\\d{9}$' },
  { id: 'ke-national-id', pattern: '^\\d{8}$' },
  { id: 'zm-nrc', pattern: '^\\d{6}/\\d{2}/\\d$' }
]
```

### 3. Verified Fix (`scripts/check-id-template.js`)
Created diagnostic script to test patterns against examples.

## Regex Pattern Breakdown

### Zimbabwe National ID: `^\d{2}-\d{6}[A-Z]\d{2}$`
Example: `63-123456A78`

- `^` - Start of string
- `\d{2}` - Two digits (63)
- `-` - Literal hyphen
- `\d{6}` - Six digits (123456)
- `[A-Z]` - One uppercase letter (A)
- `\d{2}` - Two digits (78)
- `$` - End of string

### South Africa ID: `^\d{13}$`
Example: `8001015009087`
- 13 consecutive digits

### Botswana Omang: `^\d{9}$`
Example: `123456789`
- 9 consecutive digits

### Kenya National ID: `^\d{8}$`
Example: `12345678`
- 8 consecutive digits

### Zambia NRC: `^\d{6}/\d{2}/\d$`
Example: `123456/78/1`
- 6 digits, slash, 2 digits, slash, 1 digit

## Files Modified

1. **scripts/seed-migration-data.js** - Fixed seed data for future deployments
2. **scripts/fix-id-patterns.js** (created) - One-time fix script for existing data
3. **scripts/check-id-template.js** (created) - Diagnostic tool for testing patterns

## Validation Code

The validation logic in `src/app/api/persons/route.ts` (lines 127-146):

```typescript
if (idFormatTemplateId) {
  const template = await prisma.idFormatTemplates.findUnique({
    where: { id: idFormatTemplateId }
  })

  if (!template) {
    return NextResponse.json(
      { error: 'Invalid ID format template' },
      { status: 400 }
    )
  }

  const regex = new RegExp(template.pattern)  // ← Now uses correct regex
  if (!regex.test(nationalId)) {
    return NextResponse.json(
      { error: `National ID format is invalid. Expected format: ${template.example}` },
      { status: 400 }
    )
  }
}
```

## Testing

### Test Results
```
Testing ID: "63-123456A78"
  Regex: /^\d{2}-\d{6}[A-Z]\d{2}$/
  Result: ✅ PASS

All templates:
  ✅ Zimbabwe - PASS
  ✅ South Africa - PASS
  ✅ Botswana - PASS
  ✅ Kenya - PASS
  ✅ Zambia - PASS
```

### How to Test
```bash
# Test specific pattern
node scripts/check-id-template.js

# Re-run seed (for fresh installs)
node scripts/seed-migration-data.js

# Fix existing database
node scripts/fix-id-patterns.js
```

## Result

✅ **Contractor creation now works correctly**
- Zimbabwe ID `63-123456A78` validates successfully
- All other country ID formats validate correctly
- Error messages show correct expected formats
- Future deployments will have correct patterns from seed data

## Prevention

To prevent this in the future:
1. Seed data now uses correct regex patterns
2. Added diagnostic script to test patterns
3. production-setup.js already had correct patterns (was not the issue)

## Related Code

- API validation: `src/app/api/persons/route.ts:127-146`
- Seed data: `scripts/seed-migration-data.js:53-99`
- Production setup: `scripts/production-setup.js:305-349` (already correct)
