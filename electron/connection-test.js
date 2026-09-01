/**
 * Real, credential-verified server connection test for the Add Server flow
 * — deliberately more than a reachability ping. Confirms, in order: the
 * entered IP is actually a valid IP, the server is reachable, its
 * certificate is trusted (prompting for trust-on-first-use if it's an
 * untrusted self-signed cert, then pinning the exact fingerprint rather
 * than blanket-trusting the hostname), and that the given credentials are
 * an actual ADMIN login on that specific server — not just that some login
 * works. None of this ever gets persisted: the credentials are used once,
 * in a throwaway, non-persistent session that's discarded immediately
 * after, whether the test succeeds or fails. Whoever actually uses the
 * kiosk day-to-day logs in fresh, with their own credentials, the normal
 * way — this test only ever proves the server + admin account are real.
 *
 * Cookie handling is explicit here, not left to net.request's session
 * binding — NextAuth's credentials flow is a two-hop dance (GET /csrf sets
 * a csrf cookie that the POST must send back and that NextAuth validates
 * server-side; a successful POST sets the real session cookie that the
 * following GET /session must send back in turn) and relying on implicit
 * session-cookie-jar behavior made a real failure ("csrf cookie never made
 * it to the POST") indistinguishable from a genuinely wrong password —
 * traced live from a report of correct admin credentials being rejected.
 * Manually accumulating Set-Cookie headers into a jar and sending them back
 * verbatim removes that whole class of doubt, and the DEBUG logging below
 * makes the next failure (if any) diagnosable from the console instead of
 * guessed at.
 */

const nodeNet = require('net')
const { net: electronNet, session: electronSession } = require('electron')

const REQUEST_TIMEOUT_MS = 8000

// "localhost" is the one hostname (not an IP) accepted here, deliberately —
// for testing against a local `npm run dev` server (README's documented
// default: http://localhost:8080) without needing the "Advanced: full URL"
// field for something this common.
function isValidIp(str) {
  const value = String(str || '').trim()
  if (value.toLowerCase() === 'localhost') return true
  return nodeNet.isIP(value) !== 0
}

// 127.0.0.1 / ::1 / "localhost" are always the same machine this Electron
// process is running on, never a real network path — but unlike a genuine
// LAN server, there's no way to know from the hostname alone whether that
// machine is running a bare `npm run dev` instance (plain HTTP) or a full
// production-configured install (HTTPS-only, same port — see server.ts's
// `useHttps`). testConnection() uses this to know when to try both
// protocols instead of assuming one (see its own comment for the exact
// order and why).
function isLoopbackHost(str) {
  const value = String(str || '').trim().toLowerCase()
  return value === 'localhost' || value === '127.0.0.1' || value === '::1' || value.startsWith('127.')
}

// Bare IP/host -> https://<host>:8080 (the documented standard default port
// this app's own deployment guide uses everywhere). A caller-supplied full
// URL (custom port, hostname, explicit http:// for a quick unsecured test
// box) is respected as-is instead — see the "Advanced: full URL" field. An
// explicit `scheme` overrides the default entirely — used by testConnection
// to try both protocols against a loopback host (see its own comment).
function buildUrl({ host, fullUrlOverride, scheme }) {
  if (fullUrlOverride && fullUrlOverride.trim()) {
    return fullUrlOverride.trim().replace(/\/+$/, '')
  }
  const trimmedHost = String(host || '').trim()
  const resolvedScheme = scheme || (isLoopbackHost(trimmedHost) ? 'http' : 'https')
  return `${resolvedScheme}://${trimmedHost}:8080`
}

function friendlyNetError(code) {
  switch (code) {
    case 'ERR_NAME_NOT_RESOLVED':
      return "Couldn't resolve that address — check the IP is correct and this machine can reach that network."
    case 'ERR_CONNECTION_REFUSED':
      return 'Connection refused — the server is reachable but nothing is listening on that port. Confirm the app is actually running there.'
    case 'ERR_CONNECTION_TIMED_OUT':
    case 'ERR_TIMED_OUT':
      return "Connection timed out — the server didn't respond. Check the network path and firewall."
    case 'ERR_CONNECTION_CLOSED':
    case 'ERR_CONNECTION_RESET':
      return 'The connection was closed unexpectedly while talking to that server.'
    default:
      return `Connection failed (${code || 'unknown error'}).`
  }
}

// ── Explicit cookie jar — a plain name->value map, sent back verbatim as a
// single "Cookie" header on every subsequent request. Deliberately not
// relying on net.request's own session-cookie-jar behavior — see the file
// header comment for why. ─────────────────────────────────────────────────
function parseSetCookie(headerValues) {
  const cookies = {}
  const values = Array.isArray(headerValues) ? headerValues : (headerValues ? [headerValues] : [])
  for (const raw of values) {
    const firstPart = String(raw).split(';')[0]
    const eqIdx = firstPart.indexOf('=')
    if (eqIdx === -1) continue
    const name = firstPart.slice(0, eqIdx).trim()
    const value = firstPart.slice(eqIdx + 1).trim()
    if (name) cookies[name] = value
  }
  return cookies
}

function cookieHeader(jar) {
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ')
}

function httpRequest(session, { method, url, headers, body }) {
  return new Promise((resolve, reject) => {
    // 'manual' — never auto-follow a redirect. NextAuth's credentials
    // callback, with json:true in the body, responds 200+JSON directly on
    // both success and failure (that's the whole point of json:true); we
    // only ever care about the raw response + its Set-Cookie headers here,
    // never about actually navigating to whatever it might redirect to.
    const request = electronNet.request({ method, url, session, redirect: 'manual' })
    for (const [key, value] of Object.entries(headers || {})) {
      request.setHeader(key, value)
    }
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      request.abort()
      reject({ code: 'ERR_TIMED_OUT', message: friendlyNetError('ERR_TIMED_OUT') })
    }, REQUEST_TIMEOUT_MS)

    request.on('response', (response) => {
      const chunks = []
      response.on('data', (chunk) => chunks.push(chunk))
      response.on('end', () => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve({ statusCode: response.statusCode, headers: response.headers, body: Buffer.concat(chunks).toString('utf-8') })
      })
      response.on('error', (error) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        reject({ code: error?.code || 'ERR_UNKNOWN', message: error?.message })
      })
    })
    request.on('error', (error) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      reject({ code: error?.code || 'ERR_UNKNOWN', message: error?.message })
    })

    if (body) request.write(body)
    request.end()
  })
}

// The actual test, against one specific URL — factored out of testConnection
// so it can be tried against more than one candidate URL for an ambiguous
// loopback host (see testConnection's own comment on why that's needed).
// Two-step flow driven by the caller (main.js): call once with no
// `trustFingerprint` — if the server's cert is untrusted, this returns
// { ok: false, reason: 'untrusted-certificate', certInfo } WITHOUT ever
// attempting login, so the UI can show the cert to the admin and ask for
// explicit confirmation. Call again with `trustFingerprint` set to that
// exact fingerprint once confirmed, which proceeds through the real login
// check and returns the fingerprint for the caller to pin on success.
async function attemptConnection(url, { identifier, password, trustFingerprint }) {
  let parsedUrl
  try {
    parsedUrl = new URL(url)
  } catch {
    return { ok: false, reason: 'invalid-url', message: 'That address could not be parsed as a URL.' }
  }

  const testSession = electronSession.fromPartition(`test-connection-${Date.now()}-${Math.random().toString(36).slice(2)}`, { cache: false })
  const jar = {}

  let encounteredCert = null
  testSession.setCertificateVerifyProc((request, callback) => {
    if (request.errorCode === 0) {
      callback(0) // already trusted via normal CA chain — nothing to prompt for
      return
    }
    const fingerprint = request.certificate?.fingerprint
    encounteredCert = {
      issuer: request.certificate?.issuer?.commonName || request.certificate?.issuer?.organizations?.[0] || 'Unknown issuer',
      subject: request.certificate?.subject?.commonName || request.hostname,
      fingerprint,
    }
    if (trustFingerprint && fingerprint === trustFingerprint) {
      callback(0) // explicitly confirmed by the admin in a prior step
    } else {
      callback(-2) // reject — surfaced below as 'untrusted-certificate'
    }
  })

  try {
    let csrfRes
    try {
      csrfRes = await httpRequest(testSession, { method: 'GET', url: `${parsedUrl.origin}/api/auth/csrf` })
    } catch (error) {
      if (encounteredCert) {
        return { ok: false, reason: 'untrusted-certificate', certInfo: encounteredCert, url }
      }
      return { ok: false, reason: 'unreachable', message: friendlyNetError(error.code), url }
    }
    Object.assign(jar, parseSetCookie(csrfRes.headers?.['set-cookie']))
    console.log('[connection-test] GET /api/auth/csrf ->', csrfRes.statusCode, 'cookies received:', Object.keys(jar))

    let csrfToken
    try {
      csrfToken = JSON.parse(csrfRes.body).csrfToken
    } catch {
      return { ok: false, reason: 'unexpected-response', message: 'That address responded, but not with what this app expects — is it definitely running the right server?', url }
    }
    if (!csrfToken) {
      return { ok: false, reason: 'unexpected-response', message: 'That address responded, but not with what this app expects — is it definitely running the right server?', url }
    }
    if (Object.keys(jar).length === 0) {
      // No cookie at all came back from /api/auth/csrf — the POST below is
      // guaranteed to fail CSRF validation server-side no matter how
      // correct the password is. Surfaced as its own reason rather than
      // silently falling through to the generic "invalid credentials"
      // message, which would be actively misleading here.
      console.warn('[connection-test] No Set-Cookie on /api/auth/csrf response — CSRF cookie missing, login will fail regardless of credentials')
      return { ok: false, reason: 'unexpected-response', message: "The server didn't set a session cookie on the initial connection — check it's serving over the expected protocol/port and isn't behind something stripping cookies (a proxy, mixed HTTP/HTTPS, etc.).", url }
    }

    const loginBody = new URLSearchParams({
      csrfToken,
      identifier: identifier || '',
      password: password || '',
      json: 'true',
      callbackUrl: parsedUrl.origin,
    }).toString()

    let loginRes
    try {
      loginRes = await httpRequest(testSession, {
        method: 'POST',
        url: `${parsedUrl.origin}/api/auth/callback/credentials`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': cookieHeader(jar),
          // Matches next-auth/react's own signIn() client exactly — some
          // NextAuth versions key off this header (not just json:true in
          // the body) to decide whether to respond with JSON instead of a
          // redirect.
          'X-Auth-Return-Redirect': '1',
        },
        body: loginBody,
      })
    } catch (error) {
      return { ok: false, reason: 'unreachable', message: friendlyNetError(error.code), url }
    }
    Object.assign(jar, parseSetCookie(loginRes.headers?.['set-cookie']))
    console.log('[connection-test] POST /api/auth/callback/credentials ->', loginRes.statusCode, 'cookies now:', Object.keys(jar))

    let sessionRes
    try {
      sessionRes = await httpRequest(testSession, {
        method: 'GET',
        url: `${parsedUrl.origin}/api/auth/session`,
        headers: { 'Cookie': cookieHeader(jar) },
      })
    } catch (error) {
      return { ok: false, reason: 'unreachable', message: friendlyNetError(error.code), url }
    }
    console.log('[connection-test] GET /api/auth/session ->', sessionRes.statusCode, 'body:', sessionRes.body)

    let sessionData
    try {
      sessionData = JSON.parse(sessionRes.body)
    } catch {
      sessionData = {}
    }

    if (!sessionData || !sessionData.user) {
      return { ok: false, reason: 'invalid-credentials', message: 'That email/password was not accepted by that server.', url }
    }
    if (sessionData.user.role !== 'admin') {
      return { ok: false, reason: 'not-admin', message: `That login works, but "${sessionData.user.email || identifier}" is not an admin account on that server.`, url }
    }

    return {
      ok: true,
      url,
      adminEmail: sessionData.user.email,
      certFingerprint: encounteredCert?.fingerprint || null,
    }
  } finally {
    // Never leave the test session logged in or holding cookies — this was
    // only ever meant to verify, not to become the operator's real session.
    testSession.clearStorageData().catch(() => {})
  }
}

// Public entry point (main.js's servers:testConnection IPC handler calls
// this, not attemptConnection directly).
async function testConnection({ host, fullUrlOverride, identifier, password, trustFingerprint }) {
  if (!fullUrlOverride && !isValidIp(host)) {
    return { ok: false, reason: 'invalid-ip', message: 'That is not a valid IP address (or "localhost").' }
  }

  const trimmedHost = String(host || '').trim()

  // Loopback is genuinely ambiguous, unlike every other server this app
  // talks to: a bare `npm run dev` instance is plain HTTP, but a full
  // production-configured install running on this same machine (certs
  // present — see server.ts's `useHttps`) is HTTPS-only on that very same
  // port, and there's no way to tell which one this is from the hostname
  // alone. Defaulting loopback to http unconditionally (the old behavior)
  // meant testing "localhost" or "127.0.0.1" against a machine's own
  // HTTPS-enabled production install failed outright with a bare,
  // uninformative network error, while the exact same machine's real LAN
  // IP worked fine. Try https first — the same default every non-loopback
  // server already gets — and only fall back to http if that specific
  // attempt can't even reach the server; once any real response comes
  // back (including an untrusted-certificate prompt), the right protocol
  // has been found and there's no reason to try the other one.
  if (!fullUrlOverride && isLoopbackHost(trimmedHost)) {
    const httpsResult = await attemptConnection(buildUrl({ host: trimmedHost, scheme: 'https' }), { identifier, password, trustFingerprint })
    if (httpsResult.ok || httpsResult.reason !== 'unreachable') return httpsResult
    return attemptConnection(buildUrl({ host: trimmedHost, scheme: 'http' }), { identifier, password, trustFingerprint })
  }

  return attemptConnection(buildUrl({ host: trimmedHost, fullUrlOverride }), { identifier, password, trustFingerprint })
}

module.exports = { isValidIp, buildUrl, testConnection }
