import path from 'path'

/**
 * Thin wrapper to call the existing CommonJS CLI seeding script from server code.
 * Using process.cwd() keeps the resolution robust when executed from Next.js server runtime.
 */
export async function runSeedMigration(): Promise<void> {
  const scriptPath = path.join(process.cwd(), 'scripts', 'seed-migration-data.js')
  function devScriptsAllowed() {
    return process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEV_SCRIPTS === 'true'
  }

  if (!devScriptsAllowed()) {
    throw new Error('Dev scripts not allowed in this environment')
  }

  // Lazily require the CommonJS seeding script using eval('require') so the
  // Next bundler doesn't try to statically resolve this dev-only file.
  let script: any = null
  try {
    // eslint-disable-next-line no-eval,@typescript-eslint/no-unsafe-assignment
    const req = eval('require') as NodeRequire
    script = req(scriptPath)
  } catch (err) {
    throw new Error('seedMigrationData script not available at ' + scriptPath + ' - ' + String(err))
  }

  if (!script || typeof script.seedMigrationData !== 'function') {
    throw new Error('seedMigrationData function not found in script at ' + scriptPath)
  }

  // Call the exported function which returns a promise
  return await script.seedMigrationData()
}

export default runSeedMigration
