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
import { saveWorkstationConfig, loadWorkstationConfig, type WorkstationAgentConfig } from './workstation-config'
import { ensureProfile, deriveProfileId, readProfileMeta } from './profile-store'
import { buildManagePageHtml } from './manage-page'

export const PAIRING_PORT = 47710

// MBM-276 Phase E: read-only status + local actions (unpair, release the
// scale, toggle auto-start, restart) surfaced as a small web page served
// from this same permanently-running local server — see manage-page.ts.
// Kept structurally separate from ProfileTrayInfo/TrayState (tray.ts) even
// though the shape mostly mirrors it: this crosses a process boundary (an
// HTTP response, potentially long-lived across a rebuild) where tray.ts's
// types don't need to, and coupling them would make an unrelated tray-only
// change ripple into this file for no reason.
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
function withCors(res: import('http').ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
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

    // Lets the admin UI check "does THIS server already have a profile on
    // this machine" before showing a Pair button — scoped per server so
    // opening the panel on server B never reports server A's state, and
    // vice versa. serverUrl is required; the caller always knows its own
    // window.location.origin.
    if (req.method === 'GET' && url.pathname === '/probe') {
      const serverUrl = url.searchParams.get('serverUrl')
      if (!serverUrl) {
        res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'serverUrl query parameter required' }))
        return
      }
      const profileId = deriveProfileId(serverUrl)
      const meta = readProfileMeta(profileId)
      // Includes which capabilities this exact machine already has for this
      // exact server (and the actual workstationAgentId, not just a
      // boolean) so the caller can detect "this machine already has a
      // workstation pairing here" BEFORE minting and creating another,
      // separate one — see the admin/workstation-agents page's pairing
      // flow, which was previously happy to mint a brand new
      // WorkstationAgents row every single time, with no awareness that
      // one might already exist for this exact profile.
      const r710Config = meta ? loadConfig(profileId) : null
      const workstationConfig = meta ? loadWorkstationConfig(profileId) : null
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({
        hasProfile: meta !== null,
        profile: meta ? {
          profileId,
          label: meta.label,
          createdAt: meta.createdAt,
          lastActiveAt: meta.lastActiveAt,
          hasR710: r710Config !== null,
          hasWorkstation: workstationConfig !== null,
          workstationAgentId: workstationConfig?.workstationAgentId,
        } : undefined,
      }))
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
        if (!parsed.serverUrl || !parsed.agentToken || !parsed.workstationAgentId || !parsed.label) {
          res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Missing fields' }))
          return
        }
        const config: WorkstationAgentConfig = {
          serverUrl: parsed.serverUrl,
          agentToken: parsed.agentToken,
          workstationAgentId: parsed.workstationAgentId,
          label: parsed.label,
          ...(parsed.caCert ? { caCert: parsed.caCert } : {}),
        }
        const profileId = ensureProfile(config.serverUrl, config.label)
        saveWorkstationConfig(profileId, config)
        res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ success: true, profileId }))
        // Server stays running — a second pairing (this or another server)
        // can arrive later without restarting the agent.
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
