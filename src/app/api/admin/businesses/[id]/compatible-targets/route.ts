import { NextRequest, NextResponse } from 'next/server'
import { isSystemAdmin} from '@/lib/permission-utils'
import { getCompatibleTargetBusinesses } from '@/lib/employee-transfer-service'
import { getServerUser } from '@/lib/get-server-user'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
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
