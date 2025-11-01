import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { isSystemAdmin, SessionUser } from '@/lib/permission-utils'
import { getDeletionImpact } from '@/lib/business-deletion-service'

interface RouteParams {
  params: { id: string }
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser
    if (!isSystemAdmin(user)) {
      return NextResponse.json({ error: 'Only system administrators can view deletion impact' }, { status: 403 })
    }

    const id = params.id
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
