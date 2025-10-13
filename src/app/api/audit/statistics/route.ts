import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getAuditStatistics } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session || session.users.role !== 'admin') {
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