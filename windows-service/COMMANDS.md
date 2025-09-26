Service commands compatibility

This project follows the familiar electricity-tokens command pattern for service management. Use the following commands (local equivalents are shown):

- install  -> force-install-hybrid (installs the Windows hybrid service)
  - Command: node scripts/service-cmd.js install
  - Equivalent: node windows-service/force-install-hybrid.js

- diagnose -> comprehensive diagnostics (status, files, processes, DB checks)
  - Command: node scripts/service-cmd.js diagnose
  - Equivalent: node windows-service/diagnose-hybrid.js

- start    -> start the Windows service (sc start)
  - Command: node scripts/service-cmd.js start
  - Equivalent: npm run service:start

- stop     -> stop the Windows service (sc stop)
  - Command: node scripts/service-cmd.js stop
  - Equivalent: npm run service:stop

- status   -> query Windows service status
  - Command: node scripts/service-cmd.js status
  - Equivalent: npm run sync-service:status

The shim `scripts/service-cmd.js` exists to provide identical verbs to users coming from the electricity-tokens project.
