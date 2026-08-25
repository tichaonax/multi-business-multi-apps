import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'
import { resolveScaleConfig, dispatchScaleJob } from '@/lib/scale/dispatch'

export async function POST(request: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { businessId } = await request.json()
  if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })

  const hasAccess = isSystemAdmin(user) || user.businessMemberships?.some(m => m.businessId === businessId && m.isActive)
  if (!hasAccess) return NextResponse.json({ error: 'Access denied to this business' }, { status: 403 })

  const config = await resolveScaleConfig(businessId)
  if (!config) return NextResponse.json({ error: 'No scale configured for this business yet' }, { status: 404 })

  return dispatchScaleJob(config.workstationAgentId, 'SCALE_TARE', undefined, user.id)
}
