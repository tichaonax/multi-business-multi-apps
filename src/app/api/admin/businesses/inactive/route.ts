import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin, SessionUser } from '@/lib/permission-utils'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser

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
