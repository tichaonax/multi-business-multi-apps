/**
 * Workstation Agent Pairing — mint/list (MBM-275)
 *
 * Registers a new local-agent pairing for a business's workstation (scale +
 * printer relay) and mints its one-time agent token. Mirrors
 * /api/admin/r710/agents/route.ts closely — see that file's header comment
 * for the token-handling rationale (bcrypt hash stored, raw token returned
 * exactly once, handed to the local agent via the one-time loopback pairing
 * call, never typed by hand).
 *
 * Access: system admin, or the business-owner of the target business — same
 * as MBM-274's admin-issuance pattern, intentionally looser than R710's
 * system-admin-only precedent, since this is business-scoped hardware a
 * business owner should be able to set up without escalating to a platform
 * admin every time.
 */

import { randomBytes } from 'crypto'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { workstationAgentHub } from '@/lib/workstation-agents/agent-hub'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin, getUserRoleInBusiness } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

function readRootCaCert(): string | null {
  const rootCaPath = join(process.cwd(), 'certs', 'rootCA.pem')
  return existsSync(rootCaPath) ? readFileSync(rootCaPath, 'utf-8') : null
}

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
  if (!isBusinessAdmin(user, businessId)) {
    return NextResponse.json({ error: 'Forbidden: business admin access required' }, { status: 403 })
  }

  const agents = await prisma.workstationAgents.findMany({
    where: { businessId, revokedAt: null },
    select: {
      id: true,
      label: true,
      agentVersion: true,
      autoStartEnabled: true,
      connectionStatus: true,
      lastConnectedAt: true,
      lastSeenAt: true,
      lastError: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  // The DB's connectionStatus is only ever written at connect/disconnect
  // time — if the socket dies without a clean disconnect event (process
  // killed, network drop, machine sleep), it can keep saying ONLINE
  // indefinitely. Override with the hub's live in-memory truth on every
  // request, exactly like R710's status route already does, so a paired
  // workstation is never reported connected unless it verifiably still is.
  const data = agents.map(agent => ({
    ...agent,
    connectionStatus: workstationAgentHub.isAgentConnected(agent.id) ? 'ONLINE' as const : 'OFFLINE' as const,
  }))

  return NextResponse.json({ success: true, data })
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { businessId, label } = body as { businessId?: string; label?: string }

    if (!businessId || !label) {
      return NextResponse.json({ error: 'businessId and label are required' }, { status: 400 })
    }
    if (!isBusinessAdmin(user, businessId)) {
      return NextResponse.json({ error: 'Forbidden: business admin access required' }, { status: 403 })
    }

    const business = await prisma.businesses.findUnique({ where: { id: businessId } })
    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

    const rawToken = randomBytes(32).toString('hex')
    const agentTokenHash = await bcrypt.hash(rawToken, 10)

    const agent = await prisma.workstationAgents.create({
      data: { businessId, label, agentTokenHash, pairedBy: user.id },
    })

    return NextResponse.json({
      success: true,
      data: { workstationAgentId: agent.id, agentToken: rawToken, caCert: readRootCaCert() },
    })
  } catch (error) {
    console.error('Error creating workstation agent pairing:', error)
    return NextResponse.json({ error: 'Failed to create agent pairing' }, { status: 500 })
  }
}
