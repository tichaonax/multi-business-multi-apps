import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasUserPermission } from '@/lib/permission-utils'
import { generateSigningKey, getFarmControlIntegration } from '@/lib/farm-control/server'

/**
 * MBM-331 — POST /api/admin/farm-control/keys { keyId? }
 * Makes a new Ed25519 signing key on this server and makes it the active one.
 * The private key stays in data/farm-control/keys/; only the public key is
 * returned, to be sent to FarmNet. Farm Control holds up to two keys per
 * integration, so the previous key keeps working until FarmNet removes it.
 */
export async function POST(request: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasUserPermission(user, 'canManageFarmControl')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const now = new Date()
  const suggested = `mbm-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${now.getHours()}${String(now.getMinutes()).padStart(2, '0')}`
  const keyId = typeof body.keyId === 'string' && body.keyId.trim() ? body.keyId.trim() : suggested

  let made
  try {
    made = await generateSigningKey(keyId)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not make the key' }, { status: 400 })
  }

  const existing = await getFarmControlIntegration()
  const data = { keyId: made.keyId, publicKeyPem: made.publicKeyPem }
  if (existing) await prisma.farmControlIntegrations.update({ where: { id: existing.id }, data })
  else await prisma.farmControlIntegrations.create({ data })

  return NextResponse.json({ success: true, data: { ...made, previousKeyId: existing?.keyId || null } })
}
