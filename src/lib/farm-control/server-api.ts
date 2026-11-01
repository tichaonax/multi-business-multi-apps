// MBM-332 — calling the Farm Control API from MBM's server (guide §4.4, rev 4).
// - Signs a linked user in with a fresh assertion (the same signer the
//   browser uses), keeps the session token in memory only, renews it about
//   2 minutes before it ends, and on a 401 signs in again once.
// - Every call names one of MBM's registered origins in `Origin` (the first
//   address on the admin Connection tab) and uses the Farm Control address
//   by name, as entered.
// Runs in the server process (the alerts poller): no next-auth / next/server.
import { signAssertion } from './server'

type Integration = { id: string; baseUrl: string; integrationId: string; audience: string; keyId: string; allowedOrigins: string[] }

const RENEW_BEFORE_MS = 120_000
const TIMEOUT_MS = 15_000

export class FarmServerError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message)
  }
}

const sessions = new Map<string, { token: string; expiresAt: number }>()
const keyFor = (i: Integration, userId: string) => `${i.id}|${i.baseUrl}|${i.integrationId}|${userId}`

async function request(i: Integration, method: string, path: string, body?: unknown, token?: string) {
  const origin = i.allowedOrigins[0]
  if (!origin) throw new FarmServerError(0, 'no-origin', "Add this MBM server's address on the Connection tab (it must be registered with FarmNet)")
  const headers: Record<string, string> = { Origin: origin, Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  let r: Response
  try {
    r = await fetch(`${new URL(i.baseUrl).origin}/api/integration/v1${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch {
    throw new FarmServerError(0, 'unreachable', `This server can't reach Farm Control at ${i.baseUrl}. It must be on the farm's tailnet and use the address by name.`)
  }
  if (r.status === 204) return null
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw new FarmServerError(r.status, d.code || '', d.error || r.statusText)
  return d
}

async function signIn(i: Integration, user: { id: string; name?: string | null }) {
  try {
    const d = await request(i, 'POST', '/session', { assertion: await signAssertion(i, user) })
    const s = { token: d.token as string, expiresAt: Date.parse(d.expiresAt) }
    sessions.set(keyFor(i, user.id), s)
    return s
  } catch (e) {
    if (e instanceof FarmServerError && e.status === 401) {
      throw new FarmServerError(401, 'refused', "Farm Control refused the sign-in: check the person is linked and this server's address is registered")
    }
    throw e
  }
}

async function session(i: Integration, user: { id: string; name?: string | null }) {
  const key = keyFor(i, user.id)
  const s = sessions.get(key)
  if (!s) return signIn(i, user)
  if (s.expiresAt - Date.now() > RENEW_BEFORE_MS) return s
  try {
    const d = await request(i, 'POST', '/session/renew', { assertion: await signAssertion(i, user) }, s.token)
    const next = { token: (d?.token as string) || s.token, expiresAt: Date.parse(d?.expiresAt) || Date.now() + 10 * 60_000 }
    sessions.set(key, next)
    return next
  } catch {
    sessions.delete(key)
    return signIn(i, user)
  }
}

/** A Farm Control API call as this user, from MBM's server. */
export async function farmServerCall<T = any>(i: Integration, user: { id: string; name?: string | null }, method: string, path: string): Promise<T> {
  const s = await session(i, user)
  try {
    return await request(i, method, path, undefined, s.token)
  } catch (e) {
    if (!(e instanceof FarmServerError) || e.status !== 401) throw e
    // The session ended: sign in again once (guide §4.4)
    sessions.delete(keyFor(i, user.id))
    const again = await signIn(i, user)
    return request(i, method, path, undefined, again.token)
  }
}

/** Plain words for the admin screen. */
export function farmErrorText(e: unknown): string {
  if (e instanceof FarmServerError) {
    if (e.code === 'feature-off') return 'Alerts are switched off for this integration in Farm Control'
    return e.message
  }
  return e instanceof Error ? e.message : 'Unknown error'
}
