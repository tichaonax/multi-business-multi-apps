Recommended service management commands

Use the npm scripts provided in the repository to manage the Windows service. The scripts map to the existing helpers and to common Windows Service commands so the workflow will feel familiar.

Common flows

- Install the Windows service (creates a wrapped service that runs the sync runner):

  npm run service:install

- Uninstall the Windows service:

  npm run service:uninstall

- Start the service (maps to the low-level sync-service start):

  npm run service:start

- Stop the service:

  npm run service:stop

- Restart the service:

  npm run service:restart

- Diagnose current system/service state (runs the comprehensive hybrid diagnostics):

  npm run service:diagnose

- Quick smoke-check (CI-friendly check that validates env, DB connectivity (unless skipped), and port health):

  npm run service:smoke-check

Notes & mappings

- The `service:*` scripts provide user-friendly aliases. They map as follows:
  - `service:install` -> `windows-service/force-install-hybrid.js` (installer wrapper)
  - `service:diagnose` -> `windows-service/diagnose-hybrid.js` (comprehensive diagnostics)
  - `service:start` -> runs `sync-service:start` (which uses `sc start "Multi-Business Sync Service"`)
  - `service:stop` -> runs `sync-service:stop` (which uses `sc stop "Multi-Business Sync Service"`)
  - `service:restart` -> runs `sync-service:restart` (stop + wait + start)
  - `service:smoke-check` -> `scripts/smoke-check-service.js` (CI/validation)

- For CI usage that cannot access the database, use the SKIP_DB_PRECHECK environment variable:

  SKIP_DB_PRECHECK=true npm run service:smoke-check

- If you prefer the raw sync-service commands (direct control), use the `sync-service:*` scripts:
  - `npm run sync-service:install`
  - `npm run sync-service:status` (recommended for low-level status output)
  - `npm run sync-service:start`
  - `npm run sync-service:stop`
  - `npm run sync-service:restart`

Troubleshooting

- If `service:install` fails due to permissions, run your shell as Administrator.
- If `sc start`/`sc stop` reports the service is not installed, run `npm run service:install` first and re-check with `npm run service:diagnose`.

If you'd like, I can also add a short top-level README section showing these commands and example outputs.