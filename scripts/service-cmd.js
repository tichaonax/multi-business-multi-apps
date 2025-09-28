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
const serviceNameHelper = require('../windows-service/service-name-helper')

function runNodeScript(relPath, args=[]) {
  const scriptPath = path.join(projectRoot, relPath)
  try {
    execSync(`node "${scriptPath}" ${args.join(' ')}`, { stdio: 'inherit', cwd: projectRoot })
  } catch (err) {
    console.error('Command failed:', err.message)
    process.exit(1)
  }
}

// Get ordered candidate service names (internal id variants then display name)
const candidateNames = serviceNameHelper.getCandidateServiceNames()

function tryScCommand(cmdTemplate) {
  // cmdTemplate should be a function that accepts a name and returns the command string
  let lastErr
  for (const name of candidateNames) {
    try {
      execSync(cmdTemplate(name), { stdio: 'inherit' })
      return true
    } catch (err) {
      lastErr = err
    }
  }
  throw lastErr
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
    // Start Windows service via sc (requires Windows). For cross-platform recommend npm run service:start
    try {
      tryScCommand((name) => `sc start "${name}"`)
    } catch (err) {
      console.error('Failed to start service via sc. Try: npm run service:start or run the service wrapper directly')
      process.exit(1)
    }
    break

  case 'stop':
    try {
      tryScCommand((name) => `sc stop "${name}"`)
    } catch (err) {
      console.error('Failed to stop service via sc. Try: npm run service:stop')
      process.exit(1)
    }
    break

  case 'status':
    try {
      tryScCommand((name) => `sc query "${name}"`)
    } catch (err) {
      console.error('Failed to query service status via sc. Try: npm run sync-service:status')
      process.exit(1)
    }
    break

  default:
    console.error('Unknown command:', cmd)
    process.exit(1)
}
