import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

// PATCH /api/clock-in/employees/[id]/photo
// Body: { profilePhotoUrl: string }
// Updates just the profile photo — simpler than the full employee PUT which requires many fields
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { profilePhotoUrl } = await req.json()
    if (!profilePhotoUrl) {
      return NextResponse.json({ error: 'profilePhotoUrl is required' }, { status: 400 })
    }

    const employee = await prisma.employees.update({
      where: { id },
      data: { profilePhotoUrl },
      select: { id: true, fullName: true, profilePhotoUrl: true },
    })

    return NextResponse.json({ success: true, employee })
  } catch (error) {
    console.error('Photo update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
