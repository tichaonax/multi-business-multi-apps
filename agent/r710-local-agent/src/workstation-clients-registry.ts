/**
 * MBM-276: registry of currently-running WorkstationSocketClient instances.
 * MBM-283: re-keyed from profileId alone to (profileId, businessId) — a
 * single profile (server) can now have several businesses paired on this
 * same machine, each with its own permanently-connected socket (see
 * index.ts's header comment), so profileId alone is no longer unique.
 * Exists so the scale-ownership relay (see workstation-job-handler.ts) can
 * look up "which socket belongs to the (profile, business) that currently
 * owns the scale" without workstation-job-handler.ts and
 * workstation-socket-client.ts importing each other's concrete classes
 * (workstation-socket-client.ts already imports FROM job-handler for
 * handleWorkstationJob/scaleDriver — a reverse type dependency would be
 * circular). Both sides only depend on this small interface instead.
 */

export interface RelayTarget {
  emitScaleWeight(reading: unknown): void
  emitScaleStatus(status: unknown): void
}

// Placeholder businessId for the brief window before a pre-MBM-279 flat
// (not-yet-per-business) workstation config has completed its first sync —
// see workstation-socket-client.ts's syncConfig() migration branch, which
// re-registers under the real businessId the moment it's known. There is
// only ever one such pairing per profile, so no collision risk while this
// placeholder is in use.
export const LEGACY_BUSINESS_KEY = '__legacy__'

export function wsKey(profileId: string, businessId: string): string {
  return `${profileId}:${businessId}`
}

const clients = new Map<string, RelayTarget>()

export function registerWorkstationClient(profileId: string, businessId: string, client: RelayTarget): void {
  clients.set(wsKey(profileId, businessId), client)
}

export function unregisterWorkstationClient(profileId: string, businessId: string, client: RelayTarget): void {
  // Only remove if `client` is still the currently-registered instance for
  // this key — guards against a stale stop() (e.g. from a superseded
  // reconnect attempt) clobbering a newer registration.
  const key = wsKey(profileId, businessId)
  if (clients.get(key) === client) {
    clients.delete(key)
  }
}

export function getWorkstationClient(profileId: string, businessId: string): RelayTarget | undefined {
  return clients.get(wsKey(profileId, businessId))
}
