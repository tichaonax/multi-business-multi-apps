/**
 * MBM-279: tells the local workstation agent (if any) running on THIS exact
 * machine which business is now active, so its scale/printer pairing
 * follows the browser's own business switch. Called from
 * business-permissions-context.tsx's useEffect on every currentBusinessId
 * change — the header dropdown, the sidebar, business creation's auto-
 * switch, and the auto-recovery fallback in refreshBusinesses() all funnel
 * through that one piece of state, so this needs no other wiring.
 *
 * Fully best-effort: the local agent's pairing server only listens on
 * 127.0.0.1, so this only ever reaches anything when the browser is on the
 * same physical machine as a paired workstation — the common case is no
 * agent here at all, which this silently no-ops for, exactly like the
 * existing pairing-detection probes on the Workstation Agents / R710 Agent
 * admin pages already do.
 *
 * A single POST /activate covers both outcomes the agent needs to handle
 * (see pairing-server.ts / index.ts's activateWorkstationBusiness()):
 * connects this business's stored pairing if one exists on this machine, or
 * clears/deactivates whatever business was previously active here if this
 * one has none — no need to probe first and branch client-side.
 */

const PAIRING_PORT = 47710
const REQUEST_TIMEOUT_MS = 2500

// MBM-283 follow-up: the workstation agent is a Windows .exe — a phone or
// tablet can never run it, full stop. The "no agent running on this
// machine" UI (dashboard banner, status pill) was built without this
// distinction and fired unconditionally on any device, which meant a
// mobile user was told to download and run r710-agent.exe on their phone —
// nonsensical, since mobile printing (MBM-283) works by relaying through
// SOME OTHER workstation's already-paired agent, never by running one
// itself. User-agent sniffing is the right tool here specifically because
// the question isn't "is the viewport narrow" (a phone in landscape, or a
// resized desktop window, shouldn't change the answer) but "can this OS
// even execute a Windows binary" — a fact about the platform, not the
// screen size.
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
}

export async function syncLocalAgentActiveBusiness(businessId: string): Promise<void> {
  if (typeof window === 'undefined' || !businessId) return

  try {
    await fetch(`http://127.0.0.1:${PAIRING_PORT}/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverUrl: window.location.origin, businessId }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch {
    // No local agent reachable on this machine (the common case), or it
    // errored — not fatal either way, nothing here depends on this
    // succeeding.
  }
}
