/**
 * R710 Remote Agent Pairing — Admin Only (MBM-272)
 *
 * Registers a new local-agent pairing for an AGENT-mode R710 device and
 * mints its one-time agent token. The raw token is returned exactly once
 * in this response — only its bcrypt hash is stored — and is handed to the
 * local agent via the one-time loopback pairing call, never typed in by
 * hand.
 */

import { randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

export async function GET(request: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isSystemAdmin(user)) return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })

  const agents = await prisma.r710RemoteAgents.findMany({
    where: { revokedAt: null },
    select: {
      id: true,
      deviceRegistryId: true,
      label: true,
      hostLabel: true,
      agentVersion: true,
      connectionStatus: true,
      lastConnectedAt: true,
      lastSeenAt: true,
      lastError: true,
      createdAt: true,
      device_registry: { select: { ipAddress: true, description: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ success: true, data: agents })
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isSystemAdmin(user)) return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })

    const body = await request.json()
    const { deviceRegistryId, label } = body as { deviceRegistryId?: string; label?: string }

    if (!deviceRegistryId || !label) {
      return NextResponse.json({ error: 'deviceRegistryId and label are required' }, { status: 400 })
    }

    const device = await prisma.r710DeviceRegistry.findUnique({ where: { id: deviceRegistryId } })
    if (!device) return NextResponse.json({ error: 'Device not found' }, { status: 404 })

    const existing = await prisma.r710RemoteAgents.findUnique({ where: { deviceRegistryId } })
    if (existing && !existing.revokedAt) {
      return NextResponse.json({ error: 'This device already has an active paired agent. Revoke it first to re-pair.' }, { status: 409 })
    }

    const rawToken = randomBytes(32).toString('hex')
    const agentTokenHash = await bcrypt.hash(rawToken, 10)

    // Flip the device to AGENT mode as part of pairing — a device only makes
    // sense to pair once someone actually wants to reach it via an agent.
    const agent = await prisma.$transaction(async (tx) => {
      const created = existing
        ? await tx.r710RemoteAgents.update({
            where: { id: existing.id },
            data: { label, agentTokenHash, pairedBy: user.id, revokedAt: null, revokedBy: null, connectionStatus: 'OFFLINE' },
          })
        : await tx.r710RemoteAgents.create({
            data: { deviceRegistryId, label, agentTokenHash, pairedBy: user.id },
          })

      await tx.r710DeviceRegistry.update({ where: { id: deviceRegistryId }, data: { connectionMode: 'AGENT' } })

      return created
    })

    return NextResponse.json({
      success: true,
      data: { agentId: agent.id, deviceRegistryId, agentToken: rawToken },
    })
  } catch (error) {
    console.error('Error creating R710 remote agent pairing:', error)
    return NextResponse.json({ error: 'Failed to create agent pairing' }, { status: 500 })
  }
}
