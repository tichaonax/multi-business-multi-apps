// MBM-331 — Farm Control camera integration, server side.
// The MBM server never talks to Farm Control: it only signs a short assertion
// naming the signed-in user (guide §4), which the user's browser exchanges for
// a Farm Control session. The signing private key lives in a file on this
// server (data/farm-control/keys/<kid>.pem, gitignored), never in the database.
import { createPrivateKey, generateKeyPairSync, randomUUID, sign } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { prisma } from '@/lib/prisma'
import { getBusinessesWithPermission, SessionUser } from '@/lib/permission-utils'

const KEY_DIR = path.join(process.cwd(), 'data', 'farm-control', 'keys')
const KEY_ID_PATTERN = /^[A-Za-z0-9._-]{1,40}$/

/** This server's integration settings (one row), or null before it's set up. */
export async function getFarmControlIntegration() {
  return prisma.farmControlIntegrations.findFirst({ orderBy: { createdAt: 'asc' } })
}

/** True when the connection is complete enough to sign assertions. */
export function isIntegrationReady(i: Awaited<ReturnType<typeof getFarmControlIntegration>>): i is NonNullable<typeof i> {
  return !!i && i.isEnabled && !!i.baseUrl && !!i.integrationId && !!i.audience && !!i.keyId
}

function keyPath(keyId: string) {
  if (!KEY_ID_PATTERN.test(keyId)) throw new Error('Invalid key id')
  return path.join(KEY_DIR, `${keyId}.pem`)
}

export async function hasPrivateKey(keyId: string): Promise<boolean> {
  if (!keyId || !KEY_ID_PATTERN.test(keyId)) return false
  return fs.access(keyPath(keyId)).then(() => true, () => false)
}

/**
 * Makes a new Ed25519 key pair (guide §4.1). The private key is written to the
 * key folder; the public key (PEM) is returned to be sent to FarmNet. An
 * existing key with the same id is never overwritten.
 */
export async function generateSigningKey(keyId: string): Promise<{ keyId: string; publicKeyPem: string }> {
  const file = keyPath(keyId)
  if (await hasPrivateKey(keyId)) throw new Error(`A key with id "${keyId}" already exists`)
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  await fs.mkdir(KEY_DIR, { recursive: true })
  await fs.writeFile(file, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600, flag: 'wx' })
  return { keyId, publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }).toString() }
}

const b64u = (b: Buffer | string) => Buffer.from(b).toString('base64url')

/** A compact EdDSA JWT for this user, valid 60 s, used once (guide §4.2). */
export async function signAssertion(
  integration: { integrationId: string; audience: string; keyId: string },
  user: { id: string; name?: string | null }
): Promise<string> {
  const key = createPrivateKey(await fs.readFile(keyPath(integration.keyId)))
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'EdDSA', typ: 'JWT', kid: integration.keyId }
  const claims = {
    iss: integration.integrationId,
    aud: integration.audience,
    sub: user.id,
    perm: ['camera-integration'],
    iat: now,
    exp: now + 60,
    jti: randomUUID(),
    ...(user.name ? { name: user.name } : {}),
  }
  const input = `${b64u(JSON.stringify(header))}.${b64u(JSON.stringify(claims))}`
  return `${input}.${b64u(sign(null, Buffer.from(input), key))}`
}

export interface CameraAccess {
  /** Camera ids the user may see (MBM side, rules 1-3 of the plan) */
  cameraIds: string[]
  /** Subset the user may also record / take pictures of */
  captureCameraIds: string[]
  /** Per camera, the businesses that grant it (for filtering in the UI) */
  cameraBusinesses: Record<string, string[]>
}

/**
 * A user's Farm Control id is their MBM user id (`sub`, guide §3.1). It
 * counts as created once a camera admin creates it (status REQUESTED), and
 * stays while the link is LINKED or REFUSED; NOT_REQUESTED means none.
 * Creating the id is MBM's grant to use farm cameras at all.
 */
export const hasFarmId = (status: string | null | undefined) => !!status && status !== 'NOT_REQUESTED'

const businessCamerasEnabled = (settings: unknown) =>
  !!settings && typeof settings === 'object' && (settings as Record<string, unknown>).farmCamerasEnabled === true

/**
 * MBM's half of the access rule: cameras assigned to businesses that have
 * camera access switched on and where the user holds canViewFarmCameras, or
 * every such business when a camera admin set "all businesses" for the user.
 * Farm Control applies its own permissions on top. Admins get nothing
 * automatically (decision D3): only explicit grants count.
 */
export async function getUserCameraAccess(user: SessionUser): Promise<CameraAccess> {
  // No Farm Control id: no cameras, whatever the permissions say
  const link = await prisma.farmControlUserLinks.findUnique({
    where: { userId: user.id },
    select: { status: true, viewAllBusinesses: true, captureAllBusinesses: true },
  })
  if (!hasFarmId(link?.status)) return { cameraIds: [], captureCameraIds: [], cameraBusinesses: {} }
  const viewAll = !!link?.viewAllBusinesses
  const captureAll = viewAll && !!link?.captureAllBusinesses
  const viewBusinessIds = getBusinessesWithPermission(user, 'canViewFarmCameras').map(m => m.businessId)
  const captureBusinessIds = new Set(getBusinessesWithPermission(user, 'canCaptureFarmCameras').map(m => m.businessId))
  if (viewBusinessIds.length === 0 && !viewAll) return { cameraIds: [], captureCameraIds: [], cameraBusinesses: {} }

  const enabledBusinesses = await prisma.businesses.findMany({
    where: { ...(viewAll ? {} : { id: { in: viewBusinessIds } }), isActive: true },
    select: { id: true, settings: true },
  })
  if (captureAll) enabledBusinesses.forEach(b => captureBusinessIds.add(b.id))
  const enabledIds = enabledBusinesses.filter(b => businessCamerasEnabled(b.settings)).map(b => b.id)
  if (enabledIds.length === 0) return { cameraIds: [], captureCameraIds: [], cameraBusinesses: {} }

  const rows = await prisma.farmControlCameraBusinesses.findMany({
    where: { businessId: { in: enabledIds } },
    select: { cameraId: true, businessId: true },
  })
  const cameraBusinesses: Record<string, string[]> = {}
  for (const r of rows) (cameraBusinesses[r.cameraId] ||= []).push(r.businessId)
  const cameraIds = Object.keys(cameraBusinesses)
  const captureCameraIds = cameraIds.filter(id => cameraBusinesses[id].some(b => captureBusinessIds.has(b)))
  return { cameraIds, captureCameraIds, cameraBusinesses }
}

/** The user's preferences, with defaults when none are saved yet. */
export async function getCameraPreferences(userId: string) {
  const p = await prisma.farmCameraUserPreferences.findUnique({ where: { userId } })
  return {
    stripVisible: p?.stripVisible ?? true,
    stripCameraIds: p?.stripCameraIds ?? [],
    stripMode: (p?.stripMode === 'pictures' ? 'pictures' : 'live') as 'live' | 'pictures',
    posStripMode: (p?.posStripMode === 'live' ? 'live' : 'pictures') as 'live' | 'pictures',
    showNamesOnStrip: p?.showNamesOnStrip ?? true,
    showStripOnPos: p?.showStripOnPos ?? false,
    cameraLabels: (p?.cameraLabels && typeof p.cameraLabels === 'object' ? p.cameraLabels : {}) as Record<string, { name?: string; showName?: boolean }>,
    alertsBell: p?.alertsBell ?? true,
    alertsChat: p?.alertsChat ?? true,
  }
}

/**
 * MBM-332 — a user as getServerUser() shapes them, loaded without a browser
 * session (for the alerts poller, which runs in the server process; it must
 * not pull in next-auth / next/server). Null when missing or inactive.
 */
export async function loadCameraUser(userId: string): Promise<SessionUser | null> {
  const [u, memberships] = await Promise.all([
    prisma.users.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true, role: true, permissions: true, isActive: true } }),
    prisma.businessMemberships.findMany({ where: { userId, isActive: true }, include: { businesses: { select: { id: true, name: true, type: true } } } }),
  ])
  if (!u || !u.isActive) return null
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    permissions: (u.permissions || {}) as Record<string, any>,
    businessMemberships: memberships.map(m => ({
      businessId: m.businesses.id,
      businessName: m.businesses.name,
      businessType: m.businesses.type,
      role: m.role,
      permissions: (m.permissions || {}) as Record<string, any>,
      isActive: m.isActive,
      joinedAt: m.joinedAt,
      lastAccessedAt: m.lastAccessedAt,
    })),
  } as SessionUser
}

/** MBM-332 — the Farm Control site ids of these cameras (from the camera ↔ business rows). */
export async function getCameraSiteIds(cameraIds: string[]): Promise<Set<string>> {
  if (cameraIds.length === 0) return new Set()
  const rows = await prisma.farmControlCameraBusinesses.findMany({ where: { cameraId: { in: cameraIds } }, select: { siteId: true } })
  return new Set(rows.map(r => r.siteId).filter(Boolean))
}
