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

**Purpose:** Automatically rebuilds the sync service when source files change

**Behavior:**
- Detects which files changed in the merge
- If `package.json` changed → Runs full setup (`npm run setup:update`)
- If `src/` files changed → Rebuilds service only (`npm run build:service`)
- Otherwise → Skips rebuild

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

- `DEPLOYMENT.md` - Full deployment documentation
- `scripts/install-git-hooks.js` - Hook installation script
- `scripts/setup-after-pull.js` - Setup script called by hooks
