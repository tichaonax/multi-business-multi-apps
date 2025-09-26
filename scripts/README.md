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