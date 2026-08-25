/**
 * MBM-276: registry of currently-running WorkstationSocketClient instances,
 * keyed by profileId. Exists so the scale-ownership relay (see
 * workstation-job-handler.ts) can look up "which socket belongs to the
 * profile that currently owns the scale" without workstation-job-handler.ts
 * and workstation-socket-client.ts importing each other's concrete classes
 * (workstation-socket-client.ts already imports FROM job-handler for
 * handleWorkstationJob/scaleDriver — a reverse type dependency would be
 * circular). Both sides only depend on this small interface instead.
 */

export interface RelayTarget {
  emitScaleWeight(reading: unknown): void
  emitScaleStatus(status: unknown): void
}

const clients = new Map<string, RelayTarget>()

export function registerWorkstationClient(profileId: string, client: RelayTarget): void {
  clients.set(profileId, client)
}

export function unregisterWorkstationClient(profileId: string, client: RelayTarget): void {
  // Only remove if `client` is still the currently-registered instance for
  // this profileId — guards against a stale stop() (e.g. from a
  // superseded reconnect attempt) clobbering a newer registration.
  if (clients.get(profileId) === client) {
    clients.delete(profileId)
  }
}

export function getWorkstationClient(profileId: string): RelayTarget | undefined {
  return clients.get(profileId)
}
