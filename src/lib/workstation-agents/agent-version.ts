/**
 * Directional comparison for the plain `major.minor.patch` version strings
 * r710-agent.exe reports (its package.json version, e.g. "0.4.22") against
 * what a given server currently expects (/api/admin/r710/agents/latest-version).
 *
 * MBM-281's original check was `agentVersion !== latestAgentVersion` — any
 * mismatch, in either direction, got the same "this workstation's agent is
 * older, update it" message. That's wrong when the agent is actually AHEAD
 * of what this particular server expects (e.g. this kiosk was switched to a
 * different, less-recently-updated server) — there is nothing to download in
 * that case, and the real fix is on that server, not this workstation. See
 * MBM-284.
 */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const partsA = a.split('.').map((n) => parseInt(n, 10) || 0)
  const partsB = b.split('.').map((n) => parseInt(n, 10) || 0)
  const length = Math.max(partsA.length, partsB.length)
  for (let i = 0; i < length; i++) {
    const numA = partsA[i] || 0
    const numB = partsB[i] || 0
    if (numA < numB) return -1
    if (numA > numB) return 1
  }
  return 0
}
