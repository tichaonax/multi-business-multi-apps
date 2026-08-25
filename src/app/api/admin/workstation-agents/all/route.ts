/**
 * MBM-275: lists every paired workstation agent across all businesses —
 * system-admin only. NetworkPrinters has no businessId column (printers are
 * a shared/global resource in this app's existing data model, picked as a
 * "default printer" per business via preferences, not owned by one), so
 * the printer-setup picker needs to choose a workstation from any business,
 * not just the current one — unlike the scale setup flow, which is
 * genuinely business-scoped.
 */

import { NextResponse } from 'next/server'
import { getServerUser } from '@/lib/get-server-user'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin } from '@/lib/permission-utils'

export async function GET() {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isSystemAdmin(user)) return NextResponse.json({ error: 'Forbidden: admin access required' }, { status: 403 })

  const agents = await prisma.workstationAgents.findMany({
    where: { revokedAt: null },
    select: {
      id: true,
      label: true,
      connectionStatus: true,
      businesses: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({
    success: true,
    data: agents.map(a => ({
      id: a.id,
      label: a.label,
      connectionStatus: a.connectionStatus,
      businessName: a.businesses.name,
    })),
  })
}
