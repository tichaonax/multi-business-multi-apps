# Fresh Install Process

This document explains how the system handles fresh installations without manual intervention.

## Database Setup

### 1. Schema Migration
All schema changes are managed through Prisma migrations in `prisma/migrations/`.

**Recent Changes (Migration: `20251121000000_vehicle_driver_enhancements`):**
- Added `licenseCountryOfIssuance` (required) to VehicleDrivers
- Made `licenseExpiry` optional (some licenses don't expire)
- Added `driverLicenseTemplateId` for license format templates
- Added new ExpenseType enum values: FOOD, TIRE, OIL
- Relaxed VIN validation (now 5+ characters instead of exactly 17)

**To apply migrations on fresh install:**
```bash
npx prisma migrate deploy
```

This will:
- Create all tables and enums
- Apply all migrations in order
- Set up foreign key relationships
- Configure indexes

### 2. Reference Data Seeding
After migration, reference data is seeded automatically.

**To seed reference data:**
```bash
node scripts/production-setup.js
```

This automatically seeds:
- **ID Format Templates** (National IDs for various countries)
- **Phone Number Templates** (with country codes and formats)
- **Date Format Templates** (regional date formats)
- **Driver License Templates** (including ZW, ZA, BW, US formats)
- **Job Titles** (CEO, Manager, Driver, etc.)
- **Compensation Types** (Hourly, Monthly, Commission, etc.)
- **Benefit Types** (Health Insurance, Leave, Allowances, etc.)
- **Business Categories** (for different business types)
- **Emoji Lookups** (for UI display)

### 3. Default Values

**VehicleDrivers Table:**
- `licenseCountryOfIssuance`: Defaults to 'ZW' (Zimbabwe) for existing records
- `licenseExpiry`: NULL is allowed (for non-expiring licenses)
- `driverLicenseTemplateId`: NULL is allowed (optional format template)

**ExpenseType Enum:**
- FUEL, TOLL, PARKING, FOOD, MAINTENANCE, TIRE, OIL, INSURANCE, OTHER

## Fresh Install Steps

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd multi-business-multi-apps
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Setup Database**
   ```bash
   # Create database (if needed)
   createdb multi_business_db

   # Run all migrations
   npx prisma migrate deploy

   # Seed reference data
   node scripts/production-setup.js
   ```

5. **Generate Prisma Client**
   ```bash
   npx prisma generate
   ```

6. **Start Application**
   ```bash
   npm run build
   npm start
   ```

## Development vs Production

**Development:**
- Use `npx prisma migrate dev` to create and apply migrations
- Use `npx prisma db push` for quick schema iterations (WARNING: doesn't create migration files!)

**Production:**
- Always use `npx prisma migrate deploy` to apply migrations
- Never use `db push` in production
- All schema changes must have corresponding migration files

## Validation

After fresh install, validate the setup:
```bash
node scripts/validate-setup.js
```

This checks:
- Database connection
- All tables exist
- Reference data is seeded
- Required enums have all values

## No Manual Intervention Required

✅ All schema changes are in migration files
✅ All reference data is seeded automatically
✅ Default values are set in migrations
✅ Foreign keys are created automatically
✅ Enum values are added automatically

The system is fully automated for fresh installations!
