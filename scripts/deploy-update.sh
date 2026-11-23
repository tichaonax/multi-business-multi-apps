#!/bin/bash
#
# DEPRECATED (MBM-341). This script used `git pull` + `prisma db push`, which
# can change or lose production data and leaves no migration history.
#
# Deploy with deploy/server/install-release.ps1 instead
# (docs/runbooks/new-mbm-server.md). On a dev machine: npm run setup:update.
#
echo "deploy-update.sh is retired: use deploy/server/install-release.ps1 (docs/runbooks/new-mbm-server.md)."
echo "Nothing was changed."
exit 1
