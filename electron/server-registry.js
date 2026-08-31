/**
 * Multi-server registry for the Electron shell — lets one kiosk install be
 * pointed at several different app servers (different companies, or a
 * test server alongside a real one) and switch between them, each with its
 * own completely isolated login (see main.js's per-server session
 * partitions — this module only owns the on-disk registry itself, not the
 * actual session isolation).
 *
 * Stored via electron-store (already a dependency here — scale-service.js
 * uses it the same way for its own config) rather than hand-rolled fs
 * calls: atomic writes, so a crash mid-save can't corrupt the registry the
 * way a plain writeFileSync could. Same "small local JSON file, one entry
 * per registered server" shape the standalone r710-agent.exe already uses
 * for its own multi-server profile storage (profile-store.ts), just
 * applied here to Electron's own registry instead.
 */

const Store = require('electron-store')
const crypto = require('crypto')

const store = new Store({ name: 'servers' })

function defaultData() {
  return {
    pinHash: null,
    pinSalt: null,
    lastUsedServerId: null,
    servers: [],
  }
}

function load() {
  const data = store.get('data')
  // Defensive against a partially-written or older-shaped value — never
  // let a corrupt registry crash the app, just fall back to empty.
  if (!data || !Array.isArray(data.servers)) return defaultData()
  return { ...defaultData(), ...data }
}

function save(data) {
  store.set('data', data)
}

// Stable id derived from the server's URL (not the label, which the admin
// can freely rename) — same reasoning as the local agent's deriveProfileId:
// the identity of "this registered server" shouldn't change just because
// someone edits its display name later. Also used as the session partition
// name, so it must be filesystem/partition-name safe.
function deriveServerId(url) {
  return crypto.createHash('sha256').update(url).digest('hex').slice(0, 16)
}

function list() {
  return load().servers
}

function get(id) {
  return load().servers.find((s) => s.id === id) || null
}

function add({ label, host, url, supportContact, certFingerprint }) {
  const data = load()
  const id = deriveServerId(url)
  const existing = data.servers.find((s) => s.id === id)
  const entry = {
    id,
    label,
    host,
    url,
    supportContact: supportContact || null,
    certFingerprint: certFingerprint || null,
    addedAt: existing?.addedAt || new Date().toISOString(),
  }
  if (existing) {
    Object.assign(existing, entry)
  } else {
    data.servers.push(entry)
  }
  save(data)
  return entry
}

function remove(id) {
  const data = load()
  data.servers = data.servers.filter((s) => s.id !== id)
  if (data.lastUsedServerId === id) data.lastUsedServerId = null
  save(data)
}

// Device-level "always open on this business" setting — deliberately stored
// per-server (a default business only means anything in the context of
// whichever server's data it refers to), and deliberately separate from
// anything in the app's own localStorage/session state, which is
// per-user and per-login, not a kiosk-wide device setting.
function setDefaultBusiness(id, businessId, businessLabel) {
  const data = load()
  const entry = data.servers.find((s) => s.id === id)
  if (!entry) return null
  entry.defaultBusinessId = businessId || null
  entry.defaultBusinessLabel = businessLabel || null
  save(data)
  return entry
}

function setLastUsed(id) {
  const data = load()
  data.lastUsedServerId = id
  save(data)
}

function getLastUsed() {
  const data = load()
  if (!data.lastUsedServerId) return null
  return data.servers.find((s) => s.id === data.lastUsedServerId) || null
}

// Certificate pinning: recorded only after an admin has explicitly
// confirmed trust for a self-signed cert during the add-server test (see
// connection-test.js) — future connections to this server are checked
// against this exact fingerprint, not just "any cert claiming this host."
function setCertFingerprint(id, fingerprint) {
  const data = load()
  const entry = data.servers.find((s) => s.id === id)
  if (entry) {
    entry.certFingerprint = fingerprint
    save(data)
  }
}

// ── PIN (add/remove gate) ───────────────────────────────────────────────
// Deliberately a light deterrent, not a strong security boundary — see the
// design discussion this shipped from. Anyone with real file access to this
// machine's userData folder can delete pinHash/pinSalt to reset it, same
// trust level as every other local config this app already keeps (env
// vars, the local agent's own pairing files). Its job is to stop a cashier
// or customer from casually adding/removing a server through the picker
// UI, not to resist a determined attacker with disk access.
function hashPin(pin, salt) {
  return crypto.scryptSync(pin, salt, 64).toString('hex')
}

function hasPin() {
  const data = load()
  return !!(data.pinHash && data.pinSalt)
}

function setPin(pin) {
  const data = load()
  const salt = crypto.randomBytes(16).toString('hex')
  data.pinSalt = salt
  data.pinHash = hashPin(pin, salt)
  save(data)
}

function verifyPin(pin) {
  const data = load()
  if (!data.pinHash || !data.pinSalt) return false
  try {
    const candidate = hashPin(pin, data.pinSalt)
    return crypto.timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(data.pinHash, 'hex'))
  } catch {
    return false
  }
}

// Resets the PIN back to "not set" — the only recovery path for a
// forgotten PIN (see the module comment above on why that's an acceptable
// tradeoff for this threat model). Deliberately does NOT touch the server
// list itself.
function clearPin() {
  const data = load()
  data.pinHash = null
  data.pinSalt = null
  save(data)
}

module.exports = {
  deriveServerId,
  list,
  get,
  add,
  remove,
  setLastUsed,
  getLastUsed,
  setDefaultBusiness,
  setCertFingerprint,
  hasPin,
  setPin,
  verifyPin,
  clearPin,
}
