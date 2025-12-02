import { spawnSync } from 'child_process'

/**
 * Check if `pg_dump` is available in PATH and executable
 */
export function isPgDumpAvailable(): boolean {
  // Allow test override (force missing pg_dump) by setting env var FORCE_PG_DUMP_MISSING
  if (process.env.FORCE_PG_DUMP_MISSING === '1') return false
  try {
    const res = spawnSync('pg_dump', ['--version'], { stdio: 'ignore' })
    return res.status === 0
  } catch (e) {
    return false
  }
}

/**
 * Check if `psql` is available in PATH and executable
 */
export function isPsqlAvailable(): boolean {
  if (process.env.FORCE_PSQL_MISSING === '1') return false
  try {
    const res = spawnSync('psql', ['--version'], { stdio: 'ignore' })
    return res.status === 0
  } catch (e) {
    return false
  }
}

export function installPgDumpHint(): string {
  return `pg_dump not found. Install PostgreSQL client tools and ensure 'pg_dump' is in PATH. On Debian/Ubuntu: 'sudo apt-get install -y postgresql-client'. On macOS (Homebrew): 'brew install libpq' and add '/usr/local/opt/libpq/bin' to PATH. On Windows: install PostgreSQL or add pg_dump.exe to PATH.`
}
