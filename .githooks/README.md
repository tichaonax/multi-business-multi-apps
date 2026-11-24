# Git Hooks

This directory contains custom git hooks that automate deployment tasks.

## Installation

Run the installation script to configure git to use these hooks:

```bash
npm run hooks:install
```

Or manually:

```bash
node scripts/install-git-hooks.js
```

## Available Hooks

### post-merge

**Trigger:** Runs automatically after `git pull` or `git merge`

**Purpose:** Says what the merge changed and what to run next (MBM-341: report only)

**Behavior:**
- Lists what changed: dependencies, migrations, the Prisma schema, the service files, application code
- Never stops, installs or builds anything
- Next steps it prints: on a dev machine `npm install`, `npm run db:deploy`, `npm run dev`; for a server, `npm run release` and `docs/runbooks/manual-deployment.md`

**Platforms:**
- `post-merge` - Bash script (Linux/Mac/Git Bash)
- `post-merge.ps1` - PowerShell script (Windows)

## Disabling Hooks

To temporarily disable custom hooks:

```bash
git config core.hooksPath .git/hooks
```

To re-enable:

```bash
git config core.hooksPath .githooks
```

## Troubleshooting

### Hooks not running after git pull

Check the hooks path configuration:

```bash
git config core.hooksPath
# Should output: .githooks
```

If not set, reinstall hooks:

```bash
npm run hooks:install
```

### Permission denied (Linux/Mac)

Make hooks executable:

```bash
chmod +x .githooks/post-merge
```

### PowerShell execution policy (Windows)

If PowerShell hooks don't run:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

## See Also

- `ADMIN-INSTALLATION-GUIDE.md` - Full deployment documentation
- `scripts/install-git-hooks.js` - Hook installation script
- `scripts/setup-after-pull.js` - Setup script called by hooks
