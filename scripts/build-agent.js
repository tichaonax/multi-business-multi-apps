#!/usr/bin/env node
/**
 * Build the R710/Workstation Local Agent as part of the main app's build.
 *
 * Chained into `postbuild` (not the required `build` script itself) — this
 * must never fail the main app's build. agent/r710-local-agent/ is a fully
 * separate npm project (own package.json/lockfile), so the root
 * `npm install` never installs its dependencies; this installs them first
 * if missing. Windows-only by design (the agent packages a Windows SEA
 * .exe with a Stop *.bat helper) — skipped cleanly everywhere else rather
 * than attempted and failed.
 *
 * Without this, the app's own /api/admin/r710/agents/download route 404s
 * with "Agent build not found on the server" until someone remembers to
 * run `npm run build` inside agent/r710-local-agent/ by hand as a separate
 * deployment step — easy to forget, exactly what prompted this script.
 *
 * Usage: node scripts/build-agent.js
 */

const { existsSync } = require('fs')
const { join } = require('path')
const { execSync } = require('child_process')

const ROOT_DIR = join(__dirname, '..')
const AGENT_DIR = join(ROOT_DIR, 'agent', 'r710-local-agent')

function run(command, cwd) {
  execSync(command, { cwd, stdio: 'inherit' })
}

function main() {
  console.log('\n🤖 Building local agent (agent/r710-local-agent)...')

  if (process.platform !== 'win32') {
    console.log('   ⚠️  Skipped — the agent packages a Windows .exe and only builds on win32.')
    console.log('      The download will 404 until built on a Windows machine; this does not affect the rest of the app.')
    return
  }

  if (!existsSync(AGENT_DIR)) {
    console.log('   ⚠️  Skipped — agent/r710-local-agent/ not found in this checkout.')
    return
  }

  try {
    if (!existsSync(join(AGENT_DIR, 'node_modules'))) {
      console.log('   📦 Installing agent dependencies (first build on this machine)...')
      run('npm install', AGENT_DIR)
    }

    run('npm run build', AGENT_DIR)
    console.log('   ✅ Agent built — agent/r710-local-agent/dist/r710-agent.zip is up to date.')
  } catch (error) {
    // Best-effort only — an agent-packaging failure must never take down
    // the rest of the app's build/deploy. Degrades to the same "Agent
    // build not found" error the download route already handles, not a
    // failed deployment.
    console.warn('   ⚠️  Agent build failed (non-fatal, main app build continues):', error.message)
  }
}

main()
