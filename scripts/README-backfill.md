Backfill Business shortName

Steps to apply schema change, generate client, and backfill existing businesses:

1. Update Prisma schema (already applied in repo). Run a migration locally:

```bash
# create migration and apply to local dev database
npx prisma migrate dev --name add-business-shortname
```

2. Generate Prisma client so TypeScript types include the new field:

```bash
npx prisma generate
```

3. Run the backfill script (requires ts-node installed). This will compute shortName for each business and update the DB.

```bash
npx ts-node --transpile-only scripts/backfill-business-shortname.ts
```

Notes:
- The computeShortName algorithm creates a 1-4 character uppercase label, using an acronym for multi-word names and first 4 letters for single-word names.
- After running the migration and backfill, restart your server/dev process.

If you want me to also add a DB migration file directly in the repo, I can generate one, but applying it to your environment requires running `prisma migrate` against your database which I cannot run for you here.
