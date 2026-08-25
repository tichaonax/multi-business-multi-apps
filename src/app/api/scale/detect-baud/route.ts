import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/get-server-user'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin, getUserRoleInBusiness } from '@/lib/permission-utils'
import { dispatchScaleJob } from '@/lib/scale/dispatch'

export async function POST(request: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { workstationAgentId, comPort } = await request.json()
  if (!workstationAgentId || !comPort) {
    return NextResponse.json({ error: 'workstationAgentId and comPort are required' }, { status: 400 })
  }

  const agent = await prisma.workstationAgents.findUnique({ where: { id: workstationAgentId } })
  if (!agent) return NextResponse.json({ error: 'Workstation agent not found' }, { status: 404 })

  const isAdmin = isSystemAdmin(user) || getUserRoleInBusiness(user, agent.businessId) === 'business-owner'
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden: business admin access required' }, { status: 403 })

  return dispatchScaleJob(workstationAgentId, 'SCALE_DETECT_BAUD', { comPort }, user.id)
}
