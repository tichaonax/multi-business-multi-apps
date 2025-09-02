import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getAuditLogs } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50
  const action = searchParams.get('action') || undefined
  const tableName = searchParams.get('tableName') || undefined

  try {
    const logs = await getAuditLogs({
      action: action as any,
      tableName,
      limit,
    })

    return NextResponse.json(logs)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    )
  }
}