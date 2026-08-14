import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

function canManage(user: any, businessId: string) {
  const perms = getEffectivePermissions(user, businessId)
  return user.role === 'admin' || perms.canManageEmployees
}

// POST /api/vehicle-service/contractors/[contractorId]/provision-login
// Body: { email, password? }
// Creates a login for the contractor portal only. Deliberately does NOT create any
// BusinessMemberships row — contractors are kept out of the BusinessPermissions
// matrix entirely; the portal gates access purely via VehicleServiceContractors.userId.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ contractorId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { contractorId } = await params
    const body = await request.json()
    const { email, password } = body as { email?: string; password?: string }

    if (!email || !email.trim()) return NextResponse.json({ error: 'email is required' }, { status: 400 })

    const contractor = await prisma.vehicleServiceContractors.findUnique({
      where: { id: contractorId },
      include: { persons: { select: { fullName: true } } },
    })
    if (!contractor) return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })
    if (!canManage(user, contractor.businessId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (contractor.userId) {
      return NextResponse.json({ error: 'This contractor already has a login' }, { status: 409 })
    }

    const existingUser = await prisma.users.findUnique({ where: { email: email.trim() } })
    if (existingUser) {
      return NextResponse.json({ error: 'Email address is already in use' }, { status: 409 })
    }

    const finalPassword = password || Math.random().toString(36).slice(-12)
    const hashedPassword = await hash(finalPassword, 12)

    const newUser = await prisma.$transaction(async (tx) => {
      const created = await tx.users.create({
        data: {
          id: randomUUID(),
          name: contractor.persons.fullName,
          email: email.trim(),
          passwordHash: hashedPassword,
          role: 'user',
          isActive: true,
          passwordResetRequired: !password,
        },
      })
      await tx.vehicleServiceContractors.update({
        where: { id: contractorId },
        data: { userId: created.id },
      })
      return created
    })

    return NextResponse.json({
      success: true,
      user: { id: newUser.id, email: newUser.email },
      temporaryPassword: password ? undefined : finalPassword,
    })
  } catch (error) {
    console.error('Provision contractor login error:', error)
    return NextResponse.json({ error: 'Failed to create login' }, { status: 500 })
  }
}
