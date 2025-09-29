# Dev Seed Scripts

Short guide for the seed scripts in this repository. These are intended for local development only (do NOT run against production).

Prerequisites
- Node.js installed (v16+ recommended)
- `npm install` run in the project root so `@prisma/client` and other deps are available
- A working database reachable via `DATABASE_URL` in your environment

Scripts

1) seed-test-maintenance.js
- Purpose: creates a single minimal vehicle (`dev-vehicle-1`), a user (`dev-user-1`) if missing, and one maintenance record attached to that vehicle.
- Run:

  node scripts/seed-test-maintenance.js

2) seed-dev-data.js
- Purpose: creates a richer set of dev data:
  - users (dev-user-1)
  - vehicles (dev-vehicle-1, dev-vehicle-2)
  - drivers (dev-driver-1, dev-driver-2)
  - driver authorizations
  - multiple maintenance records (past + upcoming)
  - a couple of recent trips
- Run:

  node scripts/seed-dev-data.js

Verification
- After seeding you can query the API endpoints (local server must be running). For quick GET testing without authentication use the development query override on endpoints that support it (only when running locally / NODE_ENV !== 'production'):

  curl "http://localhost:8080/api/vehicles/maintenance?dueSoon=true&limit=10&_devUserId=dev-user-1"

- Or inspect the DB with Prisma Studio:

  npx prisma studio

Safety & cleanup
- These scripts are strictly for dev environments. They create/modify real DB rows.
- To remove seeded data manually, either use Prisma Studio or run SQL/Prisma queries to delete rows with ids starting with `dev-` (or inspect created ids printed by the scripts).

Notes
- The scripts use the project's Prisma schema and `@prisma/client`. If you've changed the schema, regenerate the client with:

  npx prisma generate

- If you prefer TypeScript seed scripts, they exist in the repo history but the JS scripts here avoid extra build steps.

Questions or additions
- Want additional edge-case records (large costs, null fields, expired warranties)? Tell me which scenarios and I can add them to `seed-dev-data.js`.

Runtime guards and bundler notes
--------------------------------

Some admin API routes call scripts under `scripts/` at runtime (for seeding, restore, etc.). Those scripts are developer-only and may not exist in production deployments. To avoid the Next.js bundler trying to resolve these modules at build-time (which previously caused warnings like "the request of a dependency is an expression" or MODULE_NOT_FOUND), several routes now use a runtime-only lazy loader pattern:

- `eval('require')` or guarded loaders are used to require dev-only scripts at runtime only when `NODE_ENV !== 'production'` or when the files are present. This prevents the bundler from statically analyzing dev-only files.
- If you deploy these scripts to a staging/CI host and want the endpoints to operate there, ensure the `scripts/` files are included in the deployment artifact and available at runtime.

Prisma crosswalk helper
------------------------

There's also a small helper at `src/lib/prisma-crosswalk.ts` which loads `scripts/prisma-relation-renames-fuzzy-filtered.json` (if present) and provides a simple mapping API. Use it in scripts or admin tooling when you need to translate between physical DB table names (snake_case) and Prisma client names (camelCase) without renaming database objects.

If you'd like, I can add a diagnostic script that lists which dev scripts are present on the current host. Note: there's an environment opt-in available — set `ALLOW_DEV_SCRIPTS=true` to allow runtime loading of dev scripts even when `NODE_ENV` is `production`. Use with care on staging/CI.