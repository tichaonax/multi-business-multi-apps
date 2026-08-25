/**
 * MBM-275: scale device config for AGENT mode (workstation-agent-relayed
 * MG-S8200) — distinct from the legacy /api/scale-config route, which
 * handles the existing DIRECT/Electron-local path (Businesses.settings
 * fallback) and is untouched by this feature. One active config per
 * business, same "one scale" assumption the legacy path already made.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/get-server-user'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin, getUserRoleInBusiness } from '@/lib/permission-utils'

function isBusinessAdmin(user: Awaited<ReturnType<typeof getServerUser>>, businessId: string): boolean {
  if (!user) return false
  return isSystemAdmin(user) || getUserRoleInBusiness(user, businessId) === 'business-owner'
}

export async function GET(request: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const businessId = searchParams.get('businessId')
  if (!businessId) return NextResponse.json({ error: 'businessId parameter required' }, { status: 400 })

  const hasAccess = isSystemAdmin(user) || user.businessMemberships?.some(m => m.businessId === businessId && m.isActive)
  if (!hasAccess) return NextResponse.json({ error: 'Access denied to this business' }, { status: 403 })

  const config = await prisma.scaleDeviceConfigs.findFirst({
    where: { businessId, isActive: true },
    orderBy: { createdAt: 'desc' },
    include: { workstation_agent: { select: { id: true, label: true, connectionStatus: true } } },
  })

  return NextResponse.json({ success: true, config })
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { businessId, workstationAgentId, comPort, baudRate } = body as {
      businessId?: string
      workstationAgentId?: string
      comPort?: string
      baudRate?: number
    }

    if (!businessId || !workstationAgentId) {
      return NextResponse.json({ error: 'businessId and workstationAgentId are required' }, { status: 400 })
    }
    if (!isBusinessAdmin(user, businessId)) {
      return NextResponse.json({ error: 'Forbidden: business admin access required' }, { status: 403 })
    }

    const agent = await prisma.workstationAgents.findUnique({ where: { id: workstationAgentId } })
    if (!agent || agent.businessId !== businessId) {
      return NextResponse.json({ error: 'Workstation agent not found for this business' }, { status: 404 })
    }

    const existing = await prisma.scaleDeviceConfigs.findFirst({ where: { businessId, isActive: true } })

    const config = existing
      ? await prisma.scaleDeviceConfigs.update({
          where: { id: existing.id },
          data: { workstationAgentId, comPort: comPort ?? null, baudRate: baudRate ?? null },
        })
      : await prisma.scaleDeviceConfigs.create({
          data: { businessId, workstationAgentId, comPort: comPort ?? null, baudRate: baudRate ?? null },
        })

    return NextResponse.json({ success: true, config })
  } catch (error) {
    console.error('[Scale Device Config] POST error:', error)
    return NextResponse.json({ error: 'Failed to save scale device config' }, { status: 500 })
  }
}
