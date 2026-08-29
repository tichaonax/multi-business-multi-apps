/**
 * MBM-272: local pairing handshake.
 * MBM-275: generalized to also accept the workstation-agent pairing (scale
 * + printer relay) on the same port/endpoint, distinguished by a
 * `pairingType` field.
 * MBM-276: made profile-aware and permanently running. Previously this
 * server accepted exactly one pairing (of either type) and then shut
 * itself down for the life of the process — fine when a workstation only
 * ever talks to one server, wrong once multiple servers need to be
 * supported: pairing to a second server later would have needed a full
 * agent restart. It now stays listening for the entire process lifetime,
 * and both endpoints are scoped by the calling browser's own serverUrl so
 * pairing to server B can never read or overwrite server A's profile.
 *
 * The agent listens on 127.0.0.1 only (never the LAN) — the browser
 * already holds an authenticated app session and fetched a fresh agent
 * token from the central server on the admin's behalf. Nothing is ever
 * typed by hand.
 */

import { createServer, type Server } from 'http'
import { saveConfig, loadConfig, type AgentConfig } from './config'
import {
  saveWorkstationConfig,
  loadWorkstationConfig,
  listWorkstationBusinessIds,
  hasLegacyFlatWorkstationConfig,
  loadLegacyFlatWorkstationConfig,
  type WorkstationAgentConfig,
} from './workstation-config'
import { getActiveWorkstationBusinessId } from './active-workstation'
import { ensureProfile, deriveProfileId, readProfileMeta } from './profile-store'
import { buildManagePageHtml } from './manage-page'
import packageJson from '../package.json'

// Same source of truth as socket-client.ts/workstation-socket-client.ts's
// own AGENT_VERSION — surfaced here too so /probe can report it before any
// pairing exists. A server-side dashboard widget uses this to detect a
// stale agent install on this exact machine even for a business that has
// never paired it (see MBM-281 follow-up).
const AGENT_VERSION = packageJson.version

export const PAIRING_PORT = 47710

// MBM-276 Phase E: read-only status + local actions (unpair, release the
// scale, toggle auto-start, restart) surfaced as a small web page served
// from this same permanently-running local server — see manage-page.ts.
// Kept structurally separate from ProfileTrayInfo/TrayState (tray.ts) even
// though the shape mostly mirrors it: this crosses a process boundary (an
// HTTP response, potentially long-lived across a rebuild) where tray.ts's
// types don't need to, and coupling them would make an unrelated tray-only
// change ripple into this file for no reason.
export interface OtherWorkstationBusiness {
  businessId: string
  label: string
}

export interface ManageProfileInfo {
  profileId: string
  label: string
  serverUrl: string
  r710State?: string
  r710DeviceIp?: string
  workstationState?: string
  businessName?: string
  configuredPrinters?: string[]
  qzPrinterName?: string
  scaleComPort?: string
  scaleBaudRate?: number
  // MBM-279: every OTHER business that has a scale/printer pairing saved on
  // this exact profile but isn't the one currently connected — lets an
  // admin standing at the machine switch manually (Section 6's "Switch to
  // this" action), without needing a browser on this machine to drive it.
  otherWorkstationBusinesses?: OtherWorkstationBusiness[]
}

export interface ManageSnapshot {
  profiles: ManageProfileInfo[]
  scaleStatus: { status: string; comPort: string | null; error?: string }
  scaleOwnerProfileId: string | null
  scaleOwnerLabel: string | null
  autoStartEnabled: boolean
  // Whole-machine, not per-profile — same field/rationale as TrayState's
  // printerNames (tray.ts): every printer Windows has installed here,
  // shown once, not duplicated per profile below.
  printerNames: string[]
}

// The admin's browser calls this server cross-origin — the app is served
// over the central server's HTTPS origin, this listener is plain HTTP on
// 127.0.0.1. Modern browsers exempt localhost/127.0.0.1 from the mixed-
// content block (the same exemption QZ Tray and similar local-agent tools
// rely on), but CORS still applies and must be handled explicitly, preflight
// included, or the fetch fails client-side even though this server processed
// it fine.
//
// Beyond plain CORS, Chrome's Private Network Access (PNA) policy treats any
// request from a "less private" address space into a "more private" one —
// here, the app's LAN/public origin calling into this loopback (127.0.0.1)
// server — as requiring an extra opt-in from the target, checked on the
// preflight. Without Access-Control-Allow-Private-Network: true, Chrome
// silently fails the actual GET/POST (fetch throws, never even reaches this
// server) once it starts enforcing PNA for that address-space transition —
// this was the real cause of "the agent is running but the browser still
// says it isn't," not a bug in what this server returns.
function withCors(res: import('http').ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Allow-Private-Network', 'true')
}

export interface PairingCallbacks {
  onR710Paired: (profileId: string, config: AgentConfig) => void
  onWorkstationPaired: (profileId: string, config: WorkstationAgentConfig) => void
  // Manage Profiles page (below) — a thin HTTP surface over state/actions
  // index.ts already owns (the same ones tray.ts drives), not a second copy
  // of any of it.
  getSnapshot: () => ManageSnapshot
  unpairProfile: (profileId: string) => void
  releaseScale: () => void
  setAutoStart: (enabled: boolean) => void
  restart: () => void
  // MBM-279: marks this business as the focused/active one for this
  // profile (display + scale hand-off only as of MBM-283 — see index.ts's
  // activateWorkstationBusiness() header comment; it no longer touches any
  // socket connection). Called by /activate below (an explicit switch, e.g.
  // the browser's business dropdown) and is also how onWorkstationPaired
  // below activates a freshly paired business.
  activateWorkstationBusiness: (profileId: string, businessId: string) => void
  // MBM-282: tells the agent this (profile, business) now has browser
  // focus — called on EVERY /activate, not just ones where the business
  // itself changed (see index.ts's noteFocusedProfile() for why that
  // distinction matters). Hands the scale over from whichever other
  // (profile, business) currently owns it. MBM-283: now takes businessId
  // too — two businesses sharing one profile need hand-off between THEM,
  // not just between different profiles/servers.
  noteFocusedProfile: (profileId: string, businessId: string) => void
  // Same graceful shutdown the tray's own "Quit" menu item triggers —
  // closes the tray helper's icon via Windows' notification API before
  // exiting. Exposed over HTTP purely so the NEXT launch's self-kill-on-
  // startup (index.ts's killExistingInstance) can ask a running instance to
  // exit cleanly instead of always force-killing it, which was leaving
  // ghost/duplicate tray icons behind (the forcefully-killed process never
  // got a chance to remove its own icon).
  quit: () => void
}

function readBody(req: import('http').IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => resolve(body))
  })
}

export function startPairingServer(callbacks: PairingCallbacks): Server {
  const server = createServer(async (req, res) => {
    withCors(res)

    if (req.method === 'OPTIONS') {
      res.writeHead(204).end()
      return
    }

    const url = new URL(req.url || '/', 'http://127.0.0.1')

    // Manage Profiles page — a human opening http://127.0.0.1:47710
    // directly in a browser (not the admin-panel pairing flow, which only
    // ever calls /probe and /pair). GET-only, read/act on THIS machine's
    // own state — no serverUrl scoping needed, unlike /probe and /pair.
    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(buildManagePageHtml())
      return
    }
    if (req.method === 'GET' && url.pathname === '/api/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(callbacks.getSnapshot()))
      return
    }
    if (req.method === 'POST' && url.pathname === '/api/scale/release') {
      callbacks.releaseScale()
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ success: true }))
      return
    }
    if (req.method === 'POST' && url.pathname === '/api/restart') {
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ success: true }))
      callbacks.restart()
      return
    }
    // No serverUrl/businessId scoping — this is a same-machine "you, the
    // process currently holding this port, please exit" request, called
    // only by this exact agent's own next launch (killExistingInstance in
    // index.ts) before it falls back to a forceful taskkill. Respond THEN
    // quit, same reasoning as /api/restart above — the process may be gone
    // by the time quit()'s graceful shutdown finishes.
    if (req.method === 'POST' && url.pathname === '/shutdown') {
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ success: true }))
      callbacks.quit()
      return
    }
    if (req.method === 'POST' && url.pathname === '/api/auto-start') {
      try {
        const { enabled } = JSON.parse(await readBody(req)) as { enabled?: boolean }
        if (typeof enabled !== 'boolean') throw new Error('invalid')
        callbacks.setAutoStart(enabled)
        res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ success: true }))
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: '"enabled" must be a boolean' }))
      }
      return
    }
    {
      const unpairMatch = req.method === 'POST' ? url.pathname.match(/^\/api\/profiles\/([^/]+)\/unpair$/) : null
      if (unpairMatch) {
        callbacks.unpairProfile(unpairMatch[1])
        res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ success: true }))
        return
      }
    }
    {
      // MBM-279: the Manage Profiles page's "Switch to this" button — same
      // underlying operation as POST /activate below, just addressed by
      // profileId (already known to this page) rather than serverUrl.
      const activateMatch = req.method === 'POST' ? url.pathname.match(/^\/api\/profiles\/([^/]+)\/activate-business$/) : null
      if (activateMatch) {
        try {
          const { businessId } = JSON.parse(await readBody(req)) as { businessId?: string }
          if (!businessId) {
            res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'businessId is required' }))
            return
          }
          // A human standing at this exact machine clicking this is at
          // least as good a focus signal as a browser tab's own focus event
          // — same MBM-282 hand-off applies.
          callbacks.noteFocusedProfile(activateMatch[1], businessId)
          callbacks.activateWorkstationBusiness(activateMatch[1], businessId)
          res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ success: true }))
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Invalid request body' }))
        }
        return
      }
    }

    // Lets the admin UI check "does THIS server already have a profile on
    // this machine" before showing a Pair button — scoped per server so
    // opening the panel on server B never reports server A's state, and
    // vice versa. serverUrl is required; the caller always knows its own
    // window.location.origin.
    //
    // MBM-279: businessId is optional and, when passed, scopes the
    // workstation answer to that exact business — a profile can now hold
    // pairings for several businesses (see workstation-config.ts), so
    // "hasWorkstation" without a businessId would be ambiguous. The
    // Workstation Agents admin page always knows its own businessId and
    // passes it, to detect "does THIS business already have a pairing here"
    // before minting another one. R710's Agent panel has no per-business
    // concept (MBM-279 plan Section 1) and never passes one — it gets a
    // same-shaped but coarser answer instead ("does this profile have ANY
    // workstation pairing at all"), which is all it ever needed anyway.
    if (req.method === 'GET' && url.pathname === '/probe') {
      const serverUrl = url.searchParams.get('serverUrl')
      const businessId = url.searchParams.get('businessId') || undefined
      if (!serverUrl) {
        res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'serverUrl query parameter required' }))
        return
      }
      const profileId = deriveProfileId(serverUrl)
      const meta = readProfileMeta(profileId)
      const r710Config = meta ? loadConfig(profileId) : null

      let hasWorkstation = false
      let workstationAgentId: string | undefined
      let isActiveWorkstation = false
      if (meta) {
        if (businessId) {
          const config = loadWorkstationConfig(profileId, businessId)
          hasWorkstation = config !== null
          workstationAgentId = config?.workstationAgentId
          isActiveWorkstation = getActiveWorkstationBusinessId(profileId) === businessId
        } else {
          const legacy = hasLegacyFlatWorkstationConfig(profileId) ? loadLegacyFlatWorkstationConfig(profileId) : null
          hasWorkstation = legacy !== null || listWorkstationBusinessIds(profileId).length > 0
          workstationAgentId = legacy?.workstationAgentId
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({
        hasProfile: meta !== null,
        agentVersion: AGENT_VERSION,
        profile: meta ? {
          profileId,
          label: meta.label,
          createdAt: meta.createdAt,
          lastActiveAt: meta.lastActiveAt,
          hasR710: r710Config !== null,
          hasWorkstation,
          workstationAgentId,
          isActiveWorkstation,
        } : undefined,
      }))
      return
    }

    // MBM-279: switches this profile's active workstation business — the
    // browser calls this whenever its current business changes (see
    // local-agent-sync.ts on the web side), scoped by businessId so it's an
    // explicit "make this business's pairing the active one," never an
    // implicit side effect of anything else. A no-op (via
    // activateWorkstationBusiness()'s own early-return) if that business is
    // already active; deactivates whatever was active if this business has
    // no pairing here at all.
    //
    // MBM-282: the browser now ALSO calls this on window focus/tab
    // visibility regain, not just an actual business change (see
    // local-agent-sync.ts) — so this is no longer only "the business
    // changed," it's also "this tab is the one with focus right now."
    // noteFocusedProfile() runs on every call regardless of whether
    // activateWorkstationBusiness() itself finds anything to do for THIS
    // profile, since the cross-profile scale hand-off must happen even when
    // simply refocusing a tab that was already showing the right business.
    if (req.method === 'POST' && url.pathname === '/activate') {
      try {
        const body = await readBody(req)
        const { serverUrl, businessId } = JSON.parse(body) as { serverUrl?: string; businessId?: string }
        if (!serverUrl || !businessId) {
          res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'serverUrl and businessId are required' }))
          return
        }
        const profileId = deriveProfileId(serverUrl)
        callbacks.noteFocusedProfile(profileId, businessId)
        callbacks.activateWorkstationBusiness(profileId, businessId)
        res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ success: true }))
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Invalid request body' }))
      }
      return
    }

    if (req.method !== 'POST' || url.pathname !== '/pair') {
      res.writeHead(404).end()
      return
    }

    try {
      const body = await readBody(req)
      const parsed = JSON.parse(body) as Partial<AgentConfig> & Partial<WorkstationAgentConfig> & { pairingType?: 'r710' | 'workstation' }

      // Default 'r710' — the admin UI predating MBM-275 never sends
      // pairingType at all, and must keep pairing R710 devices exactly
      // as before.
      const pairingType = parsed.pairingType || 'r710'

      if (pairingType === 'workstation') {
        if (!parsed.serverUrl || !parsed.agentToken || !parsed.workstationAgentId || !parsed.label || !parsed.businessId) {
          res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Missing fields' }))
          return
        }
        const config: WorkstationAgentConfig = {
          serverUrl: parsed.serverUrl,
          agentToken: parsed.agentToken,
          workstationAgentId: parsed.workstationAgentId,
          businessId: parsed.businessId,
          label: parsed.label,
          ...(parsed.caCert ? { caCert: parsed.caCert } : {}),
        }
        const profileId = ensureProfile(config.serverUrl, config.label)
        saveWorkstationConfig(profileId, parsed.businessId, config)
        res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ success: true, profileId }))
        // Server stays running — a second pairing (this or another
        // business, or another server) can arrive later without restarting
        // the agent.
        callbacks.onWorkstationPaired(profileId, config)
        return
      }

      if (!parsed.serverUrl || !parsed.agentToken || !parsed.deviceRegistryId || !parsed.label) {
        res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Missing fields' }))
        return
      }

      const config: AgentConfig = {
        serverUrl: parsed.serverUrl,
        agentToken: parsed.agentToken,
        deviceRegistryId: parsed.deviceRegistryId,
        label: parsed.label,
        ...(parsed.caCert ? { caCert: parsed.caCert } : {}),
        ...(parsed.deviceIpAddress ? { deviceIpAddress: parsed.deviceIpAddress } : {}),
      }
      const profileId = ensureProfile(config.serverUrl, config.label)
      saveConfig(profileId, config)

      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ success: true, profileId }))
      callbacks.onR710Paired(profileId, config)
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Invalid request body' }))
    }
  })

  server.listen(PAIRING_PORT, '127.0.0.1', () => {
    console.log(`[Agent] Pairing endpoint listening on http://127.0.0.1:${PAIRING_PORT} (probe/pair, stays up for the life of the process)`)
  })

  return server
}
