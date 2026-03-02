import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

// GET /api/employees/my-photo
// Returns the profile photo URL for the currently logged-in user's employee record.
export async function GET() {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ profilePhotoUrl: null })

    let employee = await prisma.employees.findFirst({
      where: { userId: user.id },
      select: { profilePhotoUrl: true },
    })

    // Fallback: match by email if userId lookup found nothing
    if (!employee && user.email) {
      employee = await prisma.employees.findFirst({
        where: { email: user.email },
        select: { profilePhotoUrl: true },
      })
    }

    return NextResponse.json({ profilePhotoUrl: employee?.profilePhotoUrl ?? null })
  } catch {
    return NextResponse.json({ profilePhotoUrl: null })
  }
}
