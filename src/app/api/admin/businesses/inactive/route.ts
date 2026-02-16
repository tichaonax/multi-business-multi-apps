import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin} from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

export async function GET() {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // Only system admins can view inactive businesses
    if (!isSystemAdmin(user)) {
      return NextResponse.json(
        { error: 'Only system administrators can view inactive businesses' }, 
        { status: 403 }
      )
    }

    const inactiveBusinesses = await prisma.businesses.findMany({
      where: {
        isActive: false
      },
      orderBy: { updatedAt: 'desc' }
    })

    return NextResponse.json(inactiveBusinesses)
  } catch (error) {
    console.error('Error fetching inactive businesses:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inactive businesses' }, 
      { status: 500 }
    )
  }
}
