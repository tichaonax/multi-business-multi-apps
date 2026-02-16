import { NextRequest, NextResponse } from 'next/server'
import { getAuditLogs } from '@/lib/audit'
import { getServerUser } from '@/lib/get-server-user'

export async function GET(req: NextRequest) {
  const user = await getServerUser()
  
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50
  const action = searchParams.get('action') || undefined
  const entityType = searchParams.get('entityType') || undefined
  const search = searchParams.get('search') || undefined
  const userId = searchParams.get('userId') || undefined
  const businessId = searchParams.get('businessId') || undefined

  try {
    const result = await getAuditLogs({
      action: action as any,
      entityType: entityType as any,
      search,
      userId,
      businessId,
      page,
      limit,
    })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    )
  }
}