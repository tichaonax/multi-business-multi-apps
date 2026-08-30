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
 */

const nodeNet = require('net')
const { net: electronNet, session: electronSession } = require('electron')

const REQUEST_TIMEOUT_MS = 8000

function isValidIp(str) {
  return nodeNet.isIP(String(str || '').trim()) !== 0
}

// Bare IP -> https://<ip>:8080 (the documented standard default port this
// app's own deployment guide uses everywhere). A caller-supplied full URL
// (custom port, hostname, even http:// for a quick unsecured test box) is
// respected as-is instead — see the "Advanced: full URL" field.
function buildUrl({ host, fullUrlOverride }) {
  if (fullUrlOverride && fullUrlOverride.trim()) {
    return fullUrlOverride.trim().replace(/\/+$/, '')
  }
  return `https://${host}:8080`
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

function httpRequest(session, { method, url, headers, body }) {
  return new Promise((resolve, reject) => {
    const request = electronNet.request({ method, url, session, redirect: 'follow' })
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
        resolve({ statusCode: response.statusCode, body: Buffer.concat(chunks).toString('utf-8') })
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

// Two-step flow driven by the caller (main.js): call once with no
// `trustFingerprint` — if the server's cert is untrusted, this returns
// { ok: false, reason: 'untrusted-certificate', certInfo } WITHOUT ever
// attempting login, so the UI can show the cert to the admin and ask for
// explicit confirmation. Call again with `trustFingerprint` set to that
// exact fingerprint once confirmed, which proceeds through the real login
// check and returns the fingerprint for the caller to pin on success.
async function testConnection({ host, fullUrlOverride, identifier, password, trustFingerprint }) {
  if (!fullUrlOverride && !isValidIp(host)) {
    return { ok: false, reason: 'invalid-ip', message: 'That is not a valid IP address.' }
  }

  const url = buildUrl({ host, fullUrlOverride })
  let parsedUrl
  try {
    parsedUrl = new URL(url)
  } catch {
    return { ok: false, reason: 'invalid-url', message: 'That address could not be parsed as a URL.' }
  }

  const testSession = electronSession.fromPartition(`test-connection-${Date.now()}-${Math.random().toString(36).slice(2)}`, { cache: false })

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

    let csrfToken
    try {
      csrfToken = JSON.parse(csrfRes.body).csrfToken
    } catch {
      return { ok: false, reason: 'unexpected-response', message: 'That address responded, but not with what this app expects — is it definitely running the right server?', url }
    }
    if (!csrfToken) {
      return { ok: false, reason: 'unexpected-response', message: 'That address responded, but not with what this app expects — is it definitely running the right server?', url }
    }

    const loginBody = new URLSearchParams({
      csrfToken,
      identifier: identifier || '',
      password: password || '',
      json: 'true',
      callbackUrl: parsedUrl.origin,
    }).toString()

    try {
      await httpRequest(testSession, {
        method: 'POST',
        url: `${parsedUrl.origin}/api/auth/callback/credentials`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: loginBody,
      })
    } catch (error) {
      return { ok: false, reason: 'unreachable', message: friendlyNetError(error.code), url }
    }

    let sessionRes
    try {
      sessionRes = await httpRequest(testSession, { method: 'GET', url: `${parsedUrl.origin}/api/auth/session` })
    } catch (error) {
      return { ok: false, reason: 'unreachable', message: friendlyNetError(error.code), url }
    }

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

module.exports = { isValidIp, buildUrl, testConnection }
