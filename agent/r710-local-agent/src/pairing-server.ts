/**
 * MBM-272: one-time local pairing handshake.
 * MBM-275: generalized to also accept the workstation-agent pairing (scale
 * + printer relay) on the same port/endpoint, distinguished by a
 * `pairingType` field — one pairing server, either or both capabilities.
 *
 * While unpaired, the agent listens on 127.0.0.1 only (never the LAN) for a
 * single POST /pair call from the browser open on this same workstation —
 * the browser already holds an authenticated app session and fetched a
 * fresh agent token from the central server on the admin's behalf. Nothing
 * is ever typed by hand. A pairing type only shuts down once it succeeds;
 * if only one of the two types has paired so far, the server stays up so
 * the other can still be paired later without restarting the agent.
 */

import { createServer, type Server } from 'http'
import { saveConfig, type AgentConfig } from './config'
import { saveWorkstationConfig, type WorkstationAgentConfig } from './workstation-config'

export const PAIRING_PORT = 47710

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
  onR710Paired: (config: AgentConfig) => void
  onWorkstationPaired: (config: WorkstationAgentConfig) => void
}

export function startPairingServer(callbacks: PairingCallbacks): Server {
  const server = createServer((req, res) => {
    withCors(res)

    if (req.method === 'OPTIONS') {
      res.writeHead(204).end()
      return
    }

    // Lets the admin UI check "is the agent running and waiting to be
    // paired on this machine" before showing a Pair button.
    if (req.method === 'GET' && req.url === '/probe') {
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ paired: false }))
      return
    }

    if (req.method !== 'POST' || req.url !== '/pair') {
      res.writeHead(404).end()
      return
    }

    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => {
      try {
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
          saveWorkstationConfig(config)
          res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ success: true }))
          server.close()
          callbacks.onWorkstationPaired(config)
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
        }
        saveConfig(config)

        res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ success: true }))

        // Stop accepting further pairing attempts — this process is paired now.
        server.close()
        callbacks.onR710Paired(config)
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Invalid request body' }))
      }
    })
  })

  server.listen(PAIRING_PORT, '127.0.0.1', () => {
    console.log(`[R710 Agent] Waiting to be paired — listening on http://127.0.0.1:${PAIRING_PORT}/pair`)
  })

  return server
}
