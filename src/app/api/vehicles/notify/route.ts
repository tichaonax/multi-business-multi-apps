import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { driverId, message } = body
    if (!driverId) return NextResponse.json({ error: 'driverId is required' }, { status: 400 })

    // Lookup driver contact info (email/phone) and simulate sending notification
  const driver = await prisma.vehicle_drivers.findUnique({ where: { id: driverId }, select: { id: true, fullName: true, emailAddress: true, phoneNumber: true } })

  if (!driver) return NextResponse.json({ error: 'Driver not found' }, { status: 404 })

  // In a real system you'd integrate with email/SMS/push providers here.
  console.log(`Notify driver ${driver.fullName} (${driver.emailAddress || driver.phoneNumber}) - message: ${message}`)

    return NextResponse.json({ success: true, message: 'Notification queued' })
  } catch (err) {
    console.error('Failed to send notification', err)
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 })
  }
}
