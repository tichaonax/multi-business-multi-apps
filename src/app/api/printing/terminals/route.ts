/**
 * MBM-283 follow-up: self-registration for a "print terminal" — a
 * lightweight, no-agent-required identity for a printer-less device that
 * wants a centrally (admin-assigned) default remote printer. Deliberately
 * NOT a variant of workstation-agent pairing: no token, no handshake, no
 * port 47710 involved — a single API call, and the calling browser stores
 * the returned id itself (localStorage). See print-dispatch.ts / the
 * MBM-283 plan for why this exists as its own concept.
 *
 * POST: any active business member may register a terminal — it's a
 * one-time "give this browser an id" action, not a management action, so
 * it doesn't need admin/owner permission (the actual default-printer
 * assignment, in default-printer/route.ts, already is admin/owner gated).
 * GET: list all terminals for a business — admin/owner only, for the
 * management UI.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/get-server-user'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin, getUserRoleInBusiness } from '@/lib/permission-utils'

function canManageTerminals(user: Awaited<ReturnType<typeof getServerUser>>, businessId: string): boolean {
  if (!user) return false
  return isSystemAdmin(user) || getUserRoleInBusiness(user, businessId) === 'business-owner'
}

function hasBusinessAccess(user: Awaited<ReturnType<typeof getServerUser>>, businessId: string): boolean {
  if (!user) return false
  return isSystemAdmin(user) || (user.businessMemberships?.some(m => m.businessId === businessId && m.isActive) ?? false)
}

export async function GET(request: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const businessId = request.nextUrl.searchParams.get('businessId')
  if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
  if (!canManageTerminals(user, businessId)) {
    return NextResponse.json({ error: 'Forbidden: business admin access required' }, { status: 403 })
  }

  const terminals = await prisma.printTerminals.findMany({
    where: { businessId },
    orderBy: { label: 'asc' },
  })

  return NextResponse.json({ success: true, data: terminals })
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId, label } = await request.json() as { businessId?: string; label?: string }
    if (!businessId || !label?.trim()) {
      return NextResponse.json({ error: 'businessId and label are required' }, { status: 400 })
    }
    if (!hasBusinessAccess(user, businessId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const terminal = await prisma.printTerminals.create({
      data: { businessId, label: label.trim(), registeredBy: user.id, lastSeenAt: new Date() },
    })

    return NextResponse.json({ success: true, data: terminal })
  } catch (error) {
    console.error('[Print Terminals] POST error:', error)
    return NextResponse.json({ error: 'Failed to register terminal' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const terminal = await prisma.printTerminals.findUnique({ where: { id } })
  if (!terminal) return NextResponse.json({ success: true }) // already gone

  if (!canManageTerminals(user, terminal.businessId)) {
    return NextResponse.json({ error: 'Forbidden: business admin access required' }, { status: 403 })
  }

  await prisma.printTerminals.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
