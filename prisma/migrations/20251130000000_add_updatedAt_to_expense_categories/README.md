# Add updatedAt column to expense_categories

This migration adds the `updatedAt` column to the `expense_categories` table to support seed scripts that set this column explicitly.

It sets a NOT NULL default value so existing rows are populated with the current timestamp.

Run:
- `npx prisma migrate deploy` to apply in production
- `npx prisma migrate dev` to apply in development
