/**
 * MBM-283 follow-up: this browser's own "print terminal" identity, if it's
 * ever been registered (see /api/printing/terminals). Deliberately just a
 * localStorage value, not tied to any user login — the whole point is a
 * shared machine keeps the SAME identity (and therefore the same
 * admin-assigned default printer) no matter who's currently signed in on
 * it, unlike the existing per-user printer preference.
 *
 * Stores id + label together so any user can see "this device is
 * registered as X" without needing a lookup call — the terminals list
 * endpoint is admin/owner-gated (it's a management view across every
 * terminal), but registering is deliberately open to any business member,
 * so the registering browser needs to remember its own label locally.
 */

const STORAGE_KEY = 'mbm-print-terminal'

export interface PrintTerminalIdentity {
  id: string
  label: string
}

export function getPrintTerminal(): PrintTerminalIdentity | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.id && parsed?.label ? parsed : null
  } catch {
    return null
  }
}

export function setPrintTerminal(identity: PrintTerminalIdentity): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(identity))
  } catch {
    // Non-fatal — this browser just won't remember its terminal identity
    // across reloads (private browsing, storage disabled, etc.).
  }
}

export function clearPrintTerminal(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to do.
  }
}
