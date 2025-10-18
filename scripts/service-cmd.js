#!/usr/bin/env node
/**
 * Service command shim
 * Usage: node scripts/service-cmd.js <install|diagnose|start|stop|status>
 * This shim maps the familiar electricity-tokens verbs to the local scripts
 */
const { execSync } = require('child_process')
const path = require('path')

const cmd = process.argv[2]
if (!cmd || ['help','-h','--help'].includes(cmd)) {
  console.log('Usage: node scripts/service-cmd.js <install|diagnose|start|stop|status>')
  process.exit(0)
}

const projectRoot = path.resolve(__dirname, '..')
const SERVICE_NAME = 'multibusinesssyncservice.exe'

function runNodeScript(relPath, args=[]) {
  const scriptPath = path.join(projectRoot, relPath)
  try {
    execSync(`node "${scriptPath}" ${args.join(' ')}`, { stdio: 'inherit', cwd: projectRoot })
  } catch (err) {
    console.error('Command failed:', err.message)
    process.exit(1)
  }
}

function runScCommand(cmdTemplate) {
  try {
    execSync(cmdTemplate(SERVICE_NAME), { stdio: 'inherit' })
    return true
  } catch (err) {
    throw err
  }
}

switch (cmd) {
  case 'install':
    // Force install hybrid service
    runNodeScript('windows-service/force-install-hybrid.js')
    break

  case 'diagnose':
    runNodeScript('windows-service/diagnose-hybrid.js')
    break

  case 'start':
    // Start Windows service via sc.exe (requires Windows). For cross-platform recommend npm run service:start
    try {
      runScCommand((name) => `sc.exe start "${name}"`)
    } catch (err) {
      console.error('Failed to start service via sc.exe. Try: npm run service:start or run the service wrapper directly')
      process.exit(1)
    }
    break

  case 'stop':
    try {
      runScCommand((name) => `sc.exe stop "${name}"`)
    } catch (err) {
      console.error('Failed to stop service via sc.exe. Try: npm run service:stop')
      process.exit(1)
    }
    break

  case 'status':
    try {
      runScCommand((name) => `sc.exe query "${name}"`)
    } catch (err) {
      console.error('Failed to query service status via sc.exe. Try: npm run sync-service:status')
      process.exit(1)
    }
    break

  default:
    console.error('Unknown command:', cmd)
    process.exit(1)
}
