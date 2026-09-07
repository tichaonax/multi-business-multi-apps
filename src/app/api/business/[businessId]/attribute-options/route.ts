import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'

const VALID_KEYS = new Set(['sizes', 'colors', 'materials'])

/**
 * GET /api/business/[businessId]/attribute-options?key=sizes|colors
 * Lists the union of this business's own custom values and the shared
 * preset vocabulary for its business type — same global/business-owned
 * split as Tags (MBM-295), applied to simple product attributes.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { businessId } = await params
  const isAdmin = isSystemAdmin(user)
  if (!isAdmin) {
    const membership = await prisma.businessMemberships.findFirst({ where: { userId: user.id, businessId, isActive: true } })
    if (!membership) return NextResponse.json({ error: 'You do not have access to this business' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const attributeKey = searchParams.get('key') || ''
  if (!VALID_KEYS.has(attributeKey)) {
    return NextResponse.json({ error: `key must be one of: ${Array.from(VALID_KEYS).join(', ')}` }, { status: 400 })
  }

  const business = await prisma.businesses.findUnique({ where: { id: businessId }, select: { type: true } })
  if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

  const options = await prisma.attributeOptions.findMany({
    where: { attributeKey, OR: [{ businessId }, { businessId: null, businessType: business.type }] },
    select: { id: true, value: true, businessId: true },
    orderBy: { value: 'asc' },
  })

  return NextResponse.json({
    success: true,
    options: options.map(o => ({ id: o.id, value: o.value, isShared: o.businessId === null })),
  })
}

/**
 * POST /api/business/[businessId]/attribute-options
 * Body: { key: 'sizes' | 'colors', value: string }
 * Adds a business-owned custom value — reuses an existing one by name if it
 * already fits (shared preset for this business type, then this business's
 * own values) instead of creating a duplicate, so it shows up in the list
 * next time regardless of who added it.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { businessId } = await params
  const isAdmin = isSystemAdmin(user)
  if (!isAdmin) {
    const membership = await prisma.businessMemberships.findFirst({ where: { userId: user.id, businessId, isActive: true } })
    if (!membership) return NextResponse.json({ error: 'You do not have access to this business' }, { status: 403 })
  }

  const business = await prisma.businesses.findUnique({ where: { id: businessId }, select: { type: true } })
  if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const attributeKey = typeof body.key === 'string' ? body.key : ''
  const value = typeof body.value === 'string' ? body.value.trim() : ''
  if (!VALID_KEYS.has(attributeKey)) {
    return NextResponse.json({ error: `key must be one of: ${Array.from(VALID_KEYS).join(', ')}` }, { status: 400 })
  }
  if (!value) return NextResponse.json({ error: 'value is required' }, { status: 400 })

  const existing = await prisma.attributeOptions.findFirst({
    where: {
      attributeKey,
      value: { equals: value, mode: 'insensitive' },
      OR: [{ businessId }, { businessId: null, businessType: business.type }],
    },
  })
  if (existing) {
    return NextResponse.json({ success: true, option: { id: existing.id, value: existing.value, isShared: existing.businessId === null } })
  }

  const option = await prisma.attributeOptions.create({
    data: { businessId, businessType: business.type, attributeKey, value, createdBy: user.id },
  })
  return NextResponse.json({ success: true, option: { id: option.id, value: option.value, isShared: false } })
}
