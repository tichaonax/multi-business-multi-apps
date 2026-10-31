import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasUserPermission } from '@/lib/permission-utils'
import { getFarmControlIntegration, hasPrivateKey } from '@/lib/farm-control/server'

/**
 * MBM-331 — GET/PUT /api/admin/farm-control/config
 * This server's Farm Control connection: address, integration id, audience,
 * active key id, origins registered with FarmNet (reference), the viewers +
 * players limit per user (2, or 3 if the farm raised it), and on/off.
 */
async function guard() {
  const user = await getServerUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (!hasUserPermission(user, 'canManageFarmControl')) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { user }
}

async function view() {
  const i = await getFarmControlIntegration()
  return {
    success: true,
    data: i
      ? { ...i, hasPrivateKey: await hasPrivateKey(i.keyId) }
      : { isEnabled: false, baseUrl: '', integrationId: '', audience: '', keyId: '', publicKeyPem: '', allowedOrigins: [], maxLargeViews: 2, hasPrivateKey: false },
  }
}

export async function GET() {
  const g = await guard()
  if (g.error) return g.error
  return NextResponse.json(await view())
}

/** Exact https origin: scheme, host and optional port, nothing else (guide §3.1). */
function cleanOrigin(value: unknown): string | null {
  if (typeof value !== 'string') return null
  try {
    const u = new URL(value.trim())
    if (u.protocol !== 'https:' || u.pathname !== '/' || u.search || u.hash || u.username) return null
    return u.origin
  } catch {
    return null
  }
}

export async function PUT(request: NextRequest) {
  const g = await guard()
  if (g.error) return g.error
  const body = await request.json().catch(() => ({}))

  const baseUrl = typeof body.baseUrl === 'string' && body.baseUrl.trim() ? cleanOrigin(body.baseUrl) : ''
  if (baseUrl === null) return NextResponse.json({ error: 'Farm Control address must be an https:// address (e.g. https://farm-server.tail1234.ts.net:8443)' }, { status: 400 })

  const origins: string[] = []
  for (const o of Array.isArray(body.allowedOrigins) ? body.allowedOrigins : []) {
    if (typeof o === 'string' && !o.trim()) continue
    const c = cleanOrigin(o)
    if (!c) return NextResponse.json({ error: `Not an exact https origin: ${o}` }, { status: 400 })
    if (!origins.includes(c)) origins.push(c)
  }
  if (origins.length > 10) return NextResponse.json({ error: 'Farm Control accepts at most 10 origins per integration' }, { status: 400 })

  const maxLargeViews = Number(body.maxLargeViews)
  if (![2, 3].includes(maxLargeViews)) return NextResponse.json({ error: 'Large views per user must be 2 or 3' }, { status: 400 })

  const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  const data = {
    baseUrl,
    integrationId: text(body.integrationId),
    audience: text(body.audience),
    allowedOrigins: origins,
    maxLargeViews,
    isEnabled: body.isEnabled === true,
  }
  const existing = await getFarmControlIntegration()
  if (data.isEnabled) {
    const keyId = existing?.keyId || ''
    if (!data.baseUrl || !data.integrationId || !data.audience || !keyId || !(await hasPrivateKey(keyId))) {
      return NextResponse.json({ error: 'Fill in the address, integration id and audience, and generate a signing key, before switching cameras on' }, { status: 400 })
    }
  }
  if (existing) await prisma.farmControlIntegrations.update({ where: { id: existing.id }, data })
  else await prisma.farmControlIntegrations.create({ data })
  return NextResponse.json(await view())
}
