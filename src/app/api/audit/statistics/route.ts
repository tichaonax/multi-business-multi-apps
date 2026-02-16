import { NextRequest, NextResponse } from 'next/server'
import { getAuditStatistics } from '@/lib/audit'
import { getServerUser } from '@/lib/get-server-user'

export async function GET(req: NextRequest) {
  const user = await getServerUser()

  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const days = searchParams.get('days') ? parseInt(searchParams.get('days')!) : 30

  try {
    const statistics = await getAuditStatistics(days)
    return NextResponse.json(statistics)
  } catch (error) {
    console.error('Failed to fetch audit statistics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch audit statistics' },
      { status: 500 }
    )
  }
}