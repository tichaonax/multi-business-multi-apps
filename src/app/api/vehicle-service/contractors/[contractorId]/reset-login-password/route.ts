import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { createAuditLog } from '@/lib/audit'

function canManage(user: any, businessId: string) {
  const perms = getEffectivePermissions(user, businessId)
  return user.role === 'admin' || perms.canManageEmployees
}

// POST /api/vehicle-service/contractors/[contractorId]/reset-login-password
// Body: { password? }
// A manager sets (or auto-generates) a new password for an existing contractor
// login — separate from Revoke/Reactivate, which only ever touch isActive.
// Works regardless of whether the login is currently active or revoked, same
// as provision-login: an explicit password is used as-is (no forced reset on
// next sign-in); an omitted one auto-generates a temporary password that must
// be changed on first login, returned once in the response.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ contractorId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { contractorId } = await params
    const body = await request.json().catch(() => ({}))
    const { password } = body as { password?: string }
    if (password && password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const contractor = await prisma.vehicleServiceContractors.findUnique({
      where: { id: contractorId },
      include: { persons: { select: { fullName: true } }, users: { select: { id: true, email: true } } },
    })
    if (!contractor) return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })
    if (!canManage(user, contractor.businessId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (!contractor.users) {
      return NextResponse.json({ error: 'This contractor has no login yet' }, { status: 400 })
    }

    const finalPassword = password || Math.random().toString(36).slice(-12)
    const hashedPassword = await hash(finalPassword, 12)

    await prisma.users.update({
      where: { id: contractor.users.id },
      data: {
        passwordHash: hashedPassword,
        passwordResetRequired: !password,
      },
    })

    await createAuditLog({
      userId: user.id,
      action: 'PASSWORD_RESET',
      entityType: 'User',
      entityId: contractor.users.id,
      metadata: {
        businessId: contractor.businessId,
        contractorId: contractor.id,
        contractorName: contractor.persons.fullName,
        reason: password ? 'Password set by manager' : 'Password reset — temporary password generated',
      },
    })

    return NextResponse.json({
      success: true,
      temporaryPassword: password ? undefined : finalPassword,
    })
  } catch (error) {
    console.error('Reset contractor login password error:', error)
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
  }
}
