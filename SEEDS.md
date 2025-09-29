# Seeds

This repository provides a set of demo seed scripts and admin API endpoints to create demo data for various business types.

How to run the clothing seed locally

1. Ensure your database is available and Prisma is configured (check `DATABASE_URL` in your environment).
2. Optionally set a demo business id to override the default:

```bash
export NEXT_PUBLIC_DEMO_BUSINESS_ID=clothing-demo-business
```

3. Run the clothing seed script directly (no auth required):

```bash
node scripts/seed-clothing-demo.js
```

4. Use the admin UI (Developer Seeds card) to execute the seed with the confirmation flow. The UI will generate a confirmation token that starts with `SEED-CLOTHING-`.

How to unseed

- Use the admin UI Developer Seeds card Unseed Clothing Demo button and confirm the generated token starting with `UNSEED-CLOTHING-`.
- Or run the unseed logic by calling the API endpoint (requires admin session): POST /api/admin/unseed-clothing with a JSON body containing `confirm: true` and `confirmText` set to the confirmation token.

Integration test

- A small test that runs seed then unseed to verify basic behavior is at `tests/seed-clothing.test.js`.

```bash
node tests/seed-clothing.test.js
```

Notes

- The seed scripts are designed to be idempotent: they use upserts and createMany(..., skipDuplicates) where appropriate.
- The unseed endpoints attempt to delete related records defensively to avoid FK constraint errors, but please review results after running in production-like environments.

*** End of file
