# Migration and Seeding Guide

This document explains the automated migration and seeding system for the Multi-Business Management Platform.

## Overview

The system includes scripts that automatically seed essential reference data and create admin users after database migrations. This ensures that dropdown menus, templates, and admin access are available immediately after deployment.

## Available Scripts

### 1. `npm run seed:migration`
**Purpose**: Seeds essential reference data and creates admin user
**Re-runnable**: Yes (uses upsert operations - safe to run multiple times)
**Usage**: After database resets or fresh installations

```bash
npm run seed:migration
```

**What it seeds:**
- ✅ 5 ID format templates (Zimbabwe, South Africa, Botswana, Kenya, Zambia)
- ✅ 29 Job titles (Construction, Management, Sales, Operations, etc.)
- ✅ 15 Compensation types (Hourly, Salary, Commission, etc.)
- ✅ 28 Benefit types (Insurance, Allowances, Leave, etc.)
- ✅ 1 Admin user (`admin@business.local` / `admin123`)

### 2. `npm run migrate:seed`
**Purpose**: Runs database migrations followed by reference data seeding
**Usage**: Production deployments and development setup

```bash
npm run migrate:seed
```

**Process:**
1. Runs `npx prisma migrate deploy`
2. Generates Prisma client
3. Seeds reference data
4. Reports success/failure

### 3. `npm run post-migration:seed`
**Purpose**: Standalone post-migration seeding (with error handling)
**Usage**: Can be automated in CI/CD pipelines

```bash
npm run post-migration:seed
```

## When to Use Each Script

### After Database Reset
```bash
# Complete migration and seeding
npm run migrate:seed
```

### After Manual Migration
```bash
# Just seed the data
npm run seed:migration
```

### In Production CI/CD
```bash
# Migration with automated seeding
npm run migrate:seed
```

### For Development Setup
```bash
# Full setup after git clone
npm run migrate:seed
```

## Admin User Details

**Default Admin Credentials:**
- Email: `admin@business.local`
- Password: `admin123`
- Role: `admin` (system administrator)

**Permissions:**
- Full access to all business modules
- User management capabilities
- Business creation and management
- System administration features

## Script Features

### ✅ Idempotent (Re-runnable)
- All scripts use `upsert` operations
- Safe to run multiple times without duplicating data
- Won't overwrite existing admin users

### ✅ Error Handling
- Graceful error handling with helpful messages
- Clear feedback on success/failure
- Non-blocking for deployment processes

### ✅ Production Ready
- Designed for automated deployment processes
- Comprehensive logging and status reporting
- Handles schema mismatches gracefully

## Schema Compatibility

The seeding scripts automatically detect which models exist in your schema:

- **✅ Supported**: `IdFormatTemplate`, `JobTitle`, `CompensationType`, `BenefitType`, `User`
- **⚠️ Skipped**: `PhoneFormatTemplate`, `DateFormatTemplate` (if not in schema)

## Troubleshooting

### Seeding Fails
```bash
# Run seeding separately to see detailed errors
npm run seed:migration
```

### Admin Login Issues
```bash
# Create admin user manually
npm run create-admin
```

### Missing Dropdowns
```bash
# Re-run seeding to restore reference data
npm run seed:migration
```

### After Schema Changes
```bash
# Full migration and seeding
npm run migrate:seed
```

## File Locations

- **Main seeding script**: `scripts/seed-migration-data.js`
- **Combined script**: `scripts/migrate-and-seed.js`
- **Post-migration script**: `scripts/post-migration-seed.js`

## Integration with Deployment

### Manual Deployment
```bash
cd /path/to/project
npm run migrate:seed
npm start
```

### Automated Deployment
```yaml
# CI/CD pipeline step
- name: Deploy Database
  run: |
    npm run migrate:seed
    npm start
```

## Summary

This seeding system ensures that:
1. **Database is immediately usable** after migrations
2. **Admin access is always available** for system management
3. **Reference data is consistent** across all environments
4. **Deployment is simplified** with automated seeding
5. **Development setup is fast** with one command

The scripts are designed to be **safe, reliable, and production-ready** for all deployment scenarios.