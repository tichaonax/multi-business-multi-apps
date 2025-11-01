import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { isSystemAdmin, SessionUser } from '@/lib/permission-utils'
import { getCompatibleTargetBusinesses } from '@/lib/employee-transfer-service'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser
    if (!isSystemAdmin(user)) {
      return NextResponse.json(
        { error: 'Only system administrators can view compatible target businesses' },
        { status: 403 }
      )
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'Missing business id' }, { status: 400 })
    }

    const businesses = await getCompatibleTargetBusinesses(id)

    return NextResponse.json({
      success: true,
      count: businesses.length,
      businesses
    })
  } catch (error) {
    console.error('Error fetching compatible target businesses:', error)
    return NextResponse.json(
      { error: 'Failed to fetch compatible target businesses' },
      { status: 500 }
    )
  }
}
