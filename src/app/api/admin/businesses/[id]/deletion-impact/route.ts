import { NextRequest, NextResponse } from 'next/server'
import { isSystemAdmin} from '@/lib/permission-utils'
import { getDeletionImpact } from '@/lib/business-deletion-service'
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
      return NextResponse.json({ error: 'Only system administrators can view deletion impact' }, { status: 403 })
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Missing business id' }, { status: 400 })
    }

    const impact = await getDeletionImpact(id)
    
    if (!impact) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    return NextResponse.json(impact)
  } catch (error) {
    console.error('Error getting deletion impact:', error)
    return NextResponse.json({ error: 'Failed to get deletion impact' }, { status: 500 })
  }
}
