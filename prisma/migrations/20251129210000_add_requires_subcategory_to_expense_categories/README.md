# Add requiresSubcategory column to expense_categories

This migration adds the missing `requiresSubcategory` column to the `expense_categories` table, required by the Prisma schema and seed scripts.

**Created:** 2025-11-29

## SQL Changes
```sql
ALTER TABLE "expense_categories" ADD COLUMN "requiresSubcategory" BOOLEAN NOT NULL DEFAULT false;
```

## Why?
- Fixes production and fresh install errors when seeding expense categories.
- Ensures database matches Prisma schema.

## How to apply
Run:
```bash
npx prisma migrate deploy
```

Then rerun your seed script:
```bash
npx tsx src/lib/seed-data/expense-categories-seed.ts
```
